import { useState, useEffect } from 'react';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import type { Car } from '../../../shared/Garage/car';

interface GarageVoiceFlowProps {
  cars: Car[];
  actions: {
    deleteVehicle: (id: string) => void;
    resetGarage: () => void;
    goToAddVehicle: () => void;
  };
}

// Stati di attesa per guidare la conversazione
type WaitState = 'confirm_clean' | 'confirm_delete' | 'delete_disambiguate_plate' | null;

export function useGarageVoiceFlow({ cars, actions }: GarageVoiceFlowProps) {
  const [waitingFor, setWaitingFor] = useState<WaitState>(null);
  // pendingValue ci serve per salvare temporaneamente l'ID dell'auto che stiamo per eliminare
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
      const cleanAnswer = rawAnswer.replace(/[.,!?]/g, '').trim();

      const confirmWords = ['si', 'sì', 'ok', 'certo', 'esatto', 'corretto', 'procedi', 'conferma', 'confermo', 'vai'];
      const cancelWords = ['no', 'annulla', 'sbagliato', 'errato', 'fermati', 'ferma'];

      const wordsArray = cleanAnswer.split(/\s+/);
      const isConfirm = nlpResult.intent === 'intent.confirm' || confirmWords.includes(cleanAnswer) || wordsArray.some(word => confirmWords.includes(word));
      const isCancel = nlpResult.intent === 'intent.cancel' || cancelWords.includes(cleanAnswer) || wordsArray.some(word => cancelWords.includes(word));

      // Funzione di utilità per estrarre la targa (stessa regex usata in addVehicle)
      const extractPlate = (text: string) => {
        const rawUtteranceCleaned = text.replace(/[\s\-\.,]/g, '').toUpperCase();
        const plateMatch = rawUtteranceCleaned.match(/[A-Z]{2}\d{3}[A-Z]{2}/);
        return plateMatch ? plateMatch[0] : null;
      };

      // =======================================================
      // CASO A: Stiamo aspettando una risposta specifica
      // =======================================================
      if (waitingFor) {
        
        // --- 1. Conferma svuotamento garage ---
        if (waitingFor === 'confirm_clean') {
          if (isConfirm) {
            setWaitingFor(null);
            actions.resetGarage();
            speakOnly("Garage svuotato con successo.");
          } else if (isCancel) {
            setWaitingFor(null);
            speakOnly("Nessun problema, il garage è al sicuro.");
          } else {
            askAndListen("Non ho capito. Vuoi davvero eliminare tutte le auto?", 'confirm_clean');
          }
          return;
        }

        // --- 2. Conferma eliminazione singola auto ---
        if (waitingFor === 'confirm_delete') {
          if (isConfirm && pendingValue) {
            actions.deleteVehicle(pendingValue);
            setWaitingFor(null);
            setPendingValue(null);
            speakOnly("Veicolo eliminato.");
          } else if (isCancel) {
            setWaitingFor(null);
            setPendingValue(null);
            speakOnly("Operazione annullata.");
          } else {
            askAndListen("Vuoi procedere con l'eliminazione?", 'confirm_delete');
          }
          return;
        }

        // --- 3. Ambiguità: Più auto trovate, chiediamo la targa ---
        if (waitingFor === 'delete_disambiguate_plate') {
          const userPlate = extractPlate(nlpResult.utterance);
          
          if (userPlate) {
            const targetCar = cars.find(c => c.plate === userPlate);
            if (targetCar) {
              setPendingValue(targetCar.id);
              askAndListen(`Ho trovato la ${targetCar.brand}. Confermi l'eliminazione?`, 'confirm_delete');
            } else {
              askAndListen("Non ho trovato questa targa nel garage. Puoi ripeterla?", 'delete_disambiguate_plate');
            }
          } else {
            askAndListen("Non ho capito la targa, per favore scandiscila bene.", 'delete_disambiguate_plate');
          }
          return;
        }
      }

      // =======================================================
      // CASO B: Nuovi comandi vocali liberi
      // =======================================================

      // --- ELIMINA TUTTO ---
      if (nlpResult.intent === 'intent.delete_all') {
        if (cars.length === 0) {
          speakOnly("Il tuo garage è già vuoto.");
          return;
        }
        askAndListen("Sei sicuro di voler svuotare interamente il tuo garage perdendo tutti i dati?", 'confirm_clean');
        return;
      }

      // --- ELIMINA SINGOLO VEICOLO ---
      if (nlpResult.intent === 'intent.delete_vehicle') {
        if (cars.length === 0) {
          speakOnly("Non hai nessun veicolo nel garage.");
          return;
        }

        // 1. Controlliamo subito se l'utente ha detto direttamente la targa (infallibile)
        const userPlate = extractPlate(nlpResult.utterance);
        if (userPlate) {
          const targetCar = cars.find(c => c.plate === userPlate);
          if (targetCar) {
            setPendingValue(targetCar.id);
            askAndListen(`Sei sicuro di voler eliminare la ${targetCar.brand}?`, 'confirm_delete');
            return;
          }
        }

        // 2. Se non ha detto la targa, cerchiamo per marca o modello
        const matchedCars = cars.filter(c => 
          cleanAnswer.includes(c.brand.toLowerCase()));

        if (matchedCars.length === 0) {
          speakOnly("Non ho trovato nessun veicolo con questo nome nel tuo garage.");
        } 
        else if (matchedCars.length === 1) {
          // Trovata un'unica auto! Chiediamo conferma.
          setPendingValue(matchedCars[0].id);
          askAndListen(`Vuoi eliminare la ${matchedCars[0].brand}?`, 'confirm_delete');
        } 
        else {
          // Ci sono più auto con lo stesso nome (es. 2 Fiat Panda)
          askAndListen(`Ho trovato ${matchedCars.length} veicoli che corrispondono. Per favore, dimmi la targa di quella da eliminare.`, 'delete_disambiguate_plate');
        }
      }

      // --- NAVIGA AD AGGIUNGI VEICOLO ---
      if (nlpResult.intent === 'intent.add_vehicle') {
        speakOnly("Certo, cosa vuoi aggiungere?");
        actions.goToAddVehicle();
        return;
      }

    });

    return cleanup;
  }, [
    registerActionHandler, waitingFor, pendingValue, cars, actions, askAndListen, speakOnly
  ]);

  return { waitingFor };
}