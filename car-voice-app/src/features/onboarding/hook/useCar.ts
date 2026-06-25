/*
 * Aggiunge o rimuove cars dal local storage
*/
import type { Car } from "../../../shared/types/car";

export function useCarActions() {
  
  const addCar = (plate: string, brandModel: string) => {
    // 1. Recupera le auto esistenti
    const saved = localStorage.getItem('cars');
    const currentCars: Car[] = saved ? JSON.parse(saved) : [];

    // 2. Crea il nuovo oggetto Car seguendo l'interfaccia condivisa
    const newCar: Car = {
      id: crypto.randomUUID(), // Genera un ID univoco
      plate: plate.toUpperCase(),
      brand: brandModel,
      addedAt: new Date().toISOString(), // Timestamp ISO standard
    };

    // 3. Salva nel localStorage
    localStorage.setItem('cars', JSON.stringify([...currentCars, newCar]));
    
    // 4. Opzionale: notifica gli altri componenti (come useCarsQuery) 
    // che lo stato è cambiato
    window.dispatchEvent(new Event('storage'));
  };

  const removeCar = (id: string) => {
    const saved = localStorage.getItem('cars');
    if (!saved) return;
    
    const currentCars: Car[] = JSON.parse(saved);
    const updatedCars = currentCars.filter(car => car.id !== id);
    
    localStorage.setItem('cars', JSON.stringify(updatedCars));
    window.dispatchEvent(new Event('storage'));
  };

  const resetGarage = () => {
    localStorage.removeItem('cars');
    window.dispatchEvent(new Event('storage'));
  };

  return { addCar, removeCar, resetGarage };
}