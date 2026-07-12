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

  // Ref per accedere sempre al form aggiornato dentro il callback
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
      askAsValet(`Ho annotato tutto: ${currentBrand} ${currentModel}, targata ${currentPlate}. Salvo e metto in garage?`, null);
    }
  };

  useEffect(() => {
    const cleanup = registerActionHandler((nlpResult: NlpResponse) => {
      if (!nlpResult || !nlpResult.utterance) return;

      const rawText = nlpResult.utterance.trim();
      const lowerText = rawText.toLowerCase().replace(/[.,!?]/g, '').trim();
      const current = formRef.current;

      // --- 1. ANNULLAMENTO ---
      const isCancel = /^(annulla|cancella|stop|reset|lascia stare)/i.test(lowerText) || 
                       nlpResult.intent === 'intent.cancel';
      if (isCancel) {
        actions.resetForm();
        setWaitingFor(null);
        speakOnly("Nessun problema, operazione annullata. Le chiavi restano a te!");
        return;
      }

      const isFormComplete = !!(current.brand && current.model && current.plate);

      // --- 2. SE IL FORM È COMPLETO E L'UTENTE RISPONDE ALLA DOMANDA DI CONFERMA ---
      if (isFormComplete) {
        // Controlla se l'utente vuole esplicitamente correggere qualcosa (es. "no il modello è...", "cambia marca")
        const isExplicitModification = /^(no|cambia|modifica|sbagliato|invece)/i.test(lowerText) ||
                                       nlpResult.intent.startsWith('intent.modify_');

        // Se non è una correzione, qualsiasi risposta ("sì", "si salva", "ok", "confermo", "salva", "va bene") SALVA L'AUTO
        if (!isExplicitModification) {
          const success = actions.performSave();
          if (success) {
            speakOnly("Perfetto! Auto parcheggiata con successo nel garage.");
            setWaitingFor(null);
          } else {
            speakOnly("C'è un errore nella targa salvata. Puoi dettarmela di nuovo?");
            setWaitingFor('plate');
          }
          return;
        }
      }

      // --- 3. ESTRAZIONE DATI DAL DISCORSO (Se il form non è ancora completo o l'utente corregge) ---
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

      // --- 4. PASSO SUCCESSIVO NELLA CONVERSAZIONE ---
      evaluateNextStep(updatedBrand, updatedModel, updatedPlate);
    });

    return cleanup;
  }, [registerActionHandler, catalog, actions]);

  return { waitingFor };
}