export interface ExtractedData {
  foundPlate: string;
  foundBrand: string;
  foundModel: string;
}

export interface Catalog {
  brands: string[];
  getModelsForBrand?: (brand: string) => string[];
}

export type VehicleField = 'brand' | 'model' | 'plate';
export type TargetField = VehicleField | 'confirm_save' | null;
export type ConversationState = 'idle' | 'collecting' | 'clarifying_brand' | 'clarifying_model' | 'clarifying_plate' | 'confirming' | 'saving';

export interface FieldResolution {
  value: string;
  confidence: number;
  status: 'exact' | 'high' | 'medium' | 'low' | 'none' | 'ambiguous';
  candidates: string[];
}

export interface ParsedVoiceCommand {
  intent: 'add_vehicle' | 'confirm' | 'cancel' | 'correction' | 'unknown';
  entities: {
    brand?: string;
    model?: string;
    plate?: string;
  };
  correction: boolean;
  targetField: TargetField;
  brandResolution?: FieldResolution;
  modelResolution?: FieldResolution;
  plateResolution?: FieldResolution;
  needsClarification: boolean;
  clarificationField: VehicleField | null;
  clarificationPrompt: string;
  originalText: string;
  normalizedText: string;
}

const STOP_WORDS = new Set([
  'aggiungi', 'inserisci', 'metti', 'salva', 'registra', 'parcheggia', 'salvalo',
  'la', 'una', 'un', 'il', 'lo', 'le', 'gli', 'del', 'della', 'dello',
  'è', 'di', 'con', 'invece', 'auto', 'macchina', 'veicolo', 'vettura',
  'marca', 'modello', 'costruttore', 'targa', 'targata', 'targato',
  'no', 'non', 'ma', 'sbagliato', 'si', 'sì', 'scrive', 'chiama', 'correggi',
  'modifica', 'cambia', 'ok', 'esatto', 'giusto', 'conferma', 'per', 'va', 'bene', 'procedi',
  'aspetta', 'volevo', 'dire', 'intendevo', 'cosi', 'così', 'male', 'scritto', 'quello',
  'questa', 'questo', 'quella', 'quello', 'anzi', 'oppure', 'o', 'e', 'anche'
]);

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,!?]/g, ' ')
    .trim();

const tokenizeMeaningfulText = (value: string) =>
  normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .filter(token => !STOP_WORDS.has(token));

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

const resolveCatalogValue = (query: string, candidates: string[]): FieldResolution => {
  const trimmedQuery = normalizeText(query);
  if (!trimmedQuery) {
    return { value: '', confidence: 0, status: 'none', candidates: [] };
  }

  const exactMatch = candidates.find(candidate => normalizeText(candidate) === trimmedQuery);
  if (exactMatch) {
    return { value: exactMatch, confidence: 1, status: 'exact', candidates: [exactMatch] };
  }

  const scored = candidates
    .map(candidate => ({ value: candidate, score: scoreMatch(trimmedQuery, candidate) }))
    .filter(entry => entry.score >= 0.7)
    .sort((left, right) => right.score - left.score);

  if (scored.length === 0) {
    return { value: '', confidence: 0, status: 'none', candidates: [] };
  }

  const topCandidate = scored[0];
  const secondCandidate = scored[1];
  const hasAmbiguity = secondCandidate && Math.abs(topCandidate.score - secondCandidate.score) < 0.08;

  if (hasAmbiguity) {
    return {
      value: '',
      confidence: topCandidate.score,
      status: 'ambiguous',
      candidates: scored.slice(0, 3).map(entry => entry.value)
    };
  }

  return {
    value: topCandidate.value,
    confidence: topCandidate.score,
    status: topCandidate.score >= 0.86 ? 'high' : 'medium',
    candidates: scored.slice(0, 3).map(entry => entry.value)
  };
};

const describeClarification = (field: VehicleField | null, candidates: string[], brand?: string) => {
  if (field === 'brand') {
    return `Ho trovato più marche simili: ${candidates.join(', ')}. Quale intendi?`;
  }

  if (field === 'model' && brand) {
    return `Ho trovato più modelli simili per ${brand}: ${candidates.join(', ')}. Quale vuoi usare?`;
  }

  return 'Non sono ancora sicuro. Puoi essere più preciso?';
};

export const extractFields = (
  text: string,
  catalog: Catalog,
  targetField: TargetField = null
): ExtractedData => {
  if (!text) return { foundPlate: '', foundBrand: '', foundModel: '' };

  const rawText = text.trim();
  const normalizedText = normalizeText(rawText);
  const plateMatch = rawText.replace(/[\s\-\.,]/g, '').toUpperCase().match(/[A-Z]{2}\d{3}[A-Z]{2}/);
  const foundPlate = plateMatch?.[0] ?? '';

  let foundBrand = '';
  let foundModel = '';

  if (targetField === 'plate') {
    return { foundPlate, foundBrand: '', foundModel: '' };
  }

  const brandCandidates = catalog.brands ?? [];
  const brandResolution = resolveCatalogValue(rawText, brandCandidates);
  if (brandResolution.value) {
    foundBrand = brandResolution.value;
  }

  const modelCandidates = foundBrand && catalog.getModelsForBrand ? catalog.getModelsForBrand(foundBrand) : [];
  const textWithoutBrand = foundBrand ? normalizedText.replace(normalizeText(foundBrand), ' ').trim() : normalizedText;
  const modelCandidateQuery = textWithoutBrand.replace(/\b(brand|modello|marca|costruttore|targa|auto|veicolo|macchina)\b/g, ' ').trim();
  const modelResolution = resolveCatalogValue(modelCandidateQuery, modelCandidates);

  if (modelResolution.value) {
    foundModel = modelResolution.value;
  }

  if (!foundBrand && targetField === 'brand') {
    const tokens = tokenizeMeaningfulText(rawText);
    if (tokens.length > 0) {
      foundBrand = tokens[0].charAt(0).toUpperCase() + tokens[0].slice(1);
    }
  }

  if (!foundModel && targetField === 'model') {
    const tokens = tokenizeMeaningfulText(rawText);
    if (tokens.length > 0) {
      foundModel = tokens.map(token => token.charAt(0).toUpperCase() + token.slice(1)).join(' ');
    }
  }

  if (!foundBrand && !foundModel) {
    const tokens = tokenizeMeaningfulText(rawText);
    if (tokens.length === 1) {
      foundBrand = tokens[0].charAt(0).toUpperCase() + tokens[0].slice(1);
    } else if (tokens.length > 1) {
      foundBrand = tokens[0].charAt(0).toUpperCase() + tokens[0].slice(1);
      foundModel = tokens.slice(1).map(token => token.charAt(0).toUpperCase() + token.slice(1)).join(' ');
    }
  }

  return { foundPlate, foundBrand, foundModel };
};

export const parseVoiceCommand = (
  text: string,
  catalog: Catalog,
  targetField: TargetField = null,
  previousDraft?: { brand: string; model: string; plate: string }
): ParsedVoiceCommand => {
  const originalText = text.trim();
  const normalizedText = normalizeText(originalText);
  const lowerText = normalizedText;

  const correction = /\b(no|non|cambia|modifica|correggi|invece|anzi|sbagliato|scrive|male|volevo dire|intendevo|si scrive|si scrive cosi|cosi|così)\b/i.test(originalText);
  const confirm = /\b(si|sii|ok|esatto|salva|va bene|procedi|conferma|perfetto)\b/i.test(originalText);
  const cancel = /\b(annulla|ferma|stop|cancella|reset|torna indietro)\b/i.test(originalText);

  const extracted = extractFields(originalText, catalog, targetField);
  const brandResolution = resolveCatalogValue(extracted.foundBrand || lowerText, catalog.brands ?? []);
  const modelCandidates = extracted.foundBrand && catalog.getModelsForBrand ? catalog.getModelsForBrand(extracted.foundBrand) : [];
  const modelResolution = resolveCatalogValue(extracted.foundModel || lowerText, modelCandidates);

  const plateResolution = extracted.foundPlate
    ? { value: extracted.foundPlate, confidence: 1, status: 'exact' as const, candidates: [extracted.foundPlate] }
    : { value: '', confidence: 0, status: 'none' as const, candidates: [] };

  let clarificationField: VehicleField | null = null;
  let clarificationPrompt = '';
  let needsClarification = false;

  if (brandResolution.status === 'ambiguous') {
    clarificationField = 'brand';
    needsClarification = true;
    clarificationPrompt = describeClarification('brand', brandResolution.candidates);
  } else if (modelResolution.status === 'ambiguous') {
    clarificationField = 'model';
    needsClarification = true;
    clarificationPrompt = describeClarification('model', modelResolution.candidates, extracted.foundBrand || previousDraft?.brand);
  } else if (!extracted.foundBrand && targetField === 'brand') {
    clarificationField = 'brand';
    needsClarification = true;
    clarificationPrompt = 'Che marca vuoi aggiungere?';
  } else if (!extracted.foundModel && targetField === 'model') {
    clarificationField = 'model';
    needsClarification = true;
    clarificationPrompt = 'Di quale modello parli esattamente?';
  }

  let intent: ParsedVoiceCommand['intent'] = 'unknown';
  if (cancel) intent = 'cancel';
  else if (confirm) intent = 'confirm';
  else if (correction) intent = 'correction';
  else if (extracted.foundBrand || extracted.foundModel || extracted.foundPlate) intent = 'add_vehicle';

  return {
    intent,
    entities: {
      brand: extracted.foundBrand || undefined,
      model: extracted.foundModel || undefined,
      plate: extracted.foundPlate || undefined
    },
    correction,
    targetField,
    brandResolution,
    modelResolution,
    plateResolution,
    needsClarification,
    clarificationField,
    clarificationPrompt,
    originalText,
    normalizedText
  };
};