import { useState, useEffect } from 'react';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import type { Vehicle } from '../../../shared/Garage/vehicleTypes';

interface VehicleDetailVoiceFlowProps {
  vehicle: Vehicle | null;
  actions: {
    goToGarage: () => void;
    goToEvent: (eventId: string) => void;
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
  | 'view_event_disambiguate_date'
  | null;

export function useVehicleDetailVoiceFlow({ vehicle, actions }: VehicleDetailVoiceFlowProps) {
  const [waitingFor, setWaitingFor] = useState<WaitState>(null);
  // pendingValue salva temporaneamente l'ID dell'auto coinvolta nell'azione corrente
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  // const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [pendingValue] = useState<string | null>(null);

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

      // const confirmWords = ['si', 'sì', 'ok', 'certo', 'esatto', 'corretto', 'procedi', 'conferma', 'confermo', 'vai', 'imposta'];
      const cancelWords = ['no', 'annulla', 'sbagliato', 'errato', 'fermati', 'ferma'];

      const wordsArray = cleanAnswer.split(/\s+/);
      
      // const isConfirm = nlpResult.intent === 'intent.confirm' || confirmWords.includes(cleanAnswer) || wordsArray.some(word => confirmWords.includes(word));
      const isCancel = nlpResult.intent === 'intent.cancel' || cancelWords.includes(cleanAnswer) || wordsArray.some(word => cancelWords.includes(word));

      // =======================================================
      // CASO A: Stiamo aspettando una risposta specifica
      // =======================================================
      if (waitingFor) {
        
        // --- GESTIONE AMBIGUITÀ EVENTO (Stesso tipo, date diverse) ---
        if (waitingFor === 'view_event_disambiguate_date') {
            if (isCancel) {
              setWaitingFor(null);
              setPendingEvents([]);
              speakOnly("Operazione annullata.");
              return;
            }

            // Cerchiamo un anno o un pezzo di data nella risposta dell'utente
            const yearMatch = rawAnswer.match(/\d{4}/);
            const userDateHint = yearMatch ? yearMatch[0] : cleanAnswer;

            const finalMatch = pendingEvents.find(e => e.date.includes(userDateHint));

            if (finalMatch) {
                speakOnly(`Apro i dettagli di ${finalMatch.title}.`);
                actions.goToEvent(finalMatch.id);
                setWaitingFor(null);
                setPendingEvents([]);
            } else {
                askAndListen("Non ho trovato un evento con questa data. Vuoi riprovare?", 'view_event_disambiguate_date');
            }
            return;
        }
      }

      // =======================================================
      // CASO B: Nuovi comandi vocali liberi
      // =======================================================
      
       // --- NAVIGA AL GARAGE ---
      if (nlpResult.intent === 'intent.garage') {
        speakOnly("Certo, ecco il garage");
        actions.goToGarage();
        return;
      }

      // --- APRI DETTAGLIO EVENTO ---
      if (nlpResult.intent === 'intent.view_event') {
          if (!vehicle || !vehicle.events || vehicle.events.length === 0) {
              speakOnly("Non ci sono eventi registrati per questo veicolo.");
              return;
          }

          // 1. Cerchiamo parole chiave nel comando (es. "olio", "gomme", "bollo")
          const excludeWords = ['vai', 'al', 'dettaglio', 'di', 'del', 'apri', 'mostrami', 'il', 'la', 'evento'];
          const searchKeywords = wordsArray.filter(w => !excludeWords.includes(w) && w.length > 2);

          let matchedEvents = vehicle.events.filter(e => {
              const titleLower = e.title.toLowerCase();
              const catLower = e.category?.toLowerCase() || '';
              return searchKeywords.some(kw => titleLower.includes(kw) || catLower.includes(kw));
          });

          // 2. Se l'utente ha già detto un anno nella frase iniziale (es. "bollo 2023"), filtriamo subito!
          const yearMatch = rawAnswer.match(/\d{4}/);
          if (yearMatch && matchedEvents.length > 1) {
              matchedEvents = matchedEvents.filter(e => e.date.includes(yearMatch[0]));
          }

          // 3. Risoluzione
          if (matchedEvents.length === 1) {
              speakOnly(`Apro il dettaglio di ${matchedEvents[0].title}.`);
              actions.goToEvent(matchedEvents[0].id);
          } 
          else if (matchedEvents.length > 1) {
              // Salviamo le corrispondenze trovate per chiedere la data
              setPendingEvents(matchedEvents);
              askAndListen(`Ho trovato ${matchedEvents.length} eventi che corrispondono. Dimmi l'anno o la data di quello che cerchi.`, 'view_event_disambiguate_date');
          } 
          else {
              speakOnly("Non ho trovato nessun evento con questo nome nel libretto.");
          }
          return;
      }

    });

    return cleanup;
  }, [
    registerActionHandler, waitingFor, pendingValue, vehicle, actions, askAndListen, speakOnly
  ]);

  return { waitingFor };
}