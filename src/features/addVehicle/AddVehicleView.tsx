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

  // 1. Nuovo stato per ricordare COSA stiamo chiedendo all'utente
  const [waitingFor, setWaitingFor] = useState<'brand' | 'model' | 'plate' | 'confirm_save' | null>(null);

  const navigate = useNavigate();
  const { brands, getModelsForBrand, isLoading } = useVehicleCatalog();
  const { addVehicle } = useGarage();
  
  // INIETTIAMO IL CONTEXT
  const { registerActionHandler, startListening } = useVoiceContext();

  // 2. Funzione helper per far "parlare" l'app e riaprire il microfono
  const askAndListen = (question: string, expectedField: 'brand' | 'model' | 'plate' | 'confirm_save') => {
    setWaitingFor(expectedField); // Ci segniamo cosa stiamo aspettando
    
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.lang = 'it-IT';
    
    // Appena ha finito di pronunciare la domanda, riapre il microfono
    utterance.onend = () => {
      startListening();
    };
    
    window.speechSynthesis.speak(utterance);
  };

  // ==========================================
  // LOGICA DI ASCOLTO VOCALE
  // ==========================================
  useEffect(() => {
    const cleanup = registerActionHandler((nlpResult) => {
      
      // =======================================================
      // CASO A: Stiamo aspettando una RISPOSTA SPECIFICA (Slot Filling)
      // =======================================================
      if (waitingFor) {
        const rawAnswer = nlpResult.utterance.toLowerCase();

        // --- BRAND ---
        if (waitingFor === 'brand') {
          const matchedBrand = brands.find(b => rawAnswer.includes(b.toLowerCase()));
          
          if (matchedBrand) {
            setBrand(matchedBrand);
            askAndListen(`Ok, ${matchedBrand}. Che modello è?`, 'model');
          } else {
            // Se non ha capito, ripete la domanda senza cancellare lo stato!
            askAndListen("Non ho trovato questa marca. Puoi ripeterla?", 'brand');
          }
          return;
        }

        // --- MODEL ---
        if (waitingFor === 'model') {
          const availableModels = brand ? getModelsForBrand(brand) : [];
          const sortedModels = [...availableModels].sort((a, b) => b.length - a.length);
          const matchedModel = sortedModels.find(m => rawAnswer.includes(m.toLowerCase()));
          
          if (matchedModel) {
            setModel(matchedModel);
            askAndListen("Ottimo. E qual è la targa?", 'plate');
          } else {
            askAndListen("Non ho capito il modello. Puoi ripeterlo?", 'model');
          }
          return;
        }

        // --- PLATE ---
        if (waitingFor === 'plate') {
          const rawUtteranceCleaned = nlpResult.utterance.replace(/[\s\-\.,]/g, '').toUpperCase();
          const plateMatch = rawUtteranceCleaned.match(/[A-Z]{2}\d{3}[A-Z]{2}/);

          if (plateMatch) {
            setPlate(plateMatch[0]);
            askAndListen("Perfetto, ho tutti i dati. Vuoi che proceda al salvataggio?", 'confirm_save');
          } else {
            askAndListen("Non ho capito la targa, pronunciala di nuovo scandendo le lettere.", 'plate');
          }
          return; 
        }

        // --- CONFIRM SAVE ---
        if (waitingFor === 'confirm_save') {
          if (nlpResult.intent === 'intent.confirm' || rawAnswer.includes('si') || rawAnswer.includes('sì') || rawAnswer.includes('ok')) {
             setWaitingFor(null); // QUI è giusto cancellarlo, abbiamo finito!
             performSave();
          } 
          else if (nlpResult.intent === 'intent.cancel' || rawAnswer.includes('no') || rawAnswer.includes('annulla')) {
             setWaitingFor(null); // QUI è giusto cancellarlo, abbiamo annullato!
             const cancelMsg = new SpeechSynthesisUtterance("Ok, salvataggio annullato.");
             cancelMsg.lang = 'it-IT';
             window.speechSynthesis.speak(cancelMsg);
          } 
          else {
             askAndListen("Non ho capito. Vuoi salvare il veicolo? Rispondi sì o no.", 'confirm_save');
          }
          return;
        }
      }

      // =======================================================
      // CASO B: È un comando generico inziale
      // =======================================================
      if (nlpResult.intent === 'intent.add_vehicle') {
        setError('');
        
        const rawUtterance = nlpResult.utterance.toLowerCase();
        let foundBrand = brand;
        let foundModel = model;

        // 1. ESTRAZIONE TARGA (Brute-force Regex)
        // Puliamo l'intera frase iniziale da spazi e cerchiamo il pattern
        const rawUtteranceCleaned = nlpResult.utterance.replace(/[\s\-\.,]/g, '').toUpperCase();
        const plateMatch = rawUtteranceCleaned.match(/[A-Z]{2}\d{3}[A-Z]{2}/);

        let extractedPlate = null;
        if (plateMatch) {
          extractedPlate = plateMatch[0];
          setPlate(extractedPlate);
        }

        // 2. RICERCA MARCA NEL CATALOGO
        const catalogBrand = brands.find(b => rawUtterance.includes(b.toLowerCase()));
        
        if (catalogBrand) {
          foundBrand = catalogBrand;
          setBrand(foundBrand);

          // 3. SE TROVIAMO LA MARCA, CERCHIAMO IL MODELLO NEL SUO CATALOGO
          const catalogModels = getModelsForBrand(catalogBrand);
          const sortedModels = [...catalogModels].sort((a, b) => b.length - a.length);
          const catalogModel = sortedModels.find(m => rawUtterance.includes(m.toLowerCase()));

          if (catalogModel) {
            foundModel = catalogModel;
            setModel(foundModel);
          }
        } else {
          // Fallback: se il catalogo fallisce, vediamo se NLP aveva catturato qualcosa (es. "marca Pagani")
          const nlpBrand = nlpResult.entities.find(e => e.entity === 'brand')?.sourceText;
          if (nlpBrand) {
            foundBrand = nlpBrand;
            setBrand(foundBrand);
          }
        }

        // 4. CONTROLLO FINALE (Il Cervello Conversazionale)
        if (!foundBrand) {
          askAndListen("Qual è la marca del veicolo?", 'brand');
        } 
        else if (foundBrand && !foundModel) {
          askAndListen(`Ok, ${foundBrand}. Che modello è esattamente?`, 'model');
        } 
        else if (foundBrand && foundModel && (!extractedPlate && !plate)) {
          askAndListen(`Ok per ${foundBrand} ${foundModel}. Qual è la targa?`, 'plate');
        }
        else if (foundBrand && foundModel && (extractedPlate || plate)) {
          // Ha detto marca, modello e targa tutto nella primissima frase!
          askAndListen(`Ho tutto: ${foundBrand} ${foundModel} con targa ${extractedPlate || plate}. Vuoi salvare?`, 'confirm_save');
        }
      }
    });

    return cleanup;
  }, [registerActionHandler, startListening, waitingFor, brand, model, brands, getModelsForBrand, plate]);

  // LOGICA DI SALVATAGGIO CENTRALIZZATA
  const performSave = () => {
    const plateRegex = /^[A-Z]{2}\d{3}[A-Z]{2}$/i;
    if (!plateRegex.test(plate.trim())) {
      setError('Targa non valida, impossibile salvare.');
      return;
    }
    if (!brand.trim() || !model.trim()) {
      setError('Marca e modello mancanti.');
      return;
    }

    // Facciamo dire all'app che l'operazione è conclusa
    const finalMsg = new SpeechSynthesisUtterance("Veicolo salvato nel garage. Ti porto al riepilogo.");
    finalMsg.lang = 'it-IT';
    window.speechSynthesis.speak(finalMsg);

    const newCar = addVehicle(plate, brand.trim(), model.trim());
    navigate(`/detail/${newCar.id}`);
  };

  // Il submit manuale (click) ora chiama semplicemente performSave()
  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');
    performSave();
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