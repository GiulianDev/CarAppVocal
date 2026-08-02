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

// Helper: Distanza di Levenshtein per correzioni fonetiche (es. Banda -> Panda)
const levenshtein = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
};

// Helper: Controllo esatto sulle parole isolate
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
      // 🔥 SHIELD: EVENT CONSUMPTION E BLOCCO NAVIGAZIONE
      // =======================================================
      const abortWords = ['annulla', 'fermati', 'basta', 'esci', 'interrompi', 'garage'];
      const isExplicitAbort = abortWords.some(w => wordsArray.includes(w)) || 
                              (wordsArray.includes('no') && wordsArray.includes('basta')) ||
                              (wordsArray.includes('vai') && wordsArray.includes('garage'));

      // Blocchiamo il genitore se siamo in attesa di un dato e non c'è richiesta di annullamento esplicito
      const blockGlobalContext = currentWaitingFor !== null && !isExplicitAbort;

      if (isExplicitAbort) {
        console.log('🛑 [Fase 0] Uscita esplicita. Chiudo il form e lascio il controllo al globale.');
        setWaitingFor(null);
        currentActions.resetForm();
        if (nlpResult.intent === 'none') speakOnly("D'accordo, operazione annullata.");
        
        // Ritorna false in modo che il VoiceContext globale esegua l'intento di navigazione
        return false; 
      }

      if (blockGlobalContext) {
         console.log('🛡️ [Intent Shield] Form attivo: Blocco la propagazione verso il VoiceContext globale.');
         nlpResult.intent = 'none'; // Neutralizza localmente gli intenti di navigazione errati
      }

      console.group('🔄 [VoiceFlow] Inizio elaborazione handler locale stabilizzato');
      console.log(`📌 Stato d'attesa al momento dell'ascolto: [${currentWaitingFor}]`);
      
      const activeIntent = nlpResult.intent;
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

      // Marca
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

      if (foundBrand !== currentForm.brand && foundModel && foundBrand) {
        const validModelsForNewBrand = currentCatalog.getModelsForBrand(foundBrand).map(m => m.toLowerCase());
        if (!validModelsForNewBrand.includes(foundModel.toLowerCase())) {
           foundModel = '';
           currentActions.setModel('');
        }
      }

      // Modello
      const nlpModel = nlpResult.entities?.find((e: any) => e.entity === 'model')?.sourceText;
      if (nlpModel) {
        foundModel = nlpModel;
        currentActions.setModel(foundModel);
      } else {
        const modelsToSearch = foundBrand 
            ? currentCatalog.getModelsForBrand(foundBrand) 
            : currentCatalog.brands.flatMap(b => currentCatalog.getModelsForBrand(b));

        let catalogModel = modelsToSearch.find(m => exactMatch(cleanAnswer, m));

        if (!catalogModel) {
            for (const m of modelsToSearch) {
                const mLower = m.toLowerCase();
                if (!mLower.includes(' ') && mLower.length >= 4) {
                    for (const w of wordsArray) {
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
            if (!foundBrand) {
                const inferredBrand = currentCatalog.brands.find(b => currentCatalog.getModelsForBrand(b).includes(catalogModel as string));
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
        
        // Ritorna il booleano per completare la propagazione in questa fase
        return blockGlobalContext;
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
      
      // 🔥 Ritorna `true` quando il form è attivo, avvisando VoiceContext di fermarsi
      return blockGlobalContext; 
    });

    return () => {
      cleanup();
      console.log("🎙️ [VoiceFlow] Rimozione Handler Vocale (Smontaggio componente).");
    };
  }, [registerActionHandler]);

  return { waitingFor };
}