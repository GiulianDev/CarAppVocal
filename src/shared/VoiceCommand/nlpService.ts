let nlpWorker: Worker | null = null;

export async function initWorker() {
  if (!nlpWorker) {
    nlpWorker = new Worker(new URL('./nlpWorker.ts', import.meta.url), {
      type: 'module'
    });
  }
  return nlpWorker;
}

const intentMap: Record<string, string> = {
  'salvare o confermare': 'intent.confirm',
  'aggiungere un veicolo': 'intent.add_vehicle',
  'modificare la targa': 'intent.modify_plate',
  'modificare il modello': 'intent.modify_model',
  'modificare la marca o costruttore': 'intent.modify_brand',
  'annullare o azzerare': 'intent.cancel',
  'andare al garage': 'intent.garage',
  'aggiungere evento di manutenzione': 'intent.add_event',
  'visualizzare dettaglio evento': 'intent.view_event',
};

// Riconoscimento rapido e deterministico per parole chiave ad alta frequenza
function checkFastPathIntent(text: string): string | null {
  const clean = text.toLowerCase().replace(/[.,!?]/g, '').trim();
  
  if (/^(sì|si|ok|esatto|confermo|salva|salvalo|perfetto|va bene|giusto)$/i.test(clean)) {
    return 'intent.confirm';
  }
  if (/^(no|annulla|cancella|reset|resetta|stop)$/i.test(clean)) {
    return 'intent.cancel';
  }
  return null;
}

export function processVoiceText(text: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    // 1. Controlla prima il Fast-Path deterministico
    const fastIntent = checkFastPathIntent(text);
    if (fastIntent) {
      console.log(`⚡ [NLP Service] Fast-Path attivato: ${fastIntent}`);
      return resolve({
        intent: fastIntent,
        score: 1.0,
        utterance: text,
        entities: []
      });
    }

    // 2. Altrimenti delega al Worker Zero-Shot
    const worker = await initWorker();
    const messageHandler = (event: MessageEvent) => {
      const { status, intent, score, utterance, error, data } = event.data;
      if (status === 'progress') {
        console.log(`[Transformers.js] Download: ${Math.round(data.progress || 0)}% - File: ${data.file}`);
      } else if (status === 'complete') {
        worker.removeEventListener('message', messageHandler);
        const systemIntent = intentMap[intent] || intent;
        console.log(`🧠 [NLP Worker] Intento: ${systemIntent} (Confidenza: ${Math.round(score * 100)}%)`);
        resolve({
          intent: systemIntent,
          score: score,
          utterance: utterance,
          entities: []
        });
      } else if (status === 'error') {
        worker.removeEventListener('message', messageHandler);
        reject(new Error(error));
      }
    };
    worker.addEventListener('message', messageHandler);
    worker.postMessage({ type: 'process', text });
  });
}

export function preloadModel(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const worker = await initWorker();
    const handler = (event: MessageEvent) => {
      const { status, error } = event.data;
      if (status === 'ready') {
        worker.removeEventListener('message', handler);
        console.log("✅ [Transformers.js] Modello precaricato con successo!");
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