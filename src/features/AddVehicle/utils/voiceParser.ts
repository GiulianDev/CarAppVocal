// src/features/vehicle/utils/voiceParser.ts
import type { MatchConfidence } from "../../../shared/VoiceCommand/conversationTypes";

// Espansione delle parole da ignorare (rumore)
const NOISE_WORDS = new Set([
  'aggiungi', 'inserisci', 'metti', 'salva', 'registra', 'parcheggia',
  'la', 'una', 'un', 'il', 'lo', 'le', 'gli', 'del', 'della', 'dello',
  'di', 'con', 'invece', 'auto', 'macchina', 'veicolo', 'vettura',
  'marca', 'modello', 'targa', 'targata', 'targato', 'scritto', 'chiamata',
  'costruttore', 'scusa', 'aspetta', 'appunto',
  'era', 'e', 'o', 'ma', 'però', 'quindi', 'allora', 'dunque', 'cioè'
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

// Lunghezza minima sotto la quale un match "per sottostringa" non è più
// affidabile: una stringa di 1-2 caratteri è quasi sempre contenuta per
// puro caso in una frase più lunga (es. la lettera "g" dentro "aggiungi").
// I match ESATTI restano invece sempre validi indipendentemente dalla
// lunghezza (es. l'utente dice davvero "Ka" o "Up").
const MIN_SUBSTRING_LEN = 3;

const hasMeaningfulSubstringMatch = (a: string, b: string): boolean => {
  if (!a || !b) return false;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length < MIN_SUBSTRING_LEN) return false;
  return longer.includes(shorter);
};

const scoreToLevel = (score: number): MatchConfidence['level'] => {
  if (score >= 1.0) return 'exact';
  if (score >= 0.85) return 'high';
  if (score >= 0.75) return 'medium';
  if (score > 0) return 'low';
  return 'none';
};

const calculateMatchScore = (query: string, target: string): number => {
  // Match esatto
  if (query === target) return 1.0;

  // Match di sottostringa (es. "Fabia" dentro "Fabia 1.2"), solo se la
  // stringa più corta è abbastanza lunga da essere un segnale affidabile.
  if (hasMeaningfulSubstringMatch(query, target)) return 0.95;

  // Levenshtein distance
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
  
  if (words.length === 0) {
    return { value: '', score: 0, level: 'none', candidates: [] };
  }

  const query = words.join(' ');
  
  // 1. Match esatto (case insensitive)
  const exactMatch = candidates.find(c => normalizeText(c) === query);
  if (exactMatch) {
    console.log(`   [resolveEntity] Match esatto trovato: "${exactMatch}"`);
    return { value: exactMatch, score: 1.0, level: 'exact', candidates: [exactMatch] };
  }

  // 2. Match di sottostringa (es. "Fabia" dentro "Fabia 1.2")
  const substringMatches = candidates.filter(c => {
    const normC = normalizeText(c);
    return hasMeaningfulSubstringMatch(query, normC);
  });
  
  if (substringMatches.length > 0) {
    // Prendi il più corto (es. "Fabia" vs "Fabia 1.2" → preferisci "Fabia")
    const best = substringMatches.sort((a, b) => a.length - b.length)[0];
    console.log(`   [resolveEntity] Match di sottostringa: "${best}" (query: "${query}")`);
    return { value: best, score: 0.95, level: 'high', candidates: substringMatches.slice(0, 3) };
  }

  // 3. Match fuzzy (Levenshtein)
  const matchesFound: { value: string; score: number }[] = [];

  for (const candidate of candidates) {
    const normCandidate = normalizeText(candidate);
    const score = calculateMatchScore(query, normCandidate);
    if (score > 0) {
      matchesFound.push({ value: candidate, score });
    }
  }

  if (matchesFound.length === 0) {
    console.log(`   [resolveEntity] Nessun match trovato per "${query}"`);
    return { value: '', score: 0, level: 'none', candidates: [] };
  }

  matchesFound.sort((a, b) => b.score - a.score);
  
  const best = matchesFound[0];
  const level = scoreToLevel(best.score);

  console.log(`   [resolveEntity] Miglior match fuzzy: "${best.value}" con score ${best.score.toFixed(3)}`);
  return {
    value: best.value,
    score: best.score,
    level,
    candidates: matchesFound.slice(0, 3).map(m => m.value)
  };
};

export interface ExtractedVehicleEntities {
  brand: MatchConfidence | null;
  model: MatchConfidence | null;
  plate: MatchConfidence | null;
  brandInferred?: boolean;
  /**
   * Campo che l'utente stava esplicitamente cercando di correggere (es. ha
   * detto "il modello è X"), anche quando il valore X non è stato risolto a
   * nulla di valido nel catalogo. Senza questa informazione, un tentativo di
   * correzione fallito è indistinguibile da un'affermazione senza alcuna
   * entità riconoscibile — e chi chiama questa funzione (useConversationEngine)
   * finiva per chiedere chiarimenti sul campo sbagliato, cadendo sul vecchio
   * "pendingEntity" invece di sapere che l'utente parlava proprio del modello.
   */
  attemptedField?: 'brand' | 'model' | 'plate' | null;
}

function cleanTextForExtraction(raw: string): string {
  return raw
    .replace(/^(no|non|invece|anzi|sbagliato|ma|però|scusa|aspetta)\s+/i, '')
    .replace(/\b(no|non)\b/g, '')
    .trim();
}

// ==========================================
// RILEVAZIONE CORREZIONI ESPLICITE
// ==========================================

function parseCorrectionPattern(text: string): { field: 'brand' | 'model' | 'plate' | null; value: string | null } {
  const lower = text.toLowerCase();
  
  const modelPatterns = [
    /(?:il\s+)?modello\s+(?:è|e|sia|sarebbe|dovrebbe essere)\s+(.+)/i,
    /correggi\s+(?:il\s+)?modello\s+(?:in|con)\s+(.+)/i,
    /modello\s+(?:in\s+)?(.+)/i,
    /(?:il\s+)?modello\s+è\s+(.+)/i,
    /cambia\s+(?:il\s+)?modello\s+(?:in|con)\s+(.+)/i,
  ];
  
  const brandPatterns = [
    /(?:la\s+)?(?:marca|costruttore)\s+(?:è|e|sia|sarebbe|dovrebbe essere)\s+(.+)/i,
    /correggi\s+(?:la\s+)?(?:marca|costruttore)\s+(?:in|con)\s+(.+)/i,
    /(?:la\s+)?(?:marca|costruttore)\s+(.+)/i,
    /(?:la\s+)?marca\s+è\s+(.+)/i,
    /cambia\s+(?:la\s+)?(?:marca|costruttore)\s+(?:in|con)\s+(.+)/i,
  ];
  
  const platePatterns = [
    /(?:la\s+)?targa\s+(?:è|e|sia|sarebbe|dovrebbe essere)\s+(.+)/i,
    /correggi\s+(?:la\s+)?targa\s+(?:in|con)\s+(.+)/i,
    /targa\s+(?:in\s+)?(.+)/i,
    /(?:la\s+)?targa\s+è\s+(.+)/i,
    /cambia\s+(?:la\s+)?targa\s+(?:in|con)\s+(.+)/i,
    /(?:la\s+)?targa\s+(?:è\s+)?sbagliata[,.\s]+(?:metto|metta|metti|inserisco)\s+(.+)/i,
    /(?:la\s+)?targa\s+(?:è\s+)?sbagliata[,.\s]+(?:dovrebbe essere|è)\s+(.+)/i,
  ];

  for (const pattern of modelPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (value.split(' ').length <= 5 && !NOISE_WORDS.has(normalizeText(value))) {
        return { field: 'model', value };
      }
    }
  }

  for (const pattern of brandPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (value.split(' ').length <= 5 && !NOISE_WORDS.has(normalizeText(value))) {
        return { field: 'brand', value };
      }
    }
  }

  for (const pattern of platePatterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[1].replace(/[\s\-\.]/g, '').toUpperCase();
      return { field: 'plate', value: raw };
    }
  }

  return { field: null, value: null };
}

// ==========================================
// FUNZIONE DI RICERCA GLOBALE MODELLO (CON LOG)
// ==========================================

function findModelGlobally(
  query: string,
  catalog: { brands: string[]; getModels: (brand: string) => string[] }
): { model: string; brand: string; score: number } | null {
  const normalized = normalizeText(query);
  if (!normalized) {
    console.log(`   [findModelGlobally] Query vuota dopo normalizzazione`);
    return null;
  }

  const tokens = normalized.split(' ').filter(w => !NOISE_WORDS.has(w));
  if (tokens.length === 0) {
    console.log(`   [findModelGlobally] Nessun token significativo dopo filtro`);
    return null;
  }

  // FIX: la ricerca deve usare la query ripulita dal rumore ("fabia"), non
  // la frase grezza normalizzata ("aggiungi una fabia"). Prima "tokens"
  // veniva calcolato ma mai riutilizzato: la frase intera restava candidata
  // al match, permettendo a modelli con nome cortissimo (es. "G") di trovare
  // corrispondenza per puro caso dentro parole come "aggiungi".
  const cleanQuery = tokens.join(' ');

  console.log(`   [findModelGlobally] Cerco modello per: "${cleanQuery}" (tokens: ${tokens.join(', ')})`);

  const modelMatches: { model: string; brand: string; score: number }[] = [];

  // Cerca in tutti i brand
  for (const b of catalog.brands) {
    const modelsList = catalog.getModels(b);
    for (const m of modelsList) {
      const normM = normalizeText(m);
      
      // 1. Match esatto (priorità massima)
      if (normM === cleanQuery) {
        console.log(`   [findModelGlobally] ★ MATCH ESATTO: "${m}" (${b})`);
        modelMatches.push({ model: m, brand: b, score: 1.0 });
        continue;
      }
      
      // 2. Match di sottostringa (se il modello contiene la query o viceversa),
      // solo per stringhe abbastanza lunghe da essere un segnale affidabile
      if (hasMeaningfulSubstringMatch(cleanQuery, normM)) {
        const score = 0.95;
        console.log(`   [findModelGlobally] ● Match sottostringa: "${m}" (${b}) -> score ${score}`);
        modelMatches.push({ model: m, brand: b, score });
        continue;
      }
      
      // 3. Match fuzzy (solo per query lunghe)
      if (cleanQuery.length > 3) {
        const score = calculateMatchScore(cleanQuery, normM);
        if (score > 0.8) {
          console.log(`   [findModelGlobally] ○ Match fuzzy: "${m}" (${b}) -> score ${score.toFixed(3)}`);
          modelMatches.push({ model: m, brand: b, score });
        }
      }
    }
  }

  if (modelMatches.length === 0) {
    console.log(`   [findModelGlobally] Nessun match trovato`);
    return null;
  }

  // Ordina per punteggio decrescente
  modelMatches.sort((a, b) => b.score - a.score);
  
  // Prendi il migliore
  const best = modelMatches[0];
  console.log(`   [findModelGlobally] ★ MIGLIOR MATCH: "${best.model}" (${best.brand}) con score ${best.score.toFixed(3)}`);
  
  // Soglia: se il punteggio è troppo basso, non deduciamo la marca
  if (best.score < 0.8) {
    console.log(`   [findModelGlobally] ⚠ Punteggio troppo basso (${best.score.toFixed(3)} < 0.8), scartato`);
    return null;
  }
  
  return best;
}

// ==========================================
// FUNZIONE PRINCIPALE: estrazione entità
// ==========================================

export const extractVehicleEntities = (
  text: string,
  catalog: { brands: string[]; getModels: (brand: string) => string[] },
  currentBrandContext?: string | null
): ExtractedVehicleEntities => {
  const rawText = text.trim();
  const cleanRaw = cleanTextForExtraction(rawText);
  
  console.groupCollapsed(`🔍 [VoiceParser] Analisi nuovo testo: "${rawText}"`);
  console.log(`🧹 [Parser] Testo pulito per l'estrazione: "${cleanRaw}"`);

  const meaningfulTokens = cleanRaw.split(' ').filter(w => !NOISE_WORDS.has(w));
  if (meaningfulTokens.length === 0) {
    console.log(`⏭️ [Parser] Testo senza token significativi. Nessuna entità estratta.`);
    console.groupEnd();
    return { brand: null, model: null, plate: null, brandInferred: false };
  }

  // ==========================================
  // PASSO 1: RILEVAZIONE CORREZIONE ESPLICITA
  // ==========================================
  const correction = parseCorrectionPattern(rawText);
  if (correction.field && correction.value) {
    console.log(`🔧 [Parser] Rilevata correzione esplicita per ${correction.field}: "${correction.value}"`);
    
    if (correction.field === 'model' && currentBrandContext) {
      const modelsList = catalog.getModels(currentBrandContext);
      const modelResolution = resolveEntity(correction.value, modelsList);
      if (modelResolution.level !== 'none') {
        console.log(`✅ [Parser] Modello corretto trovato: ${modelResolution.value} (marca: ${currentBrandContext})`);
        console.groupEnd();
        return { 
          brand: { value: currentBrandContext, score: 1.0, level: 'exact' },
          model: modelResolution,
          plate: null,
          brandInferred: false
        };
      }
      console.log(`⚠️ [Parser] Modello "${correction.value}" non trovato in ${currentBrandContext}. Provo ricerca globale...`);
    }

    if (correction.field === 'brand') {
      const brandResolution = resolveEntity(correction.value, catalog.brands);
      if (brandResolution.level !== 'none') {
        console.log(`✅ [Parser] Marca corretta trovata: ${brandResolution.value}`);
        console.groupEnd();
        return { brand: brandResolution, model: null, plate: null, brandInferred: false };
      }
      console.log(`⚠️ [Parser] Marca "${correction.value}" non trovata nel catalogo.`);
      const modelMatch = findModelGlobally(correction.value, catalog);
      if (modelMatch) {
        console.log(`🔄 [Parser] "${correction.value}" sembra essere un modello. Deduco marca: ${modelMatch.brand}`);
        console.groupEnd();
        const inferredLevel = scoreToLevel(modelMatch.score);
        return {
          brand: { value: modelMatch.brand, score: modelMatch.score, level: inferredLevel },
          model: { value: modelMatch.model, score: modelMatch.score, level: inferredLevel },
          plate: null,
          brandInferred: true
        };
      }
    }

    if (correction.field === 'plate') {
      const plateValue = correction.value;
      if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(plateValue)) {
        console.log(`✅ [Parser] Targa corretta: ${plateValue}`);
        console.groupEnd();
        return { 
          brand: null, 
          model: null, 
          plate: { value: plateValue, score: 1.0, level: 'exact' },
          brandInferred: false
        };
      } else {
        console.log(`⚠️ [Parser] Targa "${plateValue}" non valida.`);
        console.groupEnd();
        return { brand: null, model: null, plate: null, brandInferred: false, attemptedField: 'plate' };
      }
    }
  }

  // ==========================================
  // PASSO 2: ESTRAZIONE STANDARD
  // ==========================================
  console.log(`🔍 [Parser] Nessuna correzione esplicita. Procedo con estrazione standard...`);

  let workingText = cleanRaw;
  let plate: MatchConfidence | null = null;

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

  // 3. Estrazione Modello con priorità
  let model: MatchConfidence | null = null;
  let inferredBrand: MatchConfidence | null = null;
  let brandInferred = false;
  // Testo su cui basare l'eventuale ricerca globale (Priorità 3). Parte dal
  // testo completo, ma viene aggiornato non appena una marca viene
  // identificata (estratta o dal contesto), per non farla ricomparire come
  // "rumore" nella ricerca globale del modello.
  let remainingTextForGlobalSearch = cleanText;

  // Priorità 1: Se abbiamo un brand estratto, cerchiamo il modello nei suoi modelli
  if (brand) {
    console.log(`🚗 [Parser] Ricerca Modello per la marca estratta: ${brand.value}`);
    const modelsList = catalog.getModels(brand.value);
    
    let textWithoutBrand = cleanText.replace(normalizeText(brand.value), '').trim();
    const filteredTokens = textWithoutBrand.split(' ').filter(w => !NOISE_WORDS.has(w));
    textWithoutBrand = filteredTokens.join(' ');
    // FIX: la marca è già stata riconosciuta con certezza, quindi non deve
    // più comparire nel testo passato alla ricerca globale (evita che una
    // marca come "Fiat", sottostringa legittima di un modello come
    // "Fiat 124", generi un modello inventato quando l'utente ha detto solo
    // la marca).
    remainingTextForGlobalSearch = textWithoutBrand;
    
    if (textWithoutBrand.length > 0) {
      console.log(`🚗 [Parser] Testo per ricerca modello: "${textWithoutBrand}"`);
      const modelResolution = resolveEntity(textWithoutBrand, modelsList);
      if (modelResolution.level !== 'none') {
        model = modelResolution;
        console.log(`🚗 [Parser] Modello trovato per marca estratta: ${model.value}`);
      } else {
        console.log(`🚗 [Parser] Nessun modello trovato per ${brand.value}`);
      }
    } else {
      console.log(`🚗 [Parser] Nessun token rimanente per la ricerca del modello. Modello = null.`);
      model = null;
    }
  }

  // Priorità 2: Se abbiamo un contesto e non abbiamo ancora un modello, cerca nel contesto
  if (!model && currentBrandContext) {
    console.log(`🚗 [Parser] Ricerca Modello nel contesto: ${currentBrandContext}`);
    const modelsList = catalog.getModels(currentBrandContext);
    
    if (brand && brand.value !== currentBrandContext) {
      console.log(`⚠️ [Parser] Brand "${brand.value}" diverso dal contesto "${currentBrandContext}". Uso brand estratto.`);
    } else {
      let textWithoutContextBrand = cleanText;
      if (currentBrandContext) {
        textWithoutContextBrand = textWithoutContextBrand.replace(normalizeText(currentBrandContext), '').trim();
      }
      if (brand) {
        textWithoutContextBrand = textWithoutContextBrand.replace(normalizeText(brand.value), '').trim();
      }
      
      const filteredTokens = textWithoutContextBrand.split(' ').filter(w => !NOISE_WORDS.has(w));
      textWithoutContextBrand = filteredTokens.join(' ');
      remainingTextForGlobalSearch = textWithoutContextBrand;
      
      if (textWithoutContextBrand.length > 0) {
        console.log(`🚗 [Parser] Testo per ricerca modello nel contesto: "${textWithoutContextBrand}"`);
        const modelResolution = resolveEntity(textWithoutContextBrand, modelsList);
        if (modelResolution.level !== 'none') {
          model = modelResolution;
          inferredBrand = { value: currentBrandContext, score: 1.0, level: 'exact' };
          console.log(`🚗 [Parser] Modello trovato nel contesto: ${model.value} (${currentBrandContext})`);
        } else {
          console.log(`🚗 [Parser] Nessun modello trovato in ${currentBrandContext}.`);
        }
      } else {
        console.log(`🚗 [Parser] Nessun token rimanente per la ricerca nel contesto.`);
      }
    }
  }

  // Priorità 3: Se non abbiamo né brand né contesto, o se brand e contesto non danno risultati, ricerca globale
  if (!model) {
    console.log(`🌐 [Parser] Avvio ricerca Globale del modello su tutto il catalogo...`);
    const globalMatch = findModelGlobally(remainingTextForGlobalSearch, catalog);
    if (globalMatch) {
      const inferredLevel = scoreToLevel(globalMatch.score);
      model = { value: globalMatch.model, score: globalMatch.score, level: inferredLevel };
      // FIX: la marca dedotta da un match globale eredita l'affidabilità del
      // match sul modello, invece di essere sempre marcata come certa al 100%.
      // Prima, un match debole sul modello produceva comunque una marca
      // "esatta", bypassando la richiesta di conferma in evaluateEntities.
      inferredBrand = { value: globalMatch.brand, score: globalMatch.score, level: inferredLevel };
      brandInferred = true;
      console.log(`🎯 [Parser] Modello trovato globalmente: ${model.value} (${globalMatch.brand})`);
    } else {
      console.log(`🌐 [Parser] Nessun modello trovato globalmente.`);
    }
  }

  // Se abbiamo un brand estratto ma nessun modello, e non abbiamo un brand inferito, usiamo il brand estratto
  const finalBrand = brand || inferredBrand || null;
  
  console.log(`✅ [Parser] RISULTATO FINALE: Marca=[${finalBrand?.value || 'null'}], Modello=[${model?.value || 'null'}], Targa=[${plate?.value || 'null'}], Dedotta=${brandInferred}, CampoTentato=[${correction.field ?? 'nessuno'}]`);
  console.groupEnd();

  return { 
    brand: finalBrand, 
    model, 
    plate,
    brandInferred,
    // Se l'utente aveva esplicitamente nominato un campo da correggere (es.
    // "il modello è Pringles") ma non siamo comunque riusciti a risolvere
    // nulla, lo segnaliamo qui invece di lasciare che chi chiama debba
    // indovinare da un risultato completamente vuoto.
    attemptedField: correction.field ?? null
  };
};