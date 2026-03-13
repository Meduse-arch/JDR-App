import React from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Competence, Stat } from '../../types'
import { formatLabelModif, formatLabelEffet } from '../../utils/formatters'

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
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 cursor-pointer" onClick={onClose}>
      <Card className="max-w-xl w-full p-8 gap-6 shadow-2xl border-main/30 animate-in zoom-in duration-200 relative overflow-hidden cursor-default" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-main" />
        <div className="flex justify-between border-b border-white/5 pb-4">
          <div>
            <Badge className="mb-2 uppercase text-[10px]" variant="outline">
              {competence.type === 'active' ? 'Active' : competence.type === 'passive_auto' ? 'Passif (Auto)' : 'Passif (Toggle)'}
            </Badge>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{competence.nom}</h3>
          </div>
          <button className="text-2xl opacity-20 hover:opacity-100 transition-opacity" onClick={onClose}>✕</button>
        </div>
        <p className="text-sm opacity-80 whitespace-pre-wrap italic bg-white/5 p-4 rounded-xl border border-white/5">"{competence.description}"</p>
        
        <div className="flex flex-col gap-4">
          <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Effets & Coûts :</p>
          <div className="flex flex-wrap gap-2">
            {competence.modificateurs?.map((m, i) => (
              <Badge key={`m-${i}`} variant="default" className="text-xs py-1 px-2 font-black bg-main/10 text-main border-main/20 uppercase">
                {formatLabelModif(m, stats)}
              </Badge>
            ))}
            {competence.effets_actifs?.map((e, i) => (
              <Badge key={`e-${i}`} variant={e.est_jet_de ? 'warning' : e.est_cout ? 'error' : 'success'} className="text-xs py-1 px-2 font-black uppercase">
                {formatLabelEffet(e, stats)}
              </Badge>
            ))}
            {(!competence.modificateurs || competence.modificateurs.length === 0) && (!competence.effets_actifs || competence.effets_actifs.length === 0) && (
              <span className="text-xs opacity-20 italic">Aucun effet</span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          {isAdmin ? (
            <>
              {onEdit && <Button variant="secondary" onClick={() => { onEdit(competence); onClose(); }}>✏️ Modifier</Button>}
            </>
          ) : (
            <>
              {competence.type === 'active' && onUse && (
                <Button className="flex-1" onClick={() => onUse(competence)}>⚡ Utiliser la compétence</Button>
              )}
              {competence.type === 'passive_toggle' && onToggle && (
                <button
                  onClick={() => onToggle(competence)}
                  className={`flex-1 py-4 rounded-xl font-black text-sm uppercase transition-all ${
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
      </Card>
    </div>
  )
}
