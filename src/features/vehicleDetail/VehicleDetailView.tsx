import { Button } from '../../shared/ui/Button';
import { useCarContext } from '../../shared/Garage/CarContext';
import type { Car } from '../../shared/Garage/car';
import { useGarage } from '../../shared/Garage/useGarage';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

export function VehicleDetailView() {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { getVehicle, isLoading } = useGarage();

  // Se per qualche motivo strano non c'è l'ID, fai redirect
  if (!id) {
    return <Navigate to="/add-vehicle" replace />;
  }

  // Aspettiamo che l'hook finisca di leggere dal localStorage
  if (isLoading) {
    return <div className="p-8 text-center text-zinc-400">Caricamento veicolo...</div>;
  }

  // Ora recuperiamo l'auto (senza scatenare re-render)
  const car = getVehicle(id);
  const goToAddVehicle = () => {
    navigate(`/add-vehicle/`);
  }

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-zinc-900/30 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      


      {car ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-indigo-500/20">
              Veicolo Attivo
            </span>
            
            <div className="flex items-center gap-2 w-auto">
              {/* Modifica lo stato globale per andare in modalità inserimento */}
              <Button variant="primary" onClick={goToAddVehicle}>
                <span className="mr-1.5 font-bold">+</span> Auto
              </Button>

              {/* <Button 
                variant="danger" 
                onClick={() => {
                  if (confirm(`Vuoi davvero rimuovere la ${car.brand} dal garage?`)) {
                    deleteCar(car.id);
                    }
                    }}
                    >
                    Rimuovi
                    </Button> */}
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            {car?.brand}
          </h1>
          
          <div className="inline-flex items-center bg-zinc-800/50 text-indigo-400 font-mono font-bold text-xl px-4 py-1.5 rounded-xl border border-zinc-700/60 tracking-widest my-2 shadow-inner">
            <div className="w-1.5 h-4 bg-indigo-500 mr-2.5 rounded-sm animate-pulse" />
            {car?.plate}
          </div>

          <div className="border-t border-zinc-800/60 my-6" />

          <div className="bg-[#0b0b12]/60 border border-zinc-800/80 p-5 rounded-xl text-center backdrop-blur-sm">
            <p className="font-semibold text-zinc-200 flex items-center justify-center gap-2">
              <span>🎙️</span> Prossimo Step: Comando Vocale
            </p>
            <p className="text-xs text-zinc-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Qui integreremo l'interfaccia di registrazione per catturare i tuoi log vocali.
            </p>
          </div>
        </>
      ) : (
        <>
        <div>
          id non trovato
        </div>
        </>
      )}



    </div>
  );
}