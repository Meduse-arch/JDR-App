import React from 'react'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { Competence, Stat } from '../../../types'
import { formatLabelModif, formatLabelEffet } from '../../../utils/formatters'
import { Zap, Edit2, Circle } from 'lucide-react'
import { ModalContainer } from './ModalContainer'

interface CompetenceDetailModalProps {
  competence: Competence
  onClose: () => void
  stats: Stat[]
  isActive?: boolean
  onEdit?: (comp: Competence) => void
  onDelete?: (id: string) => void
  onUse?: (comp: Competence) => void
  onToggle?: (comp: Competence) => void
  isAdmin?: boolean
}

export const CompetenceDetailModal: React.FC<CompetenceDetailModalProps> = ({
  competence,
  onClose,
  stats,
  isActive,
  onEdit,
  onUse,
  onToggle,
  isAdmin = false
}) => {
  const isPassiveAuto = competence.type === 'passive_auto'
  const isPassiveToggle = competence.type === 'passive_toggle'
  const isActiveType = competence.type === 'active'

  const hasMechanics = (competence.modificateurs?.length || 0) > 0 || (competence.effets_actifs?.length || 0) > 0 || (isPassiveAuto && (competence.tags?.length || 0) > 0)

  return (
    <ModalContainer onClose={onClose} className="max-w-lg">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-cinzel font-black uppercase tracking-widest text-primary">
          {competence.nom}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`font-cinzel text-[10px] tracking-[0.2em] px-2 py-0.5 uppercase ${
            isActiveType ? 'bg-theme-main/20 text-theme-main' :
            isPassiveAuto ? 'bg-blue-500/20 text-blue-400' :
            'bg-purple-500/20 text-purple-400'
          }`}>
            {isActiveType ? 'Actif' : isPassiveAuto ? 'Automatique' : 'Basculable'}
          </div>
          <div className="flex gap-2">
            {competence.tags?.map(t => (
              <span key={t.id} className="text-[9px] font-cinzel opacity-40 uppercase tracking-widest">
                #{t.nom}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-linear-to-r from-transparent via-theme-main/20 to-transparent" />

      <div className="bg-black/20 p-4 rounded-sm border-l-4 border-theme-main/40 max-h-40 overflow-y-auto custom-scrollbar">
        <p className="font-garamond text-lg italic text-secondary leading-relaxed">
          "{competence.description || "Nulle incantation ne trouble encore le silence..."}"
        </p>
      </div>
      
      <div className="flex flex-col gap-2">
        <h4 className="font-cinzel text-xs uppercase tracking-[0.2em] text-theme-main opacity-60">
          Mécaniques
        </h4>
        <div className="flex flex-wrap gap-2">
          {competence.modificateurs?.map((m, i) => (
            <Badge 
              key={`m-${i}`} 
              variant="default" 
              className="bg-theme-main/10 text-theme-main border-theme-main/20"
            >
              {formatLabelModif(m, stats)}
            </Badge>
          ))}
          {competence.effets_actifs?.map((e, i) => (
            <Badge 
              key={`e-${i}`} 
              variant={e.est_jet_de ? 'warning' : e.est_cout ? 'error' : 'success'}
            >
              {formatLabelEffet(e, stats)}
            </Badge>
          ))}
          {isPassiveAuto && competence.tags && competence.tags.length > 0 && (
            <Badge variant="warning" className="gap-1.5">
              <Zap size={10} />
              Déclenché par : {competence.tags.map(t => t.nom).join(', ')}
            </Badge>
          )}
          {!hasMechanics && (
            <span className="font-garamond italic opacity-30 text-sm">
              Aucune mécanique particulière.
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-2">
        {isAdmin ? (
          <Button 
            variant="secondary" 
            onClick={() => { onEdit?.(competence); onClose(); }} 
            className="flex-1 gap-2"
          >
            <Edit2 size={14} /> Modifier
          </Button>
        ) : (
          <>
            {isActiveType && onUse && (
              <Button 
                variant="primary"
                className="flex-1 gap-2 py-3" 
                onClick={() => onUse(competence)}
              >
                <Zap size={14} /> Utiliser
              </Button>
            )}
            {isPassiveToggle && onToggle && (
              <Button
                variant={isActive ? 'active' : 'secondary'}
                onClick={() => onToggle(competence)}
                className="flex-1 py-3 gap-2"
              >
                <Circle size={14} className={isActive ? 'fill-current' : ''} />
                {isActive ? 'Aura Active' : "Éveiller l'Aura"}
              </Button>
            )}
          </>
        )}
      </div>
    </ModalContainer>
  )
}

export default CompetenceDetailModal
