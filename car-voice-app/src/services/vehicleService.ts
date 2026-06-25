const DATASET_URL = "https://raw.githubusercontent.com/matthlavacka/car-list/master/car-list.json";

export interface ApiCarItem {
  brand: string;
  models: string[];
}

export async function fetchVehicleCatalog(): Promise<{ brands: string[]; modelsMap: Record<string, string[]> }> {
  try {
    const response = await fetch(DATASET_URL);
    if (!response.ok) throw new Error("Errore nel recupero dei dati auto");
    
    const data: ApiCarItem[] = await response.json();
    const brands = data.map(item => item.brand).sort();
    
    const modelsMap = data.reduce<Record<string, string[]>>((accumulator, item) => {
      accumulator[item.brand] = item.models;
      return accumulator;
    }, {});

    return { brands, modelsMap };
  } catch (error) {
    console.error("Fallback catalog:", error);
    return {
      brands: ["Fiat", "Alfa Romeo", "Audi", "BMW", "Volkswagen"],
      modelsMap: {
        "Fiat": ["Panda", "500"],
        "Alfa Romeo": ["Giulia", "Stelvio"],
        "Audi": ["A3", "A4"],
        "BMW": ["Rad 3", "X5"],
        "Volkswagen": ["Golf", "Polo"]
      }
    };
  }
}