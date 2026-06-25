interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'outline';
}

export function Button({ children, variant = 'primary', ...props }: ButtonProps) {
  const baseStyle = "w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center outline-none disabled:opacity-40 disabled:cursor-not-allowed select-none";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_12px_rgba(79,70,229,0.3)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_20px_rgba(79,70,229,0.5)]",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
    outline: "bg-zinc-900/40 border border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-50"
  };

  return (
    <button {...props} className={`${baseStyle} ${variants[variant]}`}>
      {children}
    </button>
  );
}