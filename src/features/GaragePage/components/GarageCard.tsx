import { useNavigate } from 'react-router-dom';
import type { Vehicle } from '../../../shared/Garage/vehicle';
import { Button } from '../../../shared/ui/Button';
import { useGarage } from '../../../shared/Garage/useGarage';

// ==========================================
// CARD VEICOLO NEL GARAGE
// ==========================================

interface GarageCardProps {
  vehicle: Vehicle;
}


export function GarageCard({ vehicle }: GarageCardProps) {
  
  const navigate = useNavigate();
  const { deleteVehicle, setFavoriteVehicle } = useGarage();


  return (
     
      <div 
          key={vehicle.id} 
          className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/60 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700/60 transition-all duration-200 cursor-pointer"
          onClick={() => navigate(`/detail/${vehicle.id}`)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              {/* 👈 Pulsante Preferito con styling glow Blu/Viola */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFavoriteVehicle(vehicle.id);
                }}
                className={`transition-all duration-300 ease-out focus:outline-none ${
                  vehicle.isFavorite 
                    ? 'text-indigo-400 drop-shadow-[0_0_12px_rgba(129,140,248,0.7)] scale-110' 
                    : 'text-zinc-600 hover:text-zinc-400 hover:scale-110'
                }`}
                title={vehicle.isFavorite ? "Veicolo principale" : "Imposta come principale"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={vehicle.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </button>
              <h3 className="font-bold text-lg text-zinc-200 tracking-tight">
                {vehicle.brand}
              </h3>
            </div>
            <span className="font-mono bg-zinc-800 text-indigo-400 px-3 py-1 rounded-md text-xs font-bold tracking-widest border border-zinc-700/50 shadow-inner">
              {vehicle.plate}
            </span>
          </div>
          
          <div className="mt-6 pt-4 border-t border-zinc-800/40 flex justify-end">
            <Button
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Vuoi eliminare ${vehicle.brand}?`)) {
                  deleteVehicle(vehicle.id);
                }
              }}
            >
              Elimina
            </Button>
          </div>
        </div>
  );
}
