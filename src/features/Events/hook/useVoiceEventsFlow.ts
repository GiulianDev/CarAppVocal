import { useState, useEffect } from 'react';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import type { Vehicle } from '../../../shared/Garage/vehicleTypes';
import type { EventFormData } from '../components/EventForm'; // Adegua il path se necessario
import { useVoiceContext } from '../../../shared/VoiceCommand/speech/VoiceContext';

interface VoiceEventsFlowProps {
  vehicle?: Vehicle | null;
  actions: {
    submitForm: (data: EventFormData) => void;
  };
}

type WaitState =
  | 'ask_title'
  | 'ask_cost'
  | 'ask_notes'
  | 'confirm_save'
  | null;

export function useVoiceEventsFlow({ vehicle, actions }: VoiceEventsFlowProps) {
  const [waitingFor, setWaitingFor] = useState<WaitState>(null);
  const [draftData, setDraftData] = useState<Partial<EventFormData>>({});

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

      const confirmWords = ['si', 'sì', 'ok', 'certo', 'esatto', 'corretto', 'procedi', 'conferma', 'salva', 'vai'];
      const cancelWords = ['no', 'annulla', 'sbagliato', 'errato', 'fermati', 'ferma', 'esci'];

      const wordsArray = cleanAnswer.split(/\s+/);
      const isConfirm = nlpResult.intent === 'intent.confirm' || confirmWords.includes(cleanAnswer) || wordsArray.some(w => confirmWords.includes(w));
      const isCancel = nlpResult.intent === 'intent.cancel' || cancelWords.includes(cleanAnswer) || wordsArray.some(w => cancelWords.includes(w));

      // Funzione utile per estrarre il prezzo dalla frase (es: "ho speso 150 euro e 50")
      const extractNumber = (text: string) => {
        const match = text.match(/\d+(?:[.,]\d+)?/);
        return match ? parseFloat(match[0].replace(',', '.')) : null;
      };

      // =======================================================
      // CASO A: WIZARD DI INSERIMENTO EVENTO
      // =======================================================
      if (waitingFor) {
        if (isCancel) {
          setWaitingFor(null);
          setDraftData({});
          speakOnly("Operazione annullata. Nessun evento salvato.");
          return;
        }

        if (waitingFor === 'ask_title') {
          setDraftData(prev => ({ ...prev, title: nlpResult.utterance }));
          askAndListen("Perfetto. Quanto hai speso per questa operazione? Se non hai speso nulla, dimmi zero.", 'ask_cost');
          return;
        }

        if (waitingFor === 'ask_cost') {
          const cost = extractNumber(cleanAnswer);
          if (cost !== null) {
            setDraftData(prev => ({ ...prev, cost: cost }));
            askAndListen("Ricevuto. Vuoi aggiungere delle note aggiuntive? Altrimenti dimmi solo di no.", 'ask_notes');
          } else {
            askAndListen("Non ho capito la cifra. Quanto hai speso?", 'ask_cost');
          }
          return;
        }

        if (waitingFor === 'ask_notes') {
          const notes = (isConfirm || isCancel) ? '' : nlpResult.utterance;
          setDraftData(prev => ({ ...prev, notes: notes }));
          askAndListen(`Ottimo. Ricapitolando: intervento per ${draftData.title || 'Manutenzione'}. Confermi il salvataggio?`, 'confirm_save');
          return;
        }

        if (waitingFor === 'confirm_save') {
          if (isConfirm) {
            // Inviamo i dati all'azione passata come prop
            actions.submitForm({
              title: draftData.title || 'Nuovo Evento',
              notes: draftData.notes,
              // Impostiamo la data di default a oggi, il form o il backend faranno il resto
              date: new Date().toISOString().split('T')[0],
              ...draftData
            } as EventFormData);
            
            setWaitingFor(null);
            setDraftData({});
            speakOnly("L'evento è stato salvato con successo nel libretto.");
          } else {
            askAndListen("Va bene, non salvo. Vuoi modificare qualcosa?", 'confirm_save');
          }
          return;
        }
      }

      // =======================================================
      // CASO B: INNESCO E COMANDI LIBERI
      // =======================================================

      if (nlpResult.intent === 'intent.add_event') {
        if (!vehicle) {
          speakOnly("Attendi il caricamento del veicolo prima di procedere.");
          return;
        }

        // Cerchiamo di capire se l'utente ha già detto il tipo di evento
        // Es: "Aggiungi cambio olio" -> Rileviamo "olio"
        const eventKeywords = ['olio', 'gomme', 'freni', 'bollo', 'assicurazione', 'revisione', 'liquido', 'filtri', 'tagliando', 'motore'];
        const foundKeyword = eventKeywords.find(kw => cleanAnswer.includes(kw));

        if (foundKeyword) {
          const titleCapitalized = foundKeyword.charAt(0).toUpperCase() + foundKeyword.slice(1);
          const computedTitle = ['bollo', 'assicurazione', 'revisione'].includes(foundKeyword) 
            ? `Rinnovo ${titleCapitalized}` 
            : `Sostituzione/Controllo ${titleCapitalized}`;
          
          setDraftData({ title: computedTitle });
          askAndListen(`Stiamo registrando un evento per ${computedTitle}. Quanto hai speso?`, 'ask_cost');
        } else {
          setDraftData({});
          askAndListen("Certo. Che tipo di intervento o scadenza vuoi registrare? Ad esempio bollo, gomme o tagliando.", 'ask_title');
        }
        return;
      }

    });

    return cleanup;
  }, [registerActionHandler, waitingFor, draftData, vehicle, actions, askAndListen, speakOnly]);

  // Se ti serve, puoi esportare `draftData` per fare il binding in real-time sui campi visivi del form!
  return { waitingFor, draftData };
}