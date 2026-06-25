import { OnboardingView } from './features/onboarding/OnboardingView';
import { DashboardView } from './features/dashboard/DashboardView';
import { useCars } from './hooks/useCar';

export default function App() {
  const { cars, isLoading, addCar, resetGarage } = useCars();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans">
        <p className="animate-pulse text-slate-400">Caricamento garage...</p>
      </div>
    );
  }

  if (cars.length === 0) {
    return <OnboardingView onCarSubmit={addCar} />;
  }

  return <DashboardView car={cars[0]} onReset={resetGarage} />;
}