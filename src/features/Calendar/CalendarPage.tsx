// CalendarPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarage } from '../../shared/Garage/useGarage';
import { Button } from '../../shared/ui/Button';
import type { EventCategory, VehicleEvent } from '../../shared/Garage/vehicle';

interface ExtendedEvent extends VehicleEvent {
  carId: string;
  carBrand: string;
  carPlate: string;
}

export function CalendarPage() {
  const navigate = useNavigate();
  const { cars, isLoading } = useGarage();
  
  // Stato per il filtro attivo
  const [activeFilter, setActiveFilter] = useState<EventCategory | 'tutti'>('tutti');

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-400">Caricamento calendario...</div>;
  }

  // 1. Estraiamo tutti gli eventi da tutti i veicoli iniettando i dati dell'auto di appartenenza
  const allEvents: ExtendedEvent[] = cars.flatMap(car => 
    (car.events || []).map((event: any) => ({
      ...event,
      carId: car.id,
      carBrand: car.brand,
      carPlate: car.plate
    }))
  );

  // 2. Ordiniamo tutti gli eventi dal più recente al più lontano
  allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 3. Applichiamo il filtro rapido per categoria se selezionato
  const filteredEvents = activeFilter === 'tutti' 
    ? allEvents 
    : allEvents.filter(event => event.category === activeFilter);

  // Helper grafici per i badge delle categorie
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'manutenzione':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'documenti':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'riparazione':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  // Helper per formattare la data
  const formatDate = (dateString: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      return new Date(dateString).toLocaleDateString('it-IT', options);
    } catch {
      return dateString;
    }
  };

  return (
    <div>
      
      {/* Intestazione */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-800/80 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            Calendario Eventi
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Cronologia e scadenze di tutti i veicoli presenti nel tuo garage.
          </p>
        </div>
        <Button onClick={() => navigate('/')}>
          Torna al Garage
        </Button>
      </div>

      {/* Sezione Filtri Rapidi (Tag) */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['tutti', 'manutenzione', 'riparazione', 'documenti', 'altro'] as const).map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(79,70,229,0.3)]'
                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {filter === 'tutti' ? '📁 Tutti' : filter === 'manutenzione' ? '🛠️ Manutenzione' : filter === 'riparazione' ? '💥 Riparazioni' : filter === 'documenti' ? '📄 Documenti' : '🔎 Altro'}
            </button>
          );
        })}
      </div>

      {/* Lista degli eventi unificata */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/10 border border-dashed border-zinc-800 rounded-2xl">
            <p className="text-sm text-zinc-500">Nessun evento trovato per la categoria selezionata.</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => navigate(`/detail/${event.carId}`)}
              className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-700/60 transition-all cursor-pointer group"
            >
              {/* Sinistra: Info Evento e Auto */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-zinc-200 group-hover:text-indigo-400 transition-colors">
                    {event.title}
                  </h3>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(event.category)}`}>
                    {event.category}
                  </span>
                </div>
                
                {/* Riferimento veicolo */}
                <div className="text-xs text-zinc-400 flex items-center gap-2">
                  <span>Veicolo: <strong className="text-zinc-300 font-medium">{event.carBrand}</strong></span>
                  <span className="text-zinc-600">•</span>
                  <span className="font-mono bg-zinc-800/60 text-zinc-400 px-1.5 py-0.5 rounded text-[10px] border border-zinc-800">
                    {event.carPlate}
                  </span>
                </div>

                {event.notes && (
                  <p className="text-xs text-zinc-500 italic truncate max-w-md mt-0.5">
                    Note: {event.notes}
                  </p>
                )}
              </div>

              {/* Destra: Data dell'evento */}
              <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 border-zinc-800/40 pt-2 sm:pt-0">
                <span className="text-xs text-zinc-500 sm:hidden">Data evento:</span>
                <span className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-2.5 py-1 rounded-lg">
                  {formatDate(event.date)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}