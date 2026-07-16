// src/features/vehicle/utils/promptBuilder.ts
import type { ConversationState, DraftVehicle } from "../../../shared/VoiceCommand/voiceTypes";

/**
 * Converte una targa in una forma "naturale" da leggere ad alta voce.
 *
 * Il Web Speech API (SpeechSynthesisUtterance) NON supporta SSML: tag come
 * <say-as interpret-as="characters"> non vengono interpretati da nessun
 * motore vocale del browser, vengono letti come testo letterale — è la
 * causa della lettura "sporca" della targa prima del salvataggio.
 *
 * Per farla leggere lettera per lettera in modo naturale usiamo il
 * minuscolo con spazi tra i caratteri: molte voci italiane annunciano
 * esplicitamente "maiuscola" per lettere isolate in maiuscolo (per
 * disambiguarle), cosa che non succede con le minuscole. La targa resta
 * MAIUSCOLA ovunque altrove (bozza, UI, salvataggio) — questa è solo la
 * versione "parlata".
 */
function toSpokenPlate(plate: string | null | undefined): string {
  if (!plate) return '';
  return plate.toLowerCase().split('').join(' ');
}

export class PromptBuilder {
  static getNextPrompt(
    state: ConversationState,
    draft: DraftVehicle,
    candidates: string[] = []
  ): string {
    switch (state) {
      case 'COLLECTING':
        if (!draft.brand) return "Che auto vuoi aggiungere?";
        if (!draft.model) return `Ottimo, un'auto targata ${draft.brand}. Che modello è?`;
        if (!draft.plate) return `Perfetto, ${draft.brand} ${draft.model}. Qual'è la targa?`;
        return "Ho annotato tutto. Salvo e metto in garage?";

      case 'CLARIFYING_BRAND':
        if (candidates.length > 0) {
          return `Ho trovato diverse marche simili, ad esempio: ${candidates.join(', ')}. Quale intendevi esattamente?`;
        }
        return "Non ho capito bene la marca dell'auto. Puoi ripeterla?";

      case 'CLARIFYING_MODEL':
        if (candidates.length > 0) {
          return `Ho trovato più modelli per ${draft.brand}, come ad esempio: ${candidates.join(', ')}. Quale vuoi usare?`;
        }
        return `Non ho trovato questo modello per ${draft.brand}. Puoi ripetere il modello?`;

      case 'CLARIFYING_PLATE':
        return "La targa non mi è chiara. Ricorda che il formato standard è due lettere, tre numeri e due lettere. Puoi dirmela di nuovo?";

      case 'CONFIRMING':
        return `Sto per salvare la tua ${draft.brand} ${draft.model} targata ${toSpokenPlate(draft.plate)}. Posso procedere?`;

      case 'SAVING':
        return "Perfetto! Auto parcheggiata con successo.";

      case 'IDLE':
      default:
        return "Come posso aiutarti?";
    }
  }

  static getCorrectionPrompt(field: 'brand' | 'model' | 'plate', newValue: string, nextPrompt: string): string {
    const fieldName = field === 'brand' ? 'la marca in' : field === 'model' ? 'il modello in' : 'la targa in';
    const formattedValue = field === 'plate' ? toSpokenPlate(newValue) : newValue;
    
    return `Va bene, ho corretto ${fieldName} ${formattedValue}. ${nextPrompt}`;
  }
}