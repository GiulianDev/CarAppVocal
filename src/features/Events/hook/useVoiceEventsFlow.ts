import { useState, useEffect, useRef } from 'react';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import type { Vehicle } from '../../../shared/Garage/vehicle';
import type { EventFormData } from '../components/EventForm';
import type { VoiceAnalysisResult } from '../../../shared/VoiceCommand/types';

interface VoiceEventsFlowProps {
  vehicle?: Vehicle | null;
  actions: {
    submitForm: (data: EventFormData) => void;
  };
}

type WaitState = 'ask_title' | 'ask_notes' | 'confirm_save' | null;

export function useVoiceEventsFlow({ vehicle, actions }: VoiceEventsFlowProps) {
  const [waitingFor, setWaitingFor] = useState<WaitState>(null);
  const [draftData, setDraftData] = useState<Partial<EventFormData>>({});

  const { registerActionHandler } = useVoiceContext();
  const { speakAndListen, speakOnly } = useSpeechAction();

  // Reference per evitare stale closures durante il dialogo step-by-step
  const ref = useRef({ vehicle, actions, waitingFor, draftData });
  useEffect(() => {
    ref.current = { vehicle, actions, waitingFor, draftData };
  });

  const askAndListen = (question: string, expectedField: WaitState) => {
    setWaitingFor(expectedField);
    speakAndListen(question);
  };

  useEffect(() => {
    const cleanup = registerActionHandler((nlpResult: VoiceAnalysisResult): boolean => {
      const { intent, entities, rawText } = nlpResult;
      const text = (rawText || '').toLowerCase().trim();
      const { vehicle: currentVehicle, actions: currentActions, waitingFor: currentWaitingFor, draftData: currentDraftData } = ref.current;

      const isConfirm = intent === 'CONFIRM' || /\b(si|sì|ok|certo|esatto|corretto|procedi|conferma|salva|vai)\b/i.test(text);
      const isCancel = intent === 'CANCEL' || /\b(no|annulla|sbagliato|errato|fermati|ferma|esci|salta)\b/i.test(text);

      // =======================================================
      // 1. WIZARD DI INSERIMENTO EVENTO IN CORSO
      // =======================================================
      if (currentWaitingFor) {
        if (isCancel && currentWaitingFor !== 'ask_notes') {
          setWaitingFor(null);
          setDraftData({});
          speakOnly("Operazione annullata. Nessun evento salvato.");
          return true;
        }

        if (currentWaitingFor === 'ask_title') {
          const newTitle = entities.extractedText || text;
          setDraftData(prev => ({ ...prev, title: newTitle }));
          askAndListen("Ricevuto. Vuoi aggiungere delle note? Altrimenti dimmi solo di no.", 'ask_notes');
          return true;
        }

        if (currentWaitingFor === 'ask_notes') {
          // Se dice "no" o annulla in questo step, semplicemente saltiamo le note
          const notes = isCancel ? undefined : (entities.extractedText || text);
          setDraftData(prev => ({ ...prev, notes }));
          
          // Nota: usiamo il title da currentDraftData per la pronuncia (o una stringa fallback)
          askAndListen(`Ottimo. Confermi il salvataggio per l'evento?`, 'confirm_save');
          return true;
        }

        if (currentWaitingFor === 'confirm_save') {
          if (isConfirm) {
            currentActions.submitForm({
              title: currentDraftData.title || 'Nuovo Evento',
              notes: currentDraftData.notes,
              category: 'manutenzione', // Default in assenza di disambiguazione
              date: new Date().toISOString().split('T')[0],
              ...currentDraftData
            } as EventFormData);
            
            setWaitingFor(null);
            setDraftData({});
            speakOnly("L'evento è stato registrato con successo nel libretto.");
          } else {
            askAndListen("Va bene, non salvo. Vuoi modificare qualcosa o esci?", 'confirm_save');
          }
          return true;
        }
      }

      // =======================================================
      // 2. INNESCO COMANDI LIBERI (Stato Idle)
      // =======================================================
      const isAddEventIntent = /\b(aggiungi|inserisci|nuovo|registra)\b.*\b(evento|manutenzione|scadenza|spesa|tagliando)\b/i.test(text);
      const eventKeywords = ['olio', 'gomme', 'freni', 'bollo', 'assicurazione', 'revisione', 'liquido', 'filtri', 'tagliando', 'motore'];
      const foundKeyword = eventKeywords.find(kw => text.includes(kw));

      if (isAddEventIntent || foundKeyword) {
        if (!currentVehicle) {
          speakOnly("Attendi il caricamento del veicolo prima di procedere.");
          return true;
        }

        if (foundKeyword) {
          const titleCapitalized = foundKeyword.charAt(0).toUpperCase() + foundKeyword.slice(1);
          const computedTitle = ['bollo', 'assicurazione', 'revisione'].includes(foundKeyword) 
            ? `Rinnovo ${titleCapitalized}` 
            : `Sostituzione/Controllo ${titleCapitalized}`;
          
          setDraftData({ title: computedTitle });
          askAndListen(`Stiamo registrando un evento per ${computedTitle}. Vuoi aggiungere delle note?`, 'ask_notes');
        } else {
          setDraftData({});
          askAndListen("Certo. Che tipo di intervento o scadenza vuoi registrare? Ad esempio bollo, gomme o tagliando.", 'ask_title');
        }
        return true;
      }

      return false; 
    });

    return cleanup;
  }, [registerActionHandler, askAndListen, speakOnly]);

  return { waitingFor, draftData };
}