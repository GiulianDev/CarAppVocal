// VehicleDetailView.tsx
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useGarage } from '../../shared/Garage/useGarage';
import { Button } from '../../shared/ui/Button';
import type { EventCategory, VehicleEvent } from '../../shared/Garage/car';

// ==========================================
// UTILITIES E HELPER CONDIVISI
// ==========================================
const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch {
    return dateString;
  }
};

const getCategoryColor = (cat: EventCategory) => {
  switch (cat) {
    case 'manutenzione': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'documenti': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'riparazione': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'altro': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
};


// ==========================================
// COMPONENTE 1: TAB LISTA CRONOLOGICA
// ==========================================
interface EventsListTabProps {
  events: VehicleEvent[];
  carId: string;
  onNavigateToEvent: (url: string) => void;
}

function EventsListTab({ events, carId, onNavigateToEvent }: EventsListTabProps) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-zinc-500 text-center py-6 border border-dashed border-zinc-800 rounded-xl">
        Nessun evento registrato.
      </p>
    );
  }

  return (
    <>
      {events.map(event => (
        <button
          key={event.id}
          type="button"
          onClick={() => onNavigateToEvent(`/detail/${carId}/event/${event.id}`)}
          className="w-full text-left bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700/80 rounded-xl p-3 flex flex-col gap-1 transition-all group focus:outline-none focus:border-indigo-500/50"
        >
          <div className="flex justify-between items-start gap-2">
            <span className="font-semibold text-xs text-zinc-200 group-hover:text-indigo-400 transition-colors">
              {event.title}
            </span>
            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${getCategoryColor(event.category)}`}>
              {event.category}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-zinc-500 w-full">
            <span>{formatDate(event.date)}</span>
            {event.notes && <span className="italic text-zinc-400 truncate max-w-[150px]">{event.notes}</span>}
          </div>
        </button>
      ))}
    </>
  );
}


// ==========================================
// COMPONENTE 2: TAB CALENDARIO / AGENDA
// ==========================================
interface EventsCalendarTabProps {
  events: VehicleEvent[];
  carId: string;
  onNavigateToEvent: (url: string) => void;
}

function EventsCalendarTab({ events, carId, onNavigateToEvent }: EventsCalendarTabProps) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-zinc-500 text-center py-6 border border-dashed border-zinc-800 rounded-xl">
        Nessuna scadenza trovata per questo filtro.
      </p>
    );
  }

  return (
    <>
      {events.map(event => (
        <button
          key={event.id}
          type="button"
          onClick={() => onNavigateToEvent(`/detail/${carId}/event/${event.id}`)}
          className="w-full flex items-center justify-between p-2.5 bg-zinc-950/40 border border-zinc-800/50 hover:border-zinc-700/80 rounded-xl text-left transition-all group focus:outline-none focus:border-indigo-500/50"
        >
          <div className="flex flex-col">
            <span className="text-xs font-medium text-zinc-300 group-hover:text-indigo-400 transition-colors">
              {event.title}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {formatDate(event.date)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              event.category === 'manutenzione' ? 'bg-emerald-400' : 
              event.category === 'riparazione' ? 'bg-rose-400' : 
              event.category === 'documenti' ? 'bg-amber-400' : 'bg-zinc-400'
            }`} />
            <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors ml-1">
              →
            </span>
          </div>
        </button>
      ))}
    </>
  );
}


// ==========================================
// COMPONENTE PRINCIPALE (CONTENITORE)
// ==========================================
export function VehicleDetailView() {
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
    <div className="w-full max-w-md p-6 sm:p-8 bg-zinc-900/30 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in duration-200">
      
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