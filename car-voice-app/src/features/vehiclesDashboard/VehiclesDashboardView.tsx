import { Button } from '../../shared/ui/Button';
import { useCarContext } from '../../shared/context/CarContext';
import type { Car } from '../../shared/types/car';

interface VehiclesDashboardViewProps {
  cars: Car[];
}

export function VehiclesDashboardView({ cars }: VehiclesDashboardViewProps) {
  const { deleteCar, resetGarage } = useCarContext();

  return (
    // Rimosso il wrapper min-h-screen, manteniamo solo la larghezza e centratura
    <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-300">
      
      {/* Header con titolo e tasto Svuota Tutto */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-800/80 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">La tua Flotta</h1>
          <p className="text-sm text-zinc-400 mt-1">Gestisci i tuoi {cars.length} veicoli configurati</p>
        </div>
        <div className="w-auto">
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Sei sicuro di voler svuotare interamente il tuo garage?")) {
                resetGarage();
              }
            }}
          >
            Svuota Garage
          </Button>
        </div>
      </div>

      {/* Griglia delle auto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cars.map((car) => (
          <div 
            key={car.id} 
            className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/60 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700/60 transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-lg text-zinc-200 tracking-tight">
                {car.brand}
              </h3>
              {/* Targa */}
              <span className="font-mono bg-zinc-800 text-indigo-400 px-3 py-1 rounded-md text-xs font-bold tracking-widest border border-zinc-700/50 shadow-inner">
                {car.plate}
              </span>
            </div>
            
            <div className="mt-6 pt-4 border-t border-zinc-800/40 flex justify-end">
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(`Vuoi eliminare ${car.brand}?`)) {
                    deleteCar(car.id);
                  }
                }}
              >
                Elimina Veicolo
              </Button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}