// src/features/vehicle/utils/voiceParser.ts
import type { MatchConfidence } from "../../../shared/VoiceCommand/conversationTypes";

// Parole di disturbo da ignorare nella ricerca testuale
const NOISE_WORDS = new Set([
  'aggiungi', 'inserisci', 'metti', 'salva', 'registra', 'parcheggia',
  'la', 'una', 'un', 'il', 'lo', 'le', 'gli', 'del', 'della', 'dello',
  'di', 'con', 'invece', 'auto', 'macchina', 'veicolo', 'vettura',
  'marca', 'modello', 'targa', 'targata', 'targato', 'scritto', 'chiamata'
]);

// Normalizzazione standard del testo per il confronto fuzzy
const normalizeText = (val: string): string =>
  val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ') // Rimuove punteggiatura
    .replace(/\s+/g, ' ') // Raggruppa spazi multipli
    .trim();

// Algoritmo di Levenshtein per tollerare piccoli refusi dello Speech-to-Text
const levenshteinDistance = (a: string, b: string): number => {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
};

// Calcola un punteggio di match da 0.0 a 1.0
const calculateMatchScore = (query: string, target: string): number => {
  if (query === target) return 1.0;
  if (target.includes(query) || query.includes(target)) return 0.9;

  const distance = levenshteinDistance(query, target);
  const maxLength = Math.max(query.length, target.length);
  const score = 1 - distance / maxLength;
  
  return score >= 0.7 ? score : 0; // Accettiamo solo match sopra il 70% di somiglianza
};

/**
 * Cerca un'entità all'interno del catalogo usando sliding windows (N-Gram)
 * per catturare correttamente anche nomi composti (es. "Alfa Romeo").
 */
export const resolveEntity = (
  cleanText: string,
  candidates: string[]
): MatchConfidence & { candidates: string[] } => {
  if (!cleanText) return { value: '', score: 0, level: 'none', candidates: [] };

  const words = cleanText.split(' ').filter(w => !NOISE_WORDS.has(w));
  let bestMatch: MatchConfidence = { value: '', score: 0, level: 'none' };
  const matchesFound: { value: string; score: number }[] = [];

  // Analizziamo sotto-frasi da 1 a 3 parole per beccare i nomi composti
  for (let len = 1; len <= Math.min(3, words.length); len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const chunk = words.slice(i, i + len).join(' ');
      
      for (const candidate of candidates) {
        const normCandidate = normalizeText(candidate);
        const score = calculateMatchScore(chunk, normCandidate);

        if (score > 0) {
          matchesFound.push({ value: candidate, score });
        }
      }
    }
  }

  if (matchesFound.length === 0) {
    return { value: '', score: 0, level: 'none', candidates: [] };
  }

  // Ordiniamo per punteggio decrescente e per lunghezza del candidato (preferiamo match più specifici)
  matchesFound.sort((a, b) => b.score - a.score || b.value.length - a.value.length);
  
  const best = matchesFound[0];
  let level: MatchConfidence['level'] = 'low';
  if (best.score === 1.0) level = 'exact';
  else if (best.score >= 0.85) level = 'high';
  else if (best.score >= 0.75) level = 'medium';

  const uniqueCandidates = Array.from(new Set(matchesFound.map(m => m.value))).slice(0, 3);

  return {
    value: best.value,
    score: best.score,
    level,
    candidates: uniqueCandidates
  };
};

export interface ExtractedVehicleEntities {
  brand: MatchConfidence | null;
  model: MatchConfidence | null;
  plate: MatchConfidence | null;
}

/**
 * Funzione principale di estrazione entità deterministica
 */
export const extractVehicleEntities = (
  text: string,
  catalog: { brands: string[]; getModels: (brand: string) => string[] },
  currentBrandContext?: string | null
): ExtractedVehicleEntities => {
  let workingText = text.trim();
  let plate: MatchConfidence | null = null;

  // 1. Estrazione Targa (Formato Italiano standard: 2 lettere, 3 numeri, 2 lettere)
  // Riconosce formati con spazi o trattini tipo "AA 322 RT" o "aa-322-rt"
  const cleanForPlate = workingText.replace(/[\-\s\.]/g, '').toUpperCase();
  const plateRegex = /[A-Z]{2}\d{3}[A-Z]{2}/;
  const plateMatch = cleanForPlate.match(plateRegex);

  if (plateMatch) {
    plate = {
      value: plateMatch[0],
      score: 1.0,
      level: 'exact'
    };
    // Rimuoviamo la targa dal testo di lavoro per evitare che sporchi la ricerca del modello
    // (es. "Alfa Romeo AA123BB" -> "Alfa Romeo")
    const rawMatchInOriginalText = workingText.match(new RegExp(plateMatch[0].split('').join('\\s*'), 'i'));
    if (rawMatchInOriginalText) {
      workingText = workingText.replace(rawMatchInOriginalText[0], '');
    }
  }

  const cleanText = normalizeText(workingText);

  // 2. Estrazione Brand
  const brandResolution = resolveEntity(cleanText, catalog.brands);
  const brand = brandResolution.level !== 'none' ? brandResolution : null;

  // 3. Estrazione Modello (Legato al brand trovato o a quello già in memoria)
  let model: MatchConfidence | null = null;
  const activeBrand = brand?.value || currentBrandContext;

  if (activeBrand) {
    const modelsList = catalog.getModels(activeBrand);
    // Puliamo il testo dal nome del brand per evitare falsi positivi sul modello
    const textWithoutBrand = brand 
      ? cleanText.replace(normalizeText(brand.value), '').trim() 
      : cleanText;

    const modelResolution = resolveEntity(textWithoutBrand, modelsList);
    if (modelResolution.level !== 'none') {
      model = modelResolution;
    }
  }

  return { brand, model, plate };
};