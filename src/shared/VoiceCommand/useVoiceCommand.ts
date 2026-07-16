/*
 * Gestire il riconoscimento vocale (microfono) su piattaforma nativa (Capacitor/Android) e browser (Web Speech API)
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

// Timeout di sicurezza: se non arriva nessun risultato (silenzio, rumore,
// mancata emissione dell'evento da parte del plugin), evitiamo che la
// Promise resti sospesa per sempre e che i listener nativi restino
// registrati all'infinito.
//
// Il valore è volutamente generoso: sul ramo nativo il plugin apre il
// dialog di sistema Android (popup: true), che richiede tempo di reazione
// dell'utente prima ancora di iniziare a parlare (ed eventualmente anche
// il permesso microfono al primo utilizzo). Un timeout troppo corto scatta
// prima che il risultato reale arrivi, e la cleanup rimuove il listener
// proprio mentre il risultato sta per arrivare: la trascrizione viene
// scartata in silenzio, pur con l'icona ancora "attiva".
const LISTEN_TIMEOUT_MS = 20000;

export function useVoiceCommand() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (Capacitor.isNativePlatform()) {
        SpeechRecognition.removeAllListeners();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startListening = useCallback((): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      setError(null);
      setTranscript('');
      setIsListening(true);

      // Evita risoluzioni/rigetti multipli della stessa Promise se più
      // percorsi (risultato, timeout, errore) scattano in sequenza.
      let settled = false;

      try {
        if (Capacitor.isNativePlatform()) {
          // --- FLUSSO ANDROID NATIVO ---
          console.log(`🎤 [VoiceCommand] Avvio ascolto nativo (Android)`);
          const status = await SpeechRecognition.checkPermissions();
          console.log(`🎤 [VoiceCommand] Permessi microfono:`, status.speechRecognition);

          if (status.speechRecognition !== 'granted') {
            const request = await SpeechRecognition.requestPermissions();
            console.log(`🎤 [VoiceCommand] Esito richiesta permessi:`, request.speechRecognition);
            if (request.speechRecognition !== 'granted') {
              throw new Error("Permesso microfono negato");
            }
          }

          const cleanupNative = () => {
            SpeechRecognition.removeAllListeners();
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setIsListening(false);
          };

          timeoutRef.current = setTimeout(() => {
            if (settled) return;
            settled = true;
            console.warn("[useVoiceCommand] Timeout: nessun risultato dal riconoscimento vocale");
            cleanupNative();
            reject(new Error("Nessun risultato: timeout riconoscimento vocale"));
          }, LISTEN_TIMEOUT_MS);

          SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
            // Ignora eventuali listener residui di un tentativo precedente
            // già risolto/scaduto (non dovrebbe più accadere grazie al
            // cleanup, ma resta una guardia difensiva a basso costo).
            if (settled) return;
            if (data.matches && data.matches.length > 0) {
              console.log(`🎤 [VoiceCommand] Risultato nativo ricevuto: "${data.matches[0]}"`);
              settled = true;
              setTranscript(data.matches[0]);
              resolve(data.matches[0]);
              cleanupNative();
            }
          });

          await SpeechRecognition.start({
            language: 'it-IT',
            maxResults: 1,
            prompt: 'Descrivi il veicolo',
            partialResults: false,
            popup: true,
          });
          console.log(`🎤 [VoiceCommand] Riconoscimento nativo avviato, in attesa del popup di sistema...`);
          // FIX: NON spegniamo isListening qui. A questo punto il
          // riconoscimento nativo è appena partito ed è ancora attivamente
          // in ascolto in background: il risultato arriva più avanti
          // tramite l'evento 'partialResults'. Lo stato passa a false solo
          // quando arriva un risultato, un errore o scatta il timeout
          // (vedi cleanupNative sopra).

        } else {
          // --- FLUSSO BROWSER (Fallback) ---
          console.log(`🎤 [VoiceCommand] Avvio ascolto browser (Web Speech API)`);
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
            settled = true;
            const result = event.results[0][0].transcript;
            console.log(`🎤 [VoiceCommand] Risultato browser ricevuto: "${result}"`);
            setTranscript(result);
            resolve(result);
          };

          recognition.onerror = (event: any) => {
            settled = true;
            console.warn(`🎤 [VoiceCommand] Errore Web Speech:`, event.error);
            setError(`Errore Web Speech: ${event.error}`);
            setIsListening(false);
            reject(event.error);
          };

          recognition.onend = () => {
            console.log(`🎤 [VoiceCommand] Riconoscimento browser terminato (settled: ${settled})`);
            setIsListening(false);
            // FIX: se il riconoscimento termina senza risultato né errore
            // esplicito, la Promise restava sospesa per sempre. Capita ad
            // es. se il browser non segnala "no-speech" come errore vero e
            // proprio.
            if (!settled) {
              settled = true;
              reject(new Error("Nessun risultato riconosciuto"));
            }
          };

          recognition.start();
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Errore microfono");
        setIsListening(false);
        if (!settled) {
          settled = true;
          reject(err);
        }
      }
    })
  }, []);

  const stopListening = useCallback(async () => {
    console.log(`🎤 [VoiceCommand] stopListening chiamato manualmente`);
    if (Capacitor.isNativePlatform()) {
      await SpeechRecognition.stop();
      SpeechRecognition.removeAllListeners();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
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