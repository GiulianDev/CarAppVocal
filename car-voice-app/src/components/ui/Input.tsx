interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      <input
        {...props}
        className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm text-zinc-100 text-sm outline-none placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
      />
    </div>
  );
}