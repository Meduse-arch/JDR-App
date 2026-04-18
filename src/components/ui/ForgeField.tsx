interface ForgeFieldProps {
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select';
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  options?: { value: string; label: string }[];
  className?: string;
  min?: number;
  max?: number;
}

export function ForgeField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  options,
  className = '',
  min,
  max
}: ForgeFieldProps) {
  const inputClass = "w-full bg-transparent border-b border-theme/20 py-2 outline-none focus:border-theme-main transition-all font-garamond italic text-lg text-primary placeholder:opacity-20 shadow-none";
  const labelClass = "text-[10px] font-cinzel font-black uppercase tracking-[0.2em] text-theme-main/60 mb-1 block";

  return (
    <div className={`flex flex-col ${className}`}>
      <label className={labelClass}>{label}</label>
      
      {type === 'textarea' ? (
        <textarea
          className={`${inputClass} min-h-[120px] resize-none overflow-hidden`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : type === 'select' ? (
        <select
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
        />
      )}
    </div>
  );
}
