import { pipeline, env } from '@xenova/transformers';
import type { WorkerCommand, VoiceIntent, VoiceEntities, WorkerResponse } from './types';

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/models/';
env.useBrowserCache = true;

const INTENT_CANDIDATES = [
  'confermare salvare procedere esatto si',
  'annullare fermarsi cancellare uscire no basta',
  'andare aprire garage lista auto'
];

const INTENT_MAP: Record<string, VoiceIntent> = {
  'confermare salvare procedere esatto si': 'CONFIRM',
  'annullare fermarsi cancellare uscire no basta': 'CANCEL',
  'andare aprire garage lista auto': 'NAVIGATE_GARAGE'
};

const NLU_STOP_WORDS = new Set([
  'aggiungi', 'inserisci', 'metti', 'crea', 'nuovo', 'nuova', 
  'un', 'una', 'uno', 'il', 'la', 'lo', 'i', 'gli', 'le',
  'auto', 'macchina', 'veicolo', 'vettura', 'della', 'del', 'di', 'è', 'e', 'con', 'in', 'a', 'da', 'che',
  'no', 'non', 'invece', 'si', 'scrive', 'scritto', 'lettera', 'come',
  'sbagliato', 'corretto', 'errore', 'cambia', 'modifica', 'modificare', 'devi',
  'voglio', 'vorrei', 'dovere', 'modello', 'marca', 'brand', 'targa',
  'aspetta', 'attendi', 'guarda', 'ascolta', 'dico', 'dica', 'cioè', 'insomma', 'scusa', 'scusami',
  'salva', 'salvare', 'conferma', 'confermare', 'procedi', 'registra', 'bensì', 'anziché'
]);

let classifier: any = null;

async function initModel() {
  if (!classifier) {
    classifier = await pipeline('zero-shot-classification', 'typeform-distilbert-base-uncased-mnli');
  }
}

function cleanUtterance(text: string): string {
  // Gestione frasi di contrasto ("non è Golf ma Polo", "anziché Fiat metti Audi", "invece di Golf metti Polo")
  let processedText = text;
  const contrastMatch = text.match(/(?:non\s+è|non\s+|anziché\s+|invece\s+di\s+)[\w\s]+\s+(?:ma|metti|è|bensì)\s+(.+)/i);
  if (contrastMatch && contrastMatch[1]) {
    processedText = contrastMatch[1];
  }

  const words = processedText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/);
  return words.filter(word => !NLU_STOP_WORDS.has(word) && word.length > 0).join(' ').trim();
}

self.onmessage = async (event: MessageEvent<WorkerCommand>) => {
  if (event.data.type === 'INIT') {
    try {
      await initModel();
      self.postMessage({ type: 'READY' } as WorkerResponse);
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', payload: { error: err?.message } } as WorkerResponse);
    }
    return;
  }

  if (event.data.type === 'ANALYZE') {
    try {
      const text = event.data.payload.text;
      const lower = text.toLowerCase().trim();
      
      const entities: VoiceEntities = {};
      let intent: VoiceIntent = 'UNKNOWN';

      // Estrazione Target Field prima del cleaning per evitare perdite di contesto
      if (/\b(targa)\b/i.test(lower)) entities.targetField = 'plate';
      else if (/\b(modello)\b/i.test(lower)) entities.targetField = 'model';
      else if (/\b(marca|brand|costruttore)\b/i.test(lower)) entities.targetField = 'brand';

      const cleanString = cleanUtterance(text);
      entities.extractedText = cleanString;

      // Estrazione Targa tramite RegEx
      const plateRegexes = [
        /\b[A-Z]{2}\s*\d{3}\s*[A-Z]{2}\b/i,       // 🇮🇹 Italia / 🇫🇷 Francia (AB 123 CD)
        /\b\d{4}\s*[A-Z]{3}\b/i,                  // 🇪🇸 Spagna (1234 ABC)
        /\b[A-Z]{1,3}\s*\d{3,6}\b/i,              // 🇨🇭 Svizzera / Vecchia 🇮🇹
        /\b[A-Z]{1,3}\s*[A-Z]{1,2}\s*\d{1,4}\b/i, // 🇩🇪 Germania
        /\b[A-Z]{2}\s*\d{2}\s*[A-Z]{3}\b/i        // 🇬🇧 Regno Unito
      ];

      let foundPlate = null;
      for (const rx of plateRegexes) {
        const match = text.match(rx);
        if (match) {
          foundPlate = match[0];
          break;
        }
      }

      if (foundPlate) {
        entities.plate = foundPlate.replace(/\s+/g, '').toUpperCase();
      }

      // Routing Intenti Contestuale
      const isExplicitCancelAction = /\b(annulla|esci|basta|fermati|cancella)\b/i.test(lower);
      const isJustNo = /\b(no|non)\b/i.test(lower) && cleanString === '' && !entities.targetField;
      const isJustYes = /\b(si|sì|ok|salva|confermo|esatto|va bene|certo|procedi|registra)\b/i.test(lower) && !/\b(no|non)\b/i.test(lower) && cleanString === '' && !entities.targetField;
      const isCorrection = /\b(no|non|invece|sbagliato|errore|cambia|modifica|modificare|correggi|aspetta|scusa|scusami)\b/i.test(lower);

      if (isExplicitCancelAction || isJustNo) intent = 'CANCEL';
      else if (isJustYes) intent = 'CONFIRM';
      else if (isCorrection) intent = 'FORM_CORRECT_FIELD';
      else if (/\b(aggiungi|inserisci|nuova auto|nuovo veicolo)\b/i.test(lower)) intent = 'ADD_VEHICLE';
      else if (entities.targetField || /\b(è|sono|chiama)\b/i.test(lower) || cleanString.length > 0) intent = 'FORM_FILL_FIELD';
      else {
          await initModel();
          const output = await classifier(text, INTENT_CANDIDATES);
          if (output.scores[0] > 0.4) intent = INTENT_MAP[output.labels[0]] || 'UNKNOWN';
      }

      if (intent === 'FORM_CORRECT_FIELD' || intent === 'FORM_FILL_FIELD' || intent === 'ADD_VEHICLE') {
          entities.correctedValue = (entities.targetField === 'plate' && entities.plate) ? entities.plate : cleanString;
      }

      self.postMessage({
        type: 'ANALYSIS_COMPLETE',
        payload: { intent, confidence: 1, entities, rawText: text }
      } as WorkerResponse);

    } catch (err: any) {
      self.postMessage({ type: 'ERROR', payload: { error: err?.message } } as WorkerResponse);
    }
  }
};