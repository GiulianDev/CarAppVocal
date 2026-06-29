// ==========================================
// TAB CALENDARIO / AGENDA
// ==========================================

import type { VehicleEvent } from "../../../shared/Garage/car";
import { formatDate } from "./VehicleDetailUtils";

interface EventsCalendarTabProps {
  events: VehicleEvent[];
  carId: string;
  onNavigateToEvent: (url: string) => void;
}

export function EventsCalendarTab({ events, carId, onNavigateToEvent }: EventsCalendarTabProps) {
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