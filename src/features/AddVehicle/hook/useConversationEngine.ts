// src/features/vehicle/hook/useConversationEngine.ts
import { useState, useEffect, useCallback } from 'react';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';
import { PromptBuilder } from '../utils/promptBuilder';
import { extractVehicleEntities, type ExtractedVehicleEntities } from '../utils/voiceParser';
import { APP_INTENTS, type NlpResult } from '../../../shared/VoiceCommand/intentService';
import type { ConversationMemory, ConversationState, DraftVehicle } from '../../../shared/VoiceCommand/conversationTypes';

interface EngineProps {
  catalog: { 
    brands: string[]; 
    getModels: (brand: string) => string[] 
  };
  onDraftComplete: (draft: Required<DraftVehicle>) => void;
  onCancel: () => void;
}

interface EvaluationResult {
  nextDraft: DraftVehicle;
  needsClarification: boolean;
  clarificationState: ConversationState | null;
  candidates: string[];
}

// ==========================================
// PURE FUNCTION: Valutazione Entità Deterministica
// ==========================================
function evaluateEntities(
  extracted: ExtractedVehicleEntities,
  currentDraft: DraftVehicle,
  pendingEntity: ConversationMemory['pendingEntity']
): EvaluationResult {
  const nextDraft = { ...currentDraft };

  // 1. Analisi Marca (Brand)
  if (extracted.brand) {
    if (extracted.brand.level === 'exact' || extracted.brand.level === 'high') {
      nextDraft.brand = extracted.brand.value;
      // Invalida il modello se la marca viene cambiata (es. da Fiat a Ford)
      if (currentDraft.brand && currentDraft.brand !== nextDraft.brand) {
        nextDraft.model = null;
      }
    } else if (extracted.brand.level === 'medium') {
      return { nextDraft, needsClarification: true, clarificationState: 'CLARIFYING_BRAND', candidates: extracted.brand.candidates || [] };
    }
  }

  // 2. Analisi Modello (Solo se abbiamo una Marca valida nel draft)
  if (nextDraft.brand && extracted.model) {
    if (extracted.model.level === 'exact' || extracted.model.level === 'high') {
      nextDraft.model = extracted.model.value;
    } else if (extracted.model.level === 'medium') {
      return { nextDraft, needsClarification: true, clarificationState: 'CLARIFYING_MODEL', candidates: extracted.model.candidates || [] };
    }
  }

  // 3. Analisi Targa
  if (extracted.plate) {
    nextDraft.plate = extracted.plate.value;
  }

  // 4. Controllo Dati Mancanti (in base all'ordine cronologico richiesto)
  if (!nextDraft.brand) {
    return { nextDraft, needsClarification: true, clarificationState: 'CLARIFYING_BRAND', candidates: [] };
  }
  if (!nextDraft.model) {
    return { nextDraft, needsClarification: true, clarificationState: 'CLARIFYING_MODEL', candidates: [] };
  }
  if (!nextDraft.plate) {
    return { nextDraft, needsClarification: true, clarificationState: 'CLARIFYING_PLATE', candidates: [] };
  }

  // Nessun chiarimento necessario: abbiamo tutto o stiamo procedendo in modo lineare
  return { nextDraft, needsClarification: false, clarificationState: null, candidates: [] };
}

// ==========================================
// HOOK PRINCIPALE
// ==========================================
export function useConversationEngine({ catalog, onDraftComplete, onCancel }: EngineProps) {
  const [state, setState] = useState<ConversationState>('IDLE');
  const [draft, setDraft] = useState<DraftVehicle>({ brand: null, model: null, plate: null });
  const [memory, setMemory] = useState<ConversationMemory>({ 
    lastState: 'IDLE', 
    pendingEntity: null, 
    candidateMatches: [] 
  });

  const { registerActionHandler } = useVoiceContext();
  const { speakAndListen, speakOnly } = useSpeechAction();

  // Avanzamento logico dello stato
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
    return PromptBuilder.getNextPrompt(nextState, currentDraft);
  }, []);

  const processSpeechResult = useCallback((nlpResult: NlpResult) => {
    const { intent, utterance } = nlpResult;
    const text = utterance.trim();

    // 1. Azioni di interruzione
    if (intent === APP_INTENTS.CANCEL) {
      setState('IDLE');
      setDraft({ brand: null, model: null, plate: null });
      onCancel();
      speakOnly("Nessun problema, operazione annullata.");
      return;
    }

    // 2. Azione di conferma finale
    if (state === 'CONFIRMING' && intent === APP_INTENTS.CONFIRM) {
      setState('SAVING');
      speakOnly(PromptBuilder.getNextPrompt('SAVING', draft));
      onDraftComplete(draft as Required<DraftVehicle>);
      return;
    }

    // 3. Estrazione ed elaborazione entità
    const extracted = extractVehicleEntities(text, catalog, draft.brand);
    
    // Fallback: se l'intento è sconosciuto e non abbiamo beccato nessuna entità, l'utente ha detto qualcosa di incomprensibile
    const hasEntities = extracted.brand || extracted.model || extracted.plate;
    if (intent === APP_INTENTS.UNKNOWN && !hasEntities) {
      speakAndListen("Non ho capito bene, puoi ripetere?");
      return;
    }

    // 4. Valutazione logica delle entità trovate contro il draft attuale
    const { 
      nextDraft, 
      needsClarification, 
      clarificationState, 
      candidates 
    } = evaluateEntities(extracted, draft, memory.pendingEntity);

    // 5. Gestione di chiarimenti o incertezze del parser (es. due brand simili)
    if (needsClarification && clarificationState) {
      // Se l'utente doveva dare la targa ma ha detto un'altra cosa o il formato era errato
      if (clarificationState === 'CLARIFYING_PLATE' && !extracted.plate && intent !== APP_INTENTS.UNKNOWN) {
          // Lasciamo scorrere verso il prossimo prompt regolare se manca solo un pezzo e non c'è ambiguità
      } else {
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
        return;
      }
    }

    // 6. Avanzamento lineare o conferma modifica avvenuta
    setDraft(nextDraft);
    const nextPrompt = advanceState(nextDraft);
    
    // Se l'intento era una correzione ed è andata a buon fine, possiamo inserire una risposta di cortesia 
    if (intent === APP_INTENTS.MODIFY_FIELD && hasEntities) {
      const fieldCorrected = extracted.brand ? 'brand' : extracted.model ? 'model' : 'plate';
      const correctionPrompt = PromptBuilder.getCorrectionPrompt(fieldCorrected, (extracted[fieldCorrected]?.value as string) || '', nextPrompt);
      speakAndListen(correctionPrompt);
    } else {
      speakAndListen(nextPrompt);
    }

  }, [state, draft, memory, catalog, onCancel, onDraftComplete, speakAndListen, speakOnly, advanceState]);

  useEffect(() => {
    return registerActionHandler(processSpeechResult);
  }, [registerActionHandler, processSpeechResult]);

  const startConversation = useCallback(() => {
    setState('COLLECTING');
    const prompt = PromptBuilder.getNextPrompt('COLLECTING', draft);
    speakAndListen(prompt);
  }, [draft, speakAndListen]);

  return { state, draft, startConversation };
}