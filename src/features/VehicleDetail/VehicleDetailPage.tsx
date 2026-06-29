import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useGarage } from '../../shared/Garage/useGarage';
import { EventsListTab } from './components/EventsListTab';
import { EventsCalendarTab } from './components/EventsCalendarTab';
import { VehicleInfo } from './components/VehicleInfo';

// ==========================================
// COMPONENTE PRINCIPALE (CONTENITORE TABS)
// ==========================================

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getVehicle, isLoading } = useGarage();

  const [activeTab, setActiveTab] = useState<'lista' | 'calendario'>('lista');

  if (!id) return <Navigate to="/" replace />;
  if (isLoading) return <div className="p-8 text-center text-zinc-400 font-mono">Caricamento veicolo...</div>;

  const vehicle = getVehicle(id);
  if (!vehicle) return <div className="p-8 text-center text-zinc-400">Veicolo non trovato.</div>;

  return (
    <div>
      
      {/* Informazioni Veicolo */}
      <VehicleInfo vehicle={vehicle}/>

      {/* Navigazione Tab */}
      <div className="flex bg-zinc-950/60 p-1 rounded-xl border border-zinc-800 mb-6">
        <button
          onClick={() => setActiveTab('lista')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'lista' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          📋 Registro Lista
        </button>
        <button
          onClick={() => setActiveTab('calendario')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'calendario' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          📅 Calendario Auto
        </button>
      </div>


      {/* ─── UNICO CONTAINER DI SCROLL CONDIVISO ─── */}
      <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
        {activeTab === 'lista' ? (
          <EventsListTab vehicle={vehicle}/>
        ) : (
          <EventsCalendarTab vehicle={vehicle}/>
        )}
      </div>

    </div>
  );
}