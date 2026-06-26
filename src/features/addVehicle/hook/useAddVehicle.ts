// src/hooks/useGarage.ts
import { useState, useEffect } from 'react';
import type { Car } from '../../../shared/types/car';

export function useAddCar() {
  
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Carica i dati all'avvio
  useEffect(() => {
    const saved = localStorage.getItem('cars');
    if (saved) setCars(JSON.parse(saved));
    setIsLoading(false);
  }, []);

  const addCar = (plate: string, brand: string, model: string) => {
    const newCar: Car = {
      id: crypto.randomUUID(),
      plate: plate.toUpperCase(),
      brand: `${brand} ${model}`,
      addedAt: new Date().toISOString(),
    };
    const updated = [...cars, newCar];
    setCars(updated);
    localStorage.setItem('cars', JSON.stringify(updated));
    setIsAdding(false);
  };

  return { cars, isLoading, isAdding, setIsAdding, addCar };
}