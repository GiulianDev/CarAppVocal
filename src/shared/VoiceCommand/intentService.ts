// ==========================================
// 1. DIZIONARIO DEGLI INTENTI (SINGLE SOURCE OF TRUTH)
// ==========================================
export const APP_INTENTS = {
  CONFIRM: 'intent.confirm',
  CANCEL: 'intent.cancel',
  ADD_VEHICLE: 'intent.add_vehicle',
  MODIFY_FIELD: 'intent.modify_field',
  GOTO_GARAGE: 'intent.garage',
  ADD_EVENT: 'intent.add_event',
  VIEW_EVENT: 'intent.view_event',
  UNKNOWN: 'intent.unknown',
} as const;

export type AppIntent = typeof APP_INTENTS[keyof typeof APP_INTENTS];

// 2. MAPPATURA PER ZERO-SHOT CLASSIFIER
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
let intentWorker: Worker | null = null;

export async function initWorker(): Promise<Worker> {
  if (!intentWorker) {
    intentWorker = new Worker(new URL('./intentWorker.ts', import.meta.url), {
      type: 'module'
    });
  }
  return intentWorker;
}

export async function preloadModel(): Promise<void> {
  console.log("⏳ [Intent Service] Pre-caricamento del modello (Worker)...");
  try {
    await initWorker();
    console.log("✅ [Intent Service] Worker pre-caricato e pronto all'uso.");
  } catch (error) {
    console.error("❌ [Intent Service] Errore nel pre-caricamento del worker:", error);
    throw error;
  }
}

// ==========================================
// ELABORAZIONE TESTO
// ==========================================

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
  entities: any[];
}

// Aggiunto il parametro opzionale allowedIntents per il filtraggio contestuale
export function processVoiceText(text: string, allowedIntents?: AppIntent[]): Promise<NlpResult> {
  return new Promise(async (resolve, reject) => {
    const fastIntent = checkFastPathIntent(text);
    
    // Controlliamo che il fast-path rientri nei comandi ammessi (se specificati)
    if (fastIntent && (!allowedIntents || allowedIntents.includes(fastIntent))) {
      console.log(`⚡ [Intent Service] Fast-Path attivato: ${fastIntent}`);
      return resolve({
        intent: fastIntent,
        score: 1.0,
        utterance: text,
        entities: []
      });
    }

    try {
      const worker = await initWorker();
      
      const messageHandler = (event: MessageEvent) => {
        const { status, intent, score, utterance, error } = event.data;
        
        if (status === 'complete') {
          worker.removeEventListener('message', messageHandler);
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

      // Calcoliamo quali label inviare al modello Transformer.js
      let activeLabels = Object.keys(NLP_CANDIDATE_LABELS);
      
      if (allowedIntents && allowedIntents.length > 0) {
        activeLabels = Object.entries(NLP_CANDIDATE_LABELS)
          .filter(([_, intentValue]) => allowedIntents.includes(intentValue as AppIntent))
          .map(([labelText, _]) => labelText);
          
        // Fallback di sicurezza estremo: se c'è stato un errore logico e abbiamo 0 label, ricarichiamo tutto
        if (activeLabels.length === 0) {
          activeLabels = Object.keys(NLP_CANDIDATE_LABELS);
        }
      }

      worker.postMessage({ 
        type: 'process', 
        text, 
        candidateLabels: activeLabels 
      });

    } catch (err) {
      reject(err);
    }
  });
}