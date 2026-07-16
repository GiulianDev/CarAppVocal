import { useState, useEffect } from 'react';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import type { Vehicle } from '../../../shared/Garage/vehicleTypes';
import { useVoiceContext } from '../../../shared/VoiceCommand/speech/VoiceContext';

interface GarageVoiceFlowProps {
  vehicles: Vehicle[];
  actions: {
    deleteVehicle: (id: string) => void;
    resetGarage: () => void;
    goToAddVehicle: () => void;
    goToCalendar: () => void;
    setFavoriteVehicle: (id: string) => void;
  };
}

// Stati di attesa per guidare la conversazione senza sovrapporsi tra flussi
type WaitState = 
  | 'confirm_clean' 
  | 'confirm_delete' 
  | 'delete_disambiguate_plate' 
  | 'delete_disambiguate_model_or_plate'
  | 'confirm_favorite'
  | 'favorite_disambiguate_plate'
  | 'favorite_disambiguate_model_or_plate'
  | null;

export function useGarageVoiceFlow({ vehicles, actions }: GarageVoiceFlowProps) {
  const [waitingFor, setWaitingFor] = useState<WaitState>(null);
  // pendingValue salva temporaneamente l'ID dell'auto coinvolta nell'azione corrente
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

      const confirmWords = ['si', 'sì', 'ok', 'certo', 'esatto', 'corretto', 'procedi', 'conferma', 'confermo', 'vai', 'imposta'];
      const cancelWords = ['no', 'annulla', 'sbagliato', 'errato', 'fermati', 'ferma'];

      const wordsArray = cleanAnswer.split(/\s+/);
      const isConfirm = nlpResult.intent === 'intent.confirm' || confirmWords.includes(cleanAnswer) || wordsArray.some(word => confirmWords.includes(word));
      const isCancel = nlpResult.intent === 'intent.cancel' || cancelWords.includes(cleanAnswer) || wordsArray.some(word => cancelWords.includes(word));

      // Funzione di utilità per estrarre la targa
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

        // --- 3. Ambiguità eliminazione: Chiediamo la targa ---
        if (waitingFor === 'delete_disambiguate_plate') {
          const userPlate = extractPlate(nlpResult.utterance);
          
          if (userPlate) {
            const targetCar = vehicles.find(c => c.plate === userPlate);
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

        // --- 4. Ambiguità eliminazione: Chiediamo modello o targa ---
        if (waitingFor === 'delete_disambiguate_model_or_plate') {
          const userPlate = extractPlate(nlpResult.utterance);
          
          if (userPlate) {
            const targetCar = vehicles.find(c => c.plate === userPlate);
            if (targetCar) {
              setPendingValue(targetCar.id);
              askAndListen(`Ho trovato la ${targetCar.brand}. Confermi l'eliminazione?`, 'confirm_delete');
            } else {
              askAndListen("Non ho trovato questa targa. Puoi dirmi il modello esatto oppure ripetere la targa?", 'delete_disambiguate_model_or_plate');
            }
            return;
          }

          let matchedVehicles = vehicles.filter(c => {
            const brandLower = c.brand.toLowerCase();
            const brandWords = brandLower.split(/\s+/).filter(w => w.length > 2);
            return brandWords.some(bw => cleanAnswer.includes(bw));
          });

          if (matchedVehicles.length > 1) {
            const exactMatches = matchedVehicles.filter(c => cleanAnswer.includes(c.brand.toLowerCase()));
            if (exactMatches.length === 1) {
              matchedVehicles = exactMatches;
            }
          }

          if (matchedVehicles.length === 1) {
            setPendingValue(matchedVehicles[0].id);
            askAndListen(`Vuoi eliminare la ${matchedVehicles[0].brand}?`, 'confirm_delete');
          } else {
            askAndListen("Ci sono ancora corrispondenze multiple o non ho capito. Per favore, dimmi solo la targa del veicolo.", 'delete_disambiguate_plate');
          }
          return;
        }

        // --- 5. Conferma preferito ---
        if (waitingFor === 'confirm_favorite') {
          if (isConfirm && pendingValue) {
            actions.setFavoriteVehicle(pendingValue);
            setWaitingFor(null);
            setPendingValue(null);
            speakOnly("Fatto!");
          } else if (isCancel) {
            setWaitingFor(null);
            setPendingValue(null);
            speakOnly("Operazione annullata.");
          } else {
            askAndListen("Sicuro?", 'confirm_favorite');
          }
          return;
        }

        // --- 6. Ambiguità preferito: Chiediamo la targa ---
        if (waitingFor === 'favorite_disambiguate_plate') {
          const userPlate = extractPlate(nlpResult.utterance);
          if (userPlate) {
            const targetCar = vehicles.find(c => c.plate === userPlate);
            if (targetCar) {
              setPendingValue(targetCar.id);
              askAndListen(`Ho trovato la ${targetCar.brand}. Vuoi impostarla come preferito?`, 'confirm_favorite');
            } else {
              askAndListen("Non ho trovato questa targa nel garage. Puoi ripeterla?", 'favorite_disambiguate_plate');
            }
          } else {
            askAndListen("Non ho capito la targa, per favore scandiscila bene.", 'favorite_disambiguate_plate');
          }
          return;
        }

        // --- 7. Ambiguità preferito: Chiediamo modello o targa ---
        if (waitingFor === 'favorite_disambiguate_model_or_plate') {
          const userPlate = extractPlate(nlpResult.utterance);
          if (userPlate) {
            const targetCar = vehicles.find(c => c.plate === userPlate);
            if (targetCar) {
              setPendingValue(targetCar.id);
              askAndListen(`Ho trovato la ${targetCar.brand}. Vuoi impostarla come preferito?`, 'confirm_favorite');
            } else {
              askAndListen("Non ho trovato questa targa. Puoi dirmi il modello esatto oppure ripetere la targa?", 'favorite_disambiguate_model_or_plate');
            }
            return;
          }

          let matchedVehicles = vehicles.filter(c => {
            const brandLower = c.brand.toLowerCase();
            const brandWords = brandLower.split(/\s+/).filter(w => w.length > 2);
            return brandWords.some(bw => cleanAnswer.includes(bw));
          });

          if (matchedVehicles.length > 1) {
            const exactMatches = matchedVehicles.filter(c => cleanAnswer.includes(c.brand.toLowerCase()));
            if (exactMatches.length === 1) {
              matchedVehicles = exactMatches;
            }
          }

          if (matchedVehicles.length === 1) {
            setPendingValue(matchedVehicles[0].id);
            askAndListen(`Vuoi impostare come preferito la ${matchedVehicles[0].brand}?`, 'confirm_favorite');
          } else {
            askAndListen("Ci sono ancora corrispondenze multiple o non ho capito. Per favore, dimmi solo la targa del veicolo.", 'favorite_disambiguate_plate');
          }
          return;
        }
      }

      // =======================================================
      // CASO B: Nuovi comandi vocali liberi
      // =======================================================

      // --- ELIMINA TUTTO ---
      if (nlpResult.intent === 'intent.delete_all') {
        if (vehicles.length === 0) {
          speakOnly("Il tuo garage è già vuoto.");
          return;
        }
        askAndListen("Sei sicuro di voler svuotare interamente il tuo garage perdendo tutti i dati?", 'confirm_clean');
        return;
      }

      // --- ELIMINA SINGOLO VEICOLO ---
      if (nlpResult.intent === 'intent.delete_vehicle') {
        if (vehicles.length === 0) {
          speakOnly("Non hai nessun veicolo nel garage.");
          return;
        }

        const userPlate = extractPlate(nlpResult.utterance);
        if (userPlate) {
          const targetCar = vehicles.find(c => c.plate === userPlate);
          if (targetCar) {
            setPendingValue(targetCar.id);
            askAndListen(`Sicuro di voler eliminare la ${targetCar.brand}?`, 'confirm_delete');
            return;
          }
        }

        let matchedVehicles = vehicles.filter(c => {
          const brandLower = c.brand.toLowerCase();
          const brandWords = brandLower.split(/\s+/).filter(w => w.length > 2);
          return brandWords.some(bw => cleanAnswer.includes(bw));
        });

        if (matchedVehicles.length > 1) {
          const exactMatches = matchedVehicles.filter(c => cleanAnswer.includes(c.brand.toLowerCase()));
          if (exactMatches.length === 1) {
            matchedVehicles = exactMatches;
          }
        }

        if (matchedVehicles.length === 0) {
          speakOnly("Non ho trovato nessun veicolo con questo nome nel tuo garage.");
        } 
        else if (matchedVehicles.length === 1) {
          setPendingValue(matchedVehicles[0].id);
          askAndListen(`Vuoi eliminare la ${matchedVehicles[0].brand}?`, 'confirm_delete');
        } 
        else {
          askAndListen(`Ho trovato ${matchedVehicles.length} veicoli che corrispondono. Dimmi il modello esatto oppure la targa.`, 'delete_disambiguate_model_or_plate');
        }
        return;
      }

      // --- VEICOLO PREFERITO ---
      if (nlpResult.intent === 'intent.set_favorite') {
        if (vehicles.length === 0) {
          speakOnly("Non hai nessun veicolo nel garage.");
          return;
        }

        const userPlate = extractPlate(nlpResult.utterance);
        if (userPlate) {
          const targetCar = vehicles.find(c => c.plate === userPlate);
          if (targetCar) {
            setPendingValue(targetCar.id);
            askAndListen(`Sei sicuro di voler impostare la ${targetCar.brand}?`, 'confirm_favorite');
            return;
          }
        }

        let matchedVehicles = vehicles.filter(c => {
          const brandLower = c.brand.toLowerCase();
          const brandWords = brandLower.split(/\s+/).filter(w => w.length > 2);
          return brandWords.some(bw => cleanAnswer.includes(bw));
        });

        if (matchedVehicles.length > 1) {
          const exactMatches = matchedVehicles.filter(c => cleanAnswer.includes(c.brand.toLowerCase()));
          if (exactMatches.length === 1) {
            matchedVehicles = exactMatches;
          }
        }

        if (matchedVehicles.length === 0) {
          speakOnly("Non ho trovato nessun veicolo con questo nome nel tuo garage.");
        } 
        else if (matchedVehicles.length === 1) {
          setPendingValue(matchedVehicles[0].id);
          askAndListen(`Vuoi impostare come preferito la ${matchedVehicles[0].brand}?`, 'confirm_favorite');
        } 
        else {
          askAndListen(`Ho trovato ${matchedVehicles.length} veicoli che corrispondono. Dimmi il modello esatto oppure la targa.`, 'favorite_disambiguate_model_or_plate');
        }
        return;
      }

       // --- NAVIGA AD AGGIUNGI VEICOLO ---
      if (nlpResult.intent === 'intent.add_vehicle') {
        speakOnly("Certo, cosa vuoi aggiungere?");
        actions.goToAddVehicle();
        return;
      }

       // --- NAVIGA AL CALENDARIO ---
      if (nlpResult.intent === 'intent.calendar_all') {
        speakOnly("Certo, ecco il calendario");
        actions.goToCalendar();
        return;
      }
    });

    return cleanup;
  }, [
    registerActionHandler, waitingFor, pendingValue, vehicles, actions, askAndListen, speakOnly
  ]);

  return { waitingFor };
}