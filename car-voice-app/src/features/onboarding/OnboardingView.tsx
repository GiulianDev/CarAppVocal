import { useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Combobox } from '../../components/ui/Combobox';
import { useVehicleCatalog } from '../../hooks/useVehicleCatalog'; // <-- Il nostro nuovo hook

interface OnboardingViewProps {
  onCarSubmit: (plate: string, brand: string) => void;
}

export function OnboardingView({ onCarSubmit }: OnboardingViewProps) {
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState('');

  // Estraiamo la logica del catalogo dall'hook dedicato
  const { brands, getModelsForBrand, isLoading } = useVehicleCatalog();

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const plateRegex = /^[A-Z]{2}\d{3}[A-Z]{2}$/i;
    if (!plateRegex.test(plate.trim())) {
      setError('Inserisci una targa valida (es. AA123BB)');
      return;
    }

    if (!brand.trim() || !model.trim()) {
      setError('Seleziona sia la marca che il modello');
      return;
    }

    onCarSubmit(plate, `${brand.trim()} ${model.trim()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl text-slate-100">
        <h1 className="text-2xl font-bold mb-2">
          Benvenuto in <span className="text-blue-500">CarVoice AI</span>
        </h1>
        <p className="text-sm text-slate-400 mb-6">Configura la tua auto per iniziare.</p>

        {isLoading ? (
          <div className="text-center py-8 text-slate-400 animate-pulse">
            Caricamento listino auto...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Targa dell'auto"
              placeholder="es. AA123BB"
              maxLength={7}
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
            />
            
            <div className="flex flex-col gap-5 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <Combobox
                label="Marca"
                placeholder="Seleziona o digita..."
                value={brand}
                onChange={(value) => {
                  setBrand(value);
                  setModel(''); 
                }}
                options={brands}
              />

              <Combobox
                label="Modello"
                placeholder="Seleziona o digita..."
                value={model}
                onChange={setModel}
                options={getModelsForBrand(brand)}
                disabled={!brand} 
              />
            </div>

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <Button type="submit">Aggiungi al Garage</Button>
          </form>
        )}
      </div>
    </div>
  );
}