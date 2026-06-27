import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export function useVoiceCommand() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (Capacitor.isNativePlatform()) {
        SpeechRecognition.removeAllListeners();
      }
    };
  }, []);

  const startListening = useCallback((): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    setError(null);
    setTranscript('');
    setIsListening(true);


    try {
      if (Capacitor.isNativePlatform()) {
        // --- FLUSSO ANDROID NATIVO ---
        // Correzione: usiamo .speechRecognition invece di .permission
        const status = await SpeechRecognition.checkPermissions();
        
        if (status.speechRecognition !== 'granted') {
          const request = await SpeechRecognition.requestPermissions();
          if (request.speechRecognition !== 'granted') {
            throw new Error("Permesso microfono negato");
          }
        }

        SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
          if (data.matches && data.matches.length > 0) {
            setTranscript(data.matches[0]);
            // Quando riceviamo il risultato, risolviamo la Promise e fermiamo l'ascolto!
            resolve(data.matches[0]); 
            SpeechRecognition.removeAllListeners();
          }
        });

        await SpeechRecognition.start({
          language: 'it-IT',
          maxResults: 1,
          prompt: 'Descrivi il veicolo',
          partialResults: false, 
          popup: true,
        });

        setIsListening(false);

      } else {
        // --- FLUSSO BROWSER (Fallback) ---
        // Correzione: Bypassiamo il controllo stretti di TS sull'oggetto window
        const windowAny = window as any;
        const SpeechRecognitionWeb = windowAny.SpeechRecognition || windowAny.webkitSpeechRecognition;
        
        if (!SpeechRecognitionWeb) {
          throw new Error("Riconoscimento vocale non supportato su questo browser");
        }

        const recognition = new SpeechRecognitionWeb();
        recognition.lang = 'it-IT';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const result = event.results[0][0].transcript;
          setTranscript(result);
          resolve(result); // Risolviamo la Promise!
        };

        recognition.onerror = (event: any) => {
          setError(`Errore Web Speech: ${event.error}`);
          setIsListening(false);
          reject(event.error); // Rigettiamo la Promise in caso di errore
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Errore microfono");
      setIsListening(false);
      reject(err);
    }
    })
  }, []);

  const stopListening = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await SpeechRecognition.stop();
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening
  };
}