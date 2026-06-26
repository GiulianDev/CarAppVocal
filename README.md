# CarAppVocal


genera mappa

- uv run generate_map.py > ./PROJECT_MAP.md



- npx cap sync

- npm install @capacitor/android
- npx cap add android

- npm run build
- npx cap sync

L'Architettura dell'App

Ascolto (STT): Usiamo @capacitor-community/speech-recognition. Sfrutta il motore di Android, pesa zero MB, funziona offline e ci dà la stringa di testo (es. "Inserisci la targa AB123CD per la mia nuova Golf").

Comprensione (NLP.js): Passiamo la stringa al nostro motore NLP.js inizializzato dentro React.

Risultato: NLP.js capisce l'intento ("Aggiungi Veicolo") ed estrae le entità ("AB123CD" come targa, "Golf" come modello), restituendoti un JSON pulito