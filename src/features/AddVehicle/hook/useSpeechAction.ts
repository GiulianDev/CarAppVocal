// hook/useSpeechAction.ts
import { useRef } from 'react';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';

export function useSpeechAction() {
  const { startListening } = useVoiceContext();
  
  // Ref per evitare il garbage collection aggressivo di Chrome
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speakAndListen = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utteranceRef.current = utterance;
    
    utterance.onend = () => {
      // Diamo 300ms alla scheda audio per lo switch In/Out
      setTimeout(() => {
        startListening();
      }, 300);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const speakOnly = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    window.speechSynthesis.speak(utterance);
  };

  return { speakAndListen, speakOnly };
}