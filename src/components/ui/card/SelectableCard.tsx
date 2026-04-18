import { HTMLAttributes, ReactNode } from 'react'
import { Check } from 'lucide-react'
import { Card } from './Card'

interface SelectableCardProps extends HTMLAttributes<HTMLDivElement> {
  isSelected?: boolean
  isActive?: boolean        // pour les compétences toggle (aura active)
  children: ReactNode
  className?: string
  showCheckmark?: boolean
}

export function SelectableCard({ isSelected, isActive, children, className = '', showCheckmark = true, onClick, ...props }: SelectableCardProps) {
  return (
    <div className="relative" onClick={onClick}>
      <Card
        variant="medieval"
        className={`cursor-pointer transition-all duration-300 h-full
          ${isSelected
            ? 'border-theme-main bg-theme-main/10 scale-[1.02] shadow-[0_0_20px_rgba(var(--color-main-rgb),0.2)]'
            : 'border-theme/20 bg-card hover:border-theme-main/30'
          }
          ${isActive ? 'ring-1 ring-theme-main/40' : ''}
          ${className}`}
        {...props}
      >
        {children}
      </Card>
      {isSelected && showCheckmark && (
        <div className="absolute -top-2 -right-2 bg-theme-main text-white p-1.5 rounded-full shadow-lg z-30 animate-in zoom-in-50">
          <Check size={12} strokeWidth={4} />
        </div>
      )}
    </div>
  )
}
