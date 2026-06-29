import { useState, useEffect } from 'react';
import type { EventCategory } from '../../../shared/Garage/vehicle';
import { Button } from '../../../shared/ui/Button';

export type EventFormMode = 'create' | 'view' | 'edit';

export interface EventFormData {
  title: string;
  category: EventCategory;
  date: string;
  notes?: string;
}

interface EventFormProps {
  mode: EventFormMode;
  initialData?: EventFormData;
  onSubmit: (data: EventFormData) => void;
  onDelete?: () => void;
  onEditClick?: () => void;
  onCancelClick?: () => void;
}

export function EventForm({
  mode,
  initialData,
  onSubmit,
  onDelete,
  onEditClick,
  onCancelClick
}: EventFormProps) {
  
  // Helper per ottenere la data di oggi
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Stato interno del form
  const [title, setTitle] = useState(initialData?.title || '');
  const [category, setCategory] = useState<EventCategory>(initialData?.category || 'manutenzione');
  const [date, setDate] = useState(initialData?.date || getTodayDateString());
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState('');

  // Se initialData cambia (es. il padre carica i dati asincronamente), aggiorniamo lo stato
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setCategory(initialData.category);
      setDate(initialData.date);
      setNotes(initialData.notes || '');
    }
  }, [initialData]);

  const isViewMode = mode === 'view';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Inserisci un titolo o una descrizione per l\'evento.');
      return;
    }
    setError('');
    onSubmit({
      title: title.trim(),
      category,
      date,
      notes: notes.trim() || undefined,
    });
  };

  // Classi dinamiche per gli input in base allo stato
  const inputBaseClasses = "w-full rounded-xl px-4 py-2.5 text-sm transition-all";
  const inputActiveClasses = "bg-zinc-900/50 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-violet-500/30";
  const inputViewClasses = "bg-transparent border-transparent text-zinc-300 font-medium px-0 pointer-events-none";

  const currentInputClasses = `${inputBaseClasses} ${isViewMode ? inputViewClasses : inputActiveClasses}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Campo Titolo */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Cosa hai fatto? {mode !== 'view' && '*'}
        </label>
        <input
          type="text"
          placeholder="es. Cambio Olio, Revisione, Assicurazione..."
          value={title}
          readOnly={isViewMode}
          onChange={(e) => setTitle(e.target.value)}
          className={currentInputClasses}
        />
      </div>

      {/* Campo Categoria */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Categoria Tag
        </label>
        <select
          value={category}
          disabled={isViewMode}
          onChange={(e) => setCategory(e.target.value as EventCategory)}
          className={`${currentInputClasses} ${isViewMode ? 'appearance-none' : 'cursor-pointer'}`}
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
          readOnly={isViewMode}
          onChange={(e) => setDate(e.target.value)}
          className={`${currentInputClasses} ${isViewMode ? '' : 'cursor-pointer'}`}
        />
      </div>

      {/* Campo Note */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Note aggiuntive
        </label>
        {isViewMode && !notes ? (
          <span className="text-sm text-zinc-600 italic">Nessuna nota aggiunta.</span>
        ) : (
          <textarea
            placeholder="es. Costo, Officina, Km attuali, marca pezzi ricambio..."
            value={notes}
            readOnly={isViewMode}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${currentInputClasses} resize-none`}
          />
        )}
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {/* Area Bottoni Dinamica */}
      <div className="pt-4 flex flex-col sm:flex-row gap-3">
        {mode === 'create' && (
          <Button type="submit" className="w-full py-3 justify-center text-sm font-bold tracking-wide">
            Salva Evento
          </Button>
        )}

        {mode === 'view' && (
          <>
            <Button 
              type="button" 
              onClick={onEditClick} 
              className="flex-1 py-3 justify-center text-sm font-bold bg-indigo-600 hover:bg-violet-600 text-white border-none shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all"
            >
              Modifica Evento
            </Button>
            {onDelete && (
              <Button 
                type="button" 
                onClick={onDelete} 
                className="py-3 justify-center text-sm font-bold bg-transparent border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-all"
              >
                Elimina
              </Button>
            )}
          </>
        )}

        {mode === 'edit' && (
          <>
            <Button 
              type="button" 
              onClick={onCancelClick} 
              className="flex-1 py-3 justify-center text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-none transition-all"
            >
              Annulla
            </Button>
            <Button 
              type="submit" 
              className="flex-1 py-3 justify-center text-sm font-bold bg-indigo-600 hover:bg-violet-600 text-white border-none shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all"
            >
              Salva Modifiche
            </Button>
          </>
        )}
      </div>
    </form>
  );
}