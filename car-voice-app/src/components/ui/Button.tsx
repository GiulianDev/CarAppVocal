interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger';
}

export function Button({ children, variant = 'primary', ...props }: ButtonProps) {
  const baseStyle = "w-full p-3.5 rounded-lg font-semibold text-base transition-colors cursor-pointer";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    danger: "bg-transparent hover:bg-red-950/30 text-red-500 text-sm underline border-none p-1"
  };

  return (
    <button {...props} className={`${baseStyle} ${variants[variant]}`}>
      {children}
    </button>
  );
}