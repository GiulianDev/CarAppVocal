// Stati possibili della conversazione
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
  score: number; // da 0.0 a 1.0
  level: 'exact' | 'high' | 'medium' | 'low' | 'none';
  candidates?: string[]; 
}

export interface ParsedCommand {
  intent: 'ADD_VEHICLE' | 'CORRECTION' | 'CONFIRM' | 'CANCEL' | 'UNKNOWN';
  entities: {
    brand?: MatchConfidence;
    model?: MatchConfidence;
    plate?: MatchConfidence;
  };
  isNegation: boolean;
  originalText: string;
}