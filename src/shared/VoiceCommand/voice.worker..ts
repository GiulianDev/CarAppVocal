import { pipeline, env } from '@xenova/transformers';

// Configurazione per il funzionamento OFFLINE nativo.
// Istruisce Transformers.js a cercare i file dei modelli localmente (es. nella cartella public/models)
// anziché tentare di scaricarli da Hugging Face ogni volta.
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = '/models/'; // Percorso relativo alla cartella 'public' della tua app

// Modelli leggeri e ottimizzati per l'uso offline/mobile (versione ONNX quantizzata)
const EMBEDDING_MODEL = 'all-MiniLM-L6-v2';
const CLASSIFIER_MODEL = 'nli-deberta-v3-small';

let embeddingPipeline: any = null;
let classifierPipeline: any = null;

// Ottiene o inizializza la pipeline di Feature Extraction (per calcolo similarità vettoriale)
async function getEmbeddingPipeline(progressCallback: (model: string, progress: number) => void) {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline('feature-extraction', EMBEDDING_MODEL, {
      quantized: true,
      progress_callback: (data: any) => {
        if (data.status === 'progress') {
          progressCallback('embedding', data.progress);
        }
      },
    });
  }
  return embeddingPipeline;
}

// Ottiene o inizializza la pipeline di Classificazione Zero-Shot (per riconoscimento intenti)
async function getClassifierPipeline(progressCallback: (model: string, progress: number) => void) {
  if (!classifierPipeline) {
    classifierPipeline = await pipeline('zero-shot-classification', CLASSIFIER_MODEL, {
      quantized: true,
      progress_callback: (data: any) => {
        if (data.status === 'progress') {
          progressCallback('classifier', data.progress);
        }
      },
    });
  }
  return classifierPipeline;
}

// Ascolto dei messaggi provenienti dal thread principale di React
self.addEventListener('message', async (event: MessageEvent) => {
  const { type, text, candidateLabels } = event.data;

  // Helper per notificare lo stato di caricamento dei file .onnx a React
  const sendProgress = (modelType: string, progress: number) => {
    self.postMessage({ type: 'PROGRESS', modelType, progress });
  };

  try {
    // Pre-carica entrambi i modelli all'avvio dell'app per azzerare i tempi di attesa successivi
    if (type === 'PRELOAD') {
      await getEmbeddingPipeline(sendProgress);
      await getClassifierPipeline(sendProgress);
      self.postMessage({ type: 'READY' });
      return;
    }

    // Calcola l'embedding (vettore numerico) di una stringa
    if (type === 'GET_EMBEDDING') {
      const embedder = await getEmbeddingPipeline(sendProgress);
      const result = await embedder(text, { pooling: 'mean', normalize: true });
      // Trasforma il tensore di output in un array standard JS per passarlo a React
      self.postMessage({ type: 'EMBEDDING_RESULT', data: Array.from(result.data) });
      return;
    }

    // Classifica l'intento in base ai candidati forniti (Zero-Shot)
    if (type === 'CLASSIFY_INTENT') {
      const classifier = await getClassifierPipeline(sendProgress);
      const result = await classifier(text, candidateLabels, { multi_label: false });
      self.postMessage({
        type: 'CLASSIFICATION_RESULT',
        label: result.labels[0],
        score: result.scores[0],
      });
      return;
    }
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', error: error.message });
  }
});