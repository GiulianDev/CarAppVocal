import { AddVehicleView } from './features/addVehicle/AddVehicleView';
import { VehicleDetailView } from './features/vehicleDetail/VehicleDetailView';
import { VehiclesDashboardView } from './features/vehiclesDashboard/VehiclesDashboardView';
import { useCarContext } from './shared/context/CarContext';

export default function App() {
  const { cars, isLoading, isAdding } = useCarContext();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4">
          {/* Spinner aggiornato ai toni blu */}
          <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm tracking-wide font-medium animate-pulse">Caricamento garage...</p>
        </div>
      );
    }

    if (cars.length === 0 || isAdding) {
      return <AddVehicleView />; 
    }

    if (cars.length === 1) {
      return <VehicleDetailView car={cars[0]} />; 
    }

    return <VehiclesDashboardView cars={cars} />;
  };

  return (
    // 🌌 WRAPPER GLOBALE: Sfondo slate-950 (blu notte scuro)
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 relative overflow-x-hidden flex flex-col selection:bg-blue-500/30 selection:text-white">
      
      {/* ✨ EFFETTI LUCE RESPONSIVI */}
      
      {/* 1. Luce a cascata dall'alto: su desktop (md:) diventa più profonda e ampia */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] md:bg-[radial-gradient(ellipse_100%_100%_at_50%_-10%,rgba(37,99,235,0.22),rgba(255,255,255,0))] pointer-events-none z-0" />
      
      {/* 2. Blob Azzurro (Sinistra): raddoppia di dimensioni e sfocatura su desktop */}
      <div className="absolute top-1/4 left-0 w-[400px] md:w-[700px] h-[400px] md:h-[700px] bg-blue-600/15 md:bg-blue-600/20 rounded-full blur-[120px] md:blur-[180px] pointer-events-none z-0 -translate-x-1/2" />
      
      {/* 3. Blob Indaco/Blu scuro (Destra in basso): si espande enormemente su desktop per coprire gli angoli bui */}
      <div className="absolute bottom-0 right-0 w-[500px] md:w-[900px] h-[500px] md:h-[900px] bg-indigo-600/10 md:bg-indigo-600/15 rounded-full blur-[130px] md:blur-[200px] pointer-events-none z-0 translate-x-1/3 translate-y-1/3" />

      {/* 📦 AREA CONTENUTO */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 relative z-10 w-full h-full">
        {renderContent()}
      </main>

    </div>
  );
}