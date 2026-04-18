import { ReactNode, CSSProperties } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'success' | 'warning' | 'error';
  className?: string;
  style?: CSSProperties;
}

export function Badge({ children, variant = 'default', className = '', style = {} }: BadgeProps) {
  const getBaseStyles = () => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: 'color-mix(in srgb, var(--color-main) 15%, transparent)',
          color: 'var(--color-light)',
          border: '1px solid color-mix(in srgb, var(--color-main) 30%, transparent)',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
        };
      case 'ghost':
        return {
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border)',
        };
      case 'success':
        return {
          backgroundColor: 'color-mix(in srgb, #4ade80 15%, transparent)',
          color: '#4ade80',
          border: '1px solid color-mix(in srgb, #4ade80 30%, transparent)',
        };
      case 'warning':
        return {
          backgroundColor: 'color-mix(in srgb, #facc15 15%, transparent)',
          color: '#facc15',
          border: '1px solid color-mix(in srgb, #facc15 30%, transparent)',
        };
      case 'error':
        return {
          backgroundColor: 'color-mix(in srgb, #f87171 15%, transparent)',
          color: '#f87171',
          border: '1px solid color-mix(in srgb, #f87171 30%, transparent)',
        };
      default:
        return {};
    }
  };

  return (
    <span
      className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase rounded-lg ${className}`}
      style={{ ...getBaseStyles(), ...style }}
    >
      {children}
    </span>
  );
}
