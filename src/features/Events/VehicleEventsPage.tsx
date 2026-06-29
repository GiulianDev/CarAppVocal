// VehicleEventPage.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGarage } from '../../shared/Garage/useGarage';
import { EventForm, type EventFormData, type EventFormMode } from './components/EventForm';
import { useVoiceEventsFlow } from './hook/useVoiceEventsFlow'; // <-- Import Sbloccato
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';

export function VehicleEventsPage() {
  const { id, eventId } = useParams<{ id: string; eventId?: string }>();
  const navigate = useNavigate();
  const { addEventToVehicle, updateEvent, deleteEvent, getVehicle, isLoading } = useGarage();

  const [currentMode, setCurrentMode] = useState<EventFormMode>(eventId ? 'view' : 'create');
  
  // 1. Recupero sicuro del veicolo prima degli Early Return
  const vehicle = id && !isLoading ? getVehicle(id) : null;
  const event = eventId && vehicle ? vehicle.events?.find((e) => e.id === eventId) : null;

  const goToVehicleDetail = (id: string) => { 
    console.log('going to garage...');
    navigate(`/detail/${id}`)
  };

  // 2. Definizione del Submit (deve stare in alto perché serve all'hook vocale)
  const handleFormSubmit = async (data: EventFormData) => {
    // Protezione per Typescript
    if (!vehicle) return; 

    if (currentMode === 'create') {
      addEventToVehicle(vehicle.id, data);
    } else if (currentMode === 'edit' && eventId) {
      updateEvent(vehicle.id, eventId, data);
    }

    // Integrazione Calendario tramite Capacitor
    if (data.reminderDate) {
      try {
        const reminderTime = new Date(data.reminderDate).getTime();
        const eventTitle = `[Garage] ${vehicle.brand} (${vehicle.plate}) - ${data.title}`;
        const eventDescription = data.notes || 'Promemoria generato dalla tua app Garage.';

        const permission = await CapacitorCalendar.requestWriteOnlyCalendarAccess();

        if (permission.result === 'granted') {
          await CapacitorCalendar.createEvent({
            title: eventTitle,
            description: eventDescription,
            startDate: reminderTime,
            endDate: reminderTime,
            isAllDay: true,
          });
        } else {
          await CapacitorCalendar.createEventWithPrompt({
            title: eventTitle,
            startDate: reminderTime,
            endDate: reminderTime,
          });
        }
      } catch (error) {
        console.error("Errore durante l'integrazione con Capacitor Calendar:", error);
      }
    }

    navigate(`/detail/${vehicle.id}`);
  };

  // 3. Orchestrazione Vocale (Ora è in cima e sicura!)
  useVoiceEventsFlow({
    vehicle: vehicle,
    actions: { 
      submitForm: handleFormSubmit // Passiamo la funzione che salva effettivamente l'evento
    }
  });

  // 4. EARLY RETURNS (Sotto l'Hook vocale)
  if (isLoading) {
    return <div className="p-8 text-center text-zinc-400 font-mono">Caricamento in corso...</div>;
  }
  
  if (!vehicle) {
    return <div className="p-8 text-center text-zinc-400">Veicolo non trovato.</div>;
  }

  if (eventId && !event) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <p className="mb-4">Evento non trovato nel registro del veicolo.</p>
        <button onClick={() => navigate(`/detail/${vehicle.id}`)} className="text-indigo-400 underline text-sm">
          Torna al dettaglio
        </button>
      </div>
    );
  }

  const handleFormDelete = () => {
    if (eventId && window.confirm('Sei sicuro di voler eliminare permanentemente questo evento?')) {
      deleteEvent(vehicle.id, eventId);
      goToVehicleDetail(vehicle.id);
    }
  };

  return (
    <div>
      {/* Intestazione Contestuale */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(`/detail/${vehicle.id}`)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 mb-3"
        >
          ← Torna a {vehicle.brand}
        </button>
        
        <h1 className="text-xl font-bold text-white tracking-tight">
          {currentMode === 'create' && '🛠️ Nuovo Evento'}
          {currentMode === 'view' && '🔍 Dettaglio Attività'}
          {currentMode === 'edit' && '📝 Modifica Attività'}
        </h1>
        <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase tracking-wider">
          {vehicle.brand} • <span className="text-indigo-400">{vehicle.plate}</span>
        </p>
      </div>

      <EventForm
        mode={currentMode}
        initialData={event || undefined}
        onSubmit={handleFormSubmit}
        onDelete={event ? handleFormDelete : undefined}
        onEditClick={() => setCurrentMode('edit')}
        onCancelClick={() => {
          if (eventId) {
            setCurrentMode('view'); 
          } else {
            navigate(`/detail/${vehicle.id}`);
          }
        }}
      />
    </div>
  );
}