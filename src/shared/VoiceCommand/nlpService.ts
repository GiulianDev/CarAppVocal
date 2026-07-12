// ==========================================
// 1. DIZIONARIO DEGLI INTENTI (SINGLE SOURCE OF TRUTH)
// ==========================================
export const APP_INTENTS = {
  CONFIRM: 'intent.confirm',
  CANCEL: 'intent.cancel',
  ADD_VEHICLE: 'intent.add_vehicle',
  MODIFY_FIELD: 'intent.modify_field', // Generalizzato! Utile sia per auto che per eventi
  GOTO_GARAGE: 'intent.garage',
  ADD_EVENT: 'intent.add_event',       // Predisposto per il futuro
  VIEW_EVENT: 'intent.view_event',     // Predisposto per il futuro
  UNKNOWN: 'intent.unknown',
} as const;

export type AppIntent = typeof APP_INTENTS[keyof typeof APP_INTENTS];

// 2. MAPPATURA PER ZERO-SHOT CLASSIFIER (Etichette in linguaggio naturale)
export const NLP_CANDIDATE_LABELS = {
  'salvare confermare procedere': APP_INTENTS.CONFIRM,
  'annullare cancellare azzerare fermare': APP_INTENTS.CANCEL,
  'aggiungere inserire nuovo veicolo macchina': APP_INTENTS.ADD_VEHICLE,
  'modificare correggere cambiare campo valore': APP_INTENTS.MODIFY_FIELD,
  'andare aprire garage lista': APP_INTENTS.GOTO_GARAGE,
  'aggiungere inserire evento manutenzione tagliando': APP_INTENTS.ADD_EVENT,
  'visualizzare mostrare dettaglio evento': APP_INTENTS.VIEW_EVENT,
} as const;

// ==========================================
// GESTIONE WORKER
// ==========================================
let nlpWorker: Worker | null = null;

export async function initWorker(): Promise<Worker> {
  if (!nlpWorker) {
    nlpWorker = new Worker(new URL('./nlpWorker.ts', import.meta.url), {
      type: 'module'
    });
  }
  return nlpWorker;
}

export async function preloadModel(): Promise<void> {
  console.log("⏳ [NLP Service] Pre-caricamento del modello (Worker)...");
  try {
    await initWorker();
    console.log("✅ [NLP Service] Worker NLP pre-caricato e pronto all'uso.");
  } catch (error) {
    console.error("❌ [NLP Service] Errore nel pre-caricamento del worker:", error);
    throw error;
  }
}

// ==========================================
// ELABORAZIONE TESTO
// ==========================================

// FAST-PATH: Regole deterministiche per comandi frequenti (Evita di svegliare l'IA)
function checkFastPathIntent(text: string): AppIntent | null {
  const clean = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,!?]/g, '')
    .trim();

  if (/^(si|sii|ok|esatto|confermo|salva|salvalo|perfetto|va bene|giusto|procedi|vai|si salva)$/i.test(clean)) {
    return APP_INTENTS.CONFIRM;
  }
  if (/^(no|annulla|cancella|reset|resetta|stop|lascia stare|fermati)$/i.test(clean)) {
    return APP_INTENTS.CANCEL;
  }
  return null;
}

export interface NlpResult {
  intent: AppIntent;
  score: number;
  utterance: string;
  entities: any[]; // Qui potremo tipizzare le entità in futuro
}

export function processVoiceText(text: string): Promise<NlpResult> {
  return new Promise(async (resolve, reject) => {
    // 1. Controllo Deterministic Fast-Path
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

    // 2. Controllo Tramite IA Zero-Shot
    try {
      const worker = await initWorker();
      
      const messageHandler = (event: MessageEvent) => {
        const { status, intent, score, utterance, error } = event.data;
        
        if (status === 'complete') {
          worker.removeEventListener('message', messageHandler);
          // Mappatura inversa: dalla stringa in linguaggio naturale all'intent di sistema
          const systemIntent = NLP_CANDIDATE_LABELS[intent as keyof typeof NLP_CANDIDATE_LABELS] || APP_INTENTS.UNKNOWN;
          
          resolve({ 
            intent: systemIntent, 
            score, 
            utterance, 
            entities: [] 
          });
        } else if (status === 'error') {
          worker.removeEventListener('message', messageHandler);
          reject(new Error(error));
        }
      };

      worker.addEventListener('message', messageHandler);
      
      // Passiamo anche le labels al worker così non deve averle hardcodate
      worker.postMessage({ 
        type: 'process', 
        text, 
        candidateLabels: Object.keys(NLP_CANDIDATE_LABELS) 
      });

    } catch (err) {
      reject(err);
    }
  });
}