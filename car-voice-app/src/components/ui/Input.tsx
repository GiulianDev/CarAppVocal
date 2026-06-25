interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[11px] font-medium uppercase tracking-wider text-slate-400/80">
        {label}
      </label>
      <input
        {...props}
        className="w-full p-3 rounded-lg border border-slate-800 bg-slate-900/50 text-white text-sm outline-none placeholder:text-slate-600 focus:border-slate-600 focus:bg-slate-900 transition-all duration-150"
      />
    </div>
  );
}