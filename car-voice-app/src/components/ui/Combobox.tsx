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

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(value.toLowerCase())
  );

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
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm text-zinc-100 text-sm outline-none placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 ${
            disabled ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => !disabled && setIsOpen(true)}
        />
        
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-200 ${isOpen && !disabled ? 'rotate-180 text-indigo-400' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && (
        <ul className="absolute top-[calc(100%+6px)] left-0 w-full bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-lg shadow-[0_25px_50px_rgba(0,0,0,0.75)] max-h-52 overflow-y-auto z-50 custom-scrollbar p-1 animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-white/5">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <li
                key={option}
                className="px-3 py-2 text-sm text-zinc-300 hover:bg-indigo-600 hover:text-white rounded-md cursor-pointer transition-colors font-sans"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {option}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-zinc-500 italic font-sans">
              Nessun risultato.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}