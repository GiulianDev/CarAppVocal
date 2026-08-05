import { useState, useEffect, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import type { VoiceAnalysisResult, VoiceEntities } from '../../../shared/VoiceCommand/types';

export type Step = 
  | 'IDLE' 
  | 'WAITING_BRAND' 
  | 'WAITING_MODEL' 
  | 'WAITING_PLATE' 
  | 'WAITING_CONFIRM'
  | 'CONFIRM_UNKNOWN_BRAND'
  | 'CONFIRM_UNKNOWN_MODEL';

interface VoiceFlowProps {
  catalog: { brands: string[]; getModelsForBrand: (brand: string) => string[]; };
  form: { plate: string; brand: string; model: string };
  actions: {
    setPlate: (val: string) => void; 
    setBrand: (val: string) => void;
    setModel: (val: string) => void; 
    performSave: () => boolean; 
    resetForm: () => void;
  };
}

export function useAddVehicleVoiceFlow({ catalog, form, actions }: VoiceFlowProps) {
  const [step, setStep] = useState<Step>('IDLE');
  const [candidateValue, setCandidateValue] = useState<string>(''); // Memorizza il valore ignoto in attesa di conferma

  const { registerActionHandler } = useVoiceContext();
  const { speakAndListen, speakOnly } = useSpeechAction();

  const globalFuse = useMemo(() => {
    const entries: { brand: string; model: string; type: 'brand' | 'model'; searchKey: string }[] = [];
    catalog.brands.forEach(brand => {
      entries.push({ brand, model: '', type: 'brand', searchKey: brand });
      catalog.getModelsForBrand(brand).forEach(model => {
        entries.push({ brand, model, type: 'model', searchKey: model });
        entries.push({ brand, model, type: 'model', searchKey: `${brand} ${model}` });
      });
    });
    // Threshold alzato a 0.4 per essere più permissivi con il catalogo, oltre il 0.4 è considerato "sconosciuto"
    return new Fuse(entries, { keys: ['searchKey'], threshold: 0.4, includeScore: true });
  }, [catalog]);

  const ref = useRef({ form, actions, step, candidateValue, globalFuse });
  useEffect(() => { ref.current = { form, actions, step, candidateValue, globalFuse }; });

  const promptUser = (text: string, nextStep: Step) => {
    console.log(`🚗 [VoiceFlow] 🔄 [${ref.current.step}] ➔ [${nextStep}] | 🗣️ "${text}"`);
    setStep(nextStep);
    speakAndListen(text);
  };

  const handleCancel = () => {
    const { step } = ref.current;
    if (step === 'CONFIRM_UNKNOWN_MODEL') {
       return promptUser("Ok, nessun problema. Dimmi il nome corretto del modello.", 'WAITING_MODEL');
    }
    if (step === 'CONFIRM_UNKNOWN_BRAND') {
       return promptUser("Ok, riproviamo. Qual è la marca corretta?", 'WAITING_BRAND');
    }
    
    ref.current.actions.resetForm();
    setStep('IDLE');
    speakOnly("Operazione annullata.");
  };

  const handleConfirm = () => {
    const { actions, step, candidateValue } = ref.current;
    
    if (step === 'CONFIRM_UNKNOWN_MODEL') {
       actions.setModel(candidateValue);
       return promptUser(`Ottimo, modello salvato come ${candidateValue}. Qual è la targa?`, 'WAITING_PLATE');
    }
    if (step === 'CONFIRM_UNKNOWN_BRAND') {
       actions.setBrand(candidateValue);
       return promptUser(`Perfetto, marca salvata come ${candidateValue}. Qual è il modello?`, 'WAITING_MODEL');
    }
    if (step === 'WAITING_CONFIRM' || step === 'WAITING_PLATE') {
      if (actions.performSave()) {
        speakOnly("Veicolo salvato con successo!");
        setStep('IDLE');
      } else {
        promptUser("Dati incompleti. Qual è la marca?", 'WAITING_BRAND');
      }
    } else {
      promptUser("Non ho capito cosa confermare. In che step ti posso aiutare?", step);
    }
  };

  const handleFillOrCorrect = (entities: VoiceEntities, intent: string) => {
    const { form, actions, step, globalFuse } = ref.current;
    const { targetField, extractedText, plate } = entities;
    const query = extractedText || '';

    // 0. Fallback vuoto
    if (!query && !plate) {
       if (step === 'WAITING_BRAND') return promptUser("Qual è la marca del veicolo?", 'WAITING_BRAND');
       if (step === 'WAITING_MODEL') return promptUser(`Qual è il modello della tua ${form.brand || 'auto'}?`, 'WAITING_MODEL');
       if (step === 'WAITING_PLATE') return promptUser("Qual è la targa?", 'WAITING_PLATE');
       return promptUser("Puoi ripetere?", step);
    }

    // 1. Targa Assoluta
    if (plate || targetField === 'plate') {
      const finalPlate = plate || query.replace(/\s/g, '').toUpperCase();
      if (finalPlate) {
        actions.setPlate(finalPlate);
        return promptUser(`Targa ${finalPlate} acquisita. Salvo il veicolo?`, 'WAITING_CONFIRM');
      }
    }

    // 2. Correzione Esplicita ("No il modello è Sweng")
    if (targetField === 'model' && query) {
       const searchResults = globalFuse.search(query);
       const bestMatch = searchResults[0]?.item;
       const score = searchResults[0]?.score ?? 1;

       // Se è un match perfetto, lo accetta a occhi chiusi
       if (bestMatch && bestMatch.type === 'model' && score <= 0.25) {
          actions.setBrand(bestMatch.brand); 
          actions.setModel(bestMatch.model);
          return promptUser(`Modello aggiornato a ${bestMatch.brand} ${bestMatch.model}. Qual è la targa?`, 'WAITING_PLATE');
       } else {
          // Altrimenti, chiede conferma per lo spelling insolito
          setCandidateValue(query);
          return promptUser(`Non ho trovato "${query}" in archivio. Confermi che il modello è "${query}"?`, 'CONFIRM_UNKNOWN_MODEL');
       }
    }

    if (targetField === 'brand' && query) {
       const bestMatch = globalFuse.search(query)[0]?.item;
       const score = globalFuse.search(query)[0]?.score ?? 1;
       
       if (bestMatch && bestMatch.type === 'brand' && score <= 0.3) {
          actions.setBrand(bestMatch.brand);
          actions.setModel(''); 
          return promptUser(`Marca corretta in ${bestMatch.brand}. Dimmi il modello.`, 'WAITING_MODEL');
       } else {
          setCandidateValue(query);
          return promptUser(`Non conosco la marca "${query}". Confermi di volerla usare?`, 'CONFIRM_UNKNOWN_BRAND');
       }
    }

    // 3. Ricerca Globale e "Leftover Extraction" (Es: "Aggiungi una Fiat Swang")
    if (query) {
      const bestMatch = globalFuse.search(query)[0]?.item;
      const score = globalFuse.search(query)[0]?.score ?? 1;

      if (bestMatch && score <= 0.4) {
        if (bestMatch.type === 'model') {
          // Es: "Aggiungi Panda" -> Trova Fiat Panda
          actions.setBrand(bestMatch.brand);
          actions.setModel(bestMatch.model);
          return promptUser(`Ho impostato ${bestMatch.brand} ${bestMatch.model}. Qual è la targa?`, 'WAITING_PLATE');
        }
        
        if (bestMatch.type === 'brand') {
          // Es: "Aggiungi Skoda" oppure "Aggiungi Fiat Swang"
          actions.setBrand(bestMatch.brand);
          
          // Estrae eventuale testo residuo dalla query (es: "fiat swang" -> toglie "fiat" -> "swang")
          const leftover = query.toLowerCase().replace(bestMatch.brand.toLowerCase(), '').trim();
          
          if (leftover) {
             setCandidateValue(leftover);
             return promptUser(`Non conosco il modello "${leftover}". Confermi di volerlo aggiungere alla tua ${bestMatch.brand}?`, 'CONFIRM_UNKNOWN_MODEL');
          } else {
             actions.setModel('');
             return promptUser(`Marca impostata su ${bestMatch.brand}. Qual è il modello?`, 'WAITING_MODEL');
          }
        }
      } else {
        // La stringa non corrisponde a nulla nel catalogo (Es: "Aggiungi una Tesla Cybertruck")
        // Facciamo fallback sullo step corrente, chiedendo conferme specifiche
        if (step === 'WAITING_BRAND' || step === 'IDLE') {
           setCandidateValue(query);
           return promptUser(`Non ho trovato "${query}" in listino. Confermi che è la marca dell'auto?`, 'CONFIRM_UNKNOWN_BRAND');
        }
      }
    }

    // 4. Fallback Progressivo Base
    if (step === 'WAITING_MODEL' && query) {
       setCandidateValue(query);
       return promptUser(`Non sono sicuro del modello "${query}". Confermi che è corretto?`, 'CONFIRM_UNKNOWN_MODEL');
    }
    
    if (!form.brand) return promptUser("Non ho capito. Qual è la marca del veicolo?", 'WAITING_BRAND');
    if (!form.model) return promptUser(`Qual è il modello della tua ${form.brand}?`, 'WAITING_MODEL');
    if (!form.plate) return promptUser(`Dimmi la targa per la ${form.brand} ${form.model}.`, 'WAITING_PLATE');

    return promptUser("Scusa, non ho capito. Puoi ripetere?", step);
  };

  useEffect(() => {
    const unregister = registerActionHandler((result: VoiceAnalysisResult): boolean => {
      console.group(`🚗 [VoiceFlow] Ricevuto Intento: ${result.intent}`);
      console.log(`Dati Entità:`, result.entities);

      switch (result.intent) {
        case 'CANCEL': handleCancel(); break;
        case 'CONFIRM': handleConfirm(); break;
        case 'ADD_VEHICLE':
        case 'FORM_CORRECT_FIELD':
        case 'FORM_FILL_FIELD':
          handleFillOrCorrect(result.entities, result.intent);
          break;
        default:
          promptUser("Scusa, non ho capito. Puoi ripetere?", ref.current.step);
          break;
      }

      console.groupEnd();
      return true;
    });
    return () => unregister();
  }, [registerActionHandler]);

  return { step };
}