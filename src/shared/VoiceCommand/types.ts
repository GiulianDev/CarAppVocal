export type VoiceIntent = 
  | 'ADD_VEHICLE'
  | 'NAVIGATE_GARAGE'
  | 'NAVIGATE_CALENDAR'
  | 'CONFIRM'
  | 'CANCEL'
  | 'FORM_FILL_FIELD'     // Aggiunto: L'utente sta compilando un dato
  | 'FORM_CORRECT_FIELD'  // Aggiunto: L'utente sta correggendo un dato
  | 'VIEW_EVENT'
  | 'UNKNOWN';

export interface VoiceEntities {
  brand?: string;
  model?: string;
  plate?: string;
  targetField?: 'brand' | 'model' | 'plate'; // Identifica il campo su cui sta agendo
  correctedValue?: string;                   // Il valore pulito da usare per il DB
  extractedText?: string;                    // Testo generico pulito dalle stop-words
}

export interface VoiceAnalysisResult {
  intent: VoiceIntent;
  confidence: number;
  entities: VoiceEntities;
  rawText: string;
  utterance?: string; // Testo originale dell'utente, se disponibile
}

export type WorkerCommand = 
  | { type: 'INIT' }
  | { type: 'ANALYZE'; payload: { text: string } };

export type WorkerResponse = 
  | { type: 'READY' }
  | { type: 'ANALYSIS_COMPLETE'; payload: VoiceAnalysisResult }
  | { type: 'ERROR'; payload: { error: string } };