import { AddVehicleView } from './features/addVehicle/AddVehicleView';
import { VehicleDetailView } from './features/vehicleDetail/VehicleDetailView';
import { VehiclesDashboardView } from './features/vehiclesDashboard/VehiclesDashboardView';
import { useCarsQuery } from './shared/hooks/useCarsQuery';

export default function App() {
  const { cars, isLoading } = useCarsQuery();

  // Funzione helper per renderizzare il contenuto corretto
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin"></div>
          <p className="text-zinc-400 text-sm tracking-wide font-medium animate-pulse">
            Caricamento garage...
          </p>
        </div>
      );
    }
    if (cars.length === 0) return <AddVehicleView />;
    if (cars.length === 1) return <VehicleDetailView car={cars[0]} />;
    return <VehiclesDashboardView cars={cars} />;
  };

  return (
    // 🌌 WRAPPER GLOBALE: Gestisce lo sfondo, il gradiente, il font e lo spazio vitale
    <div className="min-h-screen bg-[#050508] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/30 via-[#050508] to-[#010103] font-sans text-zinc-100 relative overflow-x-hidden flex flex-col">
      
      {/* ✨ EFFETTO LUCE GLOBALE: Unico per tutta l'app */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* 📦 AREA CONTENUTO: Centra automaticamente le viste che gli passiamo */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 relative z-10 w-full h-full">
        {renderContent()}
      </main>

    </div>
  );
}