import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { nlpService } from './nlpService';
import { useVoiceCommand } from './useVoiceCommand';
import type { VoiceAnalysisResult } from './types';

type ActionHandler = (result: VoiceAnalysisResult) => boolean;

interface VoiceContextType {
  isModelReady: boolean;
  isListening: boolean;
  startListening: () => Promise<void>;
  registerActionHandler: (handler: ActionHandler) => () => void;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [isModelReady, setIsModelReady] = useState(false);
  const activeHandlerRef = useRef<ActionHandler | null>(null);
  const { startListening: startNativeListening, isListening } = useVoiceCommand();
  const navigate = useNavigate();

  // ⚡ Warmup all'avvio dell'applicazione
  useEffect(() => {
    nlpService.init()
      .then(() => setIsModelReady(true))
      .catch((err) => console.error("SML Boot Error:", err));
  }, []);

  const registerActionHandler = useCallback((handler: ActionHandler) => {
    activeHandlerRef.current = handler;
    console.log("🎙️ [VoiceContext] Handler locale registrato.");
    return () => {
      if (activeHandlerRef.current === handler) {
        activeHandlerRef.current = null;
        console.log("🎙️ [VoiceContext] Handler locale disconnesso.");
      }
    };
  }, []);

  const startListening = async () => {
    try {
      const spokenText = await startNativeListening();
      if (!spokenText) return;

      console.log(`🎙️ [VoiceContext] Testo catturato: "${spokenText}"`);
      const nlpResult = await nlpService.analyzeText(spokenText);

      // 1. Priorità all'Handler Locale (es. Pagina Add Vehicle)
      if (activeHandlerRef.current) {
        const consumedLocally = activeHandlerRef.current(nlpResult);
        if (consumedLocally) {
          console.log("🛡️ [VoiceContext] Comando gestito ed esaurito dal contesto locale.");
          return;
        }
      }

      // 2. Routing Globale Fallback
      if (nlpResult.intent === 'ADD_VEHICLE') {
        navigate('/add-vehicle');
      } else if (nlpResult.intent === 'NAVIGATE_GARAGE') {
        navigate('/garage');
      } else if (nlpResult.intent === 'NAVIGATE_CALENDAR') {
        navigate('/calendar');
      }
    } catch (err) {
      console.error("🎙️ [VoiceContext] Errore ascolto:", err);
    }
  };

  return (
    <VoiceContext.Provider
      value={{
        isModelReady,
        isListening,
        startListening,
        registerActionHandler
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export const useVoiceContext = () => {
  const context = useContext(VoiceContext);
  if (!context) throw new Error('useVoiceContext deve essere usato dentro VoiceProvider');
  return context;
};