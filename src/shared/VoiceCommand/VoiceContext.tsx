import { createContext, useContext, useRef, useCallback } from 'react';
import { processVoiceText, type IntentResult } from '../intent/intentService';
import { useVoiceCommand } from './useVoiceCommand';


// ==========================================
// TIPI
// ==========================================

type VoiceContextType = {
  startListening: () => Promise<void>;
  isListening: boolean;
  error: string | null;
  // Funzione che una pagina usa per registrare un handler per i risultati NLP
  registerActionHandler: (handler: (result: IntentResult) => void) => () => void;
};

// ==========================================
// CONTEXT & PROVIDER
// ==========================================

const VoiceContext = createContext<VoiceContextType | null>(null);

export const VoiceProvider = ({ children }: { children: React.ReactNode }) => {
  const { startListening: startNativeListening, isListening, error } = useVoiceCommand();
  
  // Ref per memorizzare l'handler della pagina corrente
  const activeHandlerRef = useRef<((result: IntentResult) => void) | null>(null);

  const registerActionHandler = useCallback((handler: (result: IntentResult) => void) => {
    activeHandlerRef.current = handler;
    // console.log("🎙️ [VoiceContext] Nuova pagina in ascolto registrata.");
    
    return () => {
      activeHandlerRef.current = null;
      // console.log("🎙️ [VoiceContext] Pagina disconnessa dall'ascolto.");
    };
  }, []);

  const startListening = async () => {
    try {
      console.log("🎙️ [VoiceContext] Avvio ascolto...");
      
      const spokenText = await startNativeListening();
      
      if (spokenText) {
        console.log(`🎙️ [VoiceContext] Testo catturato: "${spokenText}"`);
        
        const IntentResult = await processVoiceText(spokenText);
        console.log("🧠 [VoiceContext] Risultato NLP:", IntentResult);

        if (activeHandlerRef.current) {
          activeHandlerRef.current(IntentResult);
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