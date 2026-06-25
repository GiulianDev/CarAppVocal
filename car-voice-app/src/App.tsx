import { AddVehicleView } from './features/addVehicle/AddVehicleView';
import { VehicleDetailView } from './features/vehicleDetail/VehicleDetailView';
import { VehiclesDashboardView } from './features/vehiclesDashboard/VehiclesDashboardView';
import { useCarsQuery } from './shared/hooks/useCarsQuery';

export default function App() {
  const { cars, isLoading } = useCarsQuery();

  // 1. Stato di caricamento (es. lettura da LocalStorage o futuro fetch da Firestore)
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050508] text-white font-sans gap-4">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin"></div>
        <p className="text-zinc-400 text-sm tracking-wide font-medium animate-pulse">Caricamento garage...</p>
      </div>
    );
  }

  // 2. Scenario 0 auto: Mostra la vista di onboarding/configurazione
  if (cars.length === 0) {
    return <AddVehicleView />;
  }

  // 3. Scenario 1 auto: Mostra la pagina di dettaglio verticale dell'unico veicolo attivo
  if (cars.length === 1) {
    return <VehicleDetailView car={cars[0]} />;
  }

  // 4. Scenario più auto (> 1): Mostra l'hub di gestione dell'intera flotta
  // Nota: Passiamo l'intero array 'cars'. Nel prossimo step modificheremo le sue props per accettarlo.
  return <VehiclesDashboardView cars={cars} />;
}