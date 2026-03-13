import React from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ConfirmButton } from '../ui/ConfirmButton'
import { Competence, Stat } from '../../types'
import { formatLabelModif, formatLabelEffet } from '../../utils/formatters'

interface CompetenceCardProps {
  competence: Competence
  stats: Stat[]
  isActive?: boolean
  onClick: (comp: Competence) => void
  onEdit?: (comp: Competence) => void
  onDelete?: (id: string) => void
  onUse?: (comp: Competence) => void
  onToggle?: (comp: Competence) => void
  isAdmin?: boolean
}

export const CompetenceCard: React.FC<CompetenceCardProps> = ({
  competence,
  stats,
  isActive,
  onClick,
  onEdit,
  onDelete,
  onUse,
  onToggle,
  isAdmin = false
}) => {
  return (
    <Card hoverEffect className="group flex flex-col h-full cursor-pointer p-5 relative overflow-hidden" onClick={() => onClick(competence)}>
      {/* Overlay pour le clic sur le détail */}
      <div className="absolute inset-0 z-0 cursor-pointer" />
      
      <div className="relative z-10 flex justify-between items-start mb-3">
        <h3 className="font-bold leading-tight text-lg truncate pr-2 text-white">{competence.nom}</h3>
        <Badge variant="ghost" className="shrink-0 text-[10px] uppercase">
          {competence.type === 'active' ? 'Active' : competence.type === 'passive_auto' ? 'Auto' : 'Toggle'}
        </Badge>
      </div>

      <p className="relative z-10 text-xs opacity-60 line-clamp-2 mb-4 italic">"{competence.description}"</p>

      <div className="relative z-10 mt-auto flex flex-col gap-3">
        <div className="flex flex-wrap gap-1">
          {competence.modificateurs?.slice(0, 2).map((m, i) => (
            <Badge key={`m-${i}`} variant="default" className="text-[8px] py-0.5 px-1.5 font-black bg-main/10 text-main border-main/10 uppercase truncate max-w-full">
              {formatLabelModif(m, stats)}
            </Badge>
          ))}
          {competence.effets_actifs?.slice(0, 2).map((e, i) => (
            <Badge key={`e-${i}`} variant={e.est_jet_de ? 'warning' : e.est_cout ? 'error' : 'success'} className="text-[8px] py-0.5 px-1.5 font-black uppercase truncate max-w-full">
              {formatLabelEffet(e, stats)}
            </Badge>
          ))}
          {(!competence.modificateurs || competence.modificateurs.length === 0) && (!competence.effets_actifs || competence.effets_actifs.length === 0) && (
            <span className="text-[8px] opacity-20 italic">Aucun effet</span>
          )}
        </div>

        <div className="relative z-20">
          {isAdmin ? (
            <div className="flex gap-2">
              {onEdit && (
                <Button size="sm" variant="secondary" className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest" onClick={(e) => { e.stopPropagation(); onEdit(competence); }}>
                  ✏️ Modifier
                </Button>
              )}
              {onDelete && (
                <ConfirmButton variant="ghost" size="sm" onConfirm={() => onDelete(competence.id)} className="text-red-400 hover:bg-red-500/10 py-2 px-3">
                  🗑️
                </ConfirmButton>
              )}
            </div>
          ) : (
            <>
              {competence.type === 'active' && onUse && (
                <Button size="sm" className="w-full py-2 text-[10px] font-black uppercase tracking-widest" onClick={(e) => { e.stopPropagation(); onUse(competence); }}>
                  ⚡ Utiliser
                </Button>
              )}
              {competence.type === 'passive_toggle' && onToggle && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggle(competence); }}
                  className={`w-full py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    isActive 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-white/5 text-white/30 border border-white/10'
                  }`}
                >
                  {isActive ? '🟢 ACTIF' : '⚫ INACTIF'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
