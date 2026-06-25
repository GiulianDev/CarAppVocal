import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Car } from '../types/car';

interface CarContextType {
  cars: Car[];
  isLoading: boolean;
  addCar: (plate: string, brand: string, model: string) => void;
  deleteCar: (id: string) => void;
  resetGarage: () => void;
}

const CarContext = createContext<CarContextType | undefined>(undefined);

export const CarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 💡 FUTURO: Qui inietterai lo stato dell'utente di Firebase
  // const { user } = useAuth(); 

  useEffect(() => {
    // STATO ATTUALE: Carica da localStorage
    const saved = localStorage.getItem('carvoice_cars');
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

  const addCar = (plate: string, brand: string, model: string) => {
    const newCar: Car = {
      id: crypto.randomUUID(),
      plate: plate.toUpperCase().trim(),
      brand: `${brand.trim()} ${model.trim()}`,
      addedAt: new Date().toISOString(),
    };

    // Aggiorna lo stato locale per una UI immediata (Optimistic Update)
    const updatedCars = [...cars, newCar];
    setCars(updatedCars);
    localStorage.setItem('carvoice_cars', JSON.stringify(updatedCars));
    console.log('Vehicle added...')

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

    /* 💡 FUTURO CON FIRESTORE:
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { cars: updatedCars });
    }
    */
  };

  const resetGarage = () => {
    setCars([]); // Svuota lo stato di React
    localStorage.removeItem('carvoice_cars'); // Elimina la chiave dal LocalStorage

    /* 💡 FUTURO CON FIRESTORE:
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { cars: [] });
    }
    */
  };

  return (
    <CarContext.Provider value={{ cars, isLoading, addCar, deleteCar, resetGarage }}>
      {children}
    </CarContext.Provider>
  );
};

// Hook interno di utilità per evitare ripetizioni di codice
export const useCarContext = () => {
  const context = useContext(CarContext);
  if (!context) throw new Error('useCarContext must be used within a CarProvider');
  return context;
};