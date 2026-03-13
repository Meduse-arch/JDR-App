import { InventaireEntry, Modificateur, EffetActif } from '../types';
import { CATEGORIE_EMOJI } from '../utils/constants';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface ItemCardProps {
  entry: InventaireEntry;
  onUtiliser?: (entry: InventaireEntry) => void;
  onEquiper?: (entry: InventaireEntry) => void;
  onClick?: (entry: InventaireEntry) => void;
  labelModif: (m: Modificateur) => string;
  labelEffet: (e: EffetActif) => string;
  modifs: Modificateur[];
}

export function ItemCard({
  entry, onUtiliser, onEquiper, onClick, labelModif, labelEffet, modifs,
}: ItemCardProps) {
  const estConsommable = entry.items.categorie === 'Consommable';

  return (
    <Card 
      onClick={() => onClick?.(entry)}
      hoverEffect
      className={`flex flex-col gap-3 group relative h-full transition-all cursor-pointer overflow-hidden ${entry.equipe ? 'border-main' : 'hover:border-main/30'}`}
      style={{
        backgroundColor: entry.equipe ? 'color-mix(in srgb, var(--color-main) 10%, var(--bg-card))' : 'var(--bg-card)',
        boxShadow: entry.equipe ? '0 0 20px var(--color-glow)' : 'none',
      }}
    >
      <div className="flex justify-between items-start">
        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter shrink-0 bg-white/5 border-white/10 text-white">
          {CATEGORIE_EMOJI[entry.items.categorie]} {entry.items.categorie}
        </Badge>
        <span className="font-black text-xs px-2 py-0.5 rounded-lg shrink-0 opacity-60 text-white"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          x{entry.quantite}
        </span>
      </div>

      <h3 className="font-black text-sm uppercase pr-4 text-white leading-tight break-words">
        {entry.items.nom}
      </h3>

      <div className="flex flex-wrap gap-1 pt-1">
        {modifs.slice(0, 2).map((m, i) => (
          <Badge key={`m-${i}`} variant="default" className="text-[8px] py-0.5 px-1.5 font-black bg-main/10 text-main border-main/10 uppercase truncate max-w-full">
            {labelModif(m)}
          </Badge>
        ))}
        {entry.items.effets_actifs?.slice(0, 2).map((e, i) => (
          <Badge key={`e-${i}`} variant="default" className="text-[8px] py-0.5 px-1.5 font-black bg-blue-500/10 text-blue-400 border-blue-500/10 uppercase truncate max-w-full">
            {labelEffet(e)}
          </Badge>
        ))}
        {((modifs.length) + (entry.items.effets_actifs?.length || 0)) > 2 && (
          <Badge variant="default" className="text-[8px] py-0.5 px-1.5 font-black bg-main/10 text-main border-main/10 uppercase">
            +{((modifs.length) + (entry.items.effets_actifs?.length || 0) - 2)}...
          </Badge>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-white/5 flex gap-2">
        {estConsommable ? (
          <button 
            onClick={(e) => { e.stopPropagation(); onUtiliser?.(entry); }}
            className="w-full py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))' }}
          >
            Utiliser
          </button>
        ) : (
          <button 
            onClick={(e) => { e.stopPropagation(); onEquiper?.(entry); }}
            className={`w-full py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 border ${entry.equipe ? 'bg-main/20 text-main border-main/50' : 'bg-white/5 text-white/50 border-white/10 hover:text-white hover:bg-white/10'}`}
          >
            {entry.equipe ? 'Ranger' : 'Équiper'}
          </button>
        )}
      </div>

      {entry.equipe && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-main rounded-full border-2 border-app shadow-[0_0_10px_var(--color-main)]" />
      )}
    </Card>
  );
}
