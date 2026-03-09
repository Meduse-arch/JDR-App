import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function Card({ children, className = '', hoverEffect = false, ...props }: CardProps) {
  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col gap-3 transition-all duration-300 ${
        hoverEffect ? 'hover:-translate-y-1 hover:shadow-lg' : ''
      } ${className}`}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
