// AddEventView.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGarage } from '../../shared/Garage/useGarage';
import { Button } from '../../shared/ui/Button';
import type { EventCategory } from '../../shared/Garage/car';

export function AddEventView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addEventToVehicle, getVehicle, isLoading } = useGarage();

  // Helper per ottenere la data di oggi in formato YYYY-MM-DD richiesto dall'input HTML
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Stati del form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('manutenzione');
  const [date, setDate] = useState(getTodayDateString()); // Data di oggi preimpostata
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-400">Caricamento...</div>;
  }

  const car = getVehicle(id);

  if (!car) {
    return <div className="p-8 text-center text-zinc-400">Veicolo non trovato.</div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Inserisci un titolo o una descrizione per l\'evento.');
      return;
    }

    // Salviamo l'evento usando il servizio aggiornato nello Step 2
    addEventToVehicle(car.id, {
      title: title.trim(),
      category,
      date,
      notes: notes.trim() || undefined,
    });

    // Torniamo alla pagina di dettaglio dell'auto
    navigate(`/detail/${car.id}`);
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-zinc-900/30 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in duration-200">
      <div className="flex justify-between items-center mb-6">
        <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-emerald-500/20">
          Nuovo Evento
        </span>
        <Button onClick={() => navigate(`/detail/${car.id}`)}>
          Annulla
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
        Aggiungi Scadenza / Evento
      </h1>
      <p className="text-xs text-zinc-400 mb-6">
        Registra un'attività per il veicolo: <span className="text-indigo-400 font-semibold">{car.brand}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Campo Titolo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Cosa hai fatto? *
          </label>
          <input
            type="text"
            placeholder="es. Cambio Olio, Revisione, Assicurazione..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        </div>

        {/* Campo Categoria */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Categoria Tag
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all appearance-none cursor-pointer"
          >
            <option value="manutenzione">🛠️ Manutenzione ordinaria</option>
            <option value="riparazione">💥 Riparazione / Guasto</option>
            <option value="documenti">📄 Documenti (Bollo, Assicurazione, ...)</option>
            <option value="altro">📁 Altro</option>
          </select>
        </div>

        {/* Campo Data */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Data dell'evento
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all cursor-pointer"
          />
        </div>

        {/* Campo Note */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Note aggiuntive (Opzionale)
          </label>
          <textarea
            placeholder="es. Costo, Officina, Km attuali, marca pezzi ricambio..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
          />
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        {/* Bottone di Conferma */}
        <div className="pt-2">
          <Button type="submit" className="w-full py-3 justify-center text-sm font-bold tracking-wide">
            Salva Evento
          </Button>
        </div>
      </form>
    </div>
  );
}