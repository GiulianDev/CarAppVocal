import type { MatchConfidence, ParsedCommand } from "../../../shared/VoiceCommand/conversationTypes";

// Stop words per pulire la frase 
const STOP_WORDS = new Set([
  'aggiungi', 'inserisci', 'metti', 'salva', 'registra', 'parcheggia', 'salvalo',
  'la', 'una', 'un', 'il', 'lo', 'le', 'gli', 'del', 'della', 'dello',
  'è', 'di', 'con', 'invece', 'auto', 'macchina', 'veicolo', 'vettura',
  'marca', 'modello', 'costruttore', 'targa', 'targata', 'targato',
  'per', 'va', 'bene', 'procedi', 'aspetta', 'volevo', 'dire', 'intendevo', 
  'cosi', 'così', 'male', 'scritto', 'quello', 'questa', 'questo', 'quella', 
  'anzi', 'oppure', 'o', 'e', 'anche', 'voglio', 'vorrei'
]);

const normalizeText = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.,!?]/g, ' ').trim();

const tokenizeMeaningfulText = (value: string) =>
  normalizeText(value).split(/\s+/).filter(Boolean).filter(token => !STOP_WORDS.has(token));

// Algoritmo di Levenshtein
const levenshteinDistance = (left: string, right: string) => {
  const matrix = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[left.length][right.length];
};

const scoreMatch = (query: string, candidate: string) => {
  const normalizedQuery = normalizeText(query);
  const normalizedCandidate = normalizeText(candidate);

  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedQuery === normalizedCandidate) return 1;
  if (normalizedQuery.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedQuery)) return 0.9;
  if (normalizedQuery.startsWith(normalizedCandidate) || normalizedCandidate.startsWith(normalizedQuery)) return 0.8;

  const distance = levenshteinDistance(normalizedQuery, normalizedCandidate);
  const maxLength = Math.max(normalizedQuery.length, normalizedCandidate.length);
  const ratio = maxLength === 0 ? 1 : 1 - distance / maxLength;

  return ratio >= 0.7 ? ratio : 0;
};

// Catalog Resolver isolato
export const resolveEntity = (query: string, candidates: string[]): MatchConfidence & { candidates: string[] } => {
  const trimmedQuery = normalizeText(query);
  if (!trimmedQuery) return { value: '', score: 0, level: 'none', candidates: [] };

  const exactMatch = candidates.find(c => normalizeText(c) === trimmedQuery);
  if (exactMatch) {
    return { value: exactMatch, score: 1, level: 'exact', candidates: [exactMatch] };
  }

  const scored = candidates
    .map(candidate => ({ value: candidate, score: scoreMatch(trimmedQuery, candidate) }))
    .filter(entry => entry.score >= 0.7)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { value: '', score: 0, level: 'none', candidates: [] };

  const best = scored[0];
  let level: MatchConfidence['level'] = 'low';
  
  if (best.score >= 0.86) level = 'high';
  else if (best.score >= 0.75) level = 'medium';

  return {
    value: best.value,
    score: best.score,
    level,
    candidates: scored.slice(0, 3).map(s => s.value)
  };
};

// Parser Conversazionale Principale
export const parseConversationalCommand = (
  text: string, 
  catalog: { brands: string[], getModels: (b: string) => string[] },
  currentBrandContext?: string | null
): ParsedCommand => {
  const originalText = text.trim();
  const normalizedText = normalizeText(originalText);

  // Rilevamento Intenti
  const isCorrection = /\b(no|non|cambia|modifica|correggi|invece|anzi|sbagliato|scrive|male|volevo dire|intendevo|si scrive|cosi|così)\b/i.test(normalizedText);
  const isConfirm = /\b(si|sii|ok|esatto|salva|va bene|procedi|conferma|perfetto|giusto)\b/i.test(normalizedText);
  const isCancel = /\b(annulla|ferma|stop|cancella|reset|indietro)\b/i.test(normalizedText);

  let intent: ParsedCommand['intent'] = 'UNKNOWN';
  
  if (isCancel) {
    intent = 'CANCEL';
  } else if (isConfirm && !isCorrection) {
    intent = 'CONFIRM';
  } else if (isCorrection) {
    intent = 'CORRECTION';
  }

  // Estrazione Targa (Pattern Regex esatto)
  const plateMatch = originalText.replace(/[\s\-\.,]/g, '').toUpperCase().match(/[A-Z]{2}\d{3}[A-Z]{2}/);
  let plateConfidence: MatchConfidence | undefined;
  
  if (plateMatch) {
    plateConfidence = { value: plateMatch[0], score: 1, level: 'exact' };
    intent = isCorrection ? 'CORRECTION' : 'ADD_VEHICLE'; 
  }

  // Identificazione Entità Grezze (Filtriamo le stop words per trovare i nomi)
  const tokens = tokenizeMeaningfulText(originalText);
  const rawEntityQuery = tokens.join(' ');

  // Risoluzione Marca
  const brandResolution = resolveEntity(rawEntityQuery, catalog.brands);
  let resolvedBrand = brandResolution.level !== 'none' ? brandResolution : undefined;

  // Risoluzione Modello
  let resolvedModel: MatchConfidence | undefined;
  const targetBrand = resolvedBrand?.value || currentBrandContext;
  
  if (targetBrand) {
    const modelCandidates = catalog.getModels(targetBrand);
    // Se abbiamo trovato un brand nel testo, lo togliamo dalla stringa prima di cercare il modello
    const queryWithoutBrand = resolvedBrand 
      ? normalizeText(rawEntityQuery).replace(normalizeText(resolvedBrand.value), '').trim()
      : rawEntityQuery;
    
    const modelResolution = resolveEntity(queryWithoutBrand, modelCandidates);
    if (modelResolution.level !== 'none') {
      resolvedModel = modelResolution;
    }
  }

  // Fallback Intento: se era sconosciuto ma abbiamo trovato entità, è un'aggiunta o una correzione
  if (intent === 'UNKNOWN' && (resolvedBrand || resolvedModel || plateConfidence)) {
    intent = isCorrection ? 'CORRECTION' : 'ADD_VEHICLE';
  }

  return {
    intent,
    isNegation: isCorrection,
    originalText,
    entities: {
      brand: resolvedBrand,
      model: resolvedModel,
      plate: plateConfidence
    }
  };
};