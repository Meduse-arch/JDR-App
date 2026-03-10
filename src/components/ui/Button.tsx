import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'active' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-main text-white shadow-lg shadow-main/20 hover:opacity-90',
    secondary: 'bg-white/5 border border-white/10 text-white hover:bg-white/10',
    danger: 'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600',
    ghost: 'bg-transparent hover:bg-white/5 text-secondary hover:text-white',
    active: 'bg-white/10 border border-white/20 text-white',
    success: 'bg-green-500 text-white shadow-lg shadow-green-500/20 hover:bg-green-600',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs font-bold rounded-lg',
    md: 'px-5 py-2.5 text-sm font-bold rounded-xl',
    lg: 'px-8 py-4 text-base font-black rounded-2xl tracking-widest',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      style={{
        backgroundColor: variant === 'primary' ? 'var(--color-main)' : undefined,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
