import { createContext, useContext, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVoiceCommand } from './useVoiceCommand';
import { processVoiceText } from './nlpService';

// ==========================================
// TIPI
// ==========================================

// Questa è la struttura che ci restituisce NLP.js
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
  // Funzione che una pagina usa per dire: "Passami i risultati NLP finché sono attiva"
  registerActionHandler: (handler: (response: NlpResponse) => void) => () => void;
};

// ==========================================
// CONTEXT & PROVIDER
// ==========================================

const VoiceContext = createContext<VoiceContextType | null>(null);

export const VoiceProvider = ({ children }: { children: React.ReactNode }) => {
  // Hook per il routing
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Usiamo il tuo hook nativo per gestire Capacitor/Web Speech API
  const { startListening: startNativeListening, isListening, error } = useVoiceCommand();
  
  // 2. Usiamo un ref per memorizzare la funzione "ascoltatrice" della pagina corrente.
  const activeHandlerRef = useRef<((res: NlpResponse) => void) | null>(null);

  // 3. Metodo per registrare la pagina attiva
  const registerActionHandler = useCallback((handler: (res: NlpResponse) => void) => {
    activeHandlerRef.current = handler;
    console.log("🎙️ [VoiceContext] Nuova pagina in ascolto registrata.");
    
    // Ritorna la funzione di cleanup (da usare nell'useEffect della pagina)
    return () => {
      activeHandlerRef.current = null;
      console.log("🎙️ [VoiceContext] Pagina disconnessa dall'ascolto.");
    };
  }, []);

  // 4. Metodo che avvia il flusso completo: Microfono -> NLP -> Pagina
  const startListening = async () => {
    try {
      console.log("🎙️ [VoiceContext] Avvio ascolto...");
      
      const spokenText = await startNativeListening();
      
      if (spokenText) {
        console.log(`🎙️ [VoiceContext] Testo catturato: "${spokenText}"`);
        
        // Passiamo il testo al motore NLP (Fase 1)
        const nlpResult = await processVoiceText(spokenText);
        console.log("🧠 [VoiceContext] Risultato NLP:", nlpResult);

        const { intent } = nlpResult;
        let didNavigate = false;

        // ==========================================
        // 5. ROUTING VOCALE GLOBALE
        // ==========================================
        
        if (intent === 'intent.add_vehicle') {
          // Se non siamo già nella pagina AddVehicle, ci andiamo
          if (!location.pathname.includes('/add-vehicle')) {
            console.log('Navigazione vocale verso: /add-vehicle/');
            // Passiamo l'intero risultato NLP allo state per poterlo usare subito all'arrivo
            navigate('/add-vehicle/', { state: { voiceData: nlpResult } });
            didNavigate = true;
          }
        } 
        else if (intent === 'intent.garage') {
          if (!location.pathname.includes('/garage')) {
            console.log('Navigazione vocale verso: /garage/');
            navigate('/garage/');
            didNavigate = true;
          }
        } 
        else if (intent === 'intent.calendar_all') {
          if (!location.pathname.includes('/calendar')) {
            console.log('Navigazione vocale verso: /calendar');
            navigate('/calendar');
            didNavigate = true;
          }
        }
        // Nota: per 'intent.view_event', la rotta dinamica '/detail/:id/event/:eventId' 
        // richiede di recuperare prima l'id del veicolo, quindi va gestito localmente 
        // o con una logica di ricerca globale prima di navigare.

        // ==========================================
        // 6. ESECUZIONE HANDLER LOCALE
        // ==========================================
        // Se NON abbiamo navigato, significa che siamo già nella pagina giusta,
        // oppure è un intento locale (es. conferme, annullamenti, ecc.)
        if (!didNavigate) {
          if (activeHandlerRef.current) {
            activeHandlerRef.current(nlpResult);
          } else {
            console.warn("🎙️ [VoiceContext] Nessuna pagina sta ascoltando i comandi vocali.");
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

// ==========================================
// CUSTOM HOOK
// ==========================================

export const useVoiceContext = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoiceContext must be used within a VoiceProvider');
  }
  return context;
};