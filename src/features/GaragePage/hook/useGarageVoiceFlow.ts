import { useState, useEffect } from 'react';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import type { Vehicle } from '../../../shared/Garage/vehicle';

interface GarageVoiceFlowProps {
  vehicles: Vehicle[];
  actions: {
    deleteVehicle: (id: string) => void;
    resetGarage: () => void;
    goToAddVehicle: () => void;
  };
}

// Stati di attesa per guidare la conversazione
type WaitState = 'confirm_clean' | 'confirm_delete' | 'delete_disambiguate_plate' | 'delete_disambiguate_model_or_plate' | null;

export function useGarageVoiceFlow({ vehicles, actions }: GarageVoiceFlowProps) {
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

        // --- 4. Ambiguità: Chiediamo modello o targa ---
        if (waitingFor === 'delete_disambiguate_model_or_plate') {
          const userPlate = extractPlate(nlpResult.utterance);
          
          // Caso A: L'utente ha preferito dire la targa
          if (userPlate) {
            const targetCar = vehicles.find(c => c.plate === userPlate);
            if (targetCar) {
              setPendingValue(targetCar.id);
              askAndListen(`Ho trovato la ${targetCar.brand}. Confermi l'eliminazione?`, 'confirm_delete');
            } else {
              // Ha detto una targa, ma non c'è. Gli ridiamo entrambe le opzioni.
              askAndListen("Non ho trovato questa targa. Puoi dirmi il modello esatto oppure ripetere la targa?", 'delete_disambiguate_model_or_plate');
            }
            return;
          }

          // Caso B: Non ha detto una targa, presumiamo abbia detto un modello
          let matchedVehicles = vehicles.filter(c => {
            const brandLower = c.brand.toLowerCase();
            const brandWords = brandLower.split(/\s+/).filter(w => w.length > 2);
            return brandWords.some(bw => cleanAnswer.includes(bw));
          });

          // Stessa ottimizzazione: cerchiamo match esatti completi
          if (matchedVehicles.length > 1) {
            const exactMatches = matchedVehicles.filter(c => cleanAnswer.includes(c.brand.toLowerCase()));
            if (exactMatches.length === 1) {
              matchedVehicles = exactMatches;
            }
          }

          // Risolviamo l'input del modello
          if (matchedVehicles.length === 1) {
            // Trovata! Ha detto il modello e c'è solo questa.
            setPendingValue(matchedVehicles[0].id);
            askAndListen(`Vuoi eliminare la ${matchedVehicles[0].brand}?`, 'confirm_delete');
          } else {
            // Se ancora non la trova, oppure ci sono ancora più veicoli (es. ha due Fiat Panda identiche),
            // scatta il paracadute: chiediamo forzatamente la targa.
            askAndListen("Ci sono ancora corrispondenze multiple o non ho capito. Per favore, dimmi solo la targa del veicolo.", 'delete_disambiguate_plate');
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
      // --- ELIMINA SINGOLO VEICOLO ---
      if (nlpResult.intent === 'intent.delete_vehicle') {
        if (vehicles.length === 0) {
          speakOnly("Non hai nessun veicolo nel garage.");
          return;
        }

        // 1. Controlliamo subito se l'utente ha detto direttamente la targa (infallibile)
        const userPlate = extractPlate(nlpResult.utterance);
        if (userPlate) {
          const targetCar = vehicles.find(c => c.plate === userPlate);
          if (targetCar) {
            setPendingValue(targetCar.id);
            askAndListen(`Sei sicuro di voler eliminare la ${targetCar.brand}?`, 'confirm_delete');
            return;
          }
        }

        // 2. Se non ha detto la targa, facciamo un match "contains" sul campo brand (che ora include marca e modello)
        let matchedVehicles = vehicles.filter(c => {
          const brandLower = c.brand.toLowerCase();
          // Dividiamo "Fiat Panda" in ["fiat", "panda"] (ignorando paroline troppo corte)
          const brandWords = brandLower.split(/\s+/).filter(w => w.length > 2);
          
          // Controlliamo se ALMENO UNA parola dell'auto ("fiat" o "panda") è contenuta nella frase dell'utente
          return brandWords.some(bw => cleanAnswer.includes(bw));
        });

        // OTTIMIZZAZIONE: Se l'utente dice "Fiat Panda", ma abbiamo anche una "Fiat Punto",
        // il codice sopra matcherebbe entrambe (perché entrambe contengono "Fiat").
        // Quindi se troviamo più veicoli, controlliamo se c'è un match della stringa COMPLETA.
        if (matchedVehicles.length > 1) {
          const exactMatches = matchedVehicles.filter(c => cleanAnswer.includes(c.brand.toLowerCase()));
          if (exactMatches.length === 1) {
            matchedVehicles = exactMatches;
          }
        }

        // 3. Risoluzione dei risultati
        if (matchedVehicles.length === 0) {
          speakOnly("Non ho trovato nessun veicolo con questo nome nel tuo garage.");
        } 
        else if (matchedVehicles.length === 1) {
          // Trovata un'unica auto! Salviamo l'id e chiediamo conferma.
          setPendingValue(matchedVehicles[0].id);
          askAndListen(`Vuoi eliminare la ${matchedVehicles[0].brand}?`, 'confirm_delete');
        } 
        else {
          // Ci sono più auto con lo stesso nome (es. 2 Panda, o ha detto solo "Fiat")
          askAndListen(`Ho trovato ${matchedVehicles.length} veicoli che corrispondono. Dimmi il modello esatto oppure la targa.`, 'delete_disambiguate_model_or_plate');        }
        return;
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
    registerActionHandler, waitingFor, pendingValue, vehicles, actions, askAndListen, speakOnly
  ]);

  return { waitingFor };
}