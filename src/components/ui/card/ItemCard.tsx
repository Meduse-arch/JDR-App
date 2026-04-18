import { InventaireEntry, Modificateur, EffetActif, CategorieItem } from '../../../types';
import { SelectableCard } from './SelectableCard';
import { ActionBar } from './ActionBar';
import { Badge } from '../Badge';
import { Sword, Shield, Gem, FlaskConical, Sparkles, Package } from 'lucide-react';

interface ItemCardProps {
  entry: InventaireEntry;
  onUtiliser?: (entry: InventaireEntry) => void;
  onEquiper?: (entry: InventaireEntry) => void;
  onClick?: (entry: InventaireEntry) => void;
  onEdit?: (item: any) => void;
  onDelete?: (id: string) => void;
  labelModif: (m: Modificateur) => string;
  labelEffet: (e: EffetActif) => string;
  modifs: Modificateur[];
}

export function ItemCard({
  entry, onUtiliser, onEquiper, onClick, onEdit, onDelete, labelModif, labelEffet, modifs,
}: ItemCardProps) {
  const item = entry.items;
  const estConsommable = item.categorie === 'Consommable';
  const hasActions = !!onUtiliser || !!onEquiper;
  // Show quantity ONLY if > 1 AND we are in Player mode (actions present)
  const showQuantity = entry.quantite > 1 && hasActions;

  const getIcon = (cat: CategorieItem) => {
    switch (cat) {
      case 'Arme': return <Sword size={14} />;
      case 'Armure': return <Shield size={14} />;
      case 'Bijou': return <Gem size={14} />;
      case 'Consommable': return <FlaskConical size={14} />;
      case 'Artéfact': return <Sparkles size={14} />;
      default: return <Package size={14} />;
    }
  };

  return (
    <SelectableCard
      onClick={() => onClick?.(entry)}
      showCheckmark={false}
      className={`flex flex-col h-full min-h-[320px] cursor-pointer rounded-sm 
        bg-card/40 backdrop-blur-md border-2 overflow-hidden p-0
        ${entry.equipe && hasActions ? 'border-theme-main' : 'border-theme/20 hover:border-theme-main/50'}`}
    >
      {/* Barre dorée équipé */}
      {entry.equipe && hasActions && (
        <div className="absolute top-0 right-0 w-1 h-full bg-theme-main shadow-[0_0_10px_var(--color-main)]" />
      )}

      {/* CONTENU SCROLLABLE */}
      <div className="flex flex-col gap-3 p-4 flex-1 overflow-hidden">
        
        {/* Header : catégorie + équipé/quantité */}
        <div className="flex justify-between items-start">
          <Badge
            variant="outline"
            className="text-[9px] font-cinzel font-black uppercase tracking-widest px-2 py-1 bg-black/40 flex items-center gap-2 border-none text-theme-main"
          >
            {getIcon(item.categorie as CategorieItem)}
            {item.categorie}
          </Badge>
          <div className="flex items-center gap-2">
            {entry.equipe && hasActions && (
              <Badge variant="default" className="bg-theme-main text-white text-[8px] font-cinzel px-1.5 py-0.5 animate-pulse">ÉQUIPÉ</Badge>
            )}
            {showQuantity && (
              <span className="font-cinzel font-black text-xs px-2 py-1 rounded-sm opacity-60 text-primary bg-black/20 border border-theme/30">
                x{entry.quantite}
              </span>
            )}
          </div>
        </div>

        {/* Nom + tags */}
        <div>
          <h3 className="font-cinzel font-black text-lg uppercase text-primary leading-tight tracking-widest group-hover:text-theme-main transition-colors line-clamp-2">
            {item.nom}
          </h3>
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.tags.map(t => (
                <span key={t.id} className="text-[8px] font-cinzel opacity-40 uppercase tracking-tighter">#{t.nom}</span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-sm font-garamond italic opacity-70 leading-relaxed line-clamp-2">
            "{item.description}"
          </p>
        )}

        {/* Badges effets — max 3 puis "..." */}
        <div className="flex flex-wrap gap-1.5">
          {[...modifs, ...(item.effets_actifs || [])].slice(0, 3).map((effect: any, i) => {
            const isModif = 'id_stat' in effect
            return (
              <Badge
                key={i}
                variant="default"
                className={`text-[9px] py-0.5 px-2 font-cinzel font-black uppercase ${
                  isModif
                    ? 'bg-theme-main/10 text-theme-main border-theme-main/20'
                    : 'bg-blue-900/20 text-blue-400 border-blue-900/20'
                }`}
              >
                {isModif ? labelModif(effect as any) : labelEffet(effect as any)}
              </Badge>
            )
          })}
          {([...modifs, ...(item.effets_actifs || [])].length > 3) && (
            <Badge variant="outline" className="text-[9px] py-0.5 px-2 font-cinzel opacity-40">
              +{[...modifs, ...(item.effets_actifs || [])].length - 3} autres
            </Badge>
          )}
        </div>
      </div>

      {/* PIED DE CARTE — toujours visible */}
      <ActionBar
        onEdit={onEdit ? () => onEdit(item) : undefined}
        onDelete={onDelete ? () => onDelete(item.id) : undefined}
        onUtiliser={onUtiliser ? () => onUtiliser(entry) : undefined}
        onEquiper={onEquiper ? () => onEquiper(entry) : undefined}
        isEquipe={entry.equipe}
        isConsommable={estConsommable}
      />
    </SelectableCard>
  )
}
