# CarAppVocal


la descrizione dei voice intent è in VoiceCommand/nlpService.ts

Abbiamo un app react + vite + capacitor
L'app permette di gestire veicoli all'interno di un garage.
La pagina di aggiunta di un veicolo permette di aggiungere tramite comandi vocali un veicolo.
L'utente può dire frasi tipo "aggiungi un panda" e il modello, guardando dalla lista, capisce che la marca/costruttore è "fiat"
L'utente però può anche aggiungere marche e modelli non in elenco, dicendo "aggiungi una krts swang" e il modello se non le trova in elenco magari chiede se è corretto quello che ha capito.
Inoltre se il modello capisce male l'utente deve poter dire "no è scritto male, si scrive con la i" o cose del genere


Soluzione ibrida

shared/VoiceCommand/
├── intentWorker.ts          → carica zero-shot (thread separato)
├── intentService.ts         → orchestratore intent (usa worker)
├── embeddingService.ts      → carica embedding (thread principale)
├── modelPreloader.ts        → centralizza preload (chiama entrambi)
├── conversationTypes.ts
├── VoiceContext.tsx
├── useSpeechAction.ts
└── useVoiceCommand.ts




# ARCHITETTURA
src/
├── shared/
│   └── VoiceCommand/
│       ├── core/
│       │   ├── conversationTypes.ts         # Tipi condivisi
│       │   └── modelPreloader.ts            # Preload centralizzato
│       │
│       ├── intent/
│       │   ├── intentService.ts             # Orchestratore intent (fast-path + worker)
│       │   └── intentWorker.ts              # Worker zero-shot (DeBERTa)
│       │
│       ├── embedding/
│       │   └── embeddingService.ts          # Embedding + semantic search (senza worker)
│       │
│       ├── speech/
│       │   ├── VoiceContext.tsx             # Context vocale
│       │   ├── useVoiceCommand.ts           # Riconoscimento vocale
│       │   └── useSpeechAction.ts           # Sintesi vocale
│       │
│       └── index.ts                         # Esportazioni pubbliche
│
├── features/
│   └── vehicle/
│       ├── hook/
│       │   ├── useConversationEngine.ts     # Motore conversazionale
│       │   ├── useAddVehicleForm.ts
│       │   └── useVehicleCatalog.ts
│       │
│       ├── utils/
│       │   ├── promptBuilder.ts             # Generazione prompt vocali
│       │   └── voiceParser.ts               # Fallback (legacy, da eliminare)
│       │
│       └── AddVehiclePage.tsx               # Pagina principale
│
└── App.tsx                                  # Preload all'avvio



# COMANDI

- genera mappa
    uv run generate_map.py > ./PROJECT_MAP.md



- npx cap sync

- npm install @capacitor/android
- npx cap add android

- npm run build
- npx cap sync
- npx cap open android

