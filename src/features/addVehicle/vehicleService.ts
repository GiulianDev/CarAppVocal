/* 
 * Recupera brand e modelli delle auto
 * From https://github.com/DanielKohut/car-data/tree/main
 */

import carDataFile from '../../assets/car_data.json';

export async function fetchVehicleCatalog() {
  // 1. Estrai l'oggetto contenente i dati
  // Usiamo 'as any' o 'as unknown' per gestire la struttura del file JSON
  const data = (carDataFile as any).brands; 
  
  // 2. Ora 'data' è un Record<string, string[]> (es: { Abarth: [...], Alfa: [...] })
  const brands = Object.keys(data).sort();
  const modelsMap = data as Record<string, string[]>;

  return { brands, modelsMap };
}