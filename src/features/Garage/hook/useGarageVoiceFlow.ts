// hook/useVehicleVoiceFlow.ts
import { useState, useEffect } from 'react';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import type { Car } from '../../../shared/Garage/car';

interface GarageVoiceFlowProps {
  cars: Car[];
  actions: {
    deleteVehicle: (id: string) => void;
    resetGarage: () => void;
  };
}

type WaitState = 'delete' | 'confirm_delete' | 'add' | 'confirm_add' | 'clean' | 'confirm_clean' | null;

export function useGarageVoiceFlow({ cars, actions }: GarageVoiceFlowProps) {
  const [waitingFor, setWaitingFor] = useState<WaitState>(null);
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
      
      // 1. Pulizia drastica: rimuoviamo la punteggiatura che le API vocali spesso inseriscono
      const cleanAnswer = rawAnswer.replace(/[.,!?]/g, '').trim();

      // 2. Dizionari di conferma sicuri (nessun problema con le lettere accentate)
      const confirmWords = ['si', 'sì', 'ok', 'certo', 'esatto', 'corretto', 'procedi', 'conferma', 'confermo', 'vai'];
      const cancelWords = ['no', 'annulla', 'sbagliato', 'errato', 'fermati'];

      // 3. Dividiamo la frase dell'utente in parole singole
      const wordsArray = cleanAnswer.split(/\s+/);

      // 4. Logica di match robusta: controlliamo l'intento NLP, la frase intera o le singole parole
      const isConfirm = 
        nlpResult.intent === 'intent.confirm' || 
        confirmWords.includes(cleanAnswer) || 
        wordsArray.some(word => confirmWords.includes(word));

      const isCancel = 
        nlpResult.intent === 'intent.cancel' || 
        cancelWords.includes(cleanAnswer) || 
        wordsArray.some(word => cancelWords.includes(word));

      // =======================================================
      // CASO A: Slot Filling (Stiamo aspettando una risposta)
      // =======================================================
      if (waitingFor) {
        console.log('wainting for ', waitingFor);


      } 

      if (nlpResult.intent === 'intent.delete_all') {

        console.log('intent delete');
        const matchedBrand = cars.find(b => cleanAnswer.includes(b.plate));
        if (matchedBrand) {
          console.log('car plate match')
          // askAndListen(`Ok, ${matchedBrand}. Che modello è?`, 'model');
        } 


      }





  
    });

    return cleanup;
  }, [
    registerActionHandler, waitingFor, pendingValue, actions, askAndListen, speakOnly
  ]);

  return { waitingFor };
}