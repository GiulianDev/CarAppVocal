import { Navigate, useParams } from 'react-router-dom';
import { useGarage } from '../../shared/Garage/useGarage';
import { VehicleInfo } from './components/VehicleInfo';
import { EventsList } from './components/EventsList';

// ==========================================
// COMPONENTE PRINCIPALE (CONTENITORE TABS)
// ==========================================

export function VehicleDetailPage() {

  const { id } = useParams<{ id: string }>();
  const { getVehicle, isLoading } = useGarage();

  if (!id) return <Navigate to="/" replace />;

  if (isLoading) 
    return <div className="p-8 text-center text-zinc-400 font-mono">Caricamento veicolo...</div>;

  const vehicle = getVehicle(id); 
  if (!vehicle) return <div className="p-8 text-center text-zinc-400">Veicolo non trovato.</div>;

  return (
    <div>
      
      {/* Informazioni Veicolo */}
      <VehicleInfo vehicle={vehicle}/>

      <EventsList vehicle={vehicle}/>

    </div>
  );
}