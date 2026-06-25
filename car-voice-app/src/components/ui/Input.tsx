interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <input
        {...props}
        className="w-full p-3 rounded-lg border border-slate-700 bg-slate-900 text-white text-base outline-none focus:border-blue-500 transition-colors"
      />
    </div>
  );
}