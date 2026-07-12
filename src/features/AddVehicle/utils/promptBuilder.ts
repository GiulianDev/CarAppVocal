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
        if (!draft.model) return `Ottimo, una ${draft.brand}! Che modello è?`;
        if (!draft.plate) return `Perfetto, ${draft.brand} ${draft.model}. Mi detti la targa per il tagliando?`;
        return "Ho annotato tutto. Salvo e metto in garage?";

      case 'CLARIFYING_BRAND':
        return `Ho trovato diverse marche simili: ${candidates.join(', ')}. Quale intendevi?`;

      case 'CLARIFYING_MODEL':
        return `Ho trovato più modelli per ${draft.brand}: ${candidates.join(', ')}. Quale vuoi usare?`;

      case 'CLARIFYING_PLATE':
        return "Non ho capito bene la targa. Ricorda che il formato standard è due lettere, tre numeri e due lettere. Puoi dirmela di nuovo?";

      case 'CONFIRMING':
        return `Sto per salvare la tua ${draft.brand} ${draft.model} targata ${draft.plate}. Posso procedere?`;

      case 'SAVING':
        return "Perfetto! Auto parcheggiata con successo nel garage.";

      case 'IDLE':
      default:
        return "Come posso aiutarti?";
    }
  }

  static getCorrectionPrompt(field: 'brand' | 'model' | 'plate', newValue: string, nextPrompt: string): string {
    const fieldName = field === 'brand' ? 'la marca' : field === 'model' ? 'il modello' : 'la targa';
    return `Va bene, ho aggiornato ${fieldName} in ${newValue}. ${nextPrompt}`;
  }
}