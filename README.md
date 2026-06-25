# CarAppVocal


genera mappa

- uv run generate_map.py > ./PROJECT_MAP.md

pattern 

src/
├── features/
│   ├── addVehicle/               # FEATURE: Schermata iniziale / Inserimento auto
│   │   ├── hooks/useAddVehicle.ts
│   │   └── AddVehicleView.tsx
│   │
│   ├── vehicleDetail/            # FEATURE: Schermata per AUTO SINGOLA (Dettaglio/Comandi)
│   │   └── VehicleDetailView.tsx
│   │
│   └── vehiclesDashboard/        # FEATURE: Schermata per AUTO MULTIPLE (Gestione Flotta)
│       └── VehiclesDashboardView.tsx
│
├── shared/                       # Tutto ciò che è trasversale e globale
│   ├── context/CarContext.tsx    # Lo stato globale (LocalStorage ora, Firebase domani)
│   ├── hooks/useCarsQuery.ts     # L'hook per permettere ad App.tsx di leggere lo stato
│   └── types/car.ts              # L'interfaccia TypeScript dell'oggetto Car
│
├── App.tsx                       # Il Direttore d'Orchestra (Router condizionale)
└── main.tsx                      # Punto di ingresso (dove avvolgiamo l'app nel Provider)