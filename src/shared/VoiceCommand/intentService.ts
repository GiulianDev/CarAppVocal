// src/shared/VoiceCommand/intentService.ts
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

  // 1. Controllo esatto per conferma
  if (/^(si|sii|ok|esatto|confermo|salva|salvalo|perfetto|va bene|giusto|procedi|vai|si salva)$/i.test(clean)) {
    return APP_INTENTS.CONFIRM;
  }
  
  // 2. Controllo esatto per cancellazione (solo se è l'unica parola rilevante)
  if (/^(no|annulla|cancella|reset|resetta|stop|lascia stare|fermati)$/i.test(clean)) {
    return APP_INTENTS.CANCEL;
  }

  // 3. Fast-path robusto per le modifiche (risolve "no modifica...")
  if (/\b(modifica|correggi|cambia|aggiorna)\b/i.test(clean)) {
    return APP_INTENTS.MODIFY_FIELD;
  }

  return null;
}

export interface NlpResult {
  intent: AppIntent;
  score: number;
  utterance: string;
  entities: any[];
}

export function processVoiceText(text: string, allowedIntents?: AppIntent[]): Promise<NlpResult> {
  return new Promise(async (resolve, reject) => {
    const fastIntent = checkFastPathIntent(text);
    
    // Controlliamo che il fast-path rientri nei comandi ammessi (se specificati)
    if (fastIntent && (!allowedIntents || allowedIntents.includes(fastIntent))) {
      console.log(`⚡ [Intent Service] Fast-Path attivato: ${fastIntent}`);
      return resolve({
        intent: fastIntent,
        score: 1.0,
        utterance: text, // Ritorniamo sempre il testo originale all'engine
        entities: []
      });
    }

    try {
      const worker = await initWorker();
      
      const messageHandler = (event: MessageEvent) => {
        const { status, intent, score, error } = event.data;
        
        if (status === 'complete') {
          worker.removeEventListener('message', messageHandler);
          const systemIntent = NLP_CANDIDATE_LABELS[intent as keyof typeof NLP_CANDIDATE_LABELS] || APP_INTENTS.UNKNOWN;
          resolve({ 
            intent: systemIntent, 
            score, 
            utterance: text, // FIX: Forziamo sempre il ritorno del testo originale, non quello tagliato
            entities: [] 
          });
        } else if (status === 'error') {
          worker.removeEventListener('message', messageHandler);
          reject(new Error(error));
        }
      };

      worker.addEventListener('message', messageHandler);

      let activeLabels = Object.keys(NLP_CANDIDATE_LABELS);
      
      if (allowedIntents && allowedIntents.length > 0) {
        activeLabels = Object.entries(NLP_CANDIDATE_LABELS)
          .filter(([_, intentValue]) => allowedIntents.includes(intentValue as AppIntent))
          .map(([labelText, _]) => labelText);
          
        if (activeLabels.length === 0) {
          activeLabels = Object.keys(NLP_CANDIDATE_LABELS);
        }
      }

      // PRE-PROCESSING: Rimuoviamo la negazione iniziale se seguita da testo utile.
      // Questo impedisce al modello NLP di sbilanciarsi sull'intento CANCEL.
      let textForAi = text.replace(/^(no|aspetta|scusa|errato|sbagliato)[,.\s]+/i, '').trim();
      if (!textForAi) textForAi = text;

      worker.postMessage({ 
        type: 'process', 
        text: textForAi, // Passiamo il testo "pulito" al worker
        candidateLabels: activeLabels 
      });

    } catch (err) {
      reject(err);
    }
  });
}