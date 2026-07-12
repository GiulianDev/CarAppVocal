// src/shared/VoiceCommand/nlpService.ts

// Manteniamo un'istanza singola del Worker per evitare di ricaricare 
// il modello in memoria (e sprecare risorse) ad ogni chiamata.
let nlpWorker: Worker | null = null;

export async function initWorker() {
  if (!nlpWorker) {
    // Vite supporta nativamente la creazione di Worker tramite URL e import.meta.url
    nlpWorker = new Worker(new URL('./nlpWorker.ts', import.meta.url), {
      type: 'module'
    });
  }
  return nlpWorker;
}

// ==========================================
// MAPPATURA INTENTI: Da Umano a Sistema
// ==========================================
// Il Transformer restituisce le etichette semantiche umane (es. 'andare al garage').
// Noi le mappiamo con le stringhe 'intent.*' che i tuoi hook (es. useAddVehicleVoiceFlow) si aspettano.
const intentMap: Record<string, string> = {
  'aggiungere un veicolo': 'intent.add_vehicle',
  'andare al garage': 'intent.garage',
  'aggiungere evento di manutenzione': 'intent.add_event',
  'visualizzare dettaglio evento': 'intent.view_event',
  'confermare': 'intent.confirm',
  'annullare': 'intent.cancel',
  'modificare targa': 'intent.modify_plate',
  'modificare modello': 'intent.modify_model',
  'modificare costruttore': 'intent.modify_brand',
};

/**
 * Funzione principale da chiamare per analizzare la voce.
 * Trasforma la comunicazione asincrona del Worker in una comoda Promise.
 */
export function processVoiceText(text: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const worker = await initWorker();

    // Creiamo un handler specifico per questa richiesta
    const messageHandler = (event: MessageEvent) => {
      const { status, intent, score, utterance, error, data } = event.data;

      if (status === 'progress') {
        // Il modello si sta scaricando (succede solo al primissimo avvio).
        // Logghiamo il progresso, ma in futuro potremmo inviarlo all'interfaccia utente!
        console.log(`[Transformers.js] Download: ${Math.round(data.progress || 0)}% - File: ${data.file}`);
      } 
      else if (status === 'complete') {
        // L'analisi è finita, rimuoviamo l'ascoltatore per evitare memory leak
        worker.removeEventListener('message', messageHandler);
        
        // Convertiamo l'etichetta semantica nell'intento di sistema
        const systemIntent = intentMap[intent] || intent;
        
        console.log(`🧠 [NLP Worker] Intento: ${systemIntent} (Confidenza: ${Math.round(score * 100)}%)`);

        // Risolviamo la Promise restituendo l'oggetto nel formato che la tua app già si aspetta
        resolve({
          intent: systemIntent,
          score: score,
          utterance: utterance,
          entities: [] // Le entities specifiche le estrarremo nel prossimo step se necessario
        });
      } 
      else if (status === 'error') {
        worker.removeEventListener('message', messageHandler);
        reject(new Error(error));
      }
    };

    // Mettiamoci in ascolto della risposta dal Worker
    worker.addEventListener('message', messageHandler);

    // Inviamo il testo catturato dal microfono al Worker per l'elaborazione
    worker.postMessage({ type: 'process', text });
  });
}

/**
 * Da chiamare all'avvio dell'app per scaricare e allocare il modello in background.
 */
export function preloadModel(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const worker = await initWorker();

    const handler = (event: MessageEvent) => {
      const { status, error, data } = event.data;

      if (status === 'progress') {
        // Se vuoi mostrare una vera progress bar globale nell'app, puoi gestire 'data' qui
        // console.log(`Download in background: ${Math.round(data.progress || 0)}%`);
      } else if (status === 'ready') {
        worker.removeEventListener('message', handler);
        console.log("✅ [Transformers.js] Modello precaricato con successo in background!");
        resolve();
      } else if (status === 'error') {
        worker.removeEventListener('message', handler);
        reject(new Error(error));
      }
    };

    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'preload' });
  });
}