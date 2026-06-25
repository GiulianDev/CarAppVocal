import { useState, useEffect } from 'react';
import type { Car } from '../types/car';

export function useCars() {
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedCars = localStorage.getItem('carvoice_cars');
    if (savedCars) {
      setCars(JSON.parse(savedCars));
    }
    setIsLoading(false);
  }, []);

  const addCar = (plate: string, brand: string) => {
    const newCar: Car = {
      id: crypto.randomUUID(),
      plate: plate.toUpperCase().trim(),
      brand: brand.trim(),
      addedAt: new Date().toISOString(),
    };

    const updatedCars = [...cars, newCar];
    setCars(updatedCars);
    localStorage.setItem('carvoice_cars', JSON.stringify(updatedCars));
  };

  const resetGarage = () => {
    localStorage.removeItem('carvoice_cars');
    setCars([]);
  };

  return { cars, isLoading, addCar, resetGarage };
}