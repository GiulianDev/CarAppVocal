import { useState, useEffect } from 'react';
import type { Car } from '../../../shared/types/car';

export function useAddVehicle() {

  const [cars, setCars] = useState<Car[]>([]);
  const [isAdding, setIsAdding] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('cars');
    if (saved) setCars(JSON.parse(saved));
    setIsAdding(false);
  }, []);

  const addVehicle = (plate: string, brand: string, model: string) => {    
    try {
      const newCar: Car = {
        id: crypto.randomUUID(),
        plate: plate.toUpperCase(),
        brand: `${brand} ${model}`,
        addedAt: new Date().toISOString(),
      };
      const updated = [...cars, newCar];
      setCars(updated);
      localStorage.setItem('cars', JSON.stringify(updated));
      console.log('Add vehicle success: ', newCar);
      return newCar;
    } finally {
      setIsAdding(false); // Termina il processo (anche in caso di errore)
    }
  };

  return { cars, isAdding, setIsAdding, addVehicle }; 
}