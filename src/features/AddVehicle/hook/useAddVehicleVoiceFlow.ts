import { useState, useEffect } from 'react';
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

  const askAndListen = (question: string, expectedField: WaitState = null) => {
    setWaitingFor(expectedField);
    speakAndListen(question);
  };

  useEffect(() => {
    const cleanup = registerActionHandler((nlpResult) => {
      const rawAnswer = nlpResult.utterance.toLowerCase();
      const cleanAnswer = rawAnswer.replace(/[.,!?]/g, '').trim();
      const wordsArray = cleanAnswer.split(/\s+/);

      // =======================================================
      // FASE 0: GLOBAL ABORT (Annullamento immediato)
      // =======================================================
      const abortWords = ['annulla', 'fermati', 'basta', 'esci', 'interrompi'];
      if (abortWords.some(w => wordsArray.includes(w))) {
        setWaitingFor(null);
        actions.resetForm();
        speakOnly("D'accordo, operazione annullata.");
        return; 
      }

      const isConfirm = nlpResult.intent === 'intent.confirm' || ['si', 'sì', 'ok', 'certo', 'confermo'].some(w => wordsArray.includes(w));
      const isCancel = nlpResult.intent === 'intent.cancel' || ['no', 'sbagliato'].some(w => wordsArray.includes(w));

      let foundPlate = form.plate;
      let foundBrand = form.brand;
      let foundModel = form.model;

      // =======================================================
      // FASE 1: CORREZIONI (Svuotamento campi)
      // =======================================================
      if (cleanAnswer.includes('no') || cleanAnswer.includes('modifica')) {
          if (cleanAnswer.includes('targa')) { foundPlate = ''; actions.setPlate(''); }
          else if (cleanAnswer.includes('marca')) { foundBrand = ''; actions.setBrand(''); foundModel = ''; actions.setModel(''); }
          else if (cleanAnswer.includes('modello')) { foundModel = ''; actions.setModel(''); }
      }

      // =======================================================
      // FASE 2: ESTRAZIONE DATI
      // =======================================================
      const plateMatch = nlpResult.utterance.replace(/[\s\-\.,]/g, '').toUpperCase().match(/[A-Z]{2}\d{3}[A-Z]{2}/);
      if (plateMatch) { foundPlate = plateMatch[0]; actions.setPlate(foundPlate); }

      const nlpBrand = nlpResult.entities?.find(e => e.entity === 'brand')?.sourceText;
      const nlpModel = nlpResult.entities?.find(e => e.entity === 'model')?.sourceText;
      
      if (nlpBrand) { foundBrand = nlpBrand; actions.setBrand(foundBrand); }
      if (nlpModel) { foundModel = nlpModel; actions.setModel(foundModel); }

      // Ricerca Catalogo (Fallback)
      if (!nlpBrand) {
        const catalogBrand = catalog.brands.find(b => rawAnswer.includes(b.toLowerCase()));
        if (catalogBrand) { foundBrand = catalogBrand; actions.setBrand(foundBrand); }
      }
      
      if (foundBrand && !nlpModel) {
        const catalogModels = catalog.getModelsForBrand(foundBrand);
        const catalogModel = catalogModels.find(m => rawAnswer.includes(m.toLowerCase()));
        if (catalogModel) { foundModel = catalogModel; actions.setModel(foundModel); }
      }

      // =======================================================
      // FASE 3: ASSEGNAZIONE CUSTOM (Context-Aware)
      // =======================================================
      const stopWords = ['aggiungi', 'inserisci', 'metti', 'la', 'una', 'è', 'di'];
      const filteredWords = wordsArray.filter(w => !stopWords.includes(w));
      const cleanContext = filteredWords.join(' ');

      if (filteredWords.length > 0 && filteredWords.length <= 3 && !isCancel) {
          if (waitingFor === 'brand' && !foundBrand) { foundBrand = cleanContext; actions.setBrand(foundBrand); }
          else if (waitingFor === 'model' && !foundModel) { foundModel = cleanContext; actions.setModel(foundModel); }
      }

      // =======================================================
      // FASE 4: NAVIGAZIONE FLUSSO
      // =======================================================
      if (waitingFor === 'confirm_save') {
        if (isConfirm) { actions.performSave(); speakOnly("Veicolo salvato."); }
        else if (isCancel) { setWaitingFor(null); speakOnly("Salvataggio annullato."); }
        else { askAndListen("Vuoi salvare il veicolo?", 'confirm_save'); }
        return;
      }

      if (!foundBrand) askAndListen("Qual è la marca del veicolo?", 'brand');
      else if (!foundModel) askAndListen(`Ok, ${foundBrand}. Che modello è?`, 'model');
      else if (!foundPlate) askAndListen(`Perfetto, ${foundBrand} ${foundModel}. Qual è la targa?`, 'plate');
      else askAndListen(`Ho tutto: ${foundBrand} ${foundModel}, targa ${foundPlate}. Salvo?`, 'confirm_save');
    });
    return cleanup;
  }, [registerActionHandler, waitingFor, catalog, form, actions, askAndListen, speakOnly]);

  return { waitingFor };
}