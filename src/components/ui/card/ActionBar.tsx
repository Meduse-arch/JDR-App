import { Button } from '../Button'
import { ConfirmButton } from '../ConfirmButton'
import { Edit2, Trash2, Plus, X, Zap, Circle, Star } from 'lucide-react'

interface ActionBarProps {
  // Mode admin/forge
  onEdit?: () => void
  onDelete?: () => void
  // Mode attribuer
  onAdd?: () => void
  onRemove?: () => void
  isAdded?: boolean
  // Mode joueur compétence
  onUse?: () => void
  onToggle?: () => void
  isActive?: boolean
  competenceType?: 'active' | 'passive_toggle' | 'passive_auto' | string
  // Mode joueur item
  onUtiliser?: () => void
  onEquiper?: () => void
  isEquipe?: boolean
  isConsommable?: boolean
  // Mode joueur quête
  onSuivre?: () => void
  isSuivie?: boolean
  // Réouvrir quête
  onReouvrir?: () => void
  showReouvrir?: boolean
}

export function ActionBar({
  onEdit, onDelete,
  onAdd, onRemove, isAdded,
  onUse, onToggle, isActive, competenceType,
  onUtiliser, onEquiper, isEquipe, isConsommable,
  onSuivre, isSuivie,
  onReouvrir, showReouvrir
}: ActionBarProps) {
  const hasAnyAction = onEdit || onDelete || onAdd || onRemove ||
    onUse || onToggle || onUtiliser || onEquiper || onSuivre || showReouvrir

  if (!hasAnyAction) return null

  return (
    <div className="border-t border-theme/10 p-3 flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
      
      {/* MODE ADMIN : Modifier + Supprimer */}
      {(onEdit || onDelete) && (
        <>
          {onEdit && (
            <Button size="sm" variant="secondary"
              className="flex-1 py-2 text-[10px] font-cinzel font-black uppercase tracking-widest"
              onClick={onEdit}>
              <Edit2 size={12} className="mr-2" /> Modifier
            </Button>
          )}
          {onDelete && (
            <ConfirmButton variant="danger" size="sm" onConfirm={onDelete} className="py-2 px-3 h-auto">
              <Trash2 size={14} />
            </ConfirmButton>
          )}
        </>
      )}

      {/* MODE ATTRIBUER : Ajouter */}
      {onAdd && !isAdded && (
        <button onClick={onAdd}
          className="w-full py-2.5 rounded-sm text-[10px] font-cinzel font-black uppercase tracking-widest border border-theme-main/30 bg-theme-main/10 text-theme-main hover:bg-theme-main/20 transition-all flex items-center justify-center gap-2">
          <Plus size={12} /> Ajouter
        </button>
      )}

      {/* MODE ATTRIBUER : Retirer */}
      {onRemove && (
        <button onClick={onRemove}
          className="w-full py-2.5 rounded-sm text-[10px] font-cinzel font-black uppercase tracking-widest border border-red-900/30 bg-red-900/10 text-red-400 hover:bg-red-900/30 transition-all flex items-center justify-center gap-2">
          <X size={12} /> Retirer
        </button>
      )}

      {/* MODE JOUEUR COMPÉTENCE : Invoquer ou Toggle */}
      {competenceType === 'active' && onUse && (
        <Button size="sm" className="w-full py-3 text-[10px] font-cinzel font-black uppercase tracking-widest" onClick={onUse}>
          <Zap size={12} className="mr-2" /> Invoquer
        </Button>
      )}
      {competenceType === 'passive_toggle' && onToggle && (
        <button onClick={onToggle}
          className={`w-full py-3 rounded-sm font-cinzel font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
            isActive
              ? 'bg-theme-main text-white border-theme-dark shadow-md'
              : 'bg-black/40 text-primary/30 border-theme/20 hover:text-primary hover:bg-black/60'
          }`}>
          <Circle size={10} className={isActive ? 'fill-current' : ''} />
          {isActive ? 'Aura Active' : "Éveiller l'Aura"}
        </button>
      )}

      {/* MODE JOUEUR ITEM : Utiliser ou Équiper */}
      {isConsommable && onUtiliser && (
        <button onClick={onUtiliser}
          className="w-full py-2.5 rounded-sm text-[10px] font-cinzel font-black uppercase tracking-widest text-white transition-all hover:brightness-110 active:scale-95 bg-theme-main shadow-md border border-theme-dark">
          Utiliser
        </button>
      )}
      {!isConsommable && onEquiper && (
        <button onClick={onEquiper}
          className={`w-full py-2.5 rounded-sm text-[10px] font-cinzel font-black uppercase tracking-widest transition-all active:scale-95 border ${
            isEquipe
              ? 'bg-theme-dark text-white border-theme-main shadow-inner'
              : 'bg-black/40 text-primary/60 border-theme/20 hover:text-primary hover:bg-black/60'
          }`}>
          {isEquipe ? 'DÉSÉQUIPER' : 'ÉQUIPER'}
        </button>
      )}

      {/* MODE JOUEUR QUÊTE : Suivre */}
      {onSuivre && (
        <button onClick={onSuivre}
          className={`p-2 rounded-sm transition-all border ${
            isSuivie
              ? 'text-theme-main border-theme-main/30 bg-theme-main/10'
              : 'text-primary/20 border-theme/10 bg-black/20 hover:text-primary/60'
          }`}>
          <Star size={14} className={isSuivie ? 'fill-current' : ''} />
        </button>
      )}

      {/* RÉOUVRIR QUÊTE */}
      {showReouvrir && onReouvrir && (
        <button onClick={onReouvrir}
          className="flex-1 py-2 font-cinzel text-[9px] text-theme-main/40 hover:text-theme-main transition-all uppercase tracking-widest flex items-center justify-center gap-1.5 border border-theme/10 rounded-sm hover:border-theme-main/30">
          ↺ Réouvrir
        </button>
      )}
    </div>
  )
}
