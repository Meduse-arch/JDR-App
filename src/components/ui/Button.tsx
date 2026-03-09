import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'active';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '', 
  ...props 
}: ButtonProps) {
  const baseClasses = "rounded-xl font-bold transition-all flex justify-center items-center gap-2";
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-3 text-base w-full",
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 14px color-mix(in srgb, var(--color-main) 30%, transparent)',
        };
      case 'active':
        return {
          backgroundColor: 'var(--color-main)',
          color: '#fff',
          border: 'none',
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
        };
      case 'danger':
        return {
          backgroundColor: 'color-mix(in srgb, #ef4444 10%, transparent)',
          color: '#f87171',
          border: '1px solid color-mix(in srgb, #ef4444 30%, transparent)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid transparent',
        };
      default:
        return {};
    }
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${
        variant === 'primary' ? 'hover:-translate-y-0.5 hover:shadow-lg active:scale-95' : 'hover:opacity-80'
      } ${className}`}
      style={getVariantStyles()}
      {...props}
    >
      {children}
    </button>
  );
}
