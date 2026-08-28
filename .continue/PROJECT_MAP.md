### Project Structure: src
├── App.tsx
├── assets/
├── features/
│   ├── AddVehicle/
│   │   ├── AddVehiclePage.tsx
│   │   ├── hook/
│   │   │   ├── useAddVehicleForm.ts
│   │   │   ├── useAddVehicleVoiceFlow.ts
│   │   │   ├── useVehicleCatalog.ts
│   │   ├── vehicleService.ts
│   ├── Calendar/
│   │   ├── CalendarPage.tsx
│   ├── Events/
│   │   ├── VehicleEventsPage.tsx
│   │   ├── components/
│   │   │   ├── EventForm.tsx
│   │   ├── hook/
│   │   │   ├── useVoiceEventsFlow.ts
│   ├── GaragePage/
│   │   ├── GaragePage.tsx
│   │   ├── components/
│   │   │   ├── GarageCard.tsx
│   │   ├── hook/
│   │   │   ├── useGarageVoiceFlow.ts
│   ├── VehicleDetail/
│   │   ├── VehicleDetailPage.tsx
│   │   ├── components/
│   │   │   ├── EventsList.tsx
│   │   │   ├── VehicleInfo.tsx
│   │   ├── hook/
│   │   │   ├── useVehicleDetailVoiceFlow.ts
│   ├── header/
│   │   ├── AuthButton/
│   │   │   ├── AuthButton.css
│   │   │   ├── AuthButton.tsx
│   │   │   ├── AuthMenu.tsx
│   │   ├── Header.css
│   │   ├── Header.tsx
├── index.css
├── main.tsx
├── router.tsx
├── shared/
│   ├── Auth/
│   │   ├── AuthContext.tsx
│   │   ├── authService.ts
│   ├── Garage/
│   │   ├── old_CarContext.tsx
│   │   ├── useGarage.ts
│   │   ├── vehicle.ts
│   ├── Utils/
│   │   ├── Utils.tsx
│   ├── VoiceCommand/
│   │   ├── VoiceContext.tsx
│   │   ├── nlpService.ts
│   │   ├── nlpService_old.ts
│   │   ├── nlpjs.d.ts
│   │   ├── sml.worker.ts
│   │   ├── types.ts
│   │   ├── useSpeechAction.ts
│   │   ├── useVoiceCommand.ts
│   ├── config/
│   │   ├── firebase.ts
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Combobox.tsx
│   │   ├── GlassCard.tsx
│   │   ├── Input.tsx
│   │   ├── VoiceFab.tsx

