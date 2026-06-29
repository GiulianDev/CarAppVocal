import type { EventCategory } from '../../../shared/Garage/car';

// ==========================================
// UTILITIES E HELPER CONDIVISI
// ==========================================
export const formatDate = (dateString: string) => {
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

export const getCategoryColor = (cat: EventCategory) => {
  switch (cat) {
    case 'manutenzione': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'documenti': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'riparazione': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'altro': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
};
