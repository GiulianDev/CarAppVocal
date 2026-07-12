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

// Aggiunte le stop words conversazionali
const STOP_WORDS = [
  'aggiungi', 'inserisci', 'metti', 'la', 'una', 'un', 'il', 'lo', 'le', 'gli',
  'è', 'di', 'marca', 'modello', 'costruttore', 'targa', 'no', 'sbagliato', 'cambia',
  'con', 'invece', 'auto', 'macchina', 'veicolo', 'per', 'da', 'a', 'o', 'e',
  'si', 'scrive', 'chiama', 'non', 'quello', 'quella', 'ma', 'esatto', 'giusto'
];

const CONFIRM_PATTERN = /^(si|sì|ok|conferma|confermo|va bene|yes)$/i;
const CANCEL_PATTERN = /^(no|annulla|annullo|cancel|stop)$/i;

export function useAddVehicleVoiceFlow({ catalog, form, actions }: AddVehicleVoiceFlowProps) {
  const [waitingFor, setWaitingFor] = useState<WaitState>(null);
  const { registerActionHandler } = useVoiceContext();
  const { speakAndListen, speakOnly } = useSpeechAction();

  const askAndListen = (question: string, expectedField: WaitState = null) => {
    setWaitingFor(expectedField);
    speakAndListen(question);
  };

  const extractFields = (text: string) => {
    let foundPlate = '';
    let foundBrand = '';
    let foundModel = '';

    // SANITIZZATORE CONVERSAZIONALE: Rimuove paragoni e ortografia ("con la n", "e non swagt")
    const sanitizedText = text
      .replace(/\b(con\s+la\s+[a-z])\b/gi, '')
      .replace(/\b(e\s+non\s+[a-z0-9]+)\b/gi, '')
      .replace(/\b(non\s+[a-z0-9]+\s+ma)\b/gi, '')
      .replace(/\b(al\s+posto\s+di\s+[a-z0-9]+)\b/gi, '')
      .trim();

    // D'ora in poi usiamo sanitizedText per tutte le ricerche
    const plateMatch = sanitizedText.replace(/[\s\-\.,]/g, '').toUpperCase().match(/[A-Z]{2}\d{3}[A-Z]{2}/);
    if (plateMatch) foundPlate = plateMatch[0];

    const marcaMatch = sanitizedText.match(/\b(marca|costruttore)\s+([a-z0-9\s]+?)(?=\s+(modello|targa|$))/i);
    const modelloMatch = sanitizedText.match(/\bmodello\s+([a-z0-9\s]+?)(?=\s+(targa|$))/i);

    if (marcaMatch && marcaMatch[2]) {
      const possibleBrand = marcaMatch[2].trim();
      const catalogBrand = catalog.brands.find(b =>
        possibleBrand.toLowerCase().includes(b.toLowerCase()) ||
        b.toLowerCase().includes(possibleBrand.toLowerCase())
      );
      foundBrand = catalogBrand || possibleBrand;
    }

    if (modelloMatch && modelloMatch[1]) {
      const possibleModel = modelloMatch[1].trim();
      if (foundBrand) {
        const catalogModels = catalog.getModelsForBrand(foundBrand);
        const catalogModel = catalogModels.find(m =>
          possibleModel.toLowerCase().includes(m.toLowerCase()) ||
          m.toLowerCase().includes(possibleModel.toLowerCase())
        );
        foundModel = catalogModel || possibleModel;
      } else {
        foundModel = possibleModel;
      }
    }

    if (!foundBrand) {
      const catalogBrand = catalog.brands.find(b => sanitizedText.toLowerCase().includes(b.toLowerCase()));
      if (catalogBrand) {
        foundBrand = catalogBrand;
      } else {
        const words = sanitizedText.split(/\s+/).filter(w => !STOP_WORDS.includes(w) && w.length > 2);
        if (words.length > 0) {
          const first = words[0];
          if (!/^(modello|marca|costruttore)$/i.test(first)) foundBrand = first;
        }
      }
    }

    if (foundBrand && !foundModel) {
      const catalogModels = catalog.getModelsForBrand(foundBrand);
      const matchedModel = catalogModels.find(m => sanitizedText.toLowerCase().includes(m.toLowerCase()));
      if (matchedModel) {
        foundModel = matchedModel;
      } else {
        const brandIndex = sanitizedText.toLowerCase().indexOf(foundBrand.toLowerCase());
        if (brandIndex !== -1) {
          let afterBrand = sanitizedText.substring(brandIndex + foundBrand.length).trim();
          const words = afterBrand.split(/\s+/).filter(w => !STOP_WORDS.includes(w) && w.length > 1);
          if (words.length > 0) foundModel = words.slice(0, 3).join(' ');
        } else {
          const words = sanitizedText.split(/\s+/).filter(w => !STOP_WORDS.includes(w) && w.length > 1);
          if (words.length > 0) foundModel = words[0];
        }
      }
    }

    return { foundPlate, foundBrand, foundModel };
  };

  useEffect(() => {
    const cleanup = registerActionHandler((nlpResult) => {
      const rawAnswer = nlpResult.utterance.toLowerCase();
      const cleanAnswer = rawAnswer.replace(/[.,!?]/g, '').trim();

      // ============================================
      // 0. OVERRIDE INTENTI (Protezione "Falsi Positivi")
      // ============================================
      let intent = nlpResult.intent;

      const isCorrectionPhrase = cleanAnswer.startsWith('no') || cleanAnswer.includes('sbagliat') || cleanAnswer.includes('scrive') || cleanAnswer.includes('invece');
      
      if (isCorrectionPhrase || intent === 'intent.cancel') {
        if (cleanAnswer.includes('modello')) {
          intent = 'intent.modify_model';
        } else if (cleanAnswer.includes('marca') || cleanAnswer.includes('costruttore')) {
          intent = 'intent.modify_brand';
        } else if (cleanAnswer.includes('targa')) {
          intent = 'intent.modify_plate';
        } else if (cleanAnswer.includes('scrive') || cleanAnswer.includes('chiama') || cleanAnswer.includes('invece')) {
          intent = 'intent.modify_model';
        }
      }

      const isExplicitConfirm = CONFIRM_PATTERN.test(cleanAnswer);
      const isExplicitCancel = CANCEL_PATTERN.test(cleanAnswer);

      // ============================================
      // 1. GESTIONE INTENTI PRINCIPALI
      // ============================================
      if (intent === 'intent.cancel' || (isExplicitCancel && intent !== 'intent.modify_model' && intent !== 'intent.modify_brand' && intent !== 'intent.modify_plate')) {
        setWaitingFor(null);
        actions.resetForm();
        speakOnly("D'accordo, operazione annullata.");
        return;
      }

      const globalIntents = ['intent.garage', 'intent.calendar_all', 'intent.view_event'];
      if (globalIntents.includes(intent)) {
        setWaitingFor(null);
        actions.resetForm();
        return;
      }

      if (intent === 'intent.confirm' || isExplicitConfirm) {
        if (waitingFor === 'confirm_save') {
          const success = actions.performSave();
          if (success) speakOnly("Veicolo salvato nel garage.");
          else speakOnly("Errore nel salvataggio, riprova.");
        } else {
          askAndListen("Vuoi salvare il veicolo? Rispondi sì o no.", 'confirm_save');
        }
        return;
      }

      // ============================================
      // 2. GESTIONE MODIFICHE MIRATE E STATO FUTURO
      // ============================================
      let isModifying = false;
      let tempPlate = form.plate;
      let tempBrand = form.brand;
      let tempModel = form.model;

      if (intent === 'intent.modify_plate') { tempPlate = ''; isModifying = true; }
      else if (intent === 'intent.modify_brand') { tempBrand = ''; tempModel = ''; isModifying = true; }
      else if (intent === 'intent.modify_model') { tempModel = ''; isModifying = true; }

      // ============================================
      // 3. ESTRAZIONE E AGGIORNAMENTO
      // ============================================
      const { foundPlate, foundBrand, foundModel } = extractFields(rawAnswer);

      const nextPlate = foundPlate || tempPlate;
      const nextBrand = foundBrand || tempBrand;
      const nextModel = foundModel || tempModel;

      if (nextPlate !== form.plate) actions.setPlate(nextPlate);
      if (nextBrand !== form.brand) actions.setBrand(nextBrand);
      if (nextModel !== form.model) actions.setModel(nextModel);

      // ============================================
      // 4. DECISIONE DEL PROSSIMO PASSO
      // ============================================
      if (isModifying && !foundPlate && !foundBrand && !foundModel) {
          if (intent === 'intent.modify_plate') { askAndListen("Va bene, dimmi la nuova targa.", 'plate'); return; }
          if (intent === 'intent.modify_brand') { askAndListen("Ok, quale marca inserisco?", 'brand'); return; }
          if (intent === 'intent.modify_model') { askAndListen("D'accordo, che modello è?", 'model'); return; }
      }

      const hasNewInfo = foundPlate || foundBrand || foundModel;
      if (!hasNewInfo && !isModifying) {
        if (waitingFor === 'brand') askAndListen("Scusa, non ho capito la marca. Puoi ripetere?", 'brand');
        else if (waitingFor === 'model') askAndListen("Non ho capito il modello, puoi ripetere?", 'model');
        else if (waitingFor === 'plate') askAndListen("Non ho capito la targa, puoi scandirla meglio?", 'plate');
        else askAndListen("Non ho capito, puoi ripetere?", null);
        return;
      }

      if (!nextBrand) {
        askAndListen("Qual è la marca del veicolo?", 'brand');
        return;
      }

      if (!nextModel) {
        askAndListen(`Ok, ${nextBrand}. Che modello è?`, 'model');
        return;
      }

      if (!nextPlate) {
        askAndListen(`Perfetto, ${nextBrand} ${nextModel}. Qual è la targa?`, 'plate');
        return;
      }

      if (waitingFor !== 'confirm_save') {
        askAndListen(`Ho tutto: ${nextBrand} ${nextModel}, targa ${nextPlate}. Confermi il salvataggio?`, 'confirm_save');
      } else {
        askAndListen("Vuoi salvare il veicolo? Rispondi sì o no.", 'confirm_save');
      }
    });

    return cleanup;
  }, [registerActionHandler, waitingFor, catalog, form, actions, askAndListen, speakOnly]);

  return { waitingFor };
}