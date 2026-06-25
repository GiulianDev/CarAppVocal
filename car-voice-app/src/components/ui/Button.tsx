interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'outline';
}

export function Button({ children, variant = 'primary', ...props }: ButtonProps) {
  // Aumentato il padding verticale a py-3.5 per renderlo più alto e moderno
  const baseStyle = "w-full px-4 py-3.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center outline-none disabled:opacity-40 disabled:cursor-not-allowed select-none";
  
  const variants = {
    // Rimosso il glow esagerato. Ora è un blu solido con un bordo sottile in tinta.
    primary: "bg-blue-600 text-white border border-blue-500/50 hover:bg-blue-500 shadow-sm",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
    outline: "bg-zinc-900/40 border border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-50"
  };

  return (
    <button {...props} className={`${baseStyle} ${variants[variant]}`}>
      {children}
    </button>
  );
}