// ==========================================
// TIPI CONDIVISI PER TUTTI I SERVIZI VOCALI
// ==========================================

export type ConversationState =
  | 'IDLE'
  | 'COLLECTING'
  | 'CLARIFYING_BRAND'
  | 'CLARIFYING_MODEL'
  | 'CLARIFYING_PLATE'
  | 'CONFIRMING'
  | 'SAVING';

export interface DraftVehicle {
  brand: string | null;
  model: string | null;
  plate: string | null;
}

export interface ConversationMemory {
  lastState: ConversationState;
  pendingEntity: 'brand' | 'model' | 'plate' | null;
  candidateMatches: string[];
}

export interface MatchConfidence {
  value: string;
  score: number;
  level: 'exact' | 'high' | 'medium' | 'low' | 'none';
  candidates?: string[];
}

// Risultato dell'estrazione entità (embedding)
export interface ExtractedVehicleEntities {
  brand: MatchConfidence | null;
  model: MatchConfidence | null;
  plate: MatchConfidence | null;
  brandInferred?: boolean;
  attemptedField?: 'brand' | 'model' | 'plate' | null;
}

// Risultato dell'intent (zero-shot)
export interface IntentResult {
  intent: AppIntent;
  score: number;
  utterance: string;
  entities: any[];
}

export type AppIntent = typeof APP_INTENTS[keyof typeof APP_INTENTS];

export const APP_INTENTS = {
  CONFIRM: 'intent.confirm',
  CANCEL: 'intent.cancel',
  MODIFY_FIELD: 'intent.modify_field',
  GOTO_GARAGE: 'intent.garage',
  UNKNOWN: 'intent.unknown',
} as const;