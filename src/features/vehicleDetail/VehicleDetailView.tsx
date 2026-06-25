import { Button } from '../../shared/ui/Button';
import { useCarContext } from '../../shared/context/CarContext';
import type { Car } from '../../shared/types/car';

interface VehicleDetailViewProps {
  car: Car;
}

export function VehicleDetailView({ car }: VehicleDetailViewProps) {
  // Estraiamo l'azione dal context globale
  const { deleteCar, setIsAdding } = useCarContext();

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-zinc-900/30 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      
      <div className="flex justify-between items-center mb-6">
        <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-indigo-500/20">
          Veicolo Attivo
        </span>
        
        <div className="flex items-center gap-2 w-auto">
          {/* Modifica lo stato globale per andare in modalità inserimento */}
          <Button variant="primary" onClick={() => setIsAdding(true)}>
            <span className="mr-1.5 font-bold">+</span> Auto
          </Button>

          <Button 
            variant="danger" 
            onClick={() => {
              if (confirm(`Vuoi davvero rimuovere la ${car.brand} dal garage?`)) {
                deleteCar(car.id);
              }
            }}
          >
            Rimuovi
          </Button>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2 tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
        {car.brand}
      </h1>
      
      <div className="inline-flex items-center bg-zinc-800/50 text-indigo-400 font-mono font-bold text-xl px-4 py-1.5 rounded-xl border border-zinc-700/60 tracking-widest my-2 shadow-inner">
        <div className="w-1.5 h-4 bg-indigo-500 mr-2.5 rounded-sm animate-pulse" />
        {car.plate}
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

    </div>
  );
}