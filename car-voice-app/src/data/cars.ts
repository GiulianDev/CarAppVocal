const DATASET_URL = "https://raw.githubusercontent.com/matthlavacka/car-list/master/car-list.json";

// 1. Definiamo l'interfaccia esatta per la struttura dell'API
export interface ApiCarItem {
  brand: string;
  models: string[];
}

export async function fetchOnlineCars(): Promise<{ brands: string[]; modelsMap: Record<string, string[]> }> {
  try {
    const response = await fetch(DATASET_URL);
    if (!response.ok) throw new Error("Errore nel recupero dei dati auto");
    
    // Il dataset reale è un array di oggetti: ApiCarItem[]
    const data: ApiCarItem[] = await response.json();
    
    // 2. Estraiamo l'elenco delle sole marche e ordiniamole alfabeticamente
    const brands = data.map(item => item.brand).sort();
    
    // 3. Trasformiamo l'array in una mappa [Chiave: Valore] usando .reduce()
    // Questo ci permette di mantenere intatta la logica che abbiamo già scritto nella View
    const modelsMap = data.reduce<Record<string, string[]>>((accumulator, item) => {
      accumulator[item.brand] = item.models;
      return accumulator;
    }, {});

    return {
      brands,
      modelsMap
    };
  } catch (error) {
    console.error("Fallback sui dati locali causa errore di rete:", error);
    return {
      brands: ["Fiat", "Alfa Romeo", "Audi", "BMW", "Volkswagen"],
      modelsMap: {
        "Fiat": ["Panda", "500", "Punto"],
        "Alfa Romeo": ["Giulia", "Stelvio", "MiTo"],
        "Audi": ["A1", "A3", "A4"],
        "BMW": ["Rad 3", "X5"],
        "Volkswagen": ["Golf", "Polo"]
      }
    };
  }
}