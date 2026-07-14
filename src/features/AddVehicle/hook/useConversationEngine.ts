// src/features/vehicle/hook/useConversationEngine.ts
import { useState, useEffect, useCallback } from 'react';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';
import { PromptBuilder } from '../utils/promptBuilder';
import { extractVehicleEntities, type ExtractedVehicleEntities } from '../utils/voiceParser';
import { APP_INTENTS, type NlpResult } from '../../../shared/VoiceCommand/intentService';
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

  const processSpeechResult = useCallback((nlpResult: NlpResult) => {
    const { intent, utterance } = nlpResult;
    const text = utterance.trim();

    console.group(`🎙️ [Engine] Ricevuto Input: "${text}"`);
    console.log(`🧠 [Engine] Intento rilevato dal Worker NLP: ${intent}`);
    console.log(`📦 [Engine] Stato Precedente: ${state} | Bozza Corrente:`, JSON.stringify(draft));

    if (intent === APP_INTENTS.CANCEL) {
      console.log(`⛔ [Engine] Utente ha richiesto annullamento. Reset dello stato.`);
      setState('IDLE');
      setDraft({ brand: null, model: null, plate: null });
      onCancel();
      speakOnly("Nessun problema, operazione annullata.");
      console.groupEnd();
      return;
    }

    if (state === 'CONFIRMING' && intent === APP_INTENTS.CONFIRM) {
      console.log(`✅ [Engine] Utente ha confermato il salvataggio.`);
      setState('SAVING');
      speakOnly(PromptBuilder.getNextPrompt('SAVING', draft));
      onDraftComplete(draft as Required<DraftVehicle>);
      console.groupEnd();
      return;
    }

    const extracted = extractVehicleEntities(text, catalog, draft.brand);
    const hasEntities = extracted.brand || extracted.model || extracted.plate;

    if (intent === APP_INTENTS.UNKNOWN && !hasEntities) {
      console.warn(`⚠️ [Engine] Intento Sconosciuto e nessuna entità trovata. Richiedo ripetizione.`);
      speakAndListen("Non ho capito bene, puoi ripetere?");
      console.groupEnd();
      return;
    }

    const { nextDraft, needsClarification, clarificationState, candidates } = evaluateEntities(extracted, draft, memory.pendingEntity);
    
    console.log(`⚖️ [Engine] Valutazione completata. Nuova Bozza stimata:`, JSON.stringify(nextDraft));

    if (needsClarification && clarificationState) {
      if (clarificationState === 'CLARIFYING_PLATE' && !extracted.plate && intent !== APP_INTENTS.UNKNOWN) {
        console.log(`[Engine] Salto chiarimento targa poichè non è stata nominata e l'intento non è sconosciuto.`);
      } else {
        console.log(`❓ [Engine] Richiesto Chiarimento. Stato passa a: ${clarificationState}`);
        setState(clarificationState);
        setDraft(nextDraft);
        setMemory(prev => ({ 
          ...prev, 
          lastState: clarificationState, 
          pendingEntity: clarificationState === 'CLARIFYING_BRAND' ? 'brand' : clarificationState === 'CLARIFYING_MODEL' ? 'model' : 'plate',
          candidateMatches: candidates 
        }));
        const prompt = PromptBuilder.getNextPrompt(clarificationState, nextDraft, candidates);
        speakAndListen(prompt);
        console.groupEnd();
        return;
      }
    }

    console.log(`🚀 [Engine] Nessun chiarimento bloccante. Avanzamento lineare.`);
    
    // Avanziamo lo stato usando la nuova bozza calcolata
    const nextPrompt = advanceState(nextDraft);
    
    if (intent === APP_INTENTS.MODIFY_FIELD && hasEntities) {
      const fieldCorrected = extracted.plate ? 'plate' : extracted.model ? 'model' : 'brand';
      
      // FIX: Verifichiamo che il campo avesse GIA' un valore nella VECCHIA bozza.
      // Se era vuoto (null), non è una correzione ma un normale inserimento.
      const wasAlreadyFilled = draft[fieldCorrected] !== null;
      
      if (wasAlreadyFilled) {
        console.log(`✍️ [Engine] Eseguita VERA correzione per il campo: ${fieldCorrected}`);
        const correctionPrompt = PromptBuilder.getCorrectionPrompt(fieldCorrected, (extracted[fieldCorrected]?.value as string) || '', nextPrompt);
        speakAndListen(correctionPrompt);
      } else {
        console.log(`🚀 [Engine] Ignorato falso intento di modifica. Il campo ${fieldCorrected} era vuoto. Inserimento standard.`);
        speakAndListen(nextPrompt);
      }
    } else {
      speakAndListen(nextPrompt);
    }
    
    // IMPORTANTE: Aggiorniamo la bozza solo alla fine dell'elaborazione
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