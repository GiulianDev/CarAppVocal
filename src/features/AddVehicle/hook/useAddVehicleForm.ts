// hook/useVehicleForm.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarage } from '../../../shared/Garage/useGarage';
import type { DraftVehicle } from '../../../shared/VoiceCommand/core/conversationTypes';

export function useVehicleForm() {
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState('');
  
  const { addVehicle } = useGarage();
  const navigate = useNavigate();

  // Aggiungiamo un parametro opzionale per ricevere i dati direttamente dal motore vocale
  const performSave = (voiceData?: Required<DraftVehicle>) => {
    // Usiamo i dati vocali se presenti, altrimenti il current state del form manuale
    const finalPlate = voiceData?.plate || plate;
    const finalBrand = voiceData?.brand || brand;
    const finalModel = voiceData?.model || model;

    const plateRegex = /^[A-Z]{2}\d{3}[A-Z]{2}$/i;
    
    if (!plateRegex.test(finalPlate.trim())) {
      setError('Targa non valida, impossibile salvare.');
      return false;
    }
    
    if (!finalBrand.trim() || !finalModel.trim()) {
      setError('Marca e modello mancanti.');
      return false;
    }

    setError(''); // Pulisci eventuali errori precedenti
    const newCar = addVehicle(finalPlate.toUpperCase().trim(), finalBrand.trim(), finalModel.trim());
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