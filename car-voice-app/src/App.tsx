import { OnboardingView } from './features/addVehicle/OnboardingView';
import { DashboardView } from './features/dashboard/DashboardView';
import { useCarsQuery } from './shared/hooks/useCarsQuery';

export default function App() {
  const { cars, isLoading } = useCarsQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050508] text-white font-sans gap-4">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin"></div>
        <p className="text-zinc-400 text-sm tracking-wide font-medium animate-pulse">Caricamento garage...</p>
      </div>
    );
  }

  if (cars.length === 0) {
    return <OnboardingView/>;
  }

  // return <DashboardView/>;
}