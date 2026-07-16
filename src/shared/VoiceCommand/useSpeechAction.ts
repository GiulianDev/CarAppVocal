// hook/useSpeechAction.ts
import { useRef } from 'react';
import { useVoiceContext } from './VoiceContext';

export function useSpeechAction() {
  const { startListening } = useVoiceContext();
  
  // Ref per evitare il garbage collection aggressivo di Chrome
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speakAndListen = (text: string) => {
    console.log(`🔊 [SpeechAction] speakAndListen -> "${text}"`);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utteranceRef.current = utterance;

    // Guardia contro il doppio avvio: alcuni browser (Chrome in primis)
    // hanno bug noti per cui "onend" a volte non scatta mai. Se succede,
    // senza un fallback il microfono non si accenderebbe più e l'utente
    // parlerebbe nel vuoto, come nel caso del "sì" non riconosciuto.
    let listeningTriggered = false;
    const triggerListening = (source: 'onend' | 'onerror') => {
      if (listeningTriggered) return;
      listeningTriggered = true;
      console.log(`🔊 [SpeechAction] Sintesi terminata (evento: ${source}). Avvio ascolto tra 300ms...`);
      // Diamo 300ms alla scheda audio per lo switch In/Out
      setTimeout(() => {
        console.log(`🎤 [SpeechAction] Chiamo startListening()`);
        startListening();
      }, 300);
    };

    utterance.onend = () => triggerListening('onend');
    utterance.onerror = (event) => {
      console.warn(`🔊 [SpeechAction] Errore sintesi vocale:`, event);
      triggerListening('onerror');
    };

    window.speechSynthesis.speak(utterance);
  };

  const speakOnly = (text: string) => {
    console.log(`🔊 [SpeechAction] speakOnly -> "${text}"`);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.onerror = (event) => {
      console.warn(`🔊 [SpeechAction] Errore sintesi vocale (speakOnly):`, event);
    };
    window.speechSynthesis.speak(utterance);
  };

  return { speakAndListen, speakOnly };
}