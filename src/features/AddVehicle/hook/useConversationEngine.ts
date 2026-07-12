import { useState, useEffect, useCallback } from 'react';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';
import { PromptBuilder } from '../utils/promptBuilder';
import { parseConversationalCommand } from '../utils/voiceParser';
import type { ConversationMemory, ConversationState, DraftVehicle } from '../../../shared/VoiceCommand/conversationTypes';

interface EngineProps {
  catalog: { 
    brands: string[]; 
    getModels: (brand: string) => string[] 
  };
  onDraftComplete: (draft: Required<DraftVehicle>) => void;
  onCancel: () => void;
}

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

  const processSpeechEvent = useCallback((text: string) => {
    // 1. Parsing del Testo (Event: TextParsed)
    const parsed = parseConversationalCommand(text, catalog, draft.brand);

    if (parsed.intent === 'CANCEL') {
      setState('IDLE');
      setDraft({ brand: null, model: null, plate: null });
      onCancel();
      speakOnly("Nessun problema, operazione annullata. Le chiavi restano a te!");
      return;
    }

    let nextDraft = { ...draft };
    let nextState = state;
    let nextCandidates: string[] = [];
    let nextPending: ConversationMemory['pendingEntity'] = memory.pendingEntity;

    // 2. Applicazione Entità (Event: EntitiesResolved)
    if (parsed.entities.brand?.value) {
      nextDraft.brand = parsed.entities.brand.value;
      // Invalida il modello se la marca cambia (Problema 1: Cambio contestuale)
      if (draft.brand && draft.brand !== nextDraft.brand) {
        nextDraft.model = null;
      }
    }
    if (parsed.entities.model?.value) {
      nextDraft.model = parsed.entities.model.value;
    }
    if (parsed.entities.plate?.value) {
      nextDraft.plate = parsed.entities.plate.value;
    }

    // 3. Gestione Correzioni e Feedback
    let acknowledgePrefix = "";
    if (parsed.intent === 'CORRECTION') {
      if (parsed.entities.brand) {
        acknowledgePrefix = `Va bene, ho corretto la marca in ${nextDraft.brand}. `;
      } else if (parsed.entities.model) {
        acknowledgePrefix = `Perfetto, ho corretto il modello in ${nextDraft.model}. `;
      } else if (parsed.entities.plate) {
        acknowledgePrefix = `Va bene, ho corretto la targa. `;
      } else {
        // L'utente ha detto "no" ma non ha fornito il dato corretto
        acknowledgePrefix = "Scusa, dimmi di nuovo il dato corretto. ";
        if (state === 'CONFIRMING') {
          nextState = 'COLLECTING'; // Resetta lo stato di conferma
        }
      }
    }

    // 4. Logica di Conferma Finale
    if (state === 'CONFIRMING' && parsed.intent === 'CONFIRM') {
      nextState = 'SAVING';
      setState(nextState);
      speakOnly(PromptBuilder.getNextPrompt(nextState, nextDraft));
      // Sappiamo che a questo punto i campi sono tutti valorizzati
      onDraftComplete(nextDraft as Required<DraftVehicle>); 
      return;
    }

    // 5. Valutazione Macchina a Stati (Event: StateUpdated)
    const brandLevel = parsed.entities.brand?.level;
    const modelLevel = parsed.entities.model?.level;

    if (brandLevel === 'medium' || brandLevel === 'low') {
      nextState = 'CLARIFYING_BRAND';
      nextCandidates = (parsed.entities.brand as any).candidates || [];
    } else if (modelLevel === 'medium' || modelLevel === 'low') {
      nextState = 'CLARIFYING_MODEL';
      nextCandidates = (parsed.entities.model as any).candidates || [];
    } else {
      // Nessuna ambiguità, proseguiamo la raccolta in sequenza
      if (!nextDraft.brand) {
        nextState = 'COLLECTING';
        nextPending = 'brand';
      } else if (!nextDraft.model) {
        nextState = 'COLLECTING';
        nextPending = 'model';
      } else if (!nextDraft.plate) {
        nextState = 'COLLECTING';
        nextPending = 'plate';
      } else {
        nextState = 'CONFIRMING';
        nextPending = null;
      }
    }

    // 6. Aggiornamento e Generazione Risposta (Event: PromptGenerated)
    setDraft(nextDraft);
    setState(nextState);
    setMemory({ lastState: state, pendingEntity: nextPending, candidateMatches: nextCandidates });

    const nextPrompt = PromptBuilder.getNextPrompt(nextState, nextDraft, nextCandidates);
    speakAndListen(acknowledgePrefix + nextPrompt);

  }, [draft, state, memory, catalog, onCancel, onDraftComplete, speakAndListen, speakOnly]);

  // Registra l'handler nel VoiceContext
  useEffect(() => {
    const cleanup = registerActionHandler((nlpResult) => {
      if (nlpResult?.utterance) {
        processSpeechEvent(nlpResult.utterance);
      }
    });
    return cleanup;
  }, [registerActionHandler, processSpeechEvent]);

  // Avvio manuale della conversazione
  const startConversation = () => {
    setState('COLLECTING');
    const prompt = PromptBuilder.getNextPrompt('COLLECTING', draft);
    speakAndListen(prompt);
  };

  return { state, draft, startConversation };
}