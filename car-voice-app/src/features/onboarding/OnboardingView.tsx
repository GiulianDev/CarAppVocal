import { useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Combobox } from '../../components/ui/Combobox';
import { useVehicleCatalog } from '../../hooks/useVehicleCatalog';

interface OnboardingViewProps {
  onCarSubmit: (plate: string, brand: string) => void;
}

export function OnboardingView({ onCarSubmit }: OnboardingViewProps) {
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState('');

  const { brands, getModelsForBrand, isLoading } = useVehicleCatalog();

  const handleSubmit = (e: React.SyntheticEvent) => {
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
    <div className="min-h-screen flex items-center justify-center bg-[#090d16] p-6 font-sans selection:bg-blue-500/30 selection:text-blue-200">
      <div className="w-full max-w-md bg-[#101524] p-8 border border-slate-800/60 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-medium tracking-wide mb-3">
            <span>✨</span> Progetto Vocale AI
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Benvenuto in CarVoice
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configura il tuo veicolo principale per sbloccare la dashboard.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-5 h-5 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">Inizializzazione catalogo...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Input
              label="Targa Veicolo"
              placeholder="es. AA123BB"
              maxLength={7}
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
            />
            
            <div className="flex flex-col gap-5 bg-slate-950/30 p-4 border border-slate-900 rounded-lg">
              <Combobox
                label="Marca"
                placeholder="Seleziona costruttore..."
                value={brand}
                onChange={(value) => {
                  setBrand(value);
                  setModel(''); 
                }}
                options={brands}
              />

              <Combobox
                label="Modello"
                placeholder="Seleziona modello..."
                value={model}
                onChange={setModel}
                options={getModelsForBrand(brand)}
                disabled={!brand} 
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 font-medium bg-red-950/20 border border-red-900/30 p-3 rounded-lg flex items-center gap-2">
                ⚠️ {error}
              </div>
            )}

            <Button type="submit">Completa Configurazione</Button>
          </form>
        )}
      </div>
    </div>
  );
}