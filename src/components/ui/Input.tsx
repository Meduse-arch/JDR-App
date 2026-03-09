import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  className?: string;
}

export function Input({ icon, className = '', ...props }: InputProps) {
  return (
    <div className="relative group flex-1 w-full">
      {icon && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity">
          {icon}
        </span>
      )}
      <input
        className={`w-full py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-blue-500/20 ${
          icon ? 'pl-11 pr-4' : 'px-4'
        } ${className}`}
        style={{
          backgroundColor: 'var(--bg-input)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
        {...props}
      />
    </div>
  );
}
