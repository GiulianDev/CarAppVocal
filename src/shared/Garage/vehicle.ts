// Definiamo i tag per i filtri rapidi
export type EventCategory = 'manutenzione' | 'documenti' | 'riparazione' | 'altro';

// Definiamo la struttura del singolo evento
export interface VehicleEvent {
  id: string;
  title: string;          // es: "Cambio Olio", "Rinnovo Assicurazione"
  date: string;           // Salviamo come stringa ISO (es: "2026-06-29")
  category: EventCategory;
  notes?: string;         // Dettagli opzionali
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  addedAt: string;
  events?: VehicleEvent[]; // 👈 Nuovo: Array opzionale (per retrocompatibilità coi dati già salvati)
}