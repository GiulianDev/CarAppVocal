// hook/useVehicleForm.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarage } from '../../../shared/Garage/useGarage';

export function useVehicleForm() {
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState('');
  
  const { addVehicle } = useGarage();
  const navigate = useNavigate();

  const performSave = () => {
    const plateRegex = /^[A-Z]{2}\d{3}[A-Z]{2}$/i;
    
    if (!plateRegex.test(plate.trim())) {
      setError('Targa non valida, impossibile salvare.');
      return false;
    }
    
    if (!brand.trim() || !model.trim()) {
      setError('Marca e modello mancanti.');
      return false;
    }

    setError(''); // Pulisci eventuali errori precedenti
    const newCar = addVehicle(plate, brand.trim(), model.trim());
    navigate(`/detail/${newCar.id}`);
    
    return true;
  };

  const resetForm = () => {
    setPlate('');
    setBrand('');
    setModel('');
    setError('');
  };

  return {
    plate, setPlate,
    brand, setBrand,
    model, setModel,
    error, setError,
    performSave,
    resetForm
  };
}