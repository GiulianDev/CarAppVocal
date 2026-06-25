interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  rightElement?: React.ReactNode; // Permette di inserire icone o bottoni a destra dell'input
}

export function Input({ label, rightElement, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-semibold uppercase tracking-wider text-ui-text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          className={`w-full px-3.5 py-3 rounded-lg border border-ui-border bg-ui-input-bg backdrop-blur-sm text-ui-text-main text-sm outline-none placeholder:text-zinc-600 focus:border-ui-border-focus focus:ring-4 focus:ring-metal-blue/10 transition-all duration-200 ${
            rightElement ? 'pr-10' : ''
          } ${props.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        />
        {rightElement && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}