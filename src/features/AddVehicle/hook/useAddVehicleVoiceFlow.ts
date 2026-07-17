// src/features/vehicles/hooks/useAddVehicleVoiceFlow.ts
import { useState, useEffect, useRef } from 'react';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';

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

type WaitState = 'brand' | 'model' | 'plate' | 'confirm_save' | null;

// Helper: Distanza di Levenshtein (misura quanto due stringhe sono simili)
const levenshtein = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
};

// Helper: Ricerca Parola Esatta (evita che la 'g' di 'aggiungi' diventi il modello 'G')
const exactMatch = (text: string, search: string) => {
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
};

export function useAddVehicleVoiceFlow({ catalog, form, actions }: AddVehicleVoiceFlowProps) {
  const [waitingFor, setWaitingFor] = useState<WaitState>(null);
  const { registerActionHandler } = useVoiceContext();
  const { speakAndListen, speakOnly } = useSpeechAction();

  const latestPropsRef = useRef({ catalog, form, actions, waitingFor });
  
  useEffect(() => {
    latestPropsRef.current = { catalog, form, actions, waitingFor };
  });

  const askAndListen = (question: string, expectedField: WaitState = null) => {
    console.log(`🔊 [VoiceFlow - TTS] TTS pronuncia: "${question}"`);
    console.log(`⏳ [VoiceFlow - State] Stato d'attesa impostato su: [${expectedField || 'Nessuno'}]`);
    setWaitingFor(expectedField);
    speakAndListen(question);
  };

  useEffect(() => {
    console.log("🎙️ [VoiceFlow] Sottoscrizione Handler Vocale Unico.");
    
    const cleanup = registerActionHandler((nlpResult) => {
      const { catalog: currentCatalog, form: currentForm, actions: currentActions, waitingFor: currentWaitingFor } = latestPropsRef.current;

      const rawAnswer = nlpResult.utterance.toLowerCase();
      const cleanAnswer = rawAnswer.replace(/[.,!?]/g, '').trim();
      const wordsArray = cleanAnswer.split(/\s+/);

      // =======================================================
      // 🔥 SHIELD: BLINDATURA INTELLIGENTE DEGLI INTENTI GLOBALI
      // =======================================================
      let activeIntent = nlpResult.intent;
      
      // Controllo se c'è un'esplicita volontà di scappare dal form
      const abortWords = ['annulla', 'fermati', 'basta', 'esci', 'interrompi', 'garage'];
      const isExplicitAbort = abortWords.some(w => wordsArray.includes(w)) || 
                              (wordsArray.includes('no') && wordsArray.includes('basta')) ||
                              (wordsArray.includes('vai') && wordsArray.includes('garage'));

      const globalNavigationIntents = ['intent.garage', 'intent.calendar_all', 'intent.view_event'];
      
      if (currentWaitingFor !== null && globalNavigationIntents.includes(activeIntent)) {
         if (isExplicitAbort) {
            console.log('🛑 [Intent Shield] Abort esplicito o navigazione forzata. Permetto l\'azione.');
            setWaitingFor(null);
            currentActions.resetForm();
            // Ritorna qui per lasciare che VoiceContext gestisca la navigazione globale verso il garage
            return; 
         } else {
            console.warn(`🛡️ [Intent Shield] Falso positivo di navigazione ("${activeIntent}"). Lo blocco e tratto come testo.`);
            activeIntent = 'none'; 
            nlpResult.intent = 'none'; // Soppressione totale per il dispatcher genitore
         }
      }

      console.group('🔄 [VoiceFlow] Inizio elaborazione handler locale stabilizzato');
      console.log(`📌 Stato d'attesa al momento dell'ascolto: [${currentWaitingFor}]`);
      console.log(`🎯 Intento filtrato: [${activeIntent}]`);

      // FASE 0: GLOBAL ABORT PURO (Senza intenti di navigazione)
      if (isExplicitAbort && activeIntent === 'none') {
        console.log('🛑 [Fase 0] Annullamento globale locale richiesto.');
        setWaitingFor(null);
        currentActions.resetForm();
        speakOnly("D'accordo, operazione annullata.");
        console.groupEnd();
        return; 
      }

      const isConfirm = activeIntent === 'intent.confirm' || ['si', 'sì', 'ok', 'certo', 'confermo', 'esatto'].some(w => wordsArray.includes(w));
      const isCancel = activeIntent === 'intent.cancel' || ['no', 'sbagliato'].some(w => wordsArray.includes(w));

      let foundPlate = currentForm.plate;
      let foundBrand = currentForm.brand;
      let foundModel = currentForm.model;

      // =======================================================
      // FASE 1: CORREZIONI E BACKTRACK INTELLIGENTE
      // =======================================================
      if (isCancel || cleanAnswer.includes('modifica')) {
          console.log('🛠️ [Fase 1] Rilevata intenzione di correzione o smentita.');
          if (cleanAnswer.includes('targa')) { foundPlate = ''; currentActions.setPlate(''); }
          else if (cleanAnswer.includes('marca')) { foundBrand = ''; currentActions.setBrand(''); foundModel = ''; currentActions.setModel(''); }
          else if (cleanAnswer.includes('modello')) { foundModel = ''; currentActions.setModel(''); }
          else {
            if (currentWaitingFor === 'plate') { foundModel = ''; currentActions.setModel(''); } 
            else if (currentWaitingFor === 'model') { foundBrand = ''; currentActions.setBrand(''); }
          }
      }

      // =======================================================
      // FASE 2: ESTRAZIONE DATI SMART (Exact Match + Fuzzy Match)
      // =======================================================
      console.log('🔍 [Fase 2] Estrazione Dati Intelligente...');
      
      const plateMatch = nlpResult.utterance.replace(/[\s\-\.,]/g, '').toUpperCase().match(/[A-Z]{2}\d{3}[A-Z]{2}/);
      if (plateMatch) { 
        foundPlate = plateMatch[0]; 
        currentActions.setPlate(foundPlate); 
      }

      // Ricerca Marca (Parola intera)
      const nlpBrand = nlpResult.entities?.find((e: any) => e.entity === 'brand')?.sourceText;
      if (nlpBrand) {
        foundBrand = nlpBrand;
        currentActions.setBrand(foundBrand);
      } else {
        const catalogBrand = currentCatalog.brands.find(b => exactMatch(cleanAnswer, b));
        if (catalogBrand) { 
          foundBrand = catalogBrand; 
          currentActions.setBrand(foundBrand); 
        }
      }

      // Smart Clean
      if (foundBrand !== currentForm.brand && foundModel && foundBrand) {
        const validModelsForNewBrand = currentCatalog.getModelsForBrand(foundBrand).map(m => m.toLowerCase());
        if (!validModelsForNewBrand.includes(foundModel.toLowerCase())) {
           foundModel = '';
           currentActions.setModel('');
        }
      }

      // Ricerca Modello (Exact Match + Fuzzy Match)
      const nlpModel = nlpResult.entities?.find((e: any) => e.entity === 'model')?.sourceText;
      if (nlpModel) {
        foundModel = nlpModel;
        currentActions.setModel(foundModel);
      } else {
        // Prepariamo la lista dei modelli in cui cercare
        const modelsToSearch = foundBrand 
            ? currentCatalog.getModelsForBrand(foundBrand) 
            : currentCatalog.brands.flatMap(b => currentCatalog.getModelsForBrand(b));

        // 1. Prova Exact Match (con word boundaries)
        let catalogModel = modelsToSearch.find(m => exactMatch(cleanAnswer, m));

        // 2. Prova Fuzzy Match se non trova quello esatto (La magia Banda -> Panda)
        if (!catalogModel) {
            for (const m of modelsToSearch) {
                const mLower = m.toLowerCase();
                // Controllo solo modelli a parola singola lunghi almeno 4 caratteri
                if (!mLower.includes(' ') && mLower.length >= 4) {
                    for (const w of wordsArray) {
                        // Se la parola ha una lunghezza simile al modello (+/- 1 carattere)
                        if (w.length >= 4 && Math.abs(w.length - mLower.length) <= 1) {
                            if (levenshtein(w, mLower) <= 1) {
                                catalogModel = m;
                                console.log(`🪄 [Fuzzy Match] Parola "${w}" corretta automaticamente in "${m}"`);
                                break;
                            }
                        }
                    }
                }
                if (catalogModel) break;
            }
        }

        if (catalogModel) {
            foundModel = catalogModel;
            currentActions.setModel(catalogModel);
            // Se eravamo senza marca, inferiamo la marca dal modello trovato
            if (!foundBrand) {
                const inferredBrand = currentCatalog.brands.find(b => 
                    currentCatalog.getModelsForBrand(b).includes(catalogModel as string)
                );
                if (inferredBrand) {
                    console.log(`🧠 [Smart Match] Inferita la marca automatica: "${inferredBrand}" dal modello "${catalogModel}"`);
                    foundBrand = inferredBrand;
                    currentActions.setBrand(inferredBrand);
                }
            }
        }
      }

      // =======================================================
      // FASE 3: ASSEGNAZIONE DI CONTESTO (Fallback)
      // =======================================================
      const stopWords = ['aggiungi', 'inserisci', 'metti', 'la', 'una', 'un', 'il', 'lo', 'gli', 'le', 'è', 'di', 'no', 'scusa', 'nuova', 'scritto', 'con', 'come', 'hai', 'capito', 'vai', 'al', 'garage'];
      const filteredWords = wordsArray.filter(w => !stopWords.includes(w) && w !== foundBrand?.toLowerCase());
      const cleanContext = filteredWords.join(' ').trim();

      if (filteredWords.length > 0 && filteredWords.length <= 4 && !isCancel && !isConfirm) {
          if (currentWaitingFor === 'brand' && !foundBrand && cleanContext) { 
            foundBrand = cleanContext.charAt(0).toUpperCase() + cleanContext.slice(1); 
            currentActions.setBrand(foundBrand); 
          }
          else if (currentWaitingFor === 'model' && !foundModel && cleanContext) { 
            foundModel = cleanContext.charAt(0).toUpperCase() + cleanContext.slice(1); 
            currentActions.setModel(foundModel); 
          }
      }

      // =======================================================
      // FASE 4: NAVIGAZIONE MACCHINA A STATI
      // =======================================================
      console.log('🧭 [Fase 4] Avanzamento logica conversazionale...');
      
      if (currentWaitingFor === 'confirm_save') {
        if (isConfirm) { 
          currentActions.performSave(); 
          speakOnly("Veicolo salvato."); 
          setWaitingFor(null);
        }
        else if (isCancel) { 
          setWaitingFor(null); 
          speakOnly("Salvataggio annullato."); 
        }
        else { 
          askAndListen("Scusami, non ho capito. Vuoi salvare il veicolo?", 'confirm_save'); 
        }
        console.groupEnd();
        return;
      }

      if (!foundBrand) {
        askAndListen("Qual è la marca del veicolo?", 'brand');
      }
      else if (!foundModel) {
        askAndListen(`Ok, ${foundBrand}. Che modello è?`, 'model');
      }
      else if (!foundPlate) {
        askAndListen(`Perfetto, ${foundBrand} ${foundModel}. Qual è la targa?`, 'plate');
      }
      else {
        askAndListen(`Ho tutto: ${foundBrand} ${foundModel}, targa ${foundPlate}. Salvo?`, 'confirm_save');
      }

      console.groupEnd();
    });

    return () => {
      cleanup();
      console.log("🎙️ [VoiceFlow] Rimozione Handler Vocale (Smontaggio componente).");
    };
  }, [registerActionHandler]);

  return { waitingFor };
}