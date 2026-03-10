import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  label?: string;
}

export function Input({ icon, label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[10px] font-black uppercase opacity-40 ml-1">
          {label}
        </label>
      )}
      <div className="relative w-full">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-sm">
            {icon}
          </span>
        )}
        <input
          className={`w-full bg-surface border border-border rounded-xl px-4 py-3 outline-none transition-all focus:border-main font-bold text-sm ${
            icon ? 'pl-10' : ''
          } ${className}`}
          style={{
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border)',
          }}
          {...props}
        />
      </div>
    </div>
  );
}
