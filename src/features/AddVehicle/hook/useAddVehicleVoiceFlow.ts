import { useState, useEffect, useRef } from 'react';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import { useVoiceContext, type NlpResponse } from '../../../shared/VoiceCommand/VoiceContext';
import { extractFields, type TargetField } from '../utils/extractFields';

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

export function useAddVehicleVoiceFlow({ catalog, form, actions }: AddVehicleVoiceFlowProps) {
  const [waitingFor, setWaitingFor] = useState<TargetField>(null);
  const { registerActionHandler } = useVoiceContext();
  const { speakAndListen, speakOnly } = useSpeechAction();

  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const askAsValet = (question: string, field: TargetField = null) => {
    setWaitingFor(field);
    speakAndListen(question);
  };

  const evaluateNextStep = (currentBrand: string, currentModel: string, currentPlate: string) => {
    if (!currentBrand) {
      askAsValet("Che auto mettiamo in garage oggi? Dimmi la marca.", 'brand');
    } else if (!currentModel) {
      askAsValet(`Ottimo, una ${currentBrand}! Che modello è?`, 'model');
    } else if (!currentPlate) {
      askAsValet(`Perfetto, ${currentBrand} ${currentModel}. Mi detti la targa per il tagliando?`, 'plate');
    } else {
      askAsValet(`Ho annotato tutto: ${currentBrand} ${currentModel}, targata ${currentPlate}. Salvo e metto in garage?`, 'confirm_save');
    }
  };

  useEffect(() => {
    const cleanup = registerActionHandler((nlpResult: NlpResponse) => {
      if (!nlpResult || !nlpResult.utterance) return;

      const rawText = nlpResult.utterance.trim();
      const normalizedText = rawText
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[.,!?]/g, '')
        .trim();

      const current = formRef.current;
      const isFormComplete = !!(current.brand && current.model && current.plate);

      // --- 1. GESTIONE ANNULLAMENTO ---
      if (nlpResult.intent === 'intent.cancel') {
        actions.resetForm();
        setWaitingFor(null);
        speakOnly("Nessun problema, operazione annullata. Le chiavi restano a te!");
        return;
      }

      // --- 2. GESTIONE CONFERMA / SALVATAGGIO ---
      if (waitingFor === 'confirm_save' || isFormComplete) {
        // Se la risposta è positiva o confermativa E non contiene parole di negazione o modifica
        const isConfirmMatch = nlpResult.intent === 'intent.confirm' || /^(si|sii|ok|esatto|salva|va bene|procedi)/i.test(normalizedText);
        const isCorrection = /^(no|non|cambia|modifica|invece)/i.test(normalizedText) || nlpResult.intent.startsWith('intent.modify_');

        if (isConfirmMatch && !isCorrection) {
          const success = actions.performSave();
          if (success) {
            speakOnly("Perfetto! Auto parcheggiata con successo nel garage.");
            setWaitingFor(null);
          } else {
            speakOnly("C'è un errore nei dati della targa. Puoi dirmela di nuovo?");
            setWaitingFor('plate');
          }
          return; // Interrompe l'esecuzione: non prova ad estrarre dati
        }
      }

      // --- 3. ESTRAZIONE DATI ---
      // Ci arriviamo solo se l'utente non ha confermato il salvataggio o stava aggiungendo dati
      const { foundPlate, foundBrand, foundModel } = extractFields(rawText, catalog, waitingFor);

      let updatedBrand = current.brand;
      let updatedModel = current.model;
      let updatedPlate = current.plate;

      if (foundBrand) {
        actions.setBrand(foundBrand);
        updatedBrand = foundBrand;
      }
      if (foundModel) {
        actions.setModel(foundModel);
        updatedModel = foundModel;
      }
      if (foundPlate) {
        actions.setPlate(foundPlate);
        updatedPlate = foundPlate;
      }

      // --- 4. AVANZAMENTO CONVERSAZIONE ---
      evaluateNextStep(updatedBrand, updatedModel, updatedPlate);
    });

    return cleanup;
  }, [registerActionHandler, catalog, actions, waitingFor]);

  return { waitingFor };
}