import { useState, useEffect, useRef } from 'react';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import type { Vehicle } from '../../../shared/Garage/vehicle';
import type { VoiceAnalysisResult } from '../../../shared/VoiceCommand/types';

interface VehicleDetailVoiceFlowProps {
  vehicle: Vehicle | null;
  actions: {
    goToGarage: () => void;
    goToEvent: (eventId: string) => void;
  };
}

type WaitState = 'view_event_disambiguate_date' | null;

export function useVehicleDetailVoiceFlow({ vehicle, actions }: VehicleDetailVoiceFlowProps) {
  const [waitingFor, setWaitingFor] = useState<WaitState>(null);
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);

  const { registerActionHandler } = useVoiceContext();
  const { speakAndListen, speakOnly } = useSpeechAction();

  // Manteniamo i riferimenti aggiornati per evitare closure stanche nell'handler
  const ref = useRef({ vehicle, actions, waitingFor, pendingEvents });
  useEffect(() => {
    ref.current = { vehicle, actions, waitingFor, pendingEvents };
  });

  const askAndListen = (question: string, expectedField: WaitState) => {
    setWaitingFor(expectedField);
    speakAndListen(question);
  };

  useEffect(() => {
    const cleanup = registerActionHandler((nlpResult: VoiceAnalysisResult): boolean => {
      const { intent, entities, rawText } = nlpResult;
      const text = (rawText || '').toLowerCase().trim();
      const { vehicle, actions, waitingFor: currentWaitingFor, pendingEvents: currentPendingEvents } = ref.current;

      // =======================================================
      // 1. DIALOGHI IN SOSPESO (Es. Disambiguazione data)
      // =======================================================
      if (currentWaitingFor) {
        
        if (intent === 'CANCEL' || /\b(no|annulla|ferma|esci|sbagliato)\b/i.test(text)) {
          setWaitingFor(null);
          setPendingEvents([]);
          speakOnly("Operazione annullata.");
          return true;
        }

        if (currentWaitingFor === 'view_event_disambiguate_date') {
          // Cerca un anno (4 cifre) o usa il testo ripulito
          const yearMatch = text.match(/\d{4}/);
          const userDateHint = yearMatch ? yearMatch[0] : (entities.extractedText || text);

          const finalMatch = currentPendingEvents.find(e => e.date.includes(userDateHint));

          if (finalMatch) {
            speakOnly(`Apro i dettagli di ${finalMatch.title}.`);
            actions.goToEvent(finalMatch.id);
            setWaitingFor(null);
            setPendingEvents([]);
          } else {
            askAndListen("Non ho trovato un evento con questa data. Vuoi riprovare?", 'view_event_disambiguate_date');
          }
          return true;
        }
      }

      // =======================================================
      // 2. NUOVI COMANDI VOCALI (Stato Idle)
      // =======================================================
      
      // --- NAVIGA AL GARAGE ---
      if (intent === 'NAVIGATE_GARAGE' || /\b(garage|lista auto|tutte le auto)\b/i.test(text)) {
        speakOnly("Torno al garage.");
        actions.goToGarage();
        return true;
      }

      // --- APRI DETTAGLIO EVENTO ---
      // Poiché l'SLM non ha l'intento specifico VIEW_EVENT, cerchiamo parole chiave nel testo grezzo
      const isEventRequest = /\b(apri|mostra|dettaglio|evento|scadenza|tagliando|bollo|assicurazione|olio|gomme|revisione)\b/i.test(text);

      if (isEventRequest) {
        if (!vehicle || !vehicle.events || vehicle.events.length === 0) {
          speakOnly("Non ci sono eventi registrati per questo veicolo.");
          return true;
        }

        // Filtriamo le stopwords contestuali per trovare il nome dell'evento
        const excludeWords = ['apri', 'mostra', 'dettaglio', 'il', 'la', 'di', 'del', 'evento', 'scadenza'];
        const searchKeywords = text.split(/\s+/).filter(w => !excludeWords.includes(w) && w.length > 2);

        let matchedEvents = vehicle.events.filter(e => {
          const titleLower = e.title.toLowerCase();
          const catLower = e.category?.toLowerCase() || '';
          return searchKeywords.some(kw => titleLower.includes(kw) || catLower.includes(kw));
        });

        // Se l'utente ha menzionato un anno (es. "bollo 2023"), pre-filtriamo
        const yearMatch = text.match(/\d{4}/);
        if (yearMatch && matchedEvents.length > 1) {
          matchedEvents = matchedEvents.filter(e => e.date.includes(yearMatch[0]));
        }

        if (matchedEvents.length === 1) {
          speakOnly(`Apro il dettaglio di ${matchedEvents[0].title}.`);
          actions.goToEvent(matchedEvents[0].id);
          return true;
        } 
        else if (matchedEvents.length > 1) {
          setPendingEvents(matchedEvents);
          askAndListen(`Ho trovato ${matchedEvents.length} eventi corrispondenti. Dimmi l'anno o la data di quello che cerchi.`, 'view_event_disambiguate_date');
          return true;
        } 
        else {
          speakOnly("Non ho trovato nessun evento con questo nome nel libretto.");
          return true;
        }
      }

      return false; // Comando non gestito localmente
    });

    return cleanup;
  }, [registerActionHandler, askAndListen, speakOnly]);

  return { waitingFor };
}