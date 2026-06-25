# CarAppVocal


pattern 

src/
├── components/          # Componenti UI generici e atomici (Shared)
│   └── ui/
│       ├── Button.tsx
│       └── Input.tsx
├── features/            # I moduli Core dell'applicazione
│   ├── dashboard/       # Tutto ciò che riguarda la schermata principale
│   │   └── DashboardView.tsx
│   └── onboarding/      # Tutto ciò che riguarda il primo accesso
│       ├── components/
│       │   └── CarForm.tsx
│       └── OnboardingView.tsx
├── hooks/               # Custom Hooks globali
│   └── useCars.ts       # Gestisce lo stato e la persistenza sul LocalStorage
├── types/               # Definizioni dei tipi TypeScript globali
│   └── car.ts
├── App.tsx              # Il Router/Coordinatore centrale
└── main.tsx