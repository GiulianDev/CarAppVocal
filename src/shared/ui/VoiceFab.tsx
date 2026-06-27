import { useVoiceContext } from "../VoiceCommand/VoiceContext";

export function VoiceFab() {
  const { startListening, isListening } = useVoiceContext();

  return (
    <button 
      className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-[1000] transition-all duration-300 ${
        isListening 
          ? 'bg-red-500 animate-pulse scale-110 shadow-red-500/50' 
          : 'bg-indigo-600 hover:scale-105 hover:bg-indigo-500 hover:shadow-indigo-500/50'
      }`}
      onClick={startListening}
      disabled={isListening}
      aria-label="Comando Vocale"
    >
      {/* Icona Microfono: Sostituiscila con la tua SVG o componente */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth="2"
        className="text-white"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    </button>
  );
}