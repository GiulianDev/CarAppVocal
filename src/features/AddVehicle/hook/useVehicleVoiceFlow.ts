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
    performSave: () => boolean; // Modificato per restituire un booleano (success/fail)
  };
}

export function useVehicleVoiceFlow({ catalog, form, actions }: VoiceFlowProps) {
  const [waitingFor, setWaitingFor] = useState<'brand' | 'model' | 'plate' | 'confirm_save' | null>(null);
  
  const { registerActionHandler } = useVoiceContext();
  const { speakAndListen, speakOnly } = useSpeechAction();

  // Combina l'impostazione dello stato con l'azione vocale
  const askAndListen = (question: string, expectedField: 'brand' | 'model' | 'plate' | 'confirm_save') => {
    setWaitingFor(expectedField);
    speakAndListen(question);
  };

  useEffect(() => {
    const cleanup = registerActionHandler((nlpResult) => {
      const rawAnswer = nlpResult.utterance.toLowerCase();

      // =======================================================
      // CASO A: Slot Filling (Stiamo aspettando una risposta specifica)
      // =======================================================
      if (waitingFor) {
        
        // --- BRAND ---
        if (waitingFor === 'brand') {
          const matchedBrand = catalog.brands.find(b => rawAnswer.includes(b.toLowerCase()));
          if (matchedBrand) {
            actions.setBrand(matchedBrand);
            askAndListen(`Ok, ${matchedBrand}. Che modello è?`, 'model');
          } else {
            askAndListen("Non ho trovato questa marca. Puoi ripeterla?", 'brand');
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
            askAndListen("Non ho capito il modello. Puoi ripeterlo?", 'model');
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
          if (nlpResult.intent === 'intent.confirm' || rawAnswer.match(/\b(si|sì|ok|certo|procedi)\b/)) {
            setWaitingFor(null);
            const success = actions.performSave();
            if (success) {
              speakOnly("Veicolo salvato nel garage. Ti porto al riepilogo.");
            } else {
               speakOnly("C'è un errore nei dati, controlla lo schermo per favore.");
            }
          } 
          else if (nlpResult.intent === 'intent.cancel' || rawAnswer.match(/\b(no|annulla|fermati)\b/)) {
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
      // CASO B: Comando generico inziale
      // =======================================================
      if (nlpResult.intent === 'intent.add_vehicle') {
        let foundBrand = form.brand;
        let foundModel = form.model;

        // 1. Estrazione Targa
        const rawUtteranceCleaned = nlpResult.utterance.replace(/[\s\-\.,]/g, '').toUpperCase();
        const plateMatch = rawUtteranceCleaned.match(/[A-Z]{2}\d{3}[A-Z]{2}/);
        let extractedPlate = plateMatch ? plateMatch[0] : null;
        
        if (extractedPlate) actions.setPlate(extractedPlate);

        // 2. Ricerca Marca
        const catalogBrand = catalog.brands.find(b => rawAnswer.includes(b.toLowerCase()));
        if (catalogBrand) {
          foundBrand = catalogBrand;
          actions.setBrand(foundBrand);

          // 3. Ricerca Modello
          const catalogModels = catalog.getModelsForBrand(catalogBrand);
          const sortedModels = [...catalogModels].sort((a, b) => b.length - a.length);
          const catalogModel = sortedModels.find(m => rawAnswer.includes(m.toLowerCase()));

          if (catalogModel) {
            foundModel = catalogModel;
            actions.setModel(foundModel);
          }
        } else {
          // Fallback NLP NER
          const nlpBrand = nlpResult.entities.find(e => e.entity === 'brand')?.sourceText;
          if (nlpBrand) {
            foundBrand = nlpBrand;
            actions.setBrand(foundBrand);
          }
        }

        // 4. Intelligenza / Slot Filling
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
    registerActionHandler, waitingFor, catalog, form, actions, askAndListen, speakOnly
  ]);

  return { waitingFor };
}