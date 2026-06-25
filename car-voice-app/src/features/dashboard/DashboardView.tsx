import { Button } from '../../shared/ui/Button';
import type { Car } from '../../shared/types/car';

interface DashboardViewProps {
  car: Car;
}

export function DashboardView({ car }: DashboardViewProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl text-slate-100">
        <div className="flex justify-between items-center mb-6">
          <span className="bg-blue-950 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-blue-900">
            Garage Attivo
          </span>
          <div className="w-auto">
            <Button variant="danger" onClick={onReset}>Elimina Auto</Button>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">{car.brand}</h1>
        <div className="inline-block bg-white text-black font-mono font-bold text-xl px-4 py-1.5 rounded-md border-2 border-black tracking-widest my-2 shadow-sm">
          {car.plate}
        </div>

        <hr className="border-slate-800 my-6" />

        <div className="bg-slate-950 border border-dashed border-slate-800 p-5 rounded-xl text-center">
          <p className="font-semibold text-slate-200">🎙️ Prossimo Step: Comando Vocale</p>
          <p className="text-xs text-slate-500 mt-1">
            Qui integreremo l'interfaccia di registrazione per catturare i tuoi lavori.
          </p>
        </div>
      </div>
    </div>
  );
}