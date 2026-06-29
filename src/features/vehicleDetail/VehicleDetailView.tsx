// VehicleDetailView.tsx
import { Button } from '../../shared/ui/Button';
import { useGarage } from '../../shared/Garage/useGarage';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

export function VehicleDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getVehicle, isLoading } = useGarage();

  // Se per qualche motivo strano non c'è l'ID, fai redirect
  if (!id) {
    return <Navigate to="/add-vehicle" replace />;
  }

  // Aspettiamo che l'hook finisca di leggere dal localStorage
  if (isLoading) {
    return <div className="p-8 text-center text-zinc-400">Caricamento veicolo...</div>;
  }

  // const goToAddVehicle = () => {
  //   navigate(`/add-vehicle/`);
  // }

  // Ora recuperiamo l'auto (senza scatenare re-render)
  const car = getVehicle(id);

  const handleAddEventClick = () => {
    navigate(`/detail/${id}/add-event`);
  };

  // Colori per i tag delle categorie
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

  // Formattazione della data (es: 29 giu 2026)
  const formatDate = (dateString: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      return new Date(dateString).toLocaleDateString('it-IT', options);
    } catch {
      return dateString;
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-zinc-900/30 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in duration-200">
      {car ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-indigo-500/20">
              Dettaglio Veicolo
            </span>
            {/* <Button onClick={goToAddVehicle}>
              + Veicolo
            </Button> */}
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            {car.brand}
          </h1>
          
          <div className="inline-flex items-center bg-zinc-800/50 text-indigo-400 font-mono font-bold text-xl px-4 py-1.5 rounded-xl border border-zinc-700/60 tracking-widest my-2 shadow-inner">
            <div className="w-1.5 h-4 bg-indigo-500 mr-2.5 rounded-sm animate-pulse" />
            {car.plate}
          </div>

          <div className="border-t border-zinc-800/60 my-6" />

          {/* Intestazione Sezione Eventi */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-200 tracking-tight">
              Registro Eventi
            </h2>
            <Button onClick={handleAddEventClick}>
              + Evento
            </Button>
          </div>

          {/* Lista degli eventi */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {!car.events || car.events.length === 0 ? (
              <div className="text-center py-6 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-xl">
                <p className="text-sm text-zinc-500">Nessun evento registrato.</p>
              </div>
            ) : (
              car.events.map((event) => (
                <div 
                  key={event.id} 
                  className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 flex flex-col gap-1.5 hover:border-zinc-700/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-zinc-200 leading-tight">
                      {event.title}
                    </h3>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(event.category)}`}>
                      {event.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-zinc-500 mt-1">
                    <span className="font-mono">{formatDate(event.date)}</span>
                    {event.notes && (
                      <span className="truncate max-w-[180px] italic text-zinc-400 text-right">
                        {event.notes}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-zinc-800/60 my-6" />

          <div className="bg-[#0b0b12]/60 border border-zinc-800/80 p-5 rounded-xl text-center backdrop-blur-sm">
            <p className="font-semibold text-zinc-200 flex items-center justify-center gap-2">
              <span>🎙️</span> Prossimo Step: Comando Vocale
            </p>
            <p className="text-xs text-zinc-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Potrai aggiungere eventi semplicemente dicendo: <br />
              <span className="text-indigo-400 italic">"Aggiungi cambio olio fatto oggi"</span>
            </p>
          </div>
        </>
      ) : (
        <div className="text-center py-4 text-zinc-400">Veicolo non trovato.</div>
      )}
    </div>
  );
}