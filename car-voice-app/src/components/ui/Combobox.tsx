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
      <label className="text-[11px] font-medium uppercase tracking-wider text-slate-400/80">
        {label}
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full p-3 pr-10 rounded-lg border border-slate-800 bg-slate-900/50 text-white text-sm outline-none placeholder:text-slate-600 focus:border-slate-600 focus:bg-slate-900 transition-all duration-150 ${
            disabled ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => !disabled && setIsOpen(true)}
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 transition-transform duration-150"
             style={{ transform: `translateY(-50%) rotate(${isOpen && !disabled ? '180deg' : '0deg'})` }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && (
        <ul className="absolute top-[103%] left-0 w-full bg-slate-900 border border-slate-800 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-h-48 overflow-y-auto z-50 custom-scrollbar p-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <li
                key={option}
                className="p-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-md cursor-pointer transition-colors"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {option}
              </li>
            ))
          ) : (
            <li className="p-2.5 text-xs text-slate-500 italic">
              Nessun risultato per "{value}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
}