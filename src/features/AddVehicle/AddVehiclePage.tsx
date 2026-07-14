import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { Combobox } from '../../shared/ui/Combobox';
import { useVehicleCatalog } from './hook/useVehicleCatalog';
import { useVehicleForm } from './hook/useAddVehicleForm';
import { useConversationEngine } from './hook/useConversationEngine';

export function AddVehiclePage() {
  // 1. Dati dal catalogo
  const { brands, getModelsForBrand, isLoading } = useVehicleCatalog();

  // 2. Stato e logica del form (Pura business logic)
  const { 
    plate, setPlate, 
    brand, setBrand, 
    model, setModel, 
    error, performSave,
    resetForm
  } = useVehicleForm();

  // 3. Orchestrazione Vocale Disaccoppiata
  const { state: voiceState, draft, startConversation } = useConversationEngine({
    catalog: { brands, getModels: getModelsForBrand },
    onDraftComplete: (finalDraft) => {
      // Aggiorniamo lo stato visivo per coerenza
      setBrand(finalDraft.brand || '');
      setModel(finalDraft.model || '');
      setPlate(finalDraft.plate || '');
      performSave(finalDraft);
    },
    onCancel: () => resetForm()
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    performSave(); // Il salvataggio manuale continua a usare lo stato locale
  };

  // 4. Gestione della Visualizzazione (Modalità Ibrida)
  const isVoiceActive = voiceState !== 'IDLE';
  const displayBrand = isVoiceActive ? (draft.brand || '') : brand;
  const displayModel = isVoiceActive ? (draft.model || '') : model;
  const displayPlate = isVoiceActive ? (draft.plate || '') : plate;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Configura veicolo
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Inserisci i dettagli dell'auto o usa l'assistente vocale.
          </p>
        </div>
        
        {/* Pulsante per attivare l'assistente vocale */}
        <Button 
          type="button" 
          onClick={startConversation} 
          disabled={isVoiceActive}
          className={isVoiceActive ? "animate-pulse bg-indigo-600" : ""}
        >
          {isVoiceActive ? '🎙️ In ascolto...' : '🎙️ Usa la Voce'}
        </Button>
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
            value={displayPlate}
            onChange={(e) => !isVoiceActive && setPlate(e.target.value.toUpperCase())}
            disabled={isVoiceActive}
          />
          
          <div className="flex flex-col gap-5">
            <Combobox
              label="Costruttore"
              placeholder="Cerca marca"
              value={displayBrand}
              onChange={(value) => {
                if (!isVoiceActive) {
                  setBrand(value);
                  setModel(''); 
                }
              }}
              options={brands}
              disabled={isVoiceActive}
            />

            <Combobox
              label="Modello"
              placeholder="Cerca modello"
              value={displayModel}
              onChange={(value) => !isVoiceActive && setModel(value)}
              options={getModelsForBrand(displayBrand)}
              disabled={!displayBrand || isVoiceActive} 
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
            <Button type="submit" disabled={isVoiceActive || !displayBrand || !displayModel || !displayPlate}>
              {isVoiceActive ? 'Salvataggio automatico...' : 'Salva nel Garage'}
            </Button>
          </div>
        </form>    
      )}
    </div>
  );
}