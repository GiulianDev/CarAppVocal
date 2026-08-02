// src/shared/VoiceCommand/nlpService.ts

import { containerBootstrap } from '@nlpjs/core';
import { Nlp } from '@nlpjs/nlp';
import { LangIt } from '@nlpjs/lang-it';

let nlpInstance: any = null;

export async function initNlp() {
  if (nlpInstance) {
    console.log('🧠 [NLP Service] Istanza già esistente, riutilizzo...');
    return nlpInstance;
  }

  console.log('🧠 [NLP Service] Inizializzazione motore NLP in corso...');

  const container = await containerBootstrap();
  container.use(Nlp);
  container.use(LangIt);

  const nlp = container.get('nlp');
  nlp.settings.autoSave = false;

  // FIX 1: DISABILITARE LA PENALIZZAZIONE PAROLE SINGOLE
  if (!nlp.settings.nlu) nlp.settings.nlu = {};
  nlp.settings.nlu.useNoneFeature = false;
  console.log('⚙️ [NLP Service] Settings: useNoneFeature disabilitato');

  nlp.addLanguage('it');

  // FIX 2: RIMOZIONE STOPWORDS CRITICHE
  const stopwordsIt = container.get('StopwordsIt');
  if (stopwordsIt && stopwordsIt.dictionary) {
    const originalLength = stopwordsIt.dictionary.length;
    stopwordsIt.dictionary = stopwordsIt.dictionary.filter(
      (word: string) => !['si', 'sì', 'no'].includes(word)
    );
    console.log(`⚙️ [NLP Service] Stopwords filtrate: da ${originalLength} a ${stopwordsIt.dictionary.length} (rimossi 'si', 'no')`);
  }

  // 1. REGOLE DI ESTRAZIONE ENTITÀ (NER)
  nlp.addNerRegexRule('it', 'plate', /[A-Za-z]{2}[\s\-]*\d{3}[\s\-]*[A-Za-z]{2}/i);
  nlp.addNerAfterCondition('it', 'brand', 'marca');
  nlp.addNerAfterCondition('it', 'model', 'modello');
  
  // 2. ADDESTRAMENTO DEGLI INTENTI (Corpus)
  console.log('🧠 [NLP Service] Caricamento documenti (intents)...');
  
  const ADD_VEHICLE = 'intent.add_vehicle';
  
  // Inseriamo vari modi in cui l'utente potrebbe esprimere l'intenzione.
  // Usa i segnaposto %entità% dove ti aspetti che il NER faccia il suo lavoro.
  nlp.addDocument('it', 'aggiungi la targa %plate% della marca %brand% modello %model%', ADD_VEHICLE);
  nlp.addDocument('it', 'inserisci un nuovo veicolo marca %brand% modello %model% con targa %plate%', ADD_VEHICLE);
  nlp.addDocument('it', 'registra auto marca %brand% modello %model% targata %plate%', ADD_VEHICLE);
  nlp.addDocument('it', 'nuova macchina marca %brand% modello %model% la targa è %plate%', ADD_VEHICLE);
  nlp.addDocument('it', 'aggiungi la targa %plate%', ADD_VEHICLE);
  nlp.addDocument('it', 'voglio inserire una nuova auto', ADD_VEHICLE);
  
  // Frasi naturali, anche senza le parole "marca" o "modello"
  nlp.addDocument('it', 'aggiungi un nuovo veicolo', ADD_VEHICLE);
  nlp.addDocument('it', 'inserisci auto', ADD_VEHICLE);
  nlp.addDocument('it', 'aggiungi una nuova %brand% %model%', ADD_VEHICLE);
  nlp.addDocument('it', 'registra una %brand% targata %plate%', ADD_VEHICLE);
  nlp.addDocument('it', 'ho comprato una %brand% %model%', ADD_VEHICLE);
  nlp.addDocument('it', 'nuova macchina', ADD_VEHICLE);

  // NUOVI INTENTI DI CONFERMA E ANNULLAMENTO
  const CONFIRM = 'intent.confirm';
  nlp.addDocument('it', 'sì', CONFIRM);
  nlp.addDocument('it', 'si', CONFIRM);
  nlp.addDocument('it', 'certo', CONFIRM);
  nlp.addDocument('it', 'ok', CONFIRM);
  nlp.addDocument('it', 'va bene', CONFIRM);
  nlp.addDocument('it', 'procedi', CONFIRM);
  nlp.addDocument('it', 'salva', CONFIRM);

  const CANCEL = 'intent.cancel';
  nlp.addDocument('it', 'no', CANCEL);
  nlp.addDocument('it', 'annulla', CANCEL);
  nlp.addDocument('it', 'fermati', CANCEL);


  // NUOVI INTENTI DI ELIMINAZIONE DI TUTTE LE AUTO
  const DELETE_ALL = 'intent.delete_all';
  nlp.addDocument('it', 'elimina tutto', DELETE_ALL);
  nlp.addDocument('it', 'elimina tutte le auto', DELETE_ALL);
  nlp.addDocument('it', 'cancella tutto', DELETE_ALL);
  nlp.addDocument('it', 'cancella tutte le auto', DELETE_ALL);
  nlp.addDocument('it', 'svuota garage', DELETE_ALL);
  nlp.addDocument('it', 'pulisci garage', DELETE_ALL);
  nlp.addDocument('it', 'elimina garage', DELETE_ALL);

  // NUOVO INTENTO: ELIMINAZIONE SINGOLO VEICOLO
  const DELETE_VEHICLE = 'intent.delete_vehicle';
  nlp.addDocument('it', 'elimina la %brand%', DELETE_VEHICLE);
  nlp.addDocument('it', 'elimina %brand%', DELETE_VEHICLE);
  nlp.addDocument('it', 'cancella auto %brand% %model%', DELETE_VEHICLE);
  nlp.addDocument('it', 'rimuovi la %model%', DELETE_VEHICLE);
  nlp.addDocument('it', 'elimina targa %plate%', DELETE_VEHICLE);
  nlp.addDocument('it', 'togli la mia %brand%', DELETE_VEHICLE);
  nlp.addDocument('it', 'voglio cancellare la %brand%', DELETE_VEHICLE);

  // NUOVO INTENTO: AGGIUNGI PREFERITO
  const SET_FAVORITE_VEHICLE = 'intent.set_favorite';
  nlp.addDocument('it', 'aggiungi ai preferiti la %brand%', SET_FAVORITE_VEHICLE);
  nlp.addDocument('it', 'aggiungi ai preferiti %brand%', SET_FAVORITE_VEHICLE);
  nlp.addDocument('it', 'modifica preferiti imposta la %brand%', SET_FAVORITE_VEHICLE);
  nlp.addDocument('it', 'imposta come preferito auto %brand% %model%', SET_FAVORITE_VEHICLE);
  nlp.addDocument('it', 'preferito la %model%', SET_FAVORITE_VEHICLE);
  nlp.addDocument('it', 'aggiungi ai preferiti targa %plate%', SET_FAVORITE_VEHICLE);
  nlp.addDocument('it', 'togli la mia %brand%', SET_FAVORITE_VEHICLE);
  nlp.addDocument('it', 'voglio aggiungere ai preferiti', SET_FAVORITE_VEHICLE);

  // NUOVO INTENTO: CALENDAR ALL VEHICLES
  const CALENDAR_ALL = 'intent.calendar_all';
  nlp.addDocument('it', 'vai al calendario', CALENDAR_ALL);
  nlp.addDocument('it', 'mostrami il celendario', CALENDAR_ALL);
  nlp.addDocument('it', 'calendario', CALENDAR_ALL);

  // NUOVO INTENTO: AGGIUNGI EVENTO
  const ADD_EVENT_VEHICLE = 'intent.add_event';
  nlp.addDocument('it', 'aggiungi un nuovo evento', ADD_EVENT_VEHICLE);
  nlp.addDocument('it', 'evento', ADD_EVENT_VEHICLE);
  nlp.addDocument('it', "aggiungi cambio dell'olio", ADD_EVENT_VEHICLE);
  nlp.addDocument('it', 'cambio gomme', ADD_EVENT_VEHICLE);
  nlp.addDocument('it', 'nuovo cambio', ADD_EVENT_VEHICLE);
  nlp.addDocument('it', 'cambiate', ADD_EVENT_VEHICLE);
  nlp.addDocument('it', 'sostituite', ADD_EVENT_VEHICLE);
  nlp.addDocument('it', 'libretto', ADD_EVENT_VEHICLE);
  nlp.addDocument('it', 'assicurazione', ADD_EVENT_VEHICLE);
  nlp.addDocument('it', 'bollo', ADD_EVENT_VEHICLE);

  // NUOVO INTENTO: GARAGE
  const GARAGE = 'intent.garage';
  nlp.addDocument('it', 'vai al garage', GARAGE);
  nlp.addDocument('it', 'torna al garage', GARAGE);
  nlp.addDocument('it', 'garage', GARAGE);
  nlp.addDocument('it', 'tutti i veicoli', GARAGE);
  nlp.addDocument('it', 'tutti i miei veicoli', GARAGE);
  nlp.addDocument('it', 'tutte le mie auto', GARAGE);
  nlp.addDocument('it', 'tutte le auto', GARAGE);
  nlp.addDocument('it', 'la mia flotta', GARAGE);

  // NUOVO INTENTO: VISUALIZZA DETTAGLIO EVENTO
  const VIEW_EVENT = 'intent.view_event';
  nlp.addDocument('it', 'vai al dettaglio di', VIEW_EVENT);
  nlp.addDocument('it', 'apri il dettaglio del', VIEW_EVENT);
  nlp.addDocument('it', 'mostrami il', VIEW_EVENT);
  nlp.addDocument('it', 'fammi vedere', VIEW_EVENT);
  nlp.addDocument('it', 'apri evento', VIEW_EVENT);
  nlp.addDocument('it', 'vai a', VIEW_EVENT);
  // Qualche esempio specifico per aiutare la rete neurale
  nlp.addDocument('it', 'vai al dettaglio del cambio olio', VIEW_EVENT);
  nlp.addDocument('it', 'apri assicurazione del 2023', VIEW_EVENT);
  nlp.addDocument('it', 'mostrami il bollo', VIEW_EVENT);
  nlp.addDocument('it', 'dettagli revisione', VIEW_EVENT);

  // 3. TRAINING DEL MODELLO
  console.log('🧠 [NLP Service] Avvio addestramento...');
  await nlp.train();
  console.log('🧠 [NLP Service] Addestramento completato!');
  
  nlpInstance = nlp;
  return nlp;
}

export async function processVoiceText(text: string) {
  if (!nlpInstance) {
    await initNlp();
  }
  console.log(`\n🗣️ === [NLP Service] ANALISI NUOVO TESTO ===`);
  console.log(`🗣️ Input: "${text}"`);
  
  const result = await nlpInstance.process('it', text);
  
  console.log(`🎯 Intento rilevato: [${result.intent}] - Punteggio: ${result.score}`);
  if (result.entities && result.entities.length > 0) {
    console.log(`📦 Entità estratte:`, result.entities.map((e: any) => `${e.entity} = "${e.sourceText}"`));
  } else {
    console.log(`📦 Entità estratte: Nessuna`);
  }
  console.log(`=============================================\n`);
  
  return result;
}