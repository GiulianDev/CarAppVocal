import { Button } from '../../shared/ui/Button';
import { useGarage } from '../../shared/Garage/useGarage';
import { useNavigate } from 'react-router-dom';
import { useGarageVoiceFlow } from './hook/useGarageVoiceFlow';
import { GarageCard } from './components/GarageCard';

export function GaragePage() {

  const handleGoToAddVehicle = () => {
    console.log('go to add vehicle...');
    navigate('/add-vehicle/');
  } 
  
  const navigate = useNavigate();
  
  const { vehicles, resetGarage, deleteVehicle, setFavoriteVehicle } = useGarage();

    // 3. Orchestrazione Vocale (Il Cervello NLP)
    useGarageVoiceFlow({
      vehicles: vehicles,
      actions: { deleteVehicle, resetGarage, goToAddVehicle: handleGoToAddVehicle, setFavoriteVehicle }
    });

  const handleResetGarage = () => {
    console.log('reset garage...');
    resetGarage();
  } 

  

  return (

    <div>
      
      {/* Header con titolo, Calendario e Svuota Tutto */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-800/80 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">La tua Flotta</h1>
          <p className="text-sm text-zinc-400 mt-1">Gestisci i tuoi {vehicles.length} veicoli configurati</p>
        </div>

        <div className="w-auto flex flex-wrap gap-3">
          <Button onClick={() => navigate('/calendar')}>
            📅 Calendario
          </Button>
          <Button onClick={() => handleGoToAddVehicle()}>
            + Auto
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Sei sicuro di voler svuotare interamente il tuo garage?")) {
                handleResetGarage();
              }
            }}
          >
            Svuota
          </Button>
        </div>
      </div>

      {/* Griglia delle auto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vehicles.map((vehicle) => (
          <GarageCard 
            key={vehicle.id}
            vehicle={vehicle} 
            onDelete={deleteVehicle}
            onSetFavorite={setFavoriteVehicle}
          />
        ))}
      </div>

    </div>
  );
}