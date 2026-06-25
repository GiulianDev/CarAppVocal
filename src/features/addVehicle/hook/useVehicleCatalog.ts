import { useState, useEffect } from 'react';
import { fetchVehicleCatalog } from '../vehicleService';

export function useVehicleCatalog() {
  const [brands, setBrands] = useState<string[]>([]);
  const [modelsMap, setModelsMap] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await fetchVehicleCatalog();
      setBrands(data.brands);
      setModelsMap(data.modelsMap);
      setIsLoading(false);
    }
    loadData();
  }, []);

  // Funzione di utilità per estrarre i modelli di una specifica marca
  const getModelsForBrand = (brand: string): string[] => {
    return modelsMap[brand] || [];
  };

  return { brands, getModelsForBrand, isLoading };
}