interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'outline';
}

export function Button({ children, variant = 'primary', ...props }: ButtonProps) {
  // py-4 lo rende alto e autorevole; rounded-md spezza le curve rendendolo più geometrico e moderno
  const baseStyle = "w-full px-4 py-4 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center outline-none disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.99]";
  
  const variants = {
    // Un blu notte profondo, opaco e satinato. Elegante, chiaramente blu, ma riposante per la vista.
    primary: "bg-blue-950 text-blue-200 border border-blue-800/60 hover:bg-blue-900 hover:text-white shadow-sm",
    
    // Danger e Outline coordinati per mantenere la coerenza geometrica
    danger: "bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/60",
    outline: "bg-transparent border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
  };

  return (
    <button {...props} className={`${baseStyle} ${variants[variant]}`}>
      {children}
    </button>
  );
}