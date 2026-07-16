// src/shared/VoiceCommand/intentService.ts
// ==========================================
// 1. DIZIONARIO DEGLI INTENTI (SINGLE SOURCE OF TRUTH)
// ==========================================
export const APP_INTENTS = {
  CONFIRM: 'intent.confirm',
  CANCEL: 'intent.cancel',
  MODIFY_FIELD: 'intent.modify_field',
  GOTO_GARAGE: 'intent.garage',
  UNKNOWN: 'intent.unknown',
} as const;

export type AppIntent = typeof APP_INTENTS[keyof typeof APP_INTENTS];

// 2. MAPPATURA PER ZERO-SHOT CLASSIFIER
export const NLP_CANDIDATE_LABELS = {
  'confermare salvare procedere ok': APP_INTENTS.CONFIRM,
  'annullare cancellare fermare stop': APP_INTENTS.CANCEL,
  'modificare correggere cambiare aggiornare sostituire': APP_INTENTS.MODIFY_FIELD,
  'andare aprire garage lista veicoli': APP_INTENTS.GOTO_GARAGE,
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

  // 1. Conferma
  if (/^(si|sii|ok|esatto|confermo|salva|salvalo|perfetto|va bene|giusto|procedi|vai|si salva)$/i.test(clean)) {
    return APP_INTENTS.CONFIRM;
  }
  
  // 2. Cancellazione (solo se è l'unica parola rilevante)
  if (/^(no|annulla|cancella|reset|resetta|stop|lascia stare|fermati)$/i.test(clean)) {
    return APP_INTENTS.CANCEL;
  }

  // 3. CORREZIONE ESPLICITA: pattern per "modello/marca/targa è X"
  // Cattura anche con "No" davanti e articoli opzionali
  if (
    /\bmodello\s+(?:è|e|sia|sarebbe|dovrebbe essere)\s+\w+/i.test(clean) ||
    /\b(?:marca|costruttore)\s+(?:è|e|sia|sarebbe|dovrebbe essere)\s+\w+/i.test(clean) ||
    /\btarga\s+(?:è|e|sia|sarebbe|dovrebbe essere)\s+[a-z0-9]+/i.test(clean)
  ) {
    console.log(`🔧 [Fast-Path] Rilevata correzione di campo con "è": "${text}"`);
    return APP_INTENTS.MODIFY_FIELD;
  }

  // 4. Correzione esplicita con "modifica/correggi/cambia" + campo
  if (
    /\b(modifica|correggi|cambia|aggiorna)\s+(?:il\s+)?(?:modello|marca|costruttore|targa)\s+(?:in|con)\s+\w+/i.test(clean)
  ) {
    console.log(`🔧 [Fast-Path] Rilevata correzione con verbo di modifica: "${text}"`);
    return APP_INTENTS.MODIFY_FIELD;
  }

  // 5. Modifica generica (con "modifica", "correggi", "cambia" o negazione iniziale)
  if (
    /^(no|non|invece|anzi|sbagliato|ma|però)\b/.test(clean) ||
    /\b(modifica|correggi|cambia|aggiorna|scrive|intendevo|volevo dire)\b/.test(clean)
  ) {
    return APP_INTENTS.MODIFY_FIELD;
  }

  return null;
}

export interface IntentResult {
  intent: AppIntent;
  score: number;
  utterance: string;
  entities: any[];
}

export function processVoiceText(text: string, allowedIntents?: AppIntent[]): Promise<IntentResult> {
  return new Promise(async (resolve, reject) => {
    const fastIntent = checkFastPathIntent(text);
    
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
        const { status, intent, score, error } = event.data;
        
        if (status === 'complete') {
          worker.removeEventListener('message', messageHandler);
          const systemIntent = NLP_CANDIDATE_LABELS[intent as keyof typeof NLP_CANDIDATE_LABELS] || APP_INTENTS.UNKNOWN;
          resolve({ 
            intent: systemIntent, 
            score, 
            utterance: text,
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

      // PRE-PROCESSING: Rimuoviamo la negazione iniziale se seguita da testo utile
      let textForAi = text.replace(/^(no|aspetta|scusa|errato|sbagliato)[,.\s]+/i, '').trim();
      if (!textForAi) textForAi = text;

      worker.postMessage({ 
        type: 'process', 
        text: textForAi,
        candidateLabels: activeLabels 
      });

    } catch (err) {
      reject(err);
    }
  });
}