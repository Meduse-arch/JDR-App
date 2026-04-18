import { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  label?: string;
}

export function Input({ icon, label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full font-garamond">
      {label && (
        <label className="text-[10px] font-cinzel font-black uppercase opacity-40 ml-1">
          {label}
        </label>
      )}
      <div className="relative w-full">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-theme-main">
            {icon}
          </span>
        )}
        <input
          className={`w-full bg-black/20 border border-theme/30 rounded-sm px-4 py-3 outline-none transition-all focus:border-theme-main font-bold text-sm ${
            icon ? 'pl-12' : ''
          } ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}
