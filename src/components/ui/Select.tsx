import { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`w-full px-4 py-3 rounded-xl outline-none cursor-pointer ${className}`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
      }}
      {...props}
    >
      {children}
    </select>
  );
}
