export type WaitState = 'brand' | 'model' | 'plate' | null;

export interface ExtractedData {
  foundPlate: string;
  foundBrand: string;
  foundModel: string;
}

export interface Catalog {
  brands: string[];
}

export const extractFields = (text: string, activeContext: WaitState = null, catalog: Catalog): ExtractedData => {
  let foundPlate = '';
  let foundBrand = '';
  let foundModel = '';

  const lowerText = text.toLowerCase();

  // --- FASE 1: CORREZIONE MIRATA (Bypass del Catalogo) ---
  
  if (activeContext === 'model') {
    const cleanedModel = lowerText
      .replace(/\b(no|non|ma|invece|si scrive|correggi|modifica|il|modello|è)\b/gi, '')
      .trim();
    // Capitalizza la prima lettera
    foundModel = cleanedModel.replace(/\b\w/g, c => c.toUpperCase());
    return { foundPlate: '', foundBrand: '', foundModel };
  }

  if (activeContext === 'brand') {
    const cleanedBrand = lowerText
      .replace(/\b(no|non|ma|invece|si scrive|correggi|modifica|la|marca|costruttore|è)\b/gi, '')
      .trim();
    foundBrand = cleanedBrand.replace(/\b\w/g, c => c.toUpperCase());
    return { foundPlate: '', foundBrand, foundModel: '' };
  }

  if (activeContext === 'plate') {
    const plateMatch = text.replace(/[\s\-\.,]/g, '').toUpperCase().match(/[A-Z]{2}\d{3}[A-Z]{2}/);
    foundPlate = plateMatch ? plateMatch[0] : '';
    return { foundPlate, foundBrand: '', foundModel: '' };
  }

  // --- FASE 2: RICERCA GLOBALE (Uso del Catalogo) ---
  
  // Ricerca Brand a catalogo
  const matchedBrand = catalog.brands.find(b => 
    lowerText.includes(b.toLowerCase())
  );
  
  if (matchedBrand) {
    foundBrand = matchedBrand;
  }

  // Estrazione della targa nella frase libera
  const globalPlateMatch = text.replace(/[\s\-\.,]/g, '').toUpperCase().match(/[A-Z]{2}\d{3}[A-Z]{2}/);
  if (globalPlateMatch) {
    foundPlate = globalPlateMatch[0];
  }

  // Estrazione del modello nella frase libera
  if (foundBrand) {
    const words = lowerText.split(' ');
    const brandIndex = words.findIndex(w => w.includes(foundBrand.toLowerCase()));
    if (brandIndex !== -1 && words.length > brandIndex + 1) {
       foundModel = words[brandIndex + 1].replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  return { foundPlate, foundBrand, foundModel };
};