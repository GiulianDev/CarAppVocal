export interface ExtractedData {
  foundPlate: string;
  foundBrand: string;
  foundModel: string;
}

export interface Catalog {
  brands: string[];
}

export type TargetField = 'brand' | 'model' | 'plate' | null;

const STOP_WORDS = new Set([
  'aggiungi', 'inserisci', 'metti', 'salva', 'registra', 'parcheggia', 'salvalo',
  'la', 'una', 'un', 'il', 'lo', 'le', 'gli', 'del', 'della', 'dello',
  'è', 'di', 'con', 'invece', 'auto', 'macchina', 'veicolo', 'vettura',
  'marca', 'modello', 'costruttore', 'targa', 'targata', 'targato',
  'no', 'non', 'ma', 'sbagliato', 'si', 'scrive', 'chiama', 'correggi',
  'modifica', 'cambia', 'sì', 'ok', 'esatto', 'giusto', 'conferma', 'per'
]);

export const extractFields = (
  text: string,
  catalog: Catalog,
  targetField: TargetField = null
): ExtractedData => {
  if (!text) return { foundPlate: '', foundBrand: '', foundModel: '' };

  const rawText = text.trim();
  const lowerText = rawText.toLowerCase();

  let foundPlate = '';
  let foundBrand = '';
  let foundModel = '';

  // 1. Estrazione Targa (Pattern Standard Italiano)
  const cleanForPlate = rawText.replace(/[\s\-\.,]/g, '').toUpperCase();
  const plateMatch = cleanForPlate.match(/[A-Z]{2}\d{3}[A-Z]{2}/);
  if (plateMatch) {
    foundPlate = plateMatch[0];
  }

  if (targetField === 'plate') {
    return { foundPlate, foundBrand: '', foundModel: '' };
  }

  // 2. Estrazione Marca dal Catalogo
  const matchedBrand = catalog.brands.find(b => {
    const regex = new RegExp(`\\b${b.toLowerCase()}\\b`, 'i');
    return regex.test(lowerText);
  });

  if (matchedBrand) {
    foundBrand = matchedBrand;
  }

  // Se aspettavamo la Marca e non è in catalogo, prendiamo la prima parola valida
  if (targetField === 'brand' && !foundBrand) {
    const tokens = lowerText
      .replace(/[.,!?]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0 && !STOP_WORDS.has(w));
    if (tokens.length > 0) {
      foundBrand = tokens[0].charAt(0).toUpperCase() + tokens[0].slice(1);
      return { foundPlate: '', foundBrand, foundModel: '' };
    }
  }

  // Se aspettavamo il Modello
  if (targetField === 'model') {
    const tokens = lowerText
      .replace(/[.,!?]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0 && !STOP_WORDS.has(w));
    if (tokens.length > 0) {
      foundModel = tokens
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      return { foundPlate: '', foundBrand, foundModel };
    }
  }

  // 3. Estrazione Generica
  let workingText = lowerText;

  if (foundPlate) {
    workingText = workingText.replace(new RegExp(foundPlate.toLowerCase(), 'g'), '');
    workingText = workingText.replace(/[a-z]{2}\s*\d{3}\s*[a-z]{2}/gi, '');
  }

  if (foundBrand) {
    workingText = workingText.replace(new RegExp(`\\b${foundBrand.toLowerCase()}\\b`, 'gi'), '');
  }

  workingText = workingText.replace(/[.,!?]/g, ' ');

  const remainingTokens = workingText
    .split(/\s+/)
    .filter(token => token.length > 0 && !STOP_WORDS.has(token));

  if (foundBrand) {
    if (remainingTokens.length > 0) {
      foundModel = remainingTokens
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  } else {
    if (remainingTokens.length === 1) {
      foundBrand = remainingTokens[0].charAt(0).toUpperCase() + remainingTokens[0].slice(1);
    } else if (remainingTokens.length > 1) {
      foundBrand = remainingTokens[0].charAt(0).toUpperCase() + remainingTokens[0].slice(1);
      foundModel = remainingTokens
        .slice(1)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  return { foundPlate, foundBrand, foundModel };
};