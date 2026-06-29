import { Button } from '../../shared/ui/Button';
import { useGarage } from '../../shared/Garage/useGarage';
import { useNavigate } from 'react-router-dom';
import { useGarageVoiceFlow } from './hook/useGarageVoiceFlow';

export function GaragePage() {

  const handleGoToDetail = (id: string) => {
    navigate(`/detail/${id}`);
  }  
  const handleGoToAddVehicle = () => {
    console.log('go to add vehicle...');
    navigate('/add-vehicle/');
  } 
  
  const navigate = useNavigate();
  
  const { vehicles, resetGarage, deleteVehicle } = useGarage();

    // 3. Orchestrazione Vocale (Il Cervello NLP)
    useGarageVoiceFlow({
      vehicles: vehicles,
      actions: { deleteVehicle, resetGarage, goToAddVehicle: handleGoToAddVehicle }
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
          <div 
            key={vehicle.id} 
            className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/60 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700/60 transition-all duration-200"
            onClick={() => handleGoToDetail(vehicle.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-lg text-zinc-200 tracking-tight">
                {vehicle.brand}
              </h3>
              {/* Targa */}
              <span className="font-mono bg-zinc-800 text-indigo-400 px-3 py-1 rounded-md text-xs font-bold tracking-widest border border-zinc-700/50 shadow-inner">
                {vehicle.plate}
              </span>
            </div>
            
            <div className="mt-6 pt-4 border-t border-zinc-800/40 flex justify-end">
              <Button
                variant="danger"
                onClick={(e) => { // 1. Ricevi l'evento 'e'
                  e.stopPropagation(); // 2. FERMA LA PROPAGAZIONE al genitore!
                  
                  if (confirm(`Vuoi eliminare ${vehicle.brand}?`)) {
                    deleteVehicle(vehicle.id);
                  }
                }}
              >
                Elimina
              </Button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}