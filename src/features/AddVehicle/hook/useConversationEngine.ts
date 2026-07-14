// src/features/vehicle/hook/useConversationEngine.ts
import { useState, useEffect, useCallback } from 'react';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';
import { PromptBuilder } from '../utils/promptBuilder';
import { extractVehicleEntities, type ExtractedVehicleEntities } from '../utils/voiceParser';
import { APP_INTENTS, type IntentResult } from '../../../shared/VoiceCommand/intentService';
import type { ConversationMemory, ConversationState, DraftVehicle } from '../../../shared/VoiceCommand/conversationTypes';

interface EngineProps {
  catalog: { brands: string[]; getModels: (brand: string) => string[] };
  onDraftComplete: (draft: Required<DraftVehicle>) => void;
  onCancel: () => void;
}

interface EvaluationResult {
  nextDraft: DraftVehicle;
  needsClarification: boolean;
  clarificationState: ConversationState | null;
  candidates: string[];
}

function evaluateEntities(
  extracted: ExtractedVehicleEntities,
  currentDraft: DraftVehicle,
  pendingEntity: ConversationMemory['pendingEntity']
): EvaluationResult {
  const nextDraft = { ...currentDraft };

  // 1. Marca
  if (extracted.brand) {
    if (extracted.brand.level === 'exact' || extracted.brand.level === 'high') {
      nextDraft.brand = extracted.brand.value;
      if (currentDraft.brand && currentDraft.brand !== nextDraft.brand) nextDraft.model = null;
    } else if (extracted.brand.level === 'medium') {
      return { nextDraft, needsClarification: true, clarificationState: 'CLARIFYING_BRAND', candidates: extracted.brand.candidates || [] };
    }
  }

  // 2. Modello
  if (nextDraft.brand && extracted.model) {
    if (extracted.model.level === 'exact' || extracted.model.level === 'high') {
      nextDraft.model = extracted.model.value;
    } else if (extracted.model.level === 'medium') {
      return { nextDraft, needsClarification: true, clarificationState: 'CLARIFYING_MODEL', candidates: extracted.model.candidates || [] };
    }
  }

  // 3. Targa
  if (extracted.plate) nextDraft.plate = extracted.plate.value;

  // 4. Controlli per avanzamento lineare
  if (!nextDraft.brand) return { nextDraft, needsClarification: true, clarificationState: 'CLARIFYING_BRAND', candidates: [] };
  if (!nextDraft.model) return { nextDraft, needsClarification: true, clarificationState: 'CLARIFYING_MODEL', candidates: [] };
  if (!nextDraft.plate) return { nextDraft, needsClarification: true, clarificationState: 'CLARIFYING_PLATE', candidates: [] };

  return { nextDraft, needsClarification: false, clarificationState: null, candidates: [] };
}

export function useConversationEngine({ catalog, onDraftComplete, onCancel }: EngineProps) {
  const [state, setState] = useState<ConversationState>('IDLE');
  const [draft, setDraft] = useState<DraftVehicle>({ brand: null, model: null, plate: null });
  const [memory, setMemory] = useState<ConversationMemory>({ lastState: 'IDLE', pendingEntity: null, candidateMatches: [] });

  const { registerActionHandler } = useVoiceContext();
  const { speakAndListen, speakOnly } = useSpeechAction();

  const advanceState = useCallback((currentDraft: DraftVehicle) => {
    let nextState: ConversationState = 'COLLECTING';
    let pending: ConversationMemory['pendingEntity'] = null;

    if (!currentDraft.brand) pending = 'brand';
    else if (!currentDraft.model) pending = 'model';
    else if (!currentDraft.plate) pending = 'plate';
    else {
      nextState = 'CONFIRMING';
      pending = null;
    }

    setState(nextState);
    setMemory(prev => ({ ...prev, lastState: nextState, pendingEntity: pending }));
    
    const prompt = PromptBuilder.getNextPrompt(nextState, currentDraft);
    console.log(`🤖 [Engine] Cambio Stato => ${nextState}. In attesa di: ${pending || 'Conferma Finale'}`);
    return prompt;
  }, []);

  const processSpeechResult = useCallback((intentResult: IntentResult) => {
    const { intent, utterance } = intentResult;
    const text = utterance.trim();

    console.group(`🎙️ [Engine] Ricevuto Input: "${text}"`);
    console.log(`🧠 [Engine] Intento rilevato: ${intent}`);
    console.log(`📦 [Engine] Stato: ${state} | Bozza:`, JSON.stringify(draft));

    // 1. ANNULLA
    if (intent === APP_INTENTS.CANCEL) {
      console.log(`⛔ [Engine] Annullamento operazione.`);
      setState('IDLE');
      setDraft({ brand: null, model: null, plate: null });
      onCancel();
      speakOnly("Nessun problema, operazione annullata.");
      console.groupEnd();
      return;
    }

    // 2. CONFERMA (solo se siamo in stato CONFIRMING)
    if (state === 'CONFIRMING' && intent === APP_INTENTS.CONFIRM) {
      console.log(`✅ [Engine] Conferma salvataggio.`);
      setState('SAVING');
      speakOnly(PromptBuilder.getNextPrompt('SAVING', draft));
      onDraftComplete(draft as Required<DraftVehicle>);
      console.groupEnd();
      return;
    }

    // 3. GOTO_GARAGE (comando di navigazione)
    if (intent === APP_INTENTS.GOTO_GARAGE) {
      console.log(`🚗 [Engine] Navigazione al garage.`);
      speakOnly("Apro il garage...");
      // TODO: naviga a /garage
      console.groupEnd();
      return;
    }

    // 4. MODIFY_FIELD o UNKNOWN → estrai entità e aggiorna bozza
    const extracted = extractVehicleEntities(text, catalog, draft.brand);
    const hasEntities = extracted.brand || extracted.model || extracted.plate;

    // Se non ci sono entità e l'intento è UNKNOWN, chiedi ripetizione
    if (!hasEntities && intent === APP_INTENTS.UNKNOWN) {
      console.warn(`⚠️ [Engine] Nessuna entità trovata. Richiedo ripetizione.`);
      speakAndListen("Non ho capito, puoi ripetere?");
      console.groupEnd();
      return;
    }

    // Se non ci sono entità ma l'intento è MODIFY_FIELD, l'utente potrebbe voler correggere senza dati
    // (es. "no, non è così") → chiediamo cosa correggere
    if (!hasEntities && intent === APP_INTENTS.MODIFY_FIELD) {
      const pending = memory.pendingEntity || 'brand';
      const prompt = PromptBuilder.getNextPrompt(
        pending === 'brand' ? 'CLARIFYING_BRAND' : 
        pending === 'model' ? 'CLARIFYING_MODEL' : 
        'CLARIFYING_PLATE',
        draft
      );
      speakAndListen(prompt);
      console.groupEnd();
      return;
    }

    // Valutazione entità
    const { nextDraft, needsClarification, clarificationState, candidates } = evaluateEntities(
      extracted,
      draft,
      memory.pendingEntity
    );
    
    console.log(`⚖️ [Engine] Valutazione completata. Nuova bozza:`, JSON.stringify(nextDraft));

    // Gestione chiarimenti
    if (needsClarification && clarificationState) {
      // Se siamo in chiarimento targa ma l'utente non l'ha nominata, saltiamo per evitare loop
      if (clarificationState === 'CLARIFYING_PLATE' && !extracted.plate && intent !== APP_INTENTS.UNKNOWN) {
        console.log(`[Engine] Salto chiarimento targa (non menzionata).`);
      } else {
        console.log(`❓ [Engine] Richiesto chiarimento: ${clarificationState}`);
        setState(clarificationState);
        setDraft(nextDraft);
        setMemory(prev => ({ 
          ...prev, 
          lastState: clarificationState, 
          pendingEntity: clarificationState === 'CLARIFYING_BRAND' ? 'brand' : 
                        clarificationState === 'CLARIFYING_MODEL' ? 'model' : 'plate',
          candidateMatches: candidates 
        }));
        const prompt = PromptBuilder.getNextPrompt(clarificationState, nextDraft, candidates);
        speakAndListen(prompt);
        console.groupEnd();
        return;
      }
    }

    // Avanzamento lineare
    console.log(`🚀 [Engine] Avanzamento lineare.`);
    const nextPrompt = advanceState(nextDraft);
    speakAndListen(nextPrompt);
    setDraft(nextDraft);
    
    console.groupEnd();
  }, [state, draft, memory, catalog, onCancel, onDraftComplete, speakAndListen, speakOnly, advanceState]);

  useEffect(() => {
    return registerActionHandler(processSpeechResult);
  }, [registerActionHandler, processSpeechResult]);

  const startConversation = useCallback(() => {
    console.log(`\n\n🟢 [Engine] *** INIZIO NUOVA CONVERSAZIONE ***`);
    setState('COLLECTING');
    const prompt = PromptBuilder.getNextPrompt('COLLECTING', draft);
    speakAndListen(prompt);
  }, [draft, speakAndListen]);

  return { state, draft, startConversation };
}