import { HTMLAttributes, ReactNode } from 'react'
import { Card } from './Card'

interface EntityCardProps extends HTMLAttributes<HTMLDivElement> {
  nom: string
  type?: string
  avatar?: ReactNode        // icône ou initiales
  badge?: ReactNode         // badge de statut
  actions?: ReactNode       // boutons d'actions (edit, delete...)
  isSelected?: boolean
  isActive?: boolean
  className?: string
}

export function EntityCard({ nom, type, avatar, badge, actions, isSelected, isActive, className = '', onClick, ...props }: EntityCardProps) {
  return (
    <Card
      variant="medieval"
      className={`flex-row items-center gap-4 p-4 cursor-pointer transition-all
        ${isSelected ? 'border-theme-main bg-theme-main/10' : 'border-theme/20 hover:border-theme-main/40'}
        ${isActive ? 'ring-1 ring-theme-main/30' : ''}
        ${className}`}
      onClick={onClick}
      {...props}
    >
      {avatar && (
        <div className="w-12 h-12 flex items-center justify-center border border-theme/20 bg-black/30 text-theme-main shrink-0">
          {avatar}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-cinzel font-bold truncate text-sm text-primary">{nom}</p>
        {type && <p className="text-[10px] font-cinzel uppercase font-black opacity-40">{type}</p>}
      </div>
      {badge}
      {actions && <div className="shrink-0 flex gap-2" onClick={e => e.stopPropagation()}>{actions}</div>}
    </Card>
  )
}
