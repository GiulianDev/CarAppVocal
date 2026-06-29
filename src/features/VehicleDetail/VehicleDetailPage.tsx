// VehicleDetailView.tsx
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useGarage } from '../../shared/Garage/useGarage';
import { Button } from '../../shared/ui/Button';
import type { EventCategory } from '../../shared/Garage/car';
import { EventsListTab } from './components/EventsListTab';
import { EventsCalendarTab } from './components/VehicleDetailPage';


// ==========================================
// COMPONENTE PRINCIPALE (CONTENITORE TABS)
// ==========================================
export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getVehicle, isLoading } = useGarage();

  const [activeTab, setActiveTab] = useState<'lista' | 'calendario'>('lista');
  const [activeFilter, setActiveFilter] = useState<EventCategory | 'tutti'>('tutti');

  if (!id) return <Navigate to="/" replace />;
  if (isLoading) return <div className="p-8 text-center text-zinc-400 font-mono">Caricamento veicolo...</div>;

  const car = getVehicle(id);
  if (!car) return <div className="p-8 text-center text-zinc-400">Veicolo non trovato.</div>;

  const vehicleEvents = car.events || [];
  const filteredEvents = activeFilter === 'tutti' 
    ? vehicleEvents 
    : vehicleEvents.filter(e => e.category === activeFilter);

  return (
    <div>
      
      {/* Informazioni Veicolo */}
      <div className="flex justify-between items-center mb-4">
        <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-500/20">
          Scheda Veicolo
        </span>
        <button onClick={() => navigate('/garage')} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Lista Garage
        </button>
      </div>
      
      <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">{car.brand}</h1>
      <div className="inline-flex items-center bg-zinc-800/50 text-indigo-400 font-mono font-bold text-lg px-3 py-1 rounded-xl border border-zinc-700/60 tracking-widest mb-6">
        {car.plate}
      </div>

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

      {/* CONTROLLI DINAMICI (Fuori dal contenitore di scroll per restare fissi in alto) */}
      <div className="mb-4">
        {activeTab === 'lista' ? (
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-zinc-300">Cronologia Attività</h2>
            <Button onClick={() => navigate(`/detail/${car.id}/event/new`)}>+ Evento</Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 animate-in fade-in duration-150">
            {(['tutti', 'manutenzione', 'riparazione', 'documenti', 'altro'] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-2 py-1 text-[10px] font-bold rounded-md border capitalize transition-all ${
                  activeFilter === f 
                    ? 'bg-indigo-600 border-indigo-500 text-white' 
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── UNICO CONTAINER DI SCROLL CONDIVISO ─── */}
      <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
        {activeTab === 'lista' ? (
          <EventsListTab 
            events={vehicleEvents} 
            carId={car.id} 
            onNavigateToEvent={navigate} 
          />
        ) : (
          <EventsCalendarTab 
            events={filteredEvents} 
            carId={car.id} 
            onNavigateToEvent={navigate} 
          />
        )}
      </div>

    </div>
  );
}