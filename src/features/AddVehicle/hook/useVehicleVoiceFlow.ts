// hook/useVehicleVoiceFlow.ts
import { useState, useEffect } from 'react';
import { useSpeechAction } from './useSpeechAction';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';

interface VoiceFlowProps {
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
  };
}

// Estendiamo i possibili stati di attesa
type WaitState = 'brand' | 'confirm_brand' | 'model' | 'confirm_model' | 'plate' | 'confirm_save' | null;

export function useVehicleVoiceFlow({ catalog, form, actions }: VoiceFlowProps) {
  const [waitingFor, setWaitingFor] = useState<WaitState>(null);
  
  // Stato temporaneo per salvare la stringa "non riconosciuta" in attesa di conferma
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  
  const { registerActionHandler } = useVoiceContext();
  const { speakAndListen, speakOnly } = useSpeechAction();

  const askAndListen = (question: string, expectedField: WaitState) => {
    setWaitingFor(expectedField);
    speakAndListen(question);
  };

  useEffect(() => {
    const cleanup = registerActionHandler((nlpResult) => {
      const rawAnswer = nlpResult.utterance.toLowerCase();
      
      // Helper per capire se l'utente sta dicendo "Sì"
      const isConfirm = nlpResult.intent === 'intent.confirm' || rawAnswer.match(/\b(si|sì|ok|certo|procedi|corretto|esatto)\b/);
      // Helper per capire se l'utente sta dicendo "No"
      const isCancel = nlpResult.intent === 'intent.cancel' || rawAnswer.match(/\b(no|annulla|sbagliato|errato)\b/);

      // =======================================================
      // CASO A: Slot Filling (Stiamo aspettando una risposta)
      // =======================================================
      if (waitingFor) {
        
        // --- BRAND ---
        if (waitingFor === 'brand') {
          const matchedBrand = catalog.brands.find(b => rawAnswer.includes(b.toLowerCase()));
          if (matchedBrand) {
            actions.setBrand(matchedBrand);
            askAndListen(`Ok, ${matchedBrand}. Che modello è?`, 'model');
          } else {
            // NOVITÀ: Salviamo quello che abbiamo sentito e chiediamo conferma
            setPendingValue(nlpResult.utterance);
            askAndListen(`Non ho questa marca a listino, ma ho capito "${nlpResult.utterance}". È corretto?`, 'confirm_brand');
          }
          return;
        }

        // --- CONFERMA BRAND OUT-OF-CATALOG ---
        if (waitingFor === 'confirm_brand') {
          if (isConfirm && pendingValue) {
            actions.setBrand(pendingValue);
            setPendingValue(null); // Puliamo la memoria
            askAndListen("Perfetto, l'ho aggiunta. Che modello è?", 'model');
          } else if (isCancel) {
            setPendingValue(null);
            askAndListen("Scusa, puoi ripetere la marca?", 'brand');
          } else {
            askAndListen(`Non ho capito. È corretta la marca "${pendingValue}"? Rispondi sì o no.`, 'confirm_brand');
          }
          return;
        }

        // --- MODEL ---
        if (waitingFor === 'model') {
          const availableModels = form.brand ? catalog.getModelsForBrand(form.brand) : [];
          const sortedModels = [...availableModels].sort((a, b) => b.length - a.length);
          const matchedModel = sortedModels.find(m => rawAnswer.includes(m.toLowerCase()));
          
          if (matchedModel) {
            actions.setModel(matchedModel);
            askAndListen("Ottimo. E qual è la targa?", 'plate');
          } else {
            // NOVITÀ: Salviamo il modello sconosciuto e chiediamo conferma
            setPendingValue(nlpResult.utterance);
            askAndListen(`Non ho trovato questo modello, ma ho capito "${nlpResult.utterance}". Confermi?`, 'confirm_model');
          }
          return;
        }

        // --- CONFERMA MODEL OUT-OF-CATALOG ---
        if (waitingFor === 'confirm_model') {
          if (isConfirm && pendingValue) {
            actions.setModel(pendingValue);
            setPendingValue(null);
            askAndListen("Aggiunto. E qual è la targa?", 'plate');
          } else if (isCancel) {
            setPendingValue(null);
            askAndListen("D'accordo, puoi ripetere il modello?", 'model');
          } else {
            askAndListen(`Rispondi sì o no. Vuoi inserire il modello "${pendingValue}"?`, 'confirm_model');
          }
          return;
        }

        // --- PLATE ---
        if (waitingFor === 'plate') {
          const rawUtteranceCleaned = nlpResult.utterance.replace(/[\s\-\.,]/g, '').toUpperCase();
          const plateMatch = rawUtteranceCleaned.match(/[A-Z]{2}\d{3}[A-Z]{2}/);

          if (plateMatch) {
            actions.setPlate(plateMatch[0]);
            askAndListen("Perfetto, ho tutti i dati. Vuoi che proceda al salvataggio?", 'confirm_save');
          } else {
            askAndListen("Non ho capito la targa, pronunciala di nuovo scandendo le lettere.", 'plate');
          }
          return; 
        }

        // --- CONFIRM SAVE ---
        if (waitingFor === 'confirm_save') {
          if (isConfirm) {
            setWaitingFor(null);
            const success = actions.performSave();
            if (success) {
              speakOnly("Veicolo salvato nel garage. Ti porto al riepilogo.");
            } else {
               speakOnly("C'è un errore nei dati, controlla lo schermo per favore.");
            }
          } 
          else if (isCancel) {
            setWaitingFor(null);
            speakOnly("Ok, salvataggio annullato.");
          } 
          else {
            askAndListen("Non ho capito. Vuoi salvare il veicolo? Rispondi sì o no.", 'confirm_save');
          }
          return;
        }
      }

      // =======================================================
      // CASO B: Comando generico iniziale (Nessuna modifica necessaria qui)
      // =======================================================
      if (nlpResult.intent === 'intent.add_vehicle') {
        let foundBrand = form.brand;
        let foundModel = form.model;

        const rawUtteranceCleaned = nlpResult.utterance.replace(/[\s\-\.,]/g, '').toUpperCase();
        const plateMatch = rawUtteranceCleaned.match(/[A-Z]{2}\d{3}[A-Z]{2}/);
        let extractedPlate = plateMatch ? plateMatch[0] : null;
        
        if (extractedPlate) actions.setPlate(extractedPlate);

        const catalogBrand = catalog.brands.find(b => rawAnswer.includes(b.toLowerCase()));
        if (catalogBrand) {
          foundBrand = catalogBrand;
          actions.setBrand(foundBrand);

          const catalogModels = catalog.getModelsForBrand(catalogBrand);
          const sortedModels = [...catalogModels].sort((a, b) => b.length - a.length);
          const catalogModel = sortedModels.find(m => rawAnswer.includes(m.toLowerCase()));

          if (catalogModel) {
            foundModel = catalogModel;
            actions.setModel(foundModel);
          }
        } else {
          const nlpBrand = nlpResult.entities.find(e => e.entity === 'brand')?.sourceText;
          if (nlpBrand) {
            foundBrand = nlpBrand;
            actions.setBrand(foundBrand);
          }
        }

        if (!foundBrand) {
          askAndListen("Qual è la marca del veicolo?", 'brand');
        } 
        else if (foundBrand && !foundModel) {
          askAndListen(`Ok, ${foundBrand}. Che modello è esattamente?`, 'model');
        } 
        else if (foundBrand && foundModel && (!extractedPlate && !form.plate)) {
          askAndListen(`Ok per ${foundBrand} ${foundModel}. Qual è la targa?`, 'plate');
        }
        else if (foundBrand && foundModel && (extractedPlate || form.plate)) {
          askAndListen(`Ho tutto: ${foundBrand} ${foundModel} con targa ${extractedPlate || form.plate}. Vuoi salvare?`, 'confirm_save');
        }
      }
    });

    return cleanup;
  }, [
    registerActionHandler, waitingFor, pendingValue, catalog, form, actions, askAndListen, speakOnly
  ]);

  return { waitingFor };
}