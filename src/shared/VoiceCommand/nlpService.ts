import type { NlpResponse } from './VoiceContext';

let smlWorker: Worker | null = null;

// Inizializzazione trasparente del Web Worker compatibile con Vite / Webpack 5
function getWorker(): Worker {
  if (!smlWorker) {
    smlWorker = new Worker(
      new URL('./sml.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return smlWorker;
}

/**
 * Processa il testo vocale tramite il modello SML su Web Worker
 */
export function processVoiceText(text: string): Promise<NlpResponse> {
  return new Promise((resolve, reject) => {
    const worker = getWorker();

    const handleMessage = (event: MessageEvent) => {
      const { status, result, error } = event.data;
      
      // Rimuoviamo il listener per evitare memory leak
      worker.removeEventListener('message', handleMessage);

      if (status === 'success') {
        resolve(result as NlpResponse);
      } else {
        console.error("🧠 [SML Error]:", error);
        reject(new Error(error));
      }
    };

    worker.addEventListener('message', handleMessage);

    // Invia il testo grezzo al Worker
    worker.postMessage({ text });
  });
}