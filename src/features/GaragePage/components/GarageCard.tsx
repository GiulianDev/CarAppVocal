import { useNavigate } from 'react-router-dom';
import type { Vehicle } from '../../../shared/Garage/vehicle';
import { Button } from '../../../shared/ui/Button';

// ==========================================
// CARD VEICOLO NEL GARAGE (OTTIMIZZATA)
// ==========================================

interface GarageCardProps {
  vehicle: Vehicle;
  onDelete: (id: string) => void;
  onSetFavorite: (id: string) => void;
}

export function GarageCard({ vehicle, onDelete, onSetFavorite }: GarageCardProps) {
  const navigate = useNavigate();

  return (
    <div 
      className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/60 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700/60 transition-all duration-200 cursor-pointer group"
      onClick={() => navigate(`/detail/${vehicle.id}`)}
    >
      {/* Blocco Superiore: Info Veicolo (Sinistra) e Stella (Destra) */}
      <div className="flex items-start justify-between gap-4">
        
        {/* Contenitore Testi: flex-col impedisce alla targa di collidere orizzontalmente */}
        <div className="flex flex-col min-w-0 flex-1">
          {/* Brand e Modello */}
          <h3 className="font-bold text-lg text-zinc-200 tracking-tight break-words pr-1">
            {vehicle.brand}
          </h3>
          
          {/* Targa posizionata sotto al titolo: spazio sicuro al 100% su ogni viewport */}
          <div className="mt-2.5">
            <span className="inline-block font-mono bg-zinc-800 text-indigo-400 px-3 py-1 rounded-md text-xs font-bold tracking-widest border border-zinc-700/50 shadow-inner select-none">
              {vehicle.plate}
            </span>
          </div>
        </div>

        {/* Pulsante Preferito posizionato stabilmente in alto a destra */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Evita il trigger del click sulla card
            onSetFavorite(vehicle.id); // 👈 Eseguiamo la callback passata come prop
          }}
          className={`flex-shrink-0 transition-all duration-300 ease-out focus:outline-none p-1 rounded-lg -mt-1 -mr-1 ${
            vehicle.isFavorite 
              ? 'text-indigo-400 drop-shadow-[0_0_12px_rgba(129,140,248,0.7)] scale-110' 
              : 'text-zinc-600 hover:text-zinc-400 hover:scale-110'
          }`}
          title={vehicle.isFavorite ? "Veicolo principale" : "Imposta come principale"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill={vehicle.isFavorite ? "currentColor" : "none"} 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-5 h-5 sm:w-6 sm:h-6"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </button>
      </div>
      
      {/* Blocco Inferiore: Pulsante di eliminazione */}
      <div className="mt-6 pt-4 border-t border-zinc-800/40 flex justify-end">
        <Button
          variant="danger"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Vuoi eliminare ${vehicle.brand}?`)) {
              onDelete(vehicle.id);
            }
          }}
        >
          Elimina
        </Button>
      </div>
    </div>
  );
}