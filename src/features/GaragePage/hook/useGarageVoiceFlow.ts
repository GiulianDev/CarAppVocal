import { useState, useEffect, useRef } from 'react';
import { useVoiceContext } from '../../../shared/VoiceCommand/VoiceContext';
import { useSpeechAction } from '../../../shared/VoiceCommand/useSpeechAction';
import type { Vehicle } from '../../../shared/Garage/vehicle';
import type { VoiceAnalysisResult } from '../../../shared/VoiceCommand/types';

interface GarageVoiceFlowProps {
  vehicles: Vehicle[];
  actions: {
    deleteVehicle: (id: string) => void;
    resetGarage: () => void;
    goToAddVehicle: () => void;
    goToCalendar: () => void;
    setFavoriteVehicle: (id: string) => void;
  };
}

type FlowState = 'confirm_reset' | 'confirm_delete' | 'confirm_favorite' | null;

export function useGarageVoiceFlow({ vehicles, actions }: GarageVoiceFlowProps) {
  const [waitingFor, setWaitingFor] = useState<FlowState>(null);
  const [targetVehicleId, setTargetVehicleId] = useState<string | null>(null);

  const { registerActionHandler } = useVoiceContext();
  const { speakAndListen, speakOnly } = useSpeechAction();

  // Manteniamo i riferimenti aggiornati per evitare closure stanche nell'handler
  const ref = useRef({ vehicles, actions, waitingFor, targetVehicleId });
  useEffect(() => {
    ref.current = { vehicles, actions, waitingFor, targetVehicleId };
  });

  const findMatchingVehicle = (queryText: string, searchPlate?: string): Vehicle | undefined => {
    const currentVehicles = ref.current.vehicles;

    if (searchPlate) {
      const cleanTargetPlate = searchPlate.replace(/[\s\-]/g, '').toUpperCase();
      const match = currentVehicles.find(v => v.plate.replace(/[\s\-]/g, '').toUpperCase() === cleanTargetPlate);
      if (match) return match;
    }

    const cleanQuery = queryText.toLowerCase().trim();
    if (!cleanQuery) return undefined;

    return currentVehicles.find(v => {
      const brandLower = v.brand.toLowerCase();
      const modelLower = (v as any).model?.toLowerCase() || ''; // Gestione fallback se model non esiste
      return cleanQuery.includes(brandLower) || cleanQuery.includes(modelLower);
    });
  };

  useEffect(() => {
    const cleanup = registerActionHandler((nlpResult: VoiceAnalysisResult): boolean => {
      const { intent, entities, rawText } = nlpResult;
      const text = (rawText || '').toLowerCase().trim();
      const { vehicles, actions, waitingFor: currentWaitingFor, targetVehicleId: currentTargetId } = ref.current;

      // 1. GESTIONE DIALOGHI IN SOSPESO (Usa direttamente gli intenti del worker)
      if (currentWaitingFor) {
        if (intent === 'CANCEL') {
          setWaitingFor(null);
          setTargetVehicleId(null);
          speakOnly("Operazione annullata.");
          return true;
        }

        if (intent === 'CONFIRM') {
          switch (currentWaitingFor) {
            case 'confirm_reset':
              actions.resetGarage();
              speakOnly("Garage svuotato interamente.");
              break;
            case 'confirm_delete':
              if (currentTargetId) {
                actions.deleteVehicle(currentTargetId);
                speakOnly("Veicolo rimosso dal garage.");
              }
              break;
            case 'confirm_favorite':
              if (currentTargetId) {
                actions.setFavoriteVehicle(currentTargetId);
                speakOnly("Veicolo impostato come preferito.");
              }
              break;
          }
          setWaitingFor(null);
          setTargetVehicleId(null);
          return true;
        }
        
        speakAndListen("Rispondi con sì per confermare o no per annullare.");
        return true;
      }

      // 2. AZIONI GLOBALI GARAGE
      if (intent === 'ADD_VEHICLE') {
        speakOnly("Apro la pagina per aggiungere un veicolo.");
        actions.goToAddVehicle();
        return true;
      }

      if (/\b(calendario|appuntamenti|scadenza|scadenze)\b/i.test(text)) {
        speakOnly("Ecco il tuo calendario.");
        actions.goToCalendar();
        return true;
      }

      if (/\b(svuota|elimina tutt|cancella tutt|rimuovi tutt)\b/i.test(text)) {
        if (vehicles.length === 0) {
          speakOnly("Il tuo garage è già vuoto.");
          return true;
        }
        setWaitingFor('confirm_reset');
        speakAndListen("Sei sicuro di voler svuotare interamente il tuo garage?");
        return true;
      }

      // 3. AZIONI SUI SINGOLI VEICOLI
      if (/\b(elimina|rimuovi|cancella|togli)\b/i.test(text)) {
        if (vehicles.length === 0) return true;
        const matchedVehicle = findMatchingVehicle(entities.extractedText || text, entities.plate);
        
        if (matchedVehicle) {
          setTargetVehicleId(matchedVehicle.id);
          setWaitingFor('confirm_delete');
          speakAndListen(`Vuoi davvero eliminare la ${matchedVehicle.brand}?`);
        } else {
          speakOnly("Non ho trovato il veicolo richiesto nel tuo garage.");
        }
        return true;
      }

      if (/\b(preferit|principale|stella)\b/i.test(text)) {
        if (vehicles.length === 0) return true;
        const matchedVehicle = findMatchingVehicle(entities.extractedText || text, entities.plate);
        
        if (matchedVehicle) {
          setTargetVehicleId(matchedVehicle.id);
          setWaitingFor('confirm_favorite');
          speakAndListen(`Vuoi impostare la ${matchedVehicle.brand} come preferita?`);
        } else {
          speakOnly("Non ho trovato questo veicolo tra le tue auto.");
        }
        return true;
      }

      return false; // Permette al VoiceContext di gestire il comando se non rilevato
    });

    return cleanup;
  }, [registerActionHandler, speakAndListen, speakOnly]);

  return { waitingFor };
}