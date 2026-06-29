import { useState, useEffect } from 'react';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import type { Vehicle } from '../../../shared/Garage/vehicle';

interface VehicleDetailVoiceFlowProps {
  vehicle: Vehicle | null;
  actions: {
    goToGarage: () => void;
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

export function useVehicleDetailVoiceFlow({ vehicle, actions }: VehicleDetailVoiceFlowProps) {
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

      // =======================================================
      // CASO A: Stiamo aspettando una risposta specifica
      // =======================================================
      if (waitingFor) {
        


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
    });

    return cleanup;
  }, [
    registerActionHandler, waitingFor, pendingValue, vehicle, actions, askAndListen, speakOnly
  ]);

  return { waitingFor };
}