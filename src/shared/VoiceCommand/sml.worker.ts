import { pipeline, env } from '@xenova/transformers';

// Definiamo i tipi di intenti supportati
const INTENTS = [
  'intent.add_vehicle',
  'intent.add_event',
  'intent.set_favorite',
  'intent.garage',
  'intent.calendar_all'
];

// ==========================================
// CONFIGURAZIONE 100% LOCALE / OFFLINE
// ==========================================
// Blocca le chiamate di rete verso Hugging Face
env.allowRemoteModels = false; 

// Abilita i modelli locali
env.allowLocalModels = true; 

// Imposta il percorso relativo alla cartella `public`
env.localModelPath = '/models/';

// Usa la cache del browser per caricamenti ancora più veloci
env.useBrowserCache = true;

// ==========================================
// INIZIALIZZAZIONE PIPELINE
// ==========================================
let classifierPromise: Promise<any> | null = null;

async function getClassifier() {
  if (!classifierPromise) {
    // Passiamo solo il nome della cartella presente sotto /public/models/
    classifierPromise = pipeline(
      'zero-shot-classification', 
      'typeform-distilbert-base-uncased-mnli'
    );
  }
  return classifierPromise;
}

// Helper interno per estrarre entità chiave tramite regex/pattern contestuali
function extractEntities(text: string) {
  const entities: any[] = [];
  const lower = text.toLowerCase();

  // 1. Estrazione Importo / Costo (es. 150€, 80 euro)
  const costMatch = text.match(/(\d+[\.,]?\d*)\s*(euro|€)/i) || text.match(/(speso|costo|pagato)\s*(\d+)/i);
  if (costMatch) {
    const val = parseFloat((costMatch[1] || costMatch[2]).replace(',', '.'));
    entities.push({
      entity: 'cost',
      sourceText: costMatch[0],
      resolution: { value: val, unit: 'EUR' }
    });
  }

  // 2. Estrazione Tipo Evento (tagliando, bollo, revisione, assicurazione, riparazione)
  const eventTypes = ['tagliando', 'bollo', 'revisione', 'assicurazione', 'riparazione', 'cambio gomme', 'lavaggio'];
  for (const type of eventTypes) {
    if (lower.includes(type)) {
      entities.push({
        entity: 'event_type',
        sourceText: type,
        resolution: { value: type }
      });
      break;
    }
  }

  // 3. Estrazione Targa (formato standard italiano: 2 lettere, 3 cifre, 2 lettere)
  const plateMatch = text.match(/\b[A-Za-z]{2}\s*\d{3}\s*[A-Za-z]{2}\b/i);
  if (plateMatch) {
    entities.push({
      entity: 'plate',
      sourceText: plateMatch[0],
      resolution: { value: plateMatch[0].replace(/\s+/g, '').toUpperCase() }
    });
  }

  return entities;
}

// Gestore dei messaggi inviati al Web Worker
self.onmessage = async (event: MessageEvent<{ text: string }>) => {
  const { text } = event.data;

  try {
    const classifier = await getClassifier();
    
    // Classificazione dell'intento con l'SML
    const output = await classifier(text, INTENTS);
    
    const topIntent = output.labels[0];
    const topScore = output.scores[0];

    // Estrazione entità
    const entities = extractEntities(text);

    self.postMessage({
      status: 'success',
      result: {
        intent: topScore > 0.35 ? topIntent : 'intent.unknown',
        score: topScore,
        entities,
        utterance: text
      }
    });
  } catch (error: any) {
    self.postMessage({
      status: 'error',
      error: error?.message || 'Errore durante l\'elaborazione SML'
    });
  }
};