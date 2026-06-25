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
      <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
        {label}
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full p-3 pr-10 rounded-xl border border-slate-800 bg-slate-900 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all ${
            disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-slate-700'
          }`}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => !disabled && setIsOpen(true)}
        />
        
        {/* Chevron Icon (SVG) con animazione di rotazione */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-transform duration-200"
             style={{ transform: `translateY(-50%) rotate(${isOpen && !disabled ? '180deg' : '0deg'})` }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Tendina dei risultati stilizzata */}
      {isOpen && !disabled && (
        <ul className="absolute top-[100%] left-0 w-full mt-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50 custom-scrollbar divide-y divide-slate-800/50 overflow-hidden">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <li
                key={option}
                className="p-3 text-sm text-slate-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {option}
              </li>
            ))
          ) : (
            <li className="p-3 text-xs text-slate-500 italic bg-slate-950/40">
              Nessun risultato. Verrà salvato come "{value}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
}