import React from 'react'
import { InventaireEntry, Item, Stat } from '../../../types'
import { Button } from '../Button'
import { ModalContainer } from './ModalContainer'
import { Badge } from '../Badge'
import { formatLabelModif, formatLabelEffet } from '../../../utils/formatters'
import { Edit2 } from 'lucide-react'

interface ItemDetailModalProps {
  item: Item | InventaireEntry | null
  onClose: () => void
  mode?: 'forge' | 'gerer' | 'joueur'
  stats: Stat[]
  isAdmin?: boolean
  onEdit?: (item: Item) => void
  onDelete?: (id: string) => void
  onUtiliser?: (entry: InventaireEntry) => void
  onEquiper?: (entry: InventaireEntry) => void
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  onClose,
  mode = 'joueur',
  stats = [],
  isAdmin = false,
  onEdit,
  onUtiliser,
  onEquiper
}) => {
  if (!item) return null

  const isEntry = (item as any).items !== undefined;
  const actualItem = isEntry ? (item as InventaireEntry).items : (item as Item)
  const entry = isEntry ? (item as InventaireEntry) : null

  const hasMechanics = (actualItem.modificateurs?.length || 0) > 0 || (actualItem.effets_actifs?.length || 0) > 0

  return (
    <ModalContainer onClose={onClose} className="max-w-lg">
      <div className="flex gap-4 items-start">
        <div className="flex-1 flex flex-col gap-2">
          <h3 className="text-2xl font-cinzel font-black uppercase tracking-widest text-primary">
            {actualItem.nom}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="font-cinzel text-[10px] tracking-[0.2em] px-2 py-0.5 uppercase bg-theme-main/20 text-theme-main">
              {actualItem.categorie}
            </div>
            
            {actualItem.tags && actualItem.tags.length > 0 && (
              <div className="flex gap-2">
                {actualItem.tags.map(t => (
                  <span key={t.id} className="text-[9px] font-cinzel opacity-40 uppercase tracking-widest">
                    #{t.nom}
                  </span>
                ))}
              </div>
            )}

            {entry && entry.quantite > 1 && (
              <div className="font-cinzel text-[10px] px-2 py-0.5 bg-white/5 text-theme-main/50 rounded-sm">
                ×{entry.quantite}
              </div>
            )}
          </div>
        </div>

        {actualItem.image_url && (
          <div className="w-20 h-20 shrink-0 rounded-sm overflow-hidden border border-theme-main/30 bg-black/40 shadow-xl">
            <img 
              src={actualItem.image_url} 
              alt={actualItem.nom} 
              className="w-full h-full object-cover" 
            />
          </div>
        )}
      </div>

      <div className="h-px w-full bg-linear-to-r from-transparent via-theme-main/20 to-transparent" />

      <div className="bg-black/20 p-4 rounded-sm border-l-4 border-theme-main/40 max-h-40 overflow-y-auto custom-scrollbar">
        <p className="font-garamond text-lg italic text-secondary leading-relaxed">
          "{actualItem.description || "Une relique nimbée de mystère..."}"
        </p>
      </div>

      {hasMechanics && (
        <div className="flex flex-col gap-2">
          <h4 className="font-cinzel text-xs uppercase tracking-[0.2em] text-theme-main opacity-60">
            Mécaniques
          </h4>
          <div className="flex flex-wrap gap-2">
            {actualItem.modificateurs?.map((m, i) => (
              <Badge 
                key={`m-${i}`} 
                variant="default" 
                className="bg-theme-main/10 text-theme-main border-theme-main/20"
              >
                {formatLabelModif(m, stats)}
              </Badge>
            ))}
            {actualItem.effets_actifs?.map((e, i) => (
              <Badge 
                key={`e-${i}`} 
                variant={e.est_jet_de ? 'warning' : e.est_cout ? 'error' : 'success'}
              >
                {formatLabelEffet(e, stats)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mt-2">
        {isAdmin ? (
          <Button 
            variant="secondary" 
            onClick={() => { onEdit?.(actualItem); onClose(); }} 
            className="flex-1 gap-2"
          >
            <Edit2 size={14} /> Modifier
          </Button>
        ) : (
          mode === 'joueur' && entry && (
            actualItem.categorie === 'Consommable' ? (
              <Button 
                variant="primary"
                className="w-full py-3 uppercase text-xs tracking-widest" 
                onClick={() => { onUtiliser?.(entry); onClose(); }}
              >
                Utiliser la Relique
              </Button>
            ) : (
              <Button 
                variant={entry.equipe ? 'secondary' : 'primary'}
                className="w-full py-3 uppercase text-xs tracking-widest"
                onClick={() => { onEquiper?.(entry); onClose(); }}
              >
                {entry.equipe ? 'Déposer l\'équipement' : 'S\'équiper de la relique'}
              </Button>
            )
          )
        )}
      </div>
    </ModalContainer>
  )
}

export default ItemDetailModal
