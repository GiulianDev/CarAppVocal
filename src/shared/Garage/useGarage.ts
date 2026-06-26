// useGetVehicle.ts
import { useEffect, useState } from "react";
import type { Car } from "./car";

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
      };
      const updated = [...cars, newCar];
      setCars(updated);
      localStorage.setItem('cars', JSON.stringify(updated));
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


  const deleteCar = (id: string) => {
    const updatedCars = cars.filter(car => car.id !== id);
    setCars(updatedCars);
    localStorage.setItem('carvoice_cars', JSON.stringify(updatedCars));
    setIsLoading(false);

    /* 💡 FUTURO CON FIRESTORE:
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { cars: updatedCars });
    }
    */
  };

  const resetGarage = () => {
    setCars([]); // Svuota lo stato di React
    localStorage.removeItem('carvoice_cars'); // Elimina la chiave dal LocalStorage
    setIsLoading(false);

    /* 💡 FUTURO CON FIRESTORE:
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { cars: [] });
    }
    */
  };

  // Restituisci lo stato VERO, non 'false' hardcodato
  return { cars, getVehicle, addVehicle, deleteCar, resetGarage, isLoading };
}