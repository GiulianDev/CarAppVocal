// VehicleDetailView.tsx
import { useNavigate } from 'react-router-dom';
import type { Vehicle } from '../../../shared/Garage/vehicle';
import { Button } from '../../../shared/ui/Button';
import { formatDate, getCategoryColor } from './VehicleDetailUtils';


// ==========================================
// EVENTS TAB - LISTA CRONOLOGICA
// ==========================================

interface EventsListTabProps {
  vehicle: Vehicle;
}


export function EventsListTab({ vehicle }: EventsListTabProps) {
  
  const navigate = useNavigate();

  const events = vehicle.events || [];

  if (events.length === 0) {
    return (
      <p className="text-xs text-zinc-500 text-center py-6 border border-dashed border-zinc-800 rounded-xl">
        Nessun evento registrato.
      </p>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-zinc-300">Cronologia Attività</h2>
        <Button onClick={() => navigate(`/detail/${vehicle.id}/event/new`)}>+ Evento</Button>
      </div>
                
      {events.map(event => (
        <button
          key={event.id}
          type="button"
          onClick={() => navigate(`/detail/${vehicle.id}/event/${event.id}`)}
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
