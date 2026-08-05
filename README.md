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


# ARCHITETTURA

Ascolto (STT)
- @capacitor-community/speech-recognition. 

RICONOSCIMENTO INTENTI 
- SML + fuse con xenova transformer





# COMANDI

- genera mappa
    uv run generate_map.py > ./PROJECT_MAP.md



- npx cap sync

- npm install @capacitor/android
- npx cap add android

- npm run build
- npx cap sync
- npx cap open android

