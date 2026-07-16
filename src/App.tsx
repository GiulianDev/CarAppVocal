import { Outlet } from 'react-router';
import { Header } from './features/header/Header';
import { VoiceFab } from './shared/VoiceCommand/VoiceFab'; // Aggiorneremo l'import o la posizione se necessario
import { GlassCard } from './shared/ui/GlassCard';
import { VoiceProvider } from './shared/VoiceCommand/VoiceContext'; // Importiamo il nuovo Provider

// Catalogo veicoli di esempio locale (puoi importarlo da un file esterno dedicato ai dati)
const vehicleCatalog = {
  brands: ['Fiat', 'Ford', 'Ferrari', 'Audi', 'BMW', 'Toyota', 'Skoda'],
  getModels: (brand: string) => {
    const models: Record<string, string[]> = {
      fiat: ['Panda', '500', 'Punto', 'Sweng'],
      ford: ['Fiesta', 'Focus', 'Mustang'],
      ferrari: ['Roma', 'SF90', 'F8'],
      audi: ['A3', 'A4', 'Q5'],
      bmw: ['Serie 1', 'X3', 'i4'],
      toyota: ['Yaris', 'RAV4'],
      skoda: ['Octavia', 'Fabia']
    };
    return models[brand.toLowerCase()] || [];
  }
};

export default function App() {
  // L'effetto useEffect con il preloadModel esplicito è stato rimosso.
  // Ora se ne occupa autonomamente il VoiceProvider al montaggio!

  return (
    <VoiceProvider catalog={vehicleCatalog}>
      <div className="min-h-screen bg-slate-950 font-sans text-slate-100 relative overflow-hidden flex flex-col selection:bg-blue-500/30 selection:text-white">
        
        {/* ✨ EFFETTI LUCE RESPONSIVI */}
        {/* 1. Luce a cascata dall'alto */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] md:bg-[radial-gradient(ellipse_100%_100%_at_50%_-10%,rgba(37,99,235,0.22),rgba(255,255,255,0))] pointer-events-none z-0" />
        
        {/* 2. Blob Azzurro (Sinistra) */}
        <div className="absolute top-1/4 left-0 w-[400px] md:w-[700px] h-[400px] md:h-[700px] bg-blue-600/15 md:bg-blue-600/20 rounded-full blur-[120px] md:blur-[180px] pointer-events-none z-0 -translate-x-1/2" />
        
        {/* 3. Blob Indaco/Blu scuro (Destra in basso) */}
        <div className="absolute bottom-0 right-0 w-[500px] md:w-[900px] h-[500px] md:h-[900px] bg-indigo-600/10 md:bg-indigo-600/15 rounded-full blur-[130px] md:blur-[200px] pointer-events-none z-0 translate-x-1/3 translate-y-1/3" />

        <Header/>
        
        {/* 📦 AREA CONTENUTO */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 relative z-10 w-full">
          <GlassCard>
            <Outlet />
          </GlassCard>
        </main>

        <VoiceFab/>

      </div>
    </VoiceProvider>
  );
}