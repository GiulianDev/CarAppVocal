interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger';
}

export function Button({ children, variant = 'primary', ...props }: ButtonProps) {
  const baseStyle = "w-full p-3 text-sm font-semibold tracking-wide rounded-lg transition-all duration-150 active:scale-[0.98] cursor-pointer text-center flex items-center justify-center";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/20 shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
    danger: "bg-slate-900/50 hover:bg-red-950/30 text-red-400 border border-slate-800 hover:border-red-900/50"
  };

  return (
    <button {...props} className={`${baseStyle} ${variants[variant]}`}>
      {children}
    </button>
  );
}