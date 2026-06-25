import { useState, useRef, useEffect } from 'react';

interface ComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function Combobox({ label, value, onChange, options, placeholder, disabled }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filtra le opzioni in base a cosa sta scrivendo l'utente (case-insensitive)
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(value.toLowerCase())
  );

  // Chiude la tendina se si clicca fuori dal componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-1.5 w-full relative" ref={wrapperRef}>
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full p-3 rounded-lg border border-slate-700 bg-slate-900 text-white text-base outline-none focus:border-blue-500 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        
        {/* Freccina indicativa (decorativa) */}
        {!disabled && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            ▼
          </div>
        )}
      </div>

      {/* Tendina dei risultati */}
      {isOpen && !disabled && (
        <ul className="absolute top-[100%] left-0 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <li
                key={option}
                className="p-3 hover:bg-blue-600 text-slate-200 cursor-pointer transition-colors border-b border-slate-700/50 last:border-0"
                onClick={() => {
                  onChange(option); // Seleziona l'opzione
                  setIsOpen(false); // Chiude la tendina
                }}
              >
                {option}
              </li>
            ))
          ) : (
            // Se non trova niente, avvisa l'utente che userà il testo libero
            <li className="p-3 text-sm text-slate-400 italic">
              Nessun risultato. Verrà salvato come "{value}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
}