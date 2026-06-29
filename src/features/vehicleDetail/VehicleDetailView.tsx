// VehicleDetailView.tsx
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useGarage } from '../../shared/Garage/useGarage';
import { Button } from '../../shared/ui/Button';
import type { EventCategory } from '../../shared/Garage/car';

export function VehicleDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getVehicle, addEventToVehicle, isLoading } = useGarage();

  // Stati interni per la gestione dinamica dei componenti inline
  const [activeTab, setActiveTab] = useState<'lista' | 'calendario'>('lista');
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [activeFilter, setActiveFilter] = useState<EventCategory | 'tutti'>('tutti');

  // Stati del Form di inserimento evento inline
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('manutenzione');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  if (!id) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-400">Caricamento veicolo...</div>;
  }

  // const goToAddVehicle = () => {
  //   navigate(`/add-vehicle/`);
  // }

  // Ora recuperiamo l'auto (senza scatenare re-render)
  const car = getVehicle(id);

  if (!car) {
    return <div className="p-8 text-center text-zinc-400">Veicolo non trovato.</div>;
  }

  // Gestione del salvataggio dell'evento inline
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Inserisci una descrizione per l\'evento.');
      return;
    }

    addEventToVehicle(car.id, {
      title: title.trim(),
      category,
      date,
      notes: notes.trim() || undefined,
    });

    // Reset del form e chiusura della sezione inline
    setTitle('');
    setNotes('');
    setFormError('');
    setIsAddingEvent(false);
  };

  // Filtriamo gli eventi di questo specifico veicolo
  const vehicleEvents = car.events || [];
  const filteredEvents = activeFilter === 'tutti' 
    ? vehicleEvents 
    : vehicleEvents.filter(e => e.category === activeFilter);

  // Helper per i colori dei tag
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'manutenzione': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'documenti': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'riparazione': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-zinc-900/30 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in duration-200">
      
      {/* Header Dettaglio */}
      <div className="flex justify-between items-center mb-4">
        <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-500/20">
          Scheda Veicolo
        </span>
          {/* 
          <Button onClick={goToAddVehicle}>
            + Veicolo
          </Button> 
          */}
      </div>
      
      <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">{car.brand}</h1>
      <div className="inline-flex items-center bg-zinc-800/50 text-indigo-400 font-mono font-bold text-lg px-3 py-1 rounded-xl border border-zinc-700/60 tracking-widest mb-6">
        {car.plate}
      </div>

      {/* Navigazione tra Sotto-Componenti (Tab) */}
      <div className="flex bg-zinc-950/60 p-1 rounded-xl border border-zinc-800 mb-6">
        <button
          onClick={() => { setActiveTab('lista'); setIsAddingEvent(false); }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'lista' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          📋 Registro Lista
        </button>
        <button
          onClick={() => { setActiveTab('calendario'); setIsAddingEvent(false); }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'calendario' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          📅 Calendario Auto
        </button>
      </div>

      {/* 1. COMPONENTE INLINE: FORM DI AGGIUNTA EVENTO */}
      {isAddingEvent && (
        <form onSubmit={handleSaveEvent} className="mb-6 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4 animate-in slide-in-from-top-4 duration-200">
          <h3 className="text-sm font-bold text-zinc-200">Aggiungi nuovo evento</h3>
          
          <input
            type="text"
            placeholder="Cosa hai fatto? (es. Cambio gomme)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-white focus:outline-none"
            >
              <option value="manutenzione">🛠️ Manutenzione</option>
              <option value="riparazione">💥 Riparazione</option>
              <option value="documenti">📄 Documenti</option>
              <option value="altro">📁 Altro</option>
            </select>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <input
            type="text"
            placeholder="Note opzionali (es. Costo, marca...)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
          />

          {formError && <p className="text-[11px] text-rose-400">⚠️ {formError}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setIsAddingEvent(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
            >
              Salva
            </button>
          </div>
        </form>
      )}

      {/* 2. TAB CONTENUTO: LISTA EVENTI REGISTRO */}
      {activeTab === 'lista' && !isAddingEvent && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-zinc-300">Cronologia Attività</h2>
            <Button onClick={() => setIsAddingEvent(true)}>+ Evento</Button>
          </div>

          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
            {vehicleEvents.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6 border border-dashed border-zinc-800 rounded-xl">Nessun evento registrato.</p>
            ) : (
              vehicleEvents.map(event => (
                <div key={event.id} className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 flex flex-col gap-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-xs text-zinc-200">{event.title}</span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${getCategoryColor(event.category)}`}>
                      {event.category}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>{formatDate(event.date)}</span>
                    {event.notes && <span className="italic text-zinc-400 truncate max-w-[150px]">{event.notes}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. TAB CONTENUTO: CALENDARIO SPECIFICO AUTO CON FILTRI RAPIDI */}
      {activeTab === 'calendario' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Filtri rapidi interni */}
          <div className="flex flex-wrap gap-1.5">
            {(['tutti', 'manutenzione', 'riparazione', 'documenti'] as const).map(f => (
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

          {/* Agenda scadenze ordinata */}
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6 border border-dashed border-zinc-800 rounded-xl">Nessuna scadenza trovata per questo filtro.</p>
            ) : (
              filteredEvents.map(event => (
                <div key={event.id} className="flex items-center justify-between p-2.5 bg-zinc-950/40 border border-zinc-800/50 rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-zinc-300">{event.title}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{formatDate(event.date)}</span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${
                    event.category === 'manutenzione' ? 'bg-emerald-400' : event.category === 'riparazione' ? 'bg-rose-400' : 'bg-amber-400'
                  }`} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}