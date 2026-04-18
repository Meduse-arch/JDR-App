import React from 'react'
import { SelectableCard } from './SelectableCard'
import { ActionBar } from './ActionBar'
import { Badge } from '../Badge'
import { Competence, Stat } from '../../../types'
import { formatLabelModif, formatLabelEffet } from '../../../utils/formatters'
import { Zap, CircleDot } from 'lucide-react'

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
  onToggle
}) => {
  return (
    <SelectableCard 
      isActive={isActive}
      showCheckmark={false}
      className="group flex flex-col h-full cursor-pointer p-6 relative rounded-sm bg-card/40 backdrop-blur-md" 
      onClick={() => onClick(competence)}
    >
      <div className="absolute inset-0 z-0 cursor-pointer" />
      
      <div className="relative z-10 flex flex-col mb-4">
        <h3 className="font-cinzel font-black uppercase tracking-widest text-lg truncate pr-2 text-primary">
          {competence.nom}
        </h3>
        
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {/* Active/Passive indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-black/40 border border-theme/10">
            {competence.type === 'active' ? (
              <><Zap size={10} className="text-theme-main" /> <span className="text-[8px] font-cinzel text-theme-main uppercase tracking-widest font-bold">Actif</span></>
            ) : (
              <><CircleDot size={10} className="text-blue-400" /> <span className="text-[8px] font-cinzel text-blue-400 uppercase tracking-widest font-bold">Passif</span></>
            )}
          </div>

          {/* Tags */}
          {competence.tags && competence.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {competence.tags.map(t => (
                <span key={t.id} className="text-[8px] font-cinzel opacity-40 uppercase tracking-tighter">#{t.nom}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="relative z-10 text-[11px] font-garamond opacity-60 line-clamp-3 mb-6 italic leading-relaxed">
        "{competence.description}"
      </p>

      {competence.type === 'passive_auto' && competence.tags && competence.tags.length > 0 && (
        <div className="relative z-10 mb-6">
          <Badge variant="warning" className="text-[7px] py-0.5 px-2 uppercase animate-pulse font-cinzel flex items-center gap-1 w-fit bg-theme-main/10 text-theme-main border-theme-main/20">
            <Zap size={8} /> SI {competence.tags.map(t => t.nom).join(', ')}
          </Badge>
        </div>
      )}

      <div className="relative z-10 mt-auto flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {competence.modificateurs?.slice(0, 2).map((m, i) => (
            <Badge key={`m-${i}`} variant="default" className="text-[8px] py-1 px-2 font-cinzel font-black bg-theme-main/10 text-theme-main border-theme-main/20 uppercase truncate max-w-full">
              {formatLabelModif(m, stats)}
            </Badge>
          ))}
          {competence.effets_actifs?.slice(0, 2).map((e, i) => (
            <Badge key={`e-${i}`} variant={e.est_jet_de ? 'warning' : e.est_cout ? 'error' : 'success'} className="text-[8px] py-1 px-2 font-cinzel font-black uppercase truncate max-w-full">
              {formatLabelEffet(e, stats)}
            </Badge>
          ))}
        </div>

        <ActionBar
          onEdit={onEdit ? () => onEdit(competence) : undefined}
          onDelete={onDelete ? () => onDelete(competence.id) : undefined}
          onUse={onUse ? () => onUse(competence) : undefined}
          onToggle={onToggle ? () => onToggle(competence) : undefined}
          isActive={isActive}
          competenceType={competence.type}
        />
      </div>
    </SelectableCard>
  )
}
