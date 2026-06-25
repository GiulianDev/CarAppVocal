import { useState, useEffect } from 'react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Combobox } from '../../components/ui/Combobox';
import { fetchOnlineCars } from '../../data/cars'; // Importiamo la funzione online

interface OnboardingViewProps {
  onCarSubmit: (plate: string, brand: string) => void;
}

export function OnboardingView({ onCarSubmit }: OnboardingViewProps) {
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState('');

  // Stati per i dati scaricati online
  const [carBrands, setCarBrands] = useState<string[]>([]);
  const [carModelsMap, setCarModelsMap] = useState<Record<string, string[]>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Scarica i dati al montaggio del componente
  useEffect(() => {
    async function loadCars() {
      const data = await fetchOnlineCars();
      setCarBrands(data.brands);
      setCarModelsMap(data.modelsMap);
      setIsLoadingData(false);
    }
    loadCars();
  }, []);

  // Recupera i modelli in base alla marca selezionata
  const availableModels = carModelsMap[brand] || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const plateRegex = /^[A-Z]{2}\d{3}[A-Z]{2}$/i;
    if (!plateRegex.test(plate.trim())) {
      setError('Inserisci una targa valida (es. AA123BB)');
      return;
    }

    if (!brand.trim()) {
      setError('Inserisci la Marca');
      return;
    }

    if (!model.trim()) {
      setError('Inserisci il Modello');
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
        <p className="text-sm text-slate-400 mb-6">
          Configura la tua auto per iniziare.
        </p>

        {isLoadingData ? (
          <div className="text-center py-8 text-slate-400 animate-pulse">
            Caricamento listino auto mondiale...
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
                options={carBrands}
              />

              <Combobox
                label="Modello"
                placeholder="Seleziona o digita..."
                value={model}
                onChange={setModel}
                options={availableModels}
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