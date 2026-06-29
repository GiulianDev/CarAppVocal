// servizio isolato che si occupi esclusivamente di capire il testo. 
// Dato che stiamo lavorando in React (browser/Vite) e Capacitor, 
// la sfida principale con NLP.js è evitare che cerchi di usare moduli di Node.js (come fs per leggere/scrivere file), 
// che farebbero crashare l'app.

import { containerBootstrap } from '@nlpjs/core';
import { Nlp } from '@nlpjs/nlp';
import { LangIt } from '@nlpjs/lang-it';

// Manteniamo un'istanza singola (Singleton) per evitare di riaddestrare il modello
// a ogni rendering o cambio pagina.
let nlpInstance: any = null;

export async function initNlp() {
  if (nlpInstance) return nlpInstance;

  // Inizializziamo il container. Questa API è perfetta per il browser
  // perché non tenta di usare il FileSystem di Node.
  const container = await containerBootstrap();
  container.use(Nlp);
  container.use(LangIt);

  const nlp = container.get('nlp');
  // Fondamentale: disabilitiamo il salvataggio su disco (siamo in un browser)
  nlp.settings.autoSave = false;

  // ==========================================
  // FIX 1: DISABILITARE LA PENALIZZAZIONE PAROLE SINGOLE
  // ==========================================
  // Impedisce a NLP.js di abbassare il punteggio (score)
  // delle frasi composte da una sola parola (es. "sì", "no")
  if (!nlp.settings.nlu) nlp.settings.nlu = {};
  nlp.settings.nlu.useNoneFeature = false;


  nlp.addLanguage('it');


  // ==========================================
  // FIX 2: RIMOZIONE STOPWORDS CRITICHE
  // ==========================================
  // Impediamo a NLP.js di scartare i nostri comandi base
  const stopwordsIt = container.get('StopwordsIt');
  if (stopwordsIt && stopwordsIt.dictionary) {
    stopwordsIt.dictionary = stopwordsIt.dictionary.filter(
      (word: string) => !['si', 'sì', 'no'].includes(word)
    );
  }

  // ==========================================
  // 1. REGOLE DI ESTRAZIONE ENTITÀ (NER)
  // ==========================================
  
  // Targa (Infallibile)
  nlp.addNerRegexRule('it', 'plate', /[A-Za-z]{2}[\s\-]*\d{3}[\s\-]*[A-Za-z]{2}/i);

  // Manteniamo solo dei fallback basici per chi parla "da robot"
  nlp.addNerAfterCondition('it', 'brand', 'marca');
  nlp.addNerAfterCondition('it', 'model', 'modello');
  
  // ==========================================
  // 2. ADDESTRAMENTO DEGLI INTENTI (Corpus)
  // ==========================================
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
  const FAVORITE_VEHICLE = 'intent.favorite_vehicle';
  nlp.addDocument('it', 'aggiungi ai preferiti la %brand%', FAVORITE_VEHICLE);
  nlp.addDocument('it', 'aggiungi ai preferiti %brand%', FAVORITE_VEHICLE);
  nlp.addDocument('it', 'modifica preferiti imposta la %brand%', FAVORITE_VEHICLE);
  nlp.addDocument('it', 'imosta come preferito auto %brand% %model%', FAVORITE_VEHICLE);
  nlp.addDocument('it', 'preferito la %model%', FAVORITE_VEHICLE);
  nlp.addDocument('it', 'aggiungi ai preferiti targa %plate%', FAVORITE_VEHICLE);
  nlp.addDocument('it', 'togli la mia %brand%', FAVORITE_VEHICLE);
  nlp.addDocument('it', 'voglio aggiungere ai preferiti', FAVORITE_VEHICLE);

  // ==========================================
  // 3. TRAINING DEL MODELLO
  // ==========================================
  await nlp.train();
  
  nlpInstance = nlp;
  return nlp;
}

/**
 * Funzione principale da chiamare per analizzare la voce
 */
export async function processVoiceText(text: string) {
  // Garantiamo che il modello sia pronto
  if (!nlpInstance) {
    await initNlp();
  }
  // Processiamo la stringa e restituiamo il risultato JSON
  return await nlpInstance.process('it', text);
}