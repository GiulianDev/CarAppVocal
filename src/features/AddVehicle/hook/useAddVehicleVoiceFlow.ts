import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import { useVoiceContext, type NlpResponse } from '../../../shared/VoiceCommand/VoiceContext';
import {
  parseVoiceCommand,
  type ConversationState,
  type ParsedVoiceCommand,
  type TargetField,
  type VehicleField
} from '../utils/extractFields';

interface AddVehicleVoiceFlowProps {
  catalog: {
    brands: string[];
    getModelsForBrand: (brand: string) => string[];
  };
  form: {
    plate: string;
    brand: string;
    model: string;
  };
  actions: {
    setPlate: (plate: string) => void;
    setBrand: (brand: string) => void;
    setModel: (model: string) => void;
    performSave: () => boolean;
    resetForm: () => void;
  };
}

interface DraftVehicle {
  brand: string;
  model: string;
  plate: string;
}

interface ConversationMemory {
  lastQuestion: string;
  pendingField: VehicleField | null;
  candidates: string[];
}

export function useAddVehicleVoiceFlow({ catalog, form, actions }: AddVehicleVoiceFlowProps) {
  const [waitingFor, setWaitingFor] = useState<TargetField>(null);
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [draftVehicle, setDraftVehicle] = useState<DraftVehicle>({ brand: '', model: '', plate: '' });
  const [conversationMemory, setConversationMemory] = useState<ConversationMemory>({
    lastQuestion: '',
    pendingField: null,
    candidates: []
  });

  const { registerActionHandler } = useVoiceContext();
  const { speakAndListen, speakOnly } = useSpeechAction();

  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const applyDraft = useCallback((nextDraft: DraftVehicle) => {
    const { brand, model, plate } = nextDraft;
    if (brand) actions.setBrand(brand);
    if (model) actions.setModel(model);
    if (plate) actions.setPlate(plate);
    setDraftVehicle(nextDraft);
  }, [actions]);

  const askAsValet = useCallback((question: string, field: TargetField = null, state: ConversationState = 'collecting') => {
    setWaitingFor(field);
    setConversationState(state);
    setConversationMemory(prev => ({ ...prev, lastQuestion: question, pendingField: field === 'confirm_save' ? null : (field as VehicleField | null) }));
    speakAndListen(question);
  }, [speakAndListen]);

  const syncFromForm = useCallback(() => {
    const current = formRef.current;
    setDraftVehicle({
      brand: current.brand ?? '',
      model: current.model ?? '',
      plate: current.plate ?? ''
    });
  }, []);

  const evaluateNextStep = useCallback((currentDraft: DraftVehicle) => {
    const hasBrand = Boolean(currentDraft.brand);
    const hasModel = Boolean(currentDraft.model);
    const hasPlate = Boolean(currentDraft.plate);

    if (!hasBrand) {
      askAsValet('Che auto mettiamo in garage oggi? Dimmi la marca.', 'brand', 'collecting');
      return;
    }

    if (!hasModel) {
      askAsValet(`Ottimo, una ${currentDraft.brand}! Che modello è?`, 'model', 'collecting');
      return;
    }

    if (!hasPlate) {
      askAsValet(`Perfetto, ${currentDraft.brand} ${currentDraft.model}. Mi detti la targa per il tagliando?`, 'plate', 'collecting');
      return;
    }

    askAsValet(`Ho annotato tutto: ${currentDraft.brand} ${currentDraft.model}, targata ${currentDraft.plate}. Salvo e metto in garage?`, 'confirm_save', 'confirming');
  }, [askAsValet]);

  const handleCorrection = useCallback((parsed: ParsedVoiceCommand, currentDraft: DraftVehicle) => {
    const nextDraft = { ...currentDraft };
    const correctionTarget = parsed.targetField ?? conversationMemory.pendingField;

    if (correctionTarget === 'brand' && parsed.entities.brand) {
      nextDraft.brand = parsed.entities.brand;
      applyDraft(nextDraft);
      askAsValet(`Va bene, aggiorno la marca in ${parsed.entities.brand}.`, 'model', 'collecting');
      return;
    }

    if (correctionTarget === 'model' && parsed.entities.model) {
      nextDraft.model = parsed.entities.model;
      applyDraft(nextDraft);
      if (nextDraft.plate) {
        askAsValet(`Perfetto, correggo il modello in ${parsed.entities.model}.`, 'confirm_save', 'confirming');
      } else {
        askAsValet(`Perfetto, correggo il modello in ${parsed.entities.model}. Qual è la targa?`, 'plate', 'collecting');
      }
      return;
    }

    if (correctionTarget === 'plate' && parsed.entities.plate) {
      nextDraft.plate = parsed.entities.plate;
      applyDraft(nextDraft);
      askAsValet(`Targa aggiornata a ${parsed.entities.plate}.`, 'confirm_save', 'confirming');
      return;
    }

    if (parsed.entities.brand) {
      nextDraft.brand = parsed.entities.brand;
      applyDraft(nextDraft);
      askAsValet('Ho aggiornato la marca. Vuoi confermare il modello o correggerlo?', 'model', 'collecting');
      return;
    }

    if (parsed.entities.model) {
      nextDraft.model = parsed.entities.model;
      applyDraft(nextDraft);
      askAsValet('Ho aggiornato il modello. Vuoi confermare la targa o correggerla?', 'plate', 'collecting');
      return;
    }

    if (parsed.entities.plate) {
      nextDraft.plate = parsed.entities.plate;
      applyDraft(nextDraft);
      askAsValet('Ho aggiornato la targa. Vuoi salvare il veicolo?', 'confirm_save', 'confirming');
      return;
    }

    askAsValet('Va bene, dimmi il dato corretto da aggiornare.', null, 'collecting');
  }, [applyDraft, askAsValet, conversationMemory.pendingField]);

  useEffect(() => {
    const cleanup = registerActionHandler((nlpResult: NlpResponse) => {
      if (!nlpResult?.utterance) return;

      const rawText = nlpResult.utterance.trim();
      const parsed = parseVoiceCommand(rawText, catalog, waitingFor, draftVehicle);

      if (nlpResult.intent === 'intent.cancel' || parsed.intent === 'cancel') {
        actions.resetForm();
        setDraftVehicle({ brand: '', model: '', plate: '' });
        setWaitingFor(null);
        setConversationState('idle');
        speakOnly('Nessun problema, operazione annullata. Le chiavi restano a te!');
        return;
      }

      if (parsed.intent === 'confirm') {
        const success = actions.performSave();
        if (success) {
          setConversationState('saving');
          setWaitingFor(null);
          speakOnly('Perfetto! Auto parcheggiata con successo nel garage.');
        } else {
          setConversationState('clarifying_plate');
          setWaitingFor('plate');
          speakOnly("C'è un errore nei dati della targa. Puoi dirmela di nuovo?");
        }
        return;
      }

      if (parsed.intent === 'correction') {
        handleCorrection(parsed, draftVehicle);
        return;
      }

      if (parsed.needsClarification) {
        const nextClarificationState: ConversationState = parsed.clarificationField === 'brand'
          ? 'clarifying_brand'
          : parsed.clarificationField === 'model'
            ? 'clarifying_model'
            : parsed.clarificationField === 'plate'
              ? 'clarifying_plate'
              : 'collecting';

        setConversationState(nextClarificationState);
        setConversationMemory(prev => ({
          ...prev,
          pendingField: parsed.clarificationField,
          candidates: parsed.brandResolution?.candidates ?? parsed.modelResolution?.candidates ?? []
        }));
        speakOnly(parsed.clarificationPrompt);
        return;
      }

      const nextDraft = { ...draftVehicle };
      if (parsed.entities.brand) nextDraft.brand = parsed.entities.brand;
      if (parsed.entities.model) nextDraft.model = parsed.entities.model;
      if (parsed.entities.plate) nextDraft.plate = parsed.entities.plate;

      if (parsed.entities.brand || parsed.entities.model || parsed.entities.plate) {
        applyDraft(nextDraft);
        setConversationState('collecting');
        evaluateNextStep(nextDraft);
        return;
      }

      if (!draftVehicle.brand && !draftVehicle.model && !draftVehicle.plate) {
        askAsValet('Che auto vuoi aggiungere?', null, 'collecting');
        return;
      }

      evaluateNextStep(nextDraft);
    });

    return cleanup;
  }, [actions, applyDraft, askAsValet, catalog, conversationMemory.pendingField, draftVehicle, evaluateNextStep, handleCorrection, registerActionHandler, waitingFor, speakOnly]);

  useEffect(() => {
    syncFromForm();
  }, [form, syncFromForm]);

  const status = useMemo(() => ({ waitingFor, conversationState, draftVehicle, conversationMemory }), [conversationMemory, conversationState, draftVehicle, waitingFor]);

  return status;
}