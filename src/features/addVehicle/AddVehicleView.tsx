import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { Combobox } from '../../shared/ui/Combobox';
import { useVehicleCatalog } from './hook/useVehicleCatalog';
import { useVehicleForm } from './hook/useVehicleForm';
import { useVehicleVoiceFlow } from './hook/useVehicleVoiceFlow';

export function AddVehicleView() {
  // 1. Dati dal catalogo
  const { brands, getModelsForBrand, isLoading } = useVehicleCatalog();

  // 2. Stato e logica del form (Pura business logic)
  const { 
    plate, setPlate, 
    brand, setBrand, 
    model, setModel, 
    error, performSave 
  } = useVehicleForm();

  // 3. Orchestrazione Vocale (Il Cervello NLP)
  useVehicleVoiceFlow({
    catalog: { brands, getModelsForBrand },
    form: { plate, brand, model },
    actions: { setPlate, setBrand, setModel, performSave }
  });

  // 4. Gestione Eventi UI manuali
  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    performSave();
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-zinc-900/30 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 animate-in fade-in zoom-in-95 duration-300">
      
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          Configura veicolo
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Inserisci i dettagli dell'auto principale per accedere alla dashboard.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin"></div>
          <span className="text-sm text-zinc-500 font-medium tracking-wide">Recupero listino...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Input
            label="Targa"
            placeholder="es. AA123BB"
            maxLength={7}
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
          />
          
          <div className="flex flex-col gap-5">
            <Combobox
              label="Costruttore"
              placeholder="Cerca marca"
              value={brand}
              onChange={(value) => {
                setBrand(value);
                setModel(''); 
              }}
              options={brands}
            />

            <Combobox
              label="Modello"
              placeholder="Cerca modello"
              value={model}
              onChange={setModel}
              options={getModelsForBrand(brand)}
              disabled={!brand} 
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg animate-in fade-in duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="mt-2 flex flex-col gap-3">
            <Button type="submit">Salva nel Garage</Button>
          </div>
        </form>    
      )}
    </div>
  );
}