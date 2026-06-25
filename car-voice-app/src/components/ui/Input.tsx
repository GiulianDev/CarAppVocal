interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <input
        {...props}
        className="w-full p-3 rounded-xl border border-slate-800 bg-slate-900 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 hover:border-slate-700 transition-all"
      />
    </div>
  );
}