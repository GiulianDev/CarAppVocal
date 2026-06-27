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

  nlp.addLanguage('it');

  // ==========================================
  // 1. REGOLE DI ESTRAZIONE ENTITÀ (NER)
  // ==========================================
  
  // Targa: Usiamo una Regex sicura e case-insensitive (es. AA123BB o aa123bb)
  nlp.addNerRegexRule('it', 'plate', /[A-Za-z]{2}\d{3}[A-Za-z]{2}/i);

  // Marca e Modello (Trim Entities):
  // Dato che il listino auto è sterminato e l'utente potrebbe pronunciare nomi nuovi,
  // usiamo le regole di "ritaglio". Insegniamo al bot a estrarre tutto ciò che 
  // si trova dopo determinate parole chiave.
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