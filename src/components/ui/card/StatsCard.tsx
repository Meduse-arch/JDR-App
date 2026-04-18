import { ReactNode } from 'react'
import { Card } from './Card'

interface StatsCardProps {
  label: string
  value: number
  delta?: number
  onChange?: (delta: number) => void
  onInputChange?: (val: string) => void
  inputValue?: string
  color?: string            // ex: 'text-red-400' pour PV
  bg?: string               // ex: 'bg-red-500/10'
  border?: string           // ex: 'border-red-500/20'
  icon?: ReactNode
  preview?: boolean         // mode aperçu sans contrôles
}

export function StatsCard({ label, value, delta = 0, onChange, onInputChange, inputValue = '', color, bg, border, icon, preview = false }: StatsCardProps) {
  const isChanged = delta !== 0
  const finalVal = value + delta

  return (
    <Card
      variant="medieval"
      className={`p-5 flex-col gap-4 ${bg || ''} ${border ? 'border ' + border : ''}`}
    >
      <div className="flex justify-between items-center">
        <span className={`text-xs font-cinzel font-black uppercase tracking-widest opacity-40 flex items-center gap-2 ${color || ''}`}>
          {icon} {label}
        </span>
        <div className="flex flex-col items-end">
          <span className={`text-3xl font-black font-cinzel ${isChanged ? 'text-theme-main animate-pulse' : 'text-primary'}`}>
            {preview ? value : finalVal}
          </span>
          {isChanged && (
            <span className={`text-xs font-bold font-cinzel ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
              ({delta > 0 ? '+' : ''}{delta})
            </span>
          )}
        </div>
      </div>

      {!preview && onChange && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(-1)}
            className="w-12 h-12 flex items-center justify-center border border-theme bg-surface text-secondary hover:text-theme-main hover:bg-card-hover transition-all font-black text-base"
          >−</button>
          <input
            type="text"
            placeholder="±0"
            value={inputValue}
            onChange={e => onInputChange?.(e.target.value)}
            className={`flex-1 bg-input-theme border border-theme text-center font-cinzel font-black text-sm py-1.5 outline-none focus:border-theme-main/40 transition-all
              ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-secondary'}`}
          />
          <button
            onClick={() => onChange(1)}
            className="w-12 h-12 flex items-center justify-center border border-theme bg-surface text-secondary hover:text-theme-main hover:bg-card-hover transition-all font-black text-base"
          >+</button>
        </div>
      )}
    </Card>
  )
}
