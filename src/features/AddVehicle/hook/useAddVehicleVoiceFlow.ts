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

export function useAddVehicleVoiceFlow({ catalog, form, actions }: AddVehicleVoiceFlowProps) {
  const [waitingFor, setWaitingFor] = useState<WaitState>(null);
  const { registerActionHandler } = useVoiceContext();
  const { speakAndListen, speakOnly } = useSpeechAction();

  // =======================================================
  // REFS PATTERN PER STABILITÀ ASSOLUTA CONTRO I RE-RENDER
  // =======================================================
  // Salviamo tutte le props volatili in un ref aggiornato ad ogni render.
  // In questo modo l'useEffect si registrerà UNA SOLA VOLTA e non si scollegherà MAI
  // a causa dei cambi di stato o delle funzioni rigenerate dal padre.
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
      // Recuperiamo i dati freschi correnti senza far scattare le dipendenze dell'useEffect
      const { catalog: currentCatalog, form: currentForm, actions: currentActions, waitingFor: currentWaitingFor } = latestPropsRef.current;

      console.group('🔄 [VoiceFlow] Inizio elaborazione handler locale stabilizzato');
      console.log(`📌 Stato d'attesa al momento dell'ascolto: [${currentWaitingFor}]`);
      console.log(`📝 Dati form letti dal Ref:`, currentForm);

      const rawAnswer = nlpResult.utterance.toLowerCase();
      const cleanAnswer = rawAnswer.replace(/[.,!?]/g, '').trim();
      const wordsArray = cleanAnswer.split(/\s+/);

      // =======================================================
      // FASE 0: GLOBAL ABORT (Annullamento immediato)
      // =======================================================
      const abortWords = ['annulla', 'fermati', 'basta', 'esci', 'interrompi'];
      if (abortWords.some(w => wordsArray.includes(w))) {
        console.log('🛑 [Fase 0] Annullamento globale richiesto.');
        setWaitingFor(null);
        currentActions.resetForm();
        speakOnly("D'accordo, operazione annullata.");
        console.groupEnd();
        return; 
      }

      const isConfirm = nlpResult.intent === 'intent.confirm' || ['si', 'sì', 'ok', 'certo', 'confermo'].some(w => wordsArray.includes(w));
      const isCancel = nlpResult.intent === 'intent.cancel' || ['no', 'sbagliato'].some(w => wordsArray.includes(w));

      let foundPlate = currentForm.plate;
      let foundBrand = currentForm.brand;
      let foundModel = currentForm.model;

      // =======================================================
      // FASE 1: CORREZIONI (Svuotamento campi)
      // =======================================================
      if (cleanAnswer.includes('no') || cleanAnswer.includes('modifica')) {
          console.log('🛠️ [Fase 1] Rilevata intenzione di correzione o smentita.');
          if (cleanAnswer.includes('targa')) { foundPlate = ''; currentActions.setPlate(''); }
          else if (cleanAnswer.includes('marca')) { foundBrand = ''; currentActions.setBrand(''); foundModel = ''; currentActions.setModel(''); }
          else if (cleanAnswer.includes('modello')) { foundModel = ''; currentActions.setModel(''); }
      }

      // =======================================================
      // FASE 2: ESTRAZIONE DATI SMART (Ricerca incrociata nel catalogo)
      // =======================================================
      console.log('🔍 [Fase 2] Estrazione Dati Intelligente...');
      
      // Controllo Regex Targa
      const plateMatch = nlpResult.utterance.replace(/[\s\-\.,]/g, '').toUpperCase().match(/[A-Z]{2}\d{3}[A-Z]{2}/);
      if (plateMatch) { 
        console.log(`✅ Targa trovata: ${plateMatch[0]}`);
        foundPlate = plateMatch[0]; 
        currentActions.setPlate(foundPlate); 
      }

      // Estrazione Marca da NLP o da scansione diretta del testo sul catalogo
      const nlpBrand = nlpResult.entities?.find(e => e.entity === 'brand')?.sourceText;
      if (nlpBrand) {
        foundBrand = nlpBrand;
        currentActions.setBrand(foundBrand);
      } else {
        const catalogBrand = currentCatalog.brands.find(b => rawAnswer.includes(b.toLowerCase()));
        if (catalogBrand) { 
          console.log(`✅ Marca intercettata dal testo: ${catalogBrand}`);
          foundBrand = catalogBrand; 
          currentActions.setBrand(foundBrand); 
        }
      }

      // Estrazione Modello Intelligente (Cross-Brand Search!)
      const nlpModel = nlpResult.entities?.find(e => e.entity === 'model')?.sourceText;
      if (nlpModel) {
        foundModel = nlpModel;
        currentActions.setModel(foundModel);
      } else {
        // Se conosciamo già la marca, cerchiamo i modelli solo lì dentro
        if (foundBrand) {
          const catalogModels = currentCatalog.getModelsForBrand(foundBrand);
          const catalogModel = catalogModels.find(m => rawAnswer.includes(m.toLowerCase()));
          if (catalogModel) { 
            console.log(`✅ Modello trovato per la marca ${foundBrand}: ${catalogModel}`);
            foundModel = catalogModel; 
            currentActions.setModel(foundModel); 
          }
        } else {
          // 🔥 AGGIORNAMENTO SMART: Se NON conosciamo la marca, cerchiamo il modello in TUTTI i brand del catalogo!
          // Se dici "Aggiungi una Panda", capisce che Panda è di Fiat e imposta AUTOMATICAMENTE entrambi i campi!
          for (const brand of currentCatalog.brands) {
            const models = currentCatalog.getModelsForBrand(brand);
            const catalogModel = models.find(m => rawAnswer.includes(m.toLowerCase()));
            if (catalogModel) {
              console.log(`🧠 [Smart Match] Trovato modello "${catalogModel}". Inferita la marca automatica: "${brand}"`);
              foundBrand = brand;
              foundModel = catalogModel;
              currentActions.setBrand(brand);
              currentActions.setModel(catalogModel);
              break;
            }
          }
        }
      }

      // =======================================================
      // FASE 3: ASSEGNAZIONE DI CONTESTO (Se l'utente risponde a monosillabi)
      // =======================================================
      const stopWords = ['aggiungi', 'inserisci', 'metti', 'la', 'una', 'è', 'di'];
      const filteredWords = wordsArray.filter(w => !stopWords.includes(w));
      const cleanContext = filteredWords.join(' ');

      if (filteredWords.length > 0 && filteredWords.length <= 3 && !isCancel && !isConfirm) {
          if (currentWaitingFor === 'brand' && !foundBrand) { 
            console.log(`🧠 [Context-Aware] Assegnazione Marca da stato d'attesa: "${cleanContext}"`);
            foundBrand = cleanContext; 
            currentActions.setBrand(foundBrand); 
          }
          else if (currentWaitingFor === 'model' && !foundModel) { 
            console.log(`🧠 [Context-Aware] Assegnazione Modello da stato d'attesa: "${cleanContext}"`);
            foundModel = cleanContext; 
            currentActions.setModel(foundModel); 
          }
      }

      // =======================================================
      // FASE 4: NAVIGAZIONE MACCHINA A STATI
      // =======================================================
      console.log('🧭 [Fase 4] Avanzamento logica conversazionale...');
      
      if (currentWaitingFor === 'confirm_save') {
        if (isConfirm) { 
          console.log('💾 Azione: Eseguo il salvataggio definitivo.');
          currentActions.performSave(); 
          speakOnly("Veicolo salvato."); 
          setWaitingFor(null);
        }
        else if (isCancel) { 
          console.log('❌ Azione: Salvataggio rifiutato.');
          setWaitingFor(null); 
          speakOnly("Salvataggio annullato."); 
        }
        else { 
          askAndListen("Scusami, non ho capito. Vuoi salvare il veicolo?", 'confirm_save'); 
        }
        console.groupEnd();
        return;
      }

      // Scelta del prossimo step in base ai dati mancanti
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
  }, [registerActionHandler]); // L'effetto dipende SOLO dal costruttore del canale di ascolto, stabilità totale!

  return { waitingFor };
}