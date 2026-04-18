import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'active' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base = `inline-flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed font-cinzel font-black uppercase tracking-widest`

  // clip-path biseauté : coins coupés en diagonale
  const clip = `[clip-path:polygon(8px_0%,100%_0%,calc(100%-8px)_100%,0%_100%)]`

  const variants = {
    primary:   'bg-theme-main/20 text-theme-main border border-theme-main/40 hover:bg-theme-main/35 hover:border-theme-main/70',
    secondary: 'bg-white/[0.03] text-theme-main/60 border border-theme-main/20 hover:bg-theme-main/10 hover:text-theme-main hover:border-theme-main/40',
    danger:    'bg-red-900/40 text-red-400/80 border border-red-800/50 hover:bg-red-900/60 hover:text-red-300 hover:border-red-700/70',
    ghost:     'bg-transparent text-theme-main/40 border border-transparent hover:bg-white/5 hover:text-theme-main/70',
    active:    'bg-theme-main/30 text-theme-main border border-theme-main/60',
    success:   'bg-green-900/40 text-green-400/80 border border-green-800/50 hover:bg-green-900/60 hover:text-green-300 hover:border-green-700/70',
    outline:   'bg-transparent text-theme-main border border-theme-main/40 hover:bg-theme-main/10 hover:border-theme-main/60',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-[9px] letter-spacing-widest',
    md: 'px-4 py-2 text-[10px]',
    lg: 'px-6 py-3 text-xs',
  }

  return (
    <button
      className={`${base} ${clip} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
