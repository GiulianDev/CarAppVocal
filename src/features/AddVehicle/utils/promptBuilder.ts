// src/features/vehicle/utils/promptBuilder.ts
import type { ConversationState, DraftVehicle } from "../../../shared/VoiceCommand/conversationTypes";

export class PromptBuilder {
  static getNextPrompt(
    state: ConversationState,
    draft: DraftVehicle,
    candidates: string[] = []
  ): string {
    switch (state) {
      case 'COLLECTING':
        if (!draft.brand) return "Che auto mettiamo in garage oggi? Dimmi la marca.";
        if (!draft.model) return `Ottimo, un'auto targata ${draft.brand}. Che modello è?`;
        if (!draft.plate) return `Perfetto, ${draft.brand} ${draft.model}. Mi detti la targa per completare il libretto?`;
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
        return `Sto per salvare la tua ${draft.brand} ${draft.model} targata <say-as interpret-as="characters">${draft.plate}</say-as>. Posso procedere?`;

      case 'SAVING':
        return "Perfetto! Auto parcheggiata con successo.";

      case 'IDLE':
      default:
        return "Come posso aiutarti?";
    }
  }

  static getCorrectionPrompt(field: 'brand' | 'model' | 'plate', newValue: string, nextPrompt: string): string {
    const fieldName = field === 'brand' ? 'la marca in' : field === 'model' ? 'il modello in' : 'la targa in';
    // Se è la targa, forziamo la lettura lettera per lettera (dipende dal motore TTS, ma è una buona pratica)
    const formattedValue = field === 'plate' ? `<say-as interpret-as="characters">${newValue}</say-as>` : newValue;
    
    return `Va bene, ho corretto ${fieldName} ${formattedValue}. ${nextPrompt}`;
  }
}