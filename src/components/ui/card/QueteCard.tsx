import { forwardRef } from 'react'
import { Quete } from '../../../types'
import { SelectableCard } from './SelectableCard'
import { ActionBar } from './ActionBar'
import { Badge } from '../Badge'
import { Scroll, CheckCircle2, XCircle, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'

interface QueteCardProps {
  quete: Quete
  onClick: (q: Quete) => void
  // Mode forge
  onEdit?: (q: Quete) => void
  onDelete?: (id: string) => void
  // Mode joueur
  onSuivre?: (q: Quete) => void
  isSuivie?: boolean
  // Mode attribuer bibliothèque
  isSelected?: boolean
  onSelect?: (id: string) => void
  // Réouvrir
  onReouvrir?: (id: string) => void
}

export const QueteCard = forwardRef<HTMLDivElement, QueteCardProps>(({ quete: q, onClick, onEdit, onDelete, onSuivre, isSuivie, isSelected, onSelect, onReouvrir }, ref) => {
  const isFinished = q.statut === 'Terminée' || q.statut === 'Échouée'
  const showReouvrir = isFinished && !!onReouvrir

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <SelectableCard
        showCheckmark={!!onSelect}
        isSelected={isSelected}
        className={`h-full flex flex-col cursor-pointer relative group bg-card/20 backdrop-blur-md border border-white/5 medieval-border transition-all hover:bg-card/40 p-0 overflow-hidden ${
          q.statut === 'Terminée' ? 'opacity-70 grayscale-[0.3]' :
          q.statut === 'Échouée' ? 'opacity-60 grayscale' :
          'border-theme-main/20 hover:border-theme-main/40'
        }`}
        onClick={() => onSelect ? onSelect(q.id) : onClick(q)}
      >
        {/* Image minimaliste en coin (optionnelle) */}
        {q.image_url && (
          <div className="absolute top-4 right-4 w-14 h-14 rounded-sm overflow-hidden border border-white/10 bg-black/40 shadow-lg z-20">
            <img 
              src={q.image_url} 
              alt={q.titre} 
              className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
            />
          </div>
        )}

        {/* CONTENU */}
        <div className="p-5 flex flex-col gap-3 flex-1">
          {/* Statut + titre */}
          <div className="flex justify-between items-start gap-4 pr-14">
            <div className="flex flex-col gap-1 overflow-hidden flex-1">
              <div className="flex items-center gap-2">
                {q.statut === 'Terminée' ? <CheckCircle2 size={14} className="text-green-500 shrink-0" /> :
                 q.statut === 'Échouée' ? <XCircle size={14} className="text-red-700 shrink-0" /> :
                 <Scroll size={14} className="text-theme-main shrink-0" />}
                <span className={`text-[9px] font-cinzel font-black uppercase tracking-widest ${
                  q.statut === 'Terminée' ? 'text-green-500/70' :
                  q.statut === 'Échouée' ? 'text-red-700/70' :
                  'text-theme-main/70'
                }`}>{q.statut}</span>
              </div>
              <h3 className={`font-cinzel font-black text-lg uppercase tracking-widest leading-tight ${
                q.statut === 'Terminée' ? 'line-through opacity-50' : 'text-primary group-hover:text-theme-main transition-colors'
              }`}>{q.titre}</h3>
            </div>
          </div>

          {/* Description */}
          <p className="font-garamond italic text-secondary text-sm line-clamp-3 leading-relaxed opacity-70">
            "{q.description || 'Les parchemins sont vierges...'}"
          </p>

          {/* Récompenses */}
          {(q.quete_recompenses?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2 mt-auto pt-2">
              {q.quete_recompenses?.slice(0, 2).map((r: any, i: number) => (
                <Badge key={i} variant="default" className="text-[8px] font-cinzel bg-theme-main/5 text-theme-main/60 border-theme-main/10 py-0.5">
                  <Trophy size={8} className="mr-1 opacity-40" />
                  {r.type === 'Item' ? (r.items?.nom || 'Objet') : r.description}
                </Badge>
              ))}
              {(q.quete_recompenses?.length || 0) > 2 && (
                <Badge variant="outline" className="text-[8px] opacity-30">
                  +{q.quete_recompenses!.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* ACTION BAR */}
        <ActionBar
          onEdit={onEdit ? () => onEdit(q) : undefined}
          onDelete={onDelete ? () => onDelete(q.id) : undefined}
          onSuivre={onSuivre ? () => onSuivre(q) : undefined}
          isSuivie={isSuivie}
          onReouvrir={onReouvrir ? () => onReouvrir(q.id) : undefined}
          showReouvrir={showReouvrir}
        />
      </SelectableCard>
    </motion.div>
  )
})
