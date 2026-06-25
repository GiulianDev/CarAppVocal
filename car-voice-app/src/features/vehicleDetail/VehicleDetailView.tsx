import { Button } from '../../shared/ui/Button';
import { useCarContext } from '../../shared/context/CarContext';
import type { Car } from '../../shared/types/car';

interface VehicleDetailViewProps {
  car: Car;
}

export function VehicleDetailView({ car }: VehicleDetailViewProps) {

  console.log('Vehicle detail view');
  // Consumiamo direttamente l'azione di eliminazione dal Context globale
  const { deleteCar } = useCarContext();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050508] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/30 via-[#050508] to-[#010103] p-4 font-sans text-zinc-100 relative overflow-hidden">
      
      {/* Effetti di luce cyberpunk coerenti con l'onboarding */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md p-6 sm:p-8 bg-zinc-900/30 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10">
        
        <div className="flex justify-between items-center mb-6">
          <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-indigo-500/20">
            Veicolo Attivo
          </span>
          <div className="w-auto">
            <Button 
              variant="danger" 
              onClick={() => {
                if (confirm(`Vuoi davvero rimuovere la ${car.brand} dal garage?`)) {
                  deleteCar(car.id);
                }
              }}
            >
              Rimuovi Auto
            </Button>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          {car.brand}
        </h1>
        
        {/* Placca Targa con lo stile scuro/cyber ottimizzato */}
        <div className="inline-flex items-center bg-zinc-800/50 text-indigo-400 font-mono font-bold text-xl px-4 py-1.5 rounded-xl border border-zinc-700/60 tracking-widest my-2 shadow-inner">
          <div className="w-1.5 h-4 bg-indigo-500 mr-2.5 rounded-sm animate-pulse" />
          {car.plate}
        </div>

        <div className="border-t border-zinc-800/60 my-6" />

        <div className="bg-[#0b0b12]/60 border border-zinc-800/80 p-5 rounded-xl text-center backdrop-blur-sm group hover:border-indigo-500/30 transition-colors duration-300">
          <p className="font-semibold text-zinc-200 flex items-center justify-center gap-2">
            <span>🎙️</span> Prossimo Step: Comando Vocale
          </p>
          <p className="text-xs text-zinc-500 mt-15 max-w-xs mx-auto leading-relaxed">
            Qui integreremo l'interfaccia di registrazione per catturare i tuoi log vocali.
          </p>
        </div>
      </div>
    </div>
  );
}