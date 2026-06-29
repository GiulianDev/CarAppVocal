// useGarage.ts
import { useEffect, useState } from "react";
import type { Car, VehicleEvent } from "./car";

const STORAGE_KEY = 'cars';

export function useGarage() {

  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('cars');
    setCars(saved ? JSON.parse(saved) : []);
    setIsLoading(false);

    /* 💡 FUTURO CON FIREBASE & FIRESTORE:
    if (user) {
      setIsLoading(true);
      // Ascolta Firestore in tempo reale per questo utente
      const unsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
        setCars(doc.data()?.cars || []);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
      */
  }, [/* user */]);

  const getVehicle = (id: string | undefined) => {    
    if (!id) return null;
    return cars.find((c) => c.id === id) || null;
  };

  const addVehicle = (plate: string, brand: string, model: string) => {    
    try {
      const newCar: Car = {
        id: crypto.randomUUID(),
        plate: plate.toUpperCase(),
        brand: `${brand} ${model}`,
        addedAt: new Date().toISOString(),
        events: [] // 👈 Aggiunto: le nuove auto nascono con l'array pronto
      };
      const updated = [...cars, newCar];
      setCars(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log('Add vehicle success: ', newCar);
      return newCar;
    } finally {
      setIsLoading(false); // Termina il processo (anche in caso di errore)
    }

    /* 💡 FUTURO CON FIRESTORE:
    if (user) {
      // Salva sul database cloud di Firebase
      await updateDoc(doc(db, "users", user.uid), { cars: updatedCars });
    }
    */


  };


  const deleteVehicle = (id: string) => {
    const updatedCars = cars.filter(car => car.id !== id);
    setCars(updatedCars);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCars));
    setIsLoading(false);

    /* 💡 FUTURO CON FIRESTORE:
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { cars: updatedCars });
    }
    */
  };

  const resetGarage = () => {
    setCars([]); 
    localStorage.removeItem(STORAGE_KEY); 
    setIsLoading(false);
    /* 💡 FUTURO CON FIRESTORE:
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { cars: [] });
    }
    */
  };

  // 👈 NUOVA FUNZIONE: Aggiunge un evento a un veicolo
  const addEventToVehicle = (carId: string, eventData: Omit<VehicleEvent, 'id'>) => {
    const updatedCars = cars.map(car => {
      if (car.id === carId) {
        const newEvent: VehicleEvent = {
          ...eventData,
          id: crypto.randomUUID(),
        };
        
        // Se car.events non esiste (auto create prima di questo update), usiamo un array vuoto
        const currentEvents = car.events || [];
        const updatedEvents = [...currentEvents, newEvent];
        
        // Ordiniamo gli eventi in automatico: il più recente in alto
        updatedEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { ...car, events: updatedEvents };
      }
      return car;
    });

    setCars(updatedCars);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCars));
    
    /* 💡 FUTURO CON FIRESTORE:
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { cars: updatedCars });
    }
    */
  };

  return { 
    cars, 
    getVehicle, 
    addVehicle, 
    deleteVehicle, 
    resetGarage, 
    addEventToVehicle, // 👈 Esponiamo la funzione al resto dell'app
    isLoading 
  };
}