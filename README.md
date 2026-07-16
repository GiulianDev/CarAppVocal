# CarAppVocal


la descrizione dei voice intent è in VoiceCommand/nlpService.ts

L'app permette di gestire veicoli all'interno di un garage.
La pagina di aggiunta di un veicolo permette di aggiungere tramite comandi vocali un veicolo.
L'utente può dire frasi tipo "aggiungi un panda" e il modello, guardando dalla lista, capisce che la marca/costruttore è "fiat"
L'utente però può anche aggiungere marche e modelli non in elenco, dicendo "aggiungi una krts swang" e il modello se non le trova in elenco magari chiede se è corretto quello che ha capito.
Inoltre se il modello capisce male l'utente deve poter dire "no è scritto male, si scrive con la i" o cose del genere



# COMANDI

- genera mappa
    uv run generate_map.py > ./PROJECT_MAP.md



- npx cap sync

- npm install @capacitor/android
- npx cap add android

- npm run build
- npx cap sync
- npx cap open android

