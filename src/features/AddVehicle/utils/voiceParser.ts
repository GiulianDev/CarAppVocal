// src/features/vehicle/utils/voiceParser.ts
import type { MatchConfidence } from "../../../shared/VoiceCommand/conversationTypes";

const NOISE_WORDS = new Set([
  'aggiungi', 'inserisci', 'metti', 'salva', 'registra', 'parcheggia',
  'la', 'una', 'un', 'il', 'lo', 'le', 'gli', 'del', 'della', 'dello',
  'di', 'con', 'invece', 'auto', 'macchina', 'veicolo', 'vettura',
  'marca', 'modello', 'targa', 'targata', 'targato', 'scritto', 'chiamata'
]);

const normalizeText = (val: string): string =>
  val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const levenshteinDistance = (a: string, b: string): number => {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) tmp[i] = [i];
  for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
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

const calculateMatchScore = (query: string, target: string): number => {
  if (query === target) return 1.0;
  if (target.includes(query) || query.includes(target)) return 0.9;

  const distance = levenshteinDistance(query, target);
  const maxLength = Math.max(query.length, target.length);
  const score = 1 - distance / maxLength;
  
  return score >= 0.7 ? score : 0;
};

export const resolveEntity = (
  cleanText: string,
  candidates: string[]
): MatchConfidence & { candidates: string[] } => {
  if (!cleanText) return { value: '', score: 0, level: 'none', candidates: [] };

  const words = cleanText.split(' ').filter(w => !NOISE_WORDS.has(w));
  let bestMatch: MatchConfidence = { value: '', score: 0, level: 'none' };
  const matchesFound: { value: string; score: number }[] = [];

  for (let len = 1; len <= Math.min(3, words.length); len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const chunk = words.slice(i, i + len).join(' ');
      for (const candidate of candidates) {
        const normCandidate = normalizeText(candidate);
        const score = calculateMatchScore(chunk, normCandidate);
        if (score > 0) matchesFound.push({ value: candidate, score });
      }
    }
  }

  if (matchesFound.length === 0) return { value: '', score: 0, level: 'none', candidates: [] };

  matchesFound.sort((a, b) => b.score - a.score || b.value.length - a.value.length);
  
  const best = matchesFound[0];
  let level: MatchConfidence['level'] = 'low';
  if (best.score === 1.0) level = 'exact';
  else if (best.score >= 0.85) level = 'high';
  else if (best.score >= 0.75) level = 'medium';

  return {
    value: best.value,
    score: best.score,
    level,
    candidates: Array.from(new Set(matchesFound.map(m => m.value))).slice(0, 3)
  };
};

export interface ExtractedVehicleEntities {
  brand: MatchConfidence | null;
  model: MatchConfidence | null;
  plate: MatchConfidence | null;
}

export const extractVehicleEntities = (
  text: string,
  catalog: { brands: string[]; getModels: (brand: string) => string[] },
  currentBrandContext?: string | null
): ExtractedVehicleEntities => {
  let workingText = text.trim();
  let plate: MatchConfidence | null = null;

  console.groupCollapsed(`🔍 [VoiceParser] Analisi nuovo testo: "${workingText}"`);

  // 1. Estrazione Targa
  const cleanForPlate = workingText.replace(/[\-\s\.]/g, '').toUpperCase();
  const plateMatch = cleanForPlate.match(/[A-Z]{2}\d{3}[A-Z]{2}/);

  if (plateMatch) {
    plate = { value: plateMatch[0], score: 1.0, level: 'exact' };
    console.log(`📝 [Parser] Targa trovata: ${plate.value}`);
    const rawMatchInOriginalText = workingText.match(new RegExp(plateMatch[0].split('').join('\\s*'), 'i'));
    if (rawMatchInOriginalText) {
      workingText = workingText.replace(rawMatchInOriginalText[0], '');
    }
  } else {
    console.log(`📝 [Parser] Nessuna targa trovata nel testo.`);
  }

  const cleanText = normalizeText(workingText);

  // 2. Estrazione Brand
  const brandResolution = resolveEntity(cleanText, catalog.brands);
  const brand = brandResolution.level !== 'none' ? brandResolution : null;
  console.log(`🏭 [Parser] Ricerca Marca. Risultato:`, brand ? brand.value : 'Nessuna');

  // 3. Estrazione Modello
  let model: MatchConfidence | null = null;
  let inferredBrand: MatchConfidence | null = null;

  const activeBrand = brand?.value || currentBrandContext;

  if (activeBrand) {
    // Caso A: Sappiamo la marca, cerchiamo solo i suoi modelli
    console.log(`🚗 [Parser] Ricerca Modello per la marca: ${activeBrand}`);
    const modelsList = catalog.getModels(activeBrand);
    const textWithoutBrand = brand ? cleanText.replace(normalizeText(brand.value), '').trim() : cleanText;
    const modelResolution = resolveEntity(textWithoutBrand, modelsList);
    
    if (modelResolution.level !== 'none') {
      model = modelResolution;
      console.log(`🚗 [Parser] Modello trovato: ${model.value}`);
    } else {
      console.log(`🚗 [Parser] Nessun modello trovato tra i veicoli di ${activeBrand}.`);
    }
  } else {
    // Caso B: LA MAGIA DELLA DEDUZIONE. Non abbiamo la marca. Cerchiamo in TUTTI i modelli.
    console.log(`🌐 [Parser] Nessuna marca definita. Avvio ricerca Globale del modello su tutto il catalogo...`);
    let bestGlobalMatch = { score: 0, model: null as MatchConfidence | null, brandValue: '' };

    for (const b of catalog.brands) {
      const modelsList = catalog.getModels(b);
      const modelRes = resolveEntity(cleanText, modelsList);
      if (modelRes.level !== 'none' && modelRes.score > bestGlobalMatch.score) {
        bestGlobalMatch = { score: modelRes.score, model: modelRes, brandValue: b };
      }
    }

    if (bestGlobalMatch.model) {
      model = bestGlobalMatch.model;
      inferredBrand = { value: bestGlobalMatch.brandValue, score: 1.0, level: 'exact' };
      console.log(`🎯 [Parser] BINGO! Modello "${model.value}" trovato. Marca dedotta automaticamente: "${bestGlobalMatch.brandValue}"`);
    } else {
      console.log(`🌐 [Parser] Ricerca Globale fallita. Nessun modello riconosciuto.`);
    }
  }

  const finalBrand = brand || inferredBrand;
  console.log(`✅ [Parser] RISULTATO FINALE: Marca=[${finalBrand?.value || 'null'}], Modello=[${model?.value || 'null'}], Targa=[${plate?.value || 'null'}]`);
  console.groupEnd();

  return { brand: finalBrand, model, plate };
};