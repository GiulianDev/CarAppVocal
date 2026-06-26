import { useEffect, useState } from "react";
import type { Car } from "../../shared/types/car";

export function useCarsQuery() {
  
  const [cars, setCars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Logica semplice di lettura da localStorage
    const saved = localStorage.getItem('cars');
    setCars(saved ? JSON.parse(saved) : []);
    setIsLoading(false);
  }, []);

  return { cars: [] as Car[], isLoading: false };
}
