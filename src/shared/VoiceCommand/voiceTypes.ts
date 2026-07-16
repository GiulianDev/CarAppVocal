export type BotRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: BotRole;
  text: string;
  timestamp: number;
}

export type ConversationState =
  | 'IDLE'
  | 'COLLECTING_VEHICLE'
  | 'CLARIFYING_BRAND'
  | 'CLARIFYING_MODEL'
  | 'CONFIRMING_VEHICLE'
  | 'COLLECTING_EVENT'
  | 'CLARIFYING_EVENT_DATE'
  | 'CONFIRMING_EVENT';

export interface DraftVehicle {
  brand: string | null;
  model: string | null;
  plate: string | null;
}

export interface DraftEvent {
  title: string | null;
  date: string | null; // ISO String YYYY-MM-DD
}

export interface MatchConfidence {
  value: string;
  score: number;
  level: 'exact' | 'high' | 'medium' | 'low' | 'none';
  candidates?: string[];
}

export interface ExtractedEntities {
  brand: MatchConfidence | null;
  model: MatchConfidence | null;
  plate: MatchConfidence | null;
  brandInferred?: boolean;
  attemptedField?: 'brand' | 'model' | 'plate' | null;
}

export const APP_INTENTS = {
  ADD_VEHICLE: 'intent.add_vehicle',
  ADD_EVENT: 'intent.add_event',
  CONFIRM: 'intent.confirm',
  CANCEL: 'intent.cancel',
  MODIFY_FIELD: 'intent.modify_field',
  UNKNOWN: 'intent.unknown',
} as const;

export type AppIntent = typeof APP_INTENTS[keyof typeof APP_INTENTS];

export interface IntentResult {
  intent: AppIntent;
  score: number;
  utterance: string;
}