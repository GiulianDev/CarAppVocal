// VehicleEventPage.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGarage } from '../../shared/Garage/useGarage';
import { EventForm, type EventFormData, type EventFormMode } from './components/EventForm';

export function VehicleEventsPage() {
  const { id, eventId } = useParams<{ id: string; eventId?: string }>();
  const navigate = useNavigate();
  const { addEventToVehicle, updateEvent, deleteEvent, getVehicle, isLoading } = useGarage();

  // Se c'è un eventId nell'URL partiamo in modalità 'view', altrimenti 'create'
  const [currentMode, setCurrentMode] = useState<EventFormMode>(eventId ? 'view' : 'create');

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-400 font-mono">Caricamento in corso...</div>;
  }

  const car = getVehicle(id);
  if (!car) {
    return <div className="p-8 text-center text-zinc-400">Veicolo non trovato.</div>;
  }

  // Cerca l'evento specifico se siamo in modalità view o edit
  const event = eventId ? car.events?.find((e) => e.id === eventId) : null;

  // Protezione nel caso l'URL contenga un ID evento invalido
  if (eventId && !event) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <p className="mb-4">Evento non trovato nel registro del veicolo.</p>
        <button onClick={() => navigate(`/detail/${car.id}`)} className="text-indigo-400 underline text-sm">
          Torna al dettaglio
        </button>
      </div>
    );
  }

  const handleFormSubmit = (data: EventFormData) => {
    if (currentMode === 'create') {
      addEventToVehicle(car.id, data);
    } else if (currentMode === 'edit' && eventId) {
      updateEvent(car.id, eventId, data);
    }
    // Ritorna sempre alla vista di dettaglio principale
    navigate(`/detail/${car.id}`);
  };

  const handleFormDelete = () => {
    if (eventId && window.confirm('Sei sicuro di voler eliminare permanentemente questo evento?')) {
      deleteEvent(car.id, eventId);
      navigate(`/detail/${car.id}`);
    }
  };

  return (
    <div>
      
      {/* Intestazione Contestuale */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(`/detail/${car.id}`)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 mb-3"
        >
          ← Torna a {car.brand}
        </button>
        
        <h1 className="text-xl font-bold text-white tracking-tight">
          {currentMode === 'create' && '🛠️ Nuovo Evento'}
          {currentMode === 'view' && '🔍 Dettaglio Attività'}
          {currentMode === 'edit' && '📝 Modifica Attività'}
        </h1>
        <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase tracking-wider">
          {car.brand} • <span className="text-indigo-400">{car.plate}</span>
        </p>
      </div>

      {/* Il Form Riceve lo Stato e le Funzioni di Callback Pulite */}
      <EventForm
        mode={currentMode}
        initialData={event || undefined}
        onSubmit={handleFormSubmit}
        onDelete={event ? handleFormDelete : undefined}
        onEditClick={() => setCurrentMode('edit')}
        onCancelClick={() => {
          if (eventId) {
            setCurrentMode('view'); // Torna alla visualizzazione se l'evento esiste
          } else {
            navigate(`/detail/${car.id}`); // Torna indietro se stavamo creando
          }
        }}
      />
    </div>
  );
}