import { createContext, useContext, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVoiceCommand } from './useVoiceCommand';
import { processVoiceText } from './nlpService';

// ==========================================
// TIPI
// ==========================================

export type NlpResponse = {
  intent: string;
  score: number;
  entities: {
    entity: string;
    sourceText: string;
    start: number;
    end: number;
    resolution?: any;
  }[];
  utterance: string;
};

type VoiceContextType = {
  startListening: () => Promise<void>;
  isListening: boolean;
  error: string | null;
  // Ora accetta un handler che può restituire un boolean (true = ferma il genitore)
  registerActionHandler: (handler: (response: NlpResponse) => boolean | void) => () => void;
};

// ==========================================
// CONTEXT & PROVIDER
// ==========================================

const VoiceContext = createContext<VoiceContextType | null>(null);

export const VoiceProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { startListening: startNativeListening, isListening, error } = useVoiceCommand();
  
  // Il ref ora accetta funzioni che ritornano boolean o void
  const activeHandlerRef = useRef<((res: NlpResponse) => boolean | void) | null>(null);

  const registerActionHandler = useCallback((handler: (res: NlpResponse) => boolean | void) => {
    activeHandlerRef.current = handler;
    console.log("🎙️ [VoiceContext] Nuova pagina in ascolto registrata.");
    
    return () => {
      activeHandlerRef.current = null;
      console.log("🎙️ [VoiceContext] Pagina disconnessa dall'ascolto.");
    };
  }, []);

  const startListening = async () => {
    try {
      console.log("🎙️ [VoiceContext] Avvio ascolto...");
      
      const spokenText = await startNativeListening();
      
      if (spokenText) {
        console.log(`🎙️ [VoiceContext] Testo catturato: "${spokenText}"`);
        
        const nlpResult = await processVoiceText(spokenText);
        console.log("🧠 [VoiceContext] Risultato NLP:", nlpResult);

        // ==========================================
        // 🔥 MODIFICA CHIAVE: ESECUZIONE HANDLER LOCALE (PRIORITÀ)
        // ==========================================
        let isHandledLocally = false;
        
        if (activeHandlerRef.current) {
          // Se la pagina corrente restituisce true, significa che "consuma" l'evento
          isHandledLocally = activeHandlerRef.current(nlpResult) === true;
        }

        // Se l'evento è stato gestito localmente dal form, FERMIAMO l'esecuzione globale.
        if (isHandledLocally) {
          console.log("🛡️ [VoiceContext] Comando globale bloccato dall'handler locale.");
          return; 
        }

        // ==========================================
        // ROUTING VOCALE GLOBALE (Se non bloccato dal locale)
        // ==========================================
        const { intent } = nlpResult;
 
        if (intent === 'intent.add_vehicle') {
          if (!location.pathname.includes('/add-vehicle')) {
            console.log('Navigazione vocale verso: /add-vehicle/');
            navigate('/add-vehicle/', { state: { voiceData: nlpResult } });
          }
        } 
        else if (intent === 'intent.garage') {
          if (!location.pathname.includes('/garage')) {
            console.log('Navigazione vocale verso: /garage/');
            navigate('/garage/');
          }
        } 
        else if (intent === 'intent.calendar_all') {
          if (!location.pathname.includes('/calendar')) {
            console.log('Navigazione vocale verso: /calendar');
            navigate('/calendar');
          }
        }
      }
    } catch (err) {
      console.error("🎙️ [VoiceContext] Errore durante l'ascolto:", err);
    }
  };

  return (
    <VoiceContext.Provider value={{ startListening, isListening, error, registerActionHandler }}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoiceContext = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoiceContext must be used within a VoiceProvider');
  }
  return context;
};