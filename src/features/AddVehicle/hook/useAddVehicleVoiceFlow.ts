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

  // Indice globale per Fuzzy Match
  const globalFuse = useMemo(() => {
    const entries: { brand: string; model: string; type: 'brand' | 'model'; searchKey: string }[] = [];
    catalog.brands.forEach(brand => {
      entries.push({ brand, model: '', type: 'brand', searchKey: brand });
      catalog.getModelsForBrand(brand).forEach(model => {
        entries.push({ brand, model, type: 'model', searchKey: model });
        entries.push({ brand, model, type: 'model', searchKey: `${brand} ${model}` });
      });
    });
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
    const { actions, form, step, candidateValue } = ref.current;
    
    if (step === 'CONFIRM_UNKNOWN_MODEL') {
       actions.setModel(candidateValue);
       return promptUser(`Ottimo, modello salvato come ${candidateValue}. Qual è la targa?`, 'WAITING_PLATE');
    }
    if (step === 'CONFIRM_UNKNOWN_BRAND') {
       actions.setBrand(candidateValue);
       return promptUser(`Perfetto, marca salvata come ${candidateValue}. Qual è il modello?`, 'WAITING_MODEL');
    }
    if (step === 'WAITING_CONFIRM') {
      if (actions.performSave()) {
        speakOnly("Veicolo salvato con successo!");
        setStep('IDLE');
      } else {
        promptUser("Dati incompleti. Qual è la marca?", 'WAITING_BRAND');
      }
      return;
    }
    if (step === 'WAITING_PLATE') {
      if (form.plate) {
        if (actions.performSave()) {
          speakOnly("Veicolo salvato con successo!");
          setStep('IDLE');
        } else {
          promptUser("Mancano alcuni dati. Dimmi la marca.", 'WAITING_BRAND');
        }
      } else {
        promptUser("Manca la targa del veicolo. Dimmi la targa.", 'WAITING_PLATE');
      }
      return;
    }
    
    promptUser("Non ho capito cosa confermare. Come posso aiutarti?", step);
  };

  const handleFillOrCorrect = (entities: VoiceEntities) => {
    const { form, actions, step, globalFuse } = ref.current;
    const { targetField, extractedText, plate } = entities;
    const query = extractedText || '';

    // 0. Fallback se input vuoto
    if (!query && !plate) {
       if (step === 'WAITING_BRAND') return promptUser("Qual è la marca del veicolo?", 'WAITING_BRAND');
       if (step === 'WAITING_MODEL') return promptUser(`Qual è il modello della tua ${form.brand || 'auto'}?`, 'WAITING_MODEL');
       if (step === 'WAITING_PLATE') return promptUser("Qual è la targa?", 'WAITING_PLATE');
       return promptUser("Puoi ripetere?", step);
    }

    // 1. Targa Assoluta / Rilevata
    if (plate || targetField === 'plate') {
      const finalPlate = plate || query.replace(/\s/g, '').toUpperCase();
      if (finalPlate) {
        actions.setPlate(finalPlate);
        return promptUser(`Targa ${finalPlate} acquisita. Salvo il veicolo nel garage?`, 'WAITING_CONFIRM');
      }
    }

    // 2. Correzione Esplicita MARCA (con filtro strict type === 'brand')
    if (targetField === 'brand' && query) {
       const searchResults = globalFuse.search(query).filter(res => res.item.type === 'brand');
       const bestMatch = searchResults[0]?.item;
       const score = searchResults[0]?.score ?? 1;
       
       if (bestMatch && score <= 0.3) {
          actions.setBrand(bestMatch.brand);
          actions.setModel(''); 
          return promptUser(`Marca corretta in ${bestMatch.brand}. Dimmi il modello.`, 'WAITING_MODEL');
       } else {
          setCandidateValue(query);
          return promptUser(`Non conosco la marca "${query}". Confermi di volerla usare?`, 'CONFIRM_UNKNOWN_BRAND');
       }
    }

    // 3. Correzione Esplicita MODELLO (con filtro strict type === 'model')
    if (targetField === 'model' && query) {
       const searchResults = globalFuse.search(query).filter(res => res.item.type === 'model');
       const bestMatch = searchResults[0]?.item;
       const score = searchResults[0]?.score ?? 1;

       if (bestMatch && score <= 0.25) {
          actions.setBrand(bestMatch.brand); 
          actions.setModel(bestMatch.model);
          return promptUser(`Modello aggiornato a ${bestMatch.brand} ${bestMatch.model}. Qual è la targa?`, 'WAITING_PLATE');
       } else {
          setCandidateValue(query);
          return promptUser(`Non ho trovato "${query}" in archivio. Confermi che il modello è "${query}"?`, 'CONFIRM_UNKNOWN_MODEL');
       }
    }

    // 4. Input generico in base allo STEP corrente
    if (step === 'WAITING_BRAND' && query) {
       const searchResults = globalFuse.search(query).filter(res => res.item.type === 'brand');
       const bestMatch = searchResults[0]?.item;
       const score = searchResults[0]?.score ?? 1;

       if (bestMatch && score <= 0.35) {
          actions.setBrand(bestMatch.brand);
          actions.setModel('');
          return promptUser(`Marca impostata su ${bestMatch.brand}. Qual è il modello?`, 'WAITING_MODEL');
       } else {
          setCandidateValue(query);
          return promptUser(`Non ho trovato "${query}" nel listino marchi. Confermi che è la marca dell'auto?`, 'CONFIRM_UNKNOWN_BRAND');
       }
    }

    if (step === 'WAITING_MODEL' && query) {
       const searchResults = globalFuse.search(query).filter(res => res.item.type === 'model');
       const bestMatch = searchResults[0]?.item;
       const score = searchResults[0]?.score ?? 1;

       if (bestMatch && score <= 0.35) {
          actions.setModel(bestMatch.model);
          if (!form.brand) actions.setBrand(bestMatch.brand);
          return promptUser(`Ho impostato il modello ${bestMatch.model}. Dimmi la targa.`, 'WAITING_PLATE');
       } else {
          setCandidateValue(query);
          return promptUser(`Non ho trovato il modello "${query}" in listino. Confermi che è corretto per la tua ${form.brand || 'auto'}?`, 'CONFIRM_UNKNOWN_MODEL');
       }
    }

    if (step === 'WAITING_PLATE' && query) {
       const formattedPlate = query.replace(/\s/g, '').toUpperCase();
       actions.setPlate(formattedPlate);
       return promptUser(`Targa impostata su ${formattedPlate}. Procedo con il salvataggio?`, 'WAITING_CONFIRM');
    }

    // 5. Ricerca Globale Fallback (Es: "Aggiungi una Fiat Swang" o "Aggiungi Panda")
    if (query) {
      const bestMatch = globalFuse.search(query)[0]?.item;
      const score = globalFuse.search(query)[0]?.score ?? 1;

      if (bestMatch && score <= 0.4) {
        if (bestMatch.type === 'model') {
          actions.setBrand(bestMatch.brand);
          actions.setModel(bestMatch.model);
          return promptUser(`Ho impostato ${bestMatch.brand} ${bestMatch.model}. Qual è la targa?`, 'WAITING_PLATE');
        }
        
        if (bestMatch.type === 'brand') {
          actions.setBrand(bestMatch.brand);
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
        // Intera frase sconosciuta
        if (!form.brand) {
           setCandidateValue(query);
           return promptUser(`Non ho trovato "${query}" in listino. Confermi che è la marca dell'auto?`, 'CONFIRM_UNKNOWN_BRAND');
        } else if (!form.model) {
           setCandidateValue(query);
           return promptUser(`Non conosco il modello "${query}". Confermi che è il modello per la tua ${form.brand}?`, 'CONFIRM_UNKNOWN_MODEL');
        }
      }
    }

    return promptUser("Scusa, non ho capito bene. Puoi ripetere?", step);
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
          handleFillOrCorrect(result.entities);
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