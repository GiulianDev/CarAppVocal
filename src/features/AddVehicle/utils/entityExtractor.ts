// src/features/vehicle/utils/entityExtractor.ts
import { pipeline } from '@xenova/transformers';
import type { MatchConfidence } from '../../../shared/VoiceCommand/core/conversationTypes';

// ==========================================
// CONFIGURAZIONE
// ==========================================
// Modello leggero per feature extraction (quantizzato, ~80 MB)
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

// Soglie di confidenza
const THRESHOLDS = {
  EXACT: 0.90,
  HIGH: 0.80,
  MEDIUM: 0.70,
  LOW: 0.50,
} as const;

// ==========================================
// TIPI
// ==========================================
interface BrandEmbedding {
  brand: string;
  embedding: number[];
}

interface ModelEmbedding {
  brand: string;
  model: string;
  embedding: number[];
}

export interface ExtractedVehicleEntities {
  brand: MatchConfidence | null;
  model: MatchConfidence | null;
  plate: MatchConfidence | null;
  brandInferred?: boolean;
  attemptedField?: 'brand' | 'model' | 'plate' | null;
}

// ==========================================
// STATO (singleton)
// ==========================================
let embedderInstance: any = null;
let brandEmbeddings: BrandEmbedding[] = [];
let modelEmbeddings: ModelEmbedding[] = [];
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// ==========================================
// UTILITY
// ==========================================
const NOISE_WORDS = new Set([
  'aggiungi', 'inserisci', 'metti', 'salva', 'registra', 'parcheggia',
  'la', 'una', 'un', 'il', 'lo', 'le', 'gli', 'del', 'della', 'dello',
  'di', 'con', 'invece', 'auto', 'macchina', 'veicolo', 'vettura',
  'marca', 'modello', 'targa', 'targata', 'targato', 'scritto', 'chiamata',
  'costruttore', 'scusa', 'aspetta', 'appunto',
  'era', 'e', 'o', 'ma', 'però', 'quindi', 'allora', 'dunque', 'cioè'
]);

function normalizeText(val: string): string {
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTextForExtraction(raw: string): string {
  return raw
    .replace(/^(no|non|invece|anzi|sbagliato|ma|però|scusa|aspetta)\s+/i, '')
    .replace(/\b(no|non)\b/g, '')
    .trim();
}

function scoreToLevel(score: number): MatchConfidence['level'] {
  if (score >= THRESHOLDS.EXACT) return 'exact';
  if (score >= THRESHOLDS.HIGH) return 'high';
  if (score >= THRESHOLDS.MEDIUM) return 'medium';
  if (score > THRESHOLDS.LOW) return 'low';
  return 'none';
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

// ==========================================
// INIZIALIZZAZIONE
// ==========================================
export async function initEntityExtractor(catalog: { brands: string[]; getModels: (brand: string) => string[] }): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log('🧠 [EntityExtractor] Caricamento modello embedding...');

    embedderInstance = await pipeline('feature-extraction', EMBEDDING_MODEL, {
      quantized: true,
      progress_callback: (data: any) => {
        console.log(`🧠 [EntityExtractor] ${Math.round(data.progress * 100)}%`);
      }
    });

    console.log('🧠 [EntityExtractor] Pre-calcolo embedding brand...');
    brandEmbeddings = await Promise.all(
      catalog.brands.map(async (brand) => {
        const result = await embedderInstance(brand, { pooling: 'mean', normalize: true });
        return { brand, embedding: result.data };
      })
    );

    console.log('🧠 [EntityExtractor] Pre-calcolo embedding modelli...');
    const promises: Promise<ModelEmbedding>[] = [];
    for (const brand of catalog.brands) {
      for (const model of catalog.getModels(brand)) {
        const full = `${brand} ${model}`;
        promises.push(
          embedderInstance(full, { pooling: 'mean', normalize: true })
            .then((r: any) => ({ brand, model, embedding: r.data }))
        );
      }
    }
    modelEmbeddings = await Promise.all(promises);

    isInitialized = true;
    console.log(`✅ [EntityExtractor] Pronto: ${brandEmbeddings.length} brand, ${modelEmbeddings.length} modelli`);
  })();

  return initPromise;
}

// ==========================================
// FUNZIONE PRINCIPALE
// ==========================================
export async function extractVehicleEntities(
  text: string,
  catalog: { brands: string[]; getModels: (brand: string) => string[] },
  currentBrandContext?: string | null
): Promise<ExtractedVehicleEntities> {
  if (!isInitialized) {
    await initEntityExtractor(catalog);
  }

  const rawText = text.trim();
  const cleanRaw = cleanTextForExtraction(rawText);

  console.groupCollapsed(`🔍 [EntityExtractor] "${rawText}"`);
  console.log(`🧹 Testo pulito: "${cleanRaw}"`);

  // 1. Estrai targa (regex)
  let plate: MatchConfidence | null = null;
  const cleanForPlate = cleanRaw.replace(/[\-\s\.]/g, '').toUpperCase();
  const plateMatch = cleanForPlate.match(/[A-Z]{2}\d{3}[A-Z]{2}/);
  if (plateMatch) {
    plate = { value: plateMatch[0], score: 1.0, level: 'exact' };
    console.log(`📝 Targa trovata: ${plate.value}`);
  }

  // 2. Rimuovi targa dal testo per la ricerca semantica
  let workingText = cleanRaw;
  if (plate) {
    const rawMatch = workingText.match(new RegExp(plate.value.split('').join('\\s*'), 'i'));
    if (rawMatch) workingText = workingText.replace(rawMatch[0], '');
  }

  const cleanText = normalizeText(workingText);
  const tokens = cleanText.split(' ').filter(w => !NOISE_WORDS.has(w));
  if (tokens.length === 0) {
    console.log('⏭️ Nessun token significativo');
    console.groupEnd();
    return { brand: null, model: null, plate, brandInferred: false };
  }

  const query = tokens.join(' ');
  console.log(`🔍 Query per embedding: "${query}"`);

  // 3. Calcola embedding del testo utente
  const qResult = await embedderInstance(query, { pooling: 'mean', normalize: true });
  const qEmb = qResult.data;

  // 4. Trova brand più simile
  let bestBrand = { brand: '', score: 0 };
  for (const b of brandEmbeddings) {
    const score = cosineSimilarity(qEmb, b.embedding);
    if (score > bestBrand.score) {
      bestBrand = { brand: b.brand, score };
    }
  }
  console.log(`🏭 Miglior brand: "${bestBrand.brand}" (${bestBrand.score.toFixed(3)})`);

  // 5. Trova modello più simile
  const targetBrand = bestBrand.score > THRESHOLDS.MEDIUM ? bestBrand.brand : currentBrandContext;
  const candidates = targetBrand
    ? modelEmbeddings.filter(m => m.brand === targetBrand)
    : modelEmbeddings;

  let bestModel = { model: '', brand: '', score: 0 };
  for (const m of candidates) {
    const score = cosineSimilarity(qEmb, m.embedding);
    if (score > bestModel.score) {
      bestModel = { model: m.model, brand: m.brand, score };
    }
  }

  // Ricerca globale se necessario
  let brandInferred = false;
  if (bestModel.score < THRESHOLDS.MEDIUM) {
    console.log('🌐 Ricerca globale del modello...');
    for (const m of modelEmbeddings) {
      const score = cosineSimilarity(qEmb, m.embedding);
      if (score > bestModel.score) {
        bestModel = { model: m.model, brand: m.brand, score };
      }
    }
    if (bestModel.score > THRESHOLDS.MEDIUM) {
      brandInferred = true;
      console.log(`🎯 Modello trovato globalmente: "${bestModel.model}" (${bestModel.brand})`);
    }
  }

  // 6. Costruisci risultati
  const finalBrand: MatchConfidence | null = (bestBrand.score >= THRESHOLDS.MEDIUM)
    ? { value: bestBrand.brand, score: bestBrand.score, level: scoreToLevel(bestBrand.score), candidates: [] }
    : (bestModel.score >= THRESHOLDS.MEDIUM)
      ? { value: bestModel.brand, score: bestModel.score, level: scoreToLevel(bestModel.score), candidates: [] }
      : null;

  const finalModel: MatchConfidence | null = (bestModel.score >= THRESHOLDS.MEDIUM)
    ? { value: bestModel.model, score: bestModel.score, level: scoreToLevel(bestModel.score), candidates: [] }
    : null;

  // Se il brand è inferito, aggiorna il flag
  if (finalBrand && bestBrand.score < THRESHOLDS.EXACT && bestModel.score > THRESHOLDS.MEDIUM) {
    brandInferred = true;
  }

  console.log(`✅ Risultato: Brand=${finalBrand?.value || 'null'} (${finalBrand?.score?.toFixed(3) || '0'}), Model=${finalModel?.value || 'null'} (${finalModel?.score?.toFixed(3) || '0'})`);
  console.groupEnd();

  return {
    brand: finalBrand,
    model: finalModel,
    plate,
    brandInferred,
  };
}