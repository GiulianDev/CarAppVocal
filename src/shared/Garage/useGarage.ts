// useGarage.ts
import { useEffect, useState } from "react";
import type { Vehicle, VehicleEvent } from "./vehicle";

const STORAGE_KEY = 'vehicles';

export function useGarage() {

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('vehicles');
    setVehicles(saved ? JSON.parse(saved) : []);
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
    return vehicles.find((c) => c.id === id) || null;
  };

  const addVehicle = (plate: string, brand: string, model: string) => {    
    try {
      const newVehicle: Vehicle = {
        id: crypto.randomUUID(),
        plate: plate.toUpperCase(),
        brand: `${brand} ${model}`,
        addedAt: new Date().toISOString(),
        events: [] // 👈 Aggiunto: le nuove auto nascono con l'array pronto
      };
      const updated = [...vehicles, newVehicle];
      setVehicles(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log('Add vehicle success: ', newVehicle);
      return newVehicle;
    } finally {
      setIsLoading(false); // Termina il processo (anche in caso di errore)
    }

    /* 💡 FUTURO CON FIRESTORE:
    if (user) {
      // Salva sul database cloud di Firebase
      await updateDoc(doc(db, "users", user.uid), { cars: updatedVehicles });
    }
    */


  };


  const deleteVehicle = (id: string) => {
    const updatedVehicles = vehicles.filter(car => car.id !== id);
    setVehicles(updatedVehicles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVehicles));
    setIsLoading(false);

    /* 💡 FUTURO CON FIRESTORE:
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { cars: updatedVehicles });
    }
    */
  };

  const resetGarage = () => {
    setVehicles([]); 
    localStorage.removeItem(STORAGE_KEY); 
    setIsLoading(false);
    /* 💡 FUTURO CON FIRESTORE:
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { cars: [] });
    }
    */
  };

  // Aggiunge un evento a un veicolo
  const addEventToVehicle = (carId: string, eventData: Omit<VehicleEvent, 'id'>) => {
    const updatedVehicles = vehicles.map(car => {
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

    setVehicles(updatedVehicles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVehicles));
    
    /* 💡 FUTURO CON FIRESTORE:
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { cars: updatedVehicles });
    }
    */
  };

  // Modifica un evento esistente
  const updateEvent = (carId: string, eventId: string, updatedData: Partial<VehicleEvent>) => {
    const updatedVehicles = vehicles.map(car => {
      if (car.id === carId && car.events) {
        const updatedEvents = car.events.map(ev => 
          ev.id === eventId ? { ...ev, ...updatedData } : ev
        );
        // Riordina nel caso la data sia stata cambiata
        updatedEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { ...car, events: updatedEvents };
      }
      return car;
    });

    setVehicles(updatedVehicles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVehicles));
  };


  // Elimina un evento specifico
  const deleteEvent = (carId: string, eventId: string) => {
    const updatedVehicles = vehicles.map(car => {
      if (car.id === carId && car.events) {
        const updatedEvents = car.events.filter(ev => ev.id !== eventId);
        return { ...car, events: updatedEvents };
      }
      return car;
    });

    setVehicles(updatedVehicles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVehicles));
  };


  return { 
    vehicles, 
    getVehicle, 
    addVehicle, 
    deleteVehicle, 
    resetGarage, 
    addEventToVehicle,
    updateEvent,
    deleteEvent,
    isLoading 
  };
}