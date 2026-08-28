# CarAppVocal

App scritta in react + vite + capacitor.
L'app permette di gestire veicoli all'interno di un garage.
Ci sono al momento 3 pagine/funzionalità principali:
1. Pagina di aggiunta di un veicolo. 
   Permette di aggiungere un veicolo tramite un form. Il form comprende 3 campi: targa, modello e marca/costruttore. Esiste una lista di auto con costruttore e modello da cui confrontare se il veicolo inserito dall'utente è esistente. Se non è esistente l'app chiede comunque conferma se il modello e corretto così da permettere alll'utente di inserire liberamente il veicolo che vuole.
2. Pagina di gestione del garage.
   L'utente può eliminare l'auto aggiunta, e può decidere quale deve essere l'auto predefinita. Può anche modificare un veicolo, in questo caso viene riportato alla pagina di aggiunta con i campi pre compilati e può modificarli.
3. Pagina di aggiunta degli eventi. in cui l'utente inserisce dei generici eventi di manutenzione, ad esempio cambio gomme o cambio olio  ecc...
Tutte le funzionalità dell'app devono poter essere gestite tramite comandi vocali.

# PROMPT
- NON CANCELLARE I COMMENTI

# ARCHITETTURA

Ascolto (STT)
- @capacitor-community/speech-recognition. 

RICONOSCIMENTO INTENTI 
- SML + fuse con xenova transformer

# Logica di aggiunta di un veicolo
La pagina di aggiunte di un veicolo recupera una lista di veicoli suddivisi per brand (marca).
L'utente deve poter aggiungere un veicolo dicendo frasi del tipo:
- "aggiungi una fiat"
   in questo caso viene detto solo il brand, presente nella lista, quindi l'app chiederà di specificare il modello
- "aggiungi una panda"
   in questo caso l'utente cita solo il modello, ma dalla lista recupera che il brand è fiat, quindi passerà a chiedere la targa.
L'app deve gestire però anche le casistiche in cui il modello o il brand dettati dall'utente non vengono trovati nella lista, in questo caso l'app chiederà solo conferma se ciò che ha recepito è corretto.
Infine l'utente deve poter correggere un campo specifico del form dicendo:
- "correggi il modello con ..."
- "il modello è sbagliato, ...."
- "no il modello non è ... ma ..."


# COMANDI

- genera mappa
    uv run generate_map.py > ./PROJECT_MAP.md

- avvia in locale
   npm run dev

- crea build
   npm run build

- Pubblica su firebase
   firebase deploy


- npx cap sync

- npm install @capacitor/android
- npx cap add android

- npx cap sync
- npx cap open android


