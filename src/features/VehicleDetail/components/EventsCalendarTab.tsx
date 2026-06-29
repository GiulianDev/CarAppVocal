// ==========================================
// TAB CALENDARIO / AGENDA
// ==========================================

import { useState } from "react";
import type { EventCategory, Vehicle } from "../../../shared/Garage/vehicle";
import { formatDate } from "./VehicleDetailUtils";
import { useNavigate } from "react-router-dom";

interface EventsCalendarTabProps {
  vehicle: Vehicle;
}

export function EventsCalendarTab({ vehicle }: EventsCalendarTabProps) {
  
  const navigate = useNavigate();
  
  const [activeFilter, setActiveFilter] = useState<EventCategory | 'tutti'>('tutti');

  const vehicleEvents = vehicle.events || [];

  const filteredEvents = activeFilter === 'tutti' 
    ? vehicleEvents 
    : vehicleEvents.filter(e => e.category === activeFilter);
  


  return (
    <>
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



      {filteredEvents.length < 1 && (
        <p className="text-xs text-zinc-500 text-center py-6 border border-dashed border-zinc-800 rounded-xl">
          Nessuna scadenza trovata per questo filtro.
        </p>
      )}

      {filteredEvents.map(event => (
        <button
          key={event.id}
          type="button"
          onClick={() => navigate(`/detail/${vehicle.id}/event/${event.id}`)}
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