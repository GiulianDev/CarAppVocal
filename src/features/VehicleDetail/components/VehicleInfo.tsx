import { useNavigate } from 'react-router-dom';
import type { Vehicle } from '../../../shared/Garage/vehicle';

// ==========================================
// EVENTS TAB - LISTA CRONOLOGICA
// ==========================================

interface VehicleInfoProps {
  vehicle: Vehicle;
}


export function VehicleInfo({ vehicle }: VehicleInfoProps) {
  
  const navigate = useNavigate();

  return (
    <>
     {/* Informazioni Veicolo */}
      <div className="flex justify-between items-center mb-4">
        <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-500/20">
          Scheda Veicolo
        </span>
        <button onClick={() => navigate('/garage')} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Lista Garage
        </button>
      </div>
      
      <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">{vehicle.brand}</h1>
      <div className="inline-flex items-center bg-zinc-800/50 text-indigo-400 font-mono font-bold text-lg px-3 py-1 rounded-xl border border-zinc-700/60 tracking-widest mb-6">
        {vehicle.plate}
      </div>
    </>
  );
}
