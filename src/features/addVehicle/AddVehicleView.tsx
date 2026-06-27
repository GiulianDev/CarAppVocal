import { useState, useEffect } from 'react';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { Combobox } from '../../shared/ui/Combobox';
import { useVehicleCatalog } from './hook/useVehicleCatalog';
import { useNavigate } from 'react-router-dom';
import { useGarage } from '../../shared/Garage/useGarage';
import { useVoiceContext } from '../../shared/VoiceCommand/VoiceContext';
// IMPORTIAMO IL CONTEXT

export function AddVehicleView() {
  
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { brands, getModelsForBrand, isLoading } = useVehicleCatalog();
  const { addVehicle } = useGarage();
  
  // INIETTIAMO IL CONTEXT
  const { registerActionHandler } = useVoiceContext();

  // ==========================================
  // LOGICA DI ASCOLTO VOCALE
  // ==========================================
  useEffect(() => {
    // Ci registriamo come ascoltatori attivi
    const cleanup = registerActionHandler((nlpResult) => {
      
      // Filtriamo solo gli intenti che ci interessano in questa pagina
      if (nlpResult.intent === 'intent.add_vehicle') {
        setError(''); // Puliamo eventuali errori precedenti

        // 1. Estraiamo le entità dall'array restituito da NLP.js
        const extractedPlate = nlpResult.entities.find(e => e.entity === 'plate')?.sourceText;
        const extractedBrand = nlpResult.entities.find(e => e.entity === 'brand')?.sourceText;
        const extractedModel = nlpResult.entities.find(e => e.entity === 'model')?.sourceText;

        // 2. Simuliamo l'inserimento dell'utente!
        
        if (extractedPlate) {
          // La Regex NLP ha già validato il formato, ma la mettiamo comunque in maiuscolo
          setPlate(extractedPlate.toUpperCase());
        }

        if (extractedBrand) {
          // Cerchiamo un match nel nostro listino (case-insensitive)
          const catalogMatch = brands.find(
            b => b.toLowerCase() === extractedBrand.trim().toLowerCase()
          );
          
          // Se lo troviamo usiamo quello del catalogo (es. "BMW"), 
          // altrimenti usiamo la stringa vocale raw (veicolo fuori listino)
          const finalBrand = catalogMatch || extractedBrand.trim();
          setBrand(finalBrand);

          // Se abbiamo trovato il brand e l'utente ha pronunciato un modello, settiamo anche quello
          if (extractedModel) {
            const availableModels = catalogMatch ? getModelsForBrand(catalogMatch) : [];
            const modelMatch = availableModels.find(
              m => m.toLowerCase() === extractedModel.trim().toLowerCase()
            );
            setModel(modelMatch || extractedModel.trim());
          }
        }
      }
    });

    // Cleanup fondamentale: quando l'utente cambia pagina (es. va su /garage),
    // questa pagina smette di ascoltare i comandi vocali.
    return cleanup;
  }, [registerActionHandler, brands, getModelsForBrand]);

  // ==========================================
  // SUBMIT STANDARD (inalterato)
  // ==========================================
  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');

    const plateRegex = /^[A-Z]{2}\d{3}[A-Z]{2}$/i;
    if (!plateRegex.test(plate.trim())) {
      setError('Inserisci una targa valida (es. AA123BB)');
      return;
    }

    if (!brand.trim() || !model.trim()) {
      setError('Seleziona marca e modello');
      return;
    }

    const newCar = addVehicle(plate, brand.trim(), model.trim());
    navigate(`/detail/${newCar.id}`);
  };

  return (
    // Restituiamo DIRETTAMENTE la card. App.tsx si occuperà di centrarla.
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
            
            {/* {cars.length > 0 && (
              <Button variant="danger" type="button">
                Annulla
              </Button>
            )} */}
          </div>
        </form>    
      )}
    </div>
  );
}