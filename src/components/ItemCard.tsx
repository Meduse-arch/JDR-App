import { useState } from 'react';
import { InventaireEntry, Modificateur } from '../types';
import { CATEGORIE_EMOJI } from '../utils/constants';

interface ItemCardProps {
  entry: InventaireEntry;
  onUtiliser: (entry: InventaireEntry) => void;
  onEquiper: (entry: InventaireEntry) => void;
  onClick?: (entry: InventaireEntry) => void;
  labelModif: (m: Modificateur) => string;
  modifs: Modificateur[];
}

export function ItemCard({
  entry, onUtiliser, onEquiper, onClick, labelModif, modifs,
}: ItemCardProps) {
  const estConsommable = entry.items.categorie === 'Consommable';
  const [pressed, setPressed] = useState(false);

  const handleEquiper = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPressed(true);
    setTimeout(() => setPressed(false), 300);
    onEquiper(entry);
  };

  const handleUtiliser = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUtiliser(entry);
  };

  return (
    <div
      onClick={() => onClick?.(entry)}
      className="relative p-5 rounded-3xl flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
      style={{
        backgroundColor: entry.equipe
          ? 'color-mix(in srgb, var(--color-main) 8%, var(--bg-card))'
          : 'var(--bg-card)',
        border: `1px solid ${entry.equipe
          ? 'color-mix(in srgb, var(--color-main) 40%, transparent)'
          : 'var(--border)'}`,
        boxShadow: entry.equipe ? '0 0 20px var(--color-glow)' : 'none',
        transform: pressed ? 'scale(0.97)' : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 flex items-center justify-center rounded-2xl text-2xl shrink-0 transition-transform group-hover:scale-110"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {CATEGORIE_EMOJI[entry.items.categorie]}
          </div>
          <div className="min-w-0">
            <p className="font-bold leading-tight truncate group-hover:text-main transition-colors" style={{ color: 'var(--text-primary)' }}>
              {entry.items.nom}
            </p>
            <span className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              {entry.items.categorie}
            </span>
          </div>
        </div>
        <span className="font-black text-xs px-2.5 py-1 rounded-xl shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          x{entry.quantite}
        </span>
      </div>

      {modifs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {modifs.slice(0, 2).map((m, i) => (
            <span key={i} className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg truncate max-w-[120px]"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-main) 15%, transparent)',
                color: 'var(--color-light)',
                border: '1px solid color-mix(in srgb, var(--color-main) 30%, transparent)',
              }}>
              {labelModif(m)}
            </span>
          ))}
          {modifs.length > 2 && (
            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-white/5 border border-white/10 opacity-50">
              +{modifs.length - 2}...
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-2">
        {estConsommable ? (
          <button onClick={handleUtiliser}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all text-white active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))',
              boxShadow: '0 0 10px var(--color-glow)',
            }}>
            Utiliser
          </button>
        ) : (
          <button onClick={handleEquiper}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95"
            style={{
              backgroundColor: entry.equipe
                ? 'color-mix(in srgb, var(--color-main) 15%, transparent)'
                : 'transparent',
              color: entry.equipe ? 'var(--color-light)' : 'var(--text-secondary)',
              borderColor: entry.equipe
                ? 'color-mix(in srgb, var(--color-main) 50%, transparent)'
                : 'var(--border)',
            }}>
            {entry.equipe ? 'Ranger' : 'Équiper'}
          </button>
        )}
      </div>
    </div>
  );
}
