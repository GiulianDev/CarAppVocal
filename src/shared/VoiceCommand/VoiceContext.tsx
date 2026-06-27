import { createContext, useContext, useRef, useCallback } from 'react';
import { useVoiceCommand } from '../../features/voiceCommand/useVoiceCommand';
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
  // 1. Usiamo il tuo hook nativo per gestire Capacitor/Web Speech API
  const { startListening: startNativeListening, isListening, transcript, error } = useVoiceCommand();
  
  // 2. Usiamo un ref per memorizzare la funzione "ascoltatrice" della pagina corrente.
  // Usiamo un ref (e non uno state) perché non vogliamo che il cambio di pagina 
  // scateni re-render inutili del Provider.
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
      
      // NOTA: Dovrai modificare leggermente il tuo `useVoiceCommand` (lo vediamo tra un attimo)
      // affinché startNativeListening() restituisca una Promise con la stringa catturata.
      const spokenText = await startNativeListening();
      
      if (spokenText) {
        console.log(`🎙️ [VoiceContext] Testo catturato: "${spokenText}"`);
        
        // Passiamo il testo al motore NLP (Fase 1)
        const nlpResult = await processVoiceText(spokenText);
        console.log("🧠 [VoiceContext] Risultato NLP:", nlpResult);

        // Se c'è una pagina in ascolto (es. AddVehicleView), le passiamo il JSON
        if (activeHandlerRef.current) {
          activeHandlerRef.current(nlpResult);
        } else {
          console.warn("🎙️ [VoiceContext] Nessuna pagina sta ascoltando i comandi vocali.");
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