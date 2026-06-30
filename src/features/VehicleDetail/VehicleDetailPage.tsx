import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useGarage } from '../../shared/Garage/useGarage';
import { VehicleInfo } from './components/VehicleInfo';
import { EventsList } from './components/EventsList';
import { useVehicleDetailVoiceFlow } from './hook/useVehicleDetailVoiceFlow';

// ==========================================
// COMPONENTE PRINCIPALE (CONTENITORE TABS)
// ==========================================

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getVehicle, isLoading } = useGarage();

  // Azione di navigazione
  const goToGarage = () => { 
    console.log('going to garage...');
    navigate('/garage/');
  };
  
  const goToEvent = (eventId: string) => {
    navigate(`/detail/${id}/event/${eventId}`);
  };

  // Recuperiamo il veicolo. Se in caricamento, sarà undefined.
  const vehicle = id && !isLoading ? getVehicle(id) : null;

  // ⚠️ REGOLA DEGLI HOOKS: Tutti gli hook in cima! 
  // Il Cervello NLP ora è al sicuro da blocchi dovuti agli early return.
  useVehicleDetailVoiceFlow({
    vehicle: vehicle,
    actions: { goToGarage, goToEvent }
  });

  // --- EARLY RETURNS (Devono stare SEMPRE dopo gli hook) ---
  if (!id) return <Navigate to="/" replace />;

  if (isLoading) 
    return <div className="p-8 text-center text-zinc-400 font-mono">Caricamento veicolo...</div>;
  
  if (!vehicle)
    return <div className="p-8 text-center text-zinc-400">Veicolo non trovato.</div>;

  return (
    <div>
      {/* Informazioni Veicolo */}
      <VehicleInfo vehicle={vehicle}/>
      <EventsList vehicle={vehicle}/>
    </div>
  );
}