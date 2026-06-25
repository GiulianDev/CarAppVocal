import { useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';


interface OnboardingViewProps {
  onCarSubmit: (plate: string, brand: string) => void;
}

export function OnboardingView({ onCarSubmit }: OnboardingViewProps) {
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const plateRegex = /^[A-Z]{2}\d{3}[A-Z]{2}$/i;
    if (!plateRegex.test(plate.trim())) {
      setError('Inserisci una targa valida (es. AA123BB)');
      return;
    }

    if (!brand.trim()) {
      setError('Inserisci la marca e il modello');
      return;
    }

    onCarSubmit(plate, brand);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl text-slate-100">
        <h1 className="text-2xl font-bold mb-2">
          Benvenuto in <span className="text-blue-500">CarVoice AI</span>
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Per iniziare a tracciare i tuoi lavori, configura la tua prima auto.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Targa dell'auto"
            placeholder="es. AA123BB"
            maxLength={7}
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
          />
          <Input
            label="Marca e Modello"
            placeholder="es. Fiat Panda 1.2"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <Button type="submit">Configura Auto</Button>
        </form>
      </div>
    </div>
  );
}