import { useEffect, useRef, useState } from 'react';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import { calculPourcentage } from '../utils/math';

export type RessourceKey = 'hp' | 'mana' | 'stam';

interface BarreRessourceProps {
  label: string;
  emoji: string;
  actuel: number;
  max: number;
  rKey: RessourceKey;
  color: string;
  glow: string;
  gradient: string;
  delta: string;
  onDeltaChange: (v: string) => void;
  onDeltaDecrement: () => void;
  onDeltaIncrement: () => void;
  onAppliquer: () => void;
}

export function BarreRessource({
  label, emoji, actuel, max, color, glow, gradient,
  delta, onDeltaChange, onDeltaDecrement, onDeltaIncrement, onAppliquer,
}: BarreRessourceProps) {
  const pct          = calculPourcentage(actuel, max);
  const valeurAnimee = useAnimatedValue(actuel);
  const pctAnimee    = useAnimatedValue(pct);

  const [flash, setFlash] = useState<'gain' | 'perte' | null>(null);
  const prevActuel = useRef(actuel);

  useEffect(() => {
    if (prevActuel.current === actuel) return;
    setFlash(actuel > prevActuel.current ? 'gain' : 'perte');
    const t = setTimeout(() => setFlash(null), 700);
    prevActuel.current = actuel;
    return () => clearTimeout(t);
  }, [actuel]);

  const deltaValide = delta !== '' && delta !== '0';

  return (
    <div
      className="relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col gap-3 overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 8%, var(--bg-card))`,
        border: `1px solid color-mix(in srgb, ${color} 25%, var(--border))`,
        boxShadow: flash === 'gain'
          ? `0 0 0 2px ${color}, 0 0 20px ${glow}`
          : flash === 'perte'
          ? `0 0 0 2px #ef4444, 0 0 15px rgba(239,68,68,0.3)`
          : 'none',
      }}
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: glow }} />

      <div className="relative z-10 flex justify-between items-center">
        <span className="text-sm font-bold uppercase tracking-wide flex items-center gap-2"
          style={{ color: 'var(--text-secondary)' }}>
          <span className="text-lg">{emoji}</span>
          {label}
        </span>
        <div className="flex items-baseline gap-1">
          <span
            className="text-2xl sm:text-3xl font-black tabular-nums transition-colors duration-300"
            style={{
              color: flash === 'gain' ? '#4ade80' : flash === 'perte' ? '#f87171' : color,
            }}
          >
            {valeurAnimee}
          </span>
          <span className="font-bold" style={{ color: 'var(--text-muted)' }}>/ {max}</span>
        </div>
      </div>

      <div className="relative z-10 w-full rounded-full h-2.5 overflow-hidden"
        style={{ backgroundColor: 'var(--bg-app)' }}>
        <div
          className="h-full rounded-full relative"
          style={{
            width: `${pctAnimee}%`,
            background: gradient,
            transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 rounded-full" />
        </div>
      </div>

      <div className="relative z-10 flex items-center p-1 rounded-xl"
        style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)' }}>
        <button
          onClick={onDeltaDecrement}
          className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg font-black text-xl transition flex items-center justify-center shrink-0"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
          −
        </button>
        <input
          type="number"
          value={delta}
          placeholder="±0"
          onChange={e => onDeltaChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && deltaValide && onAppliquer()}
          className="flex-1 bg-transparent text-center font-bold text-sm outline-none min-w-0"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={onDeltaIncrement}
          className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg font-black text-xl transition flex items-center justify-center shrink-0"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
          +
        </button>
        <div className="w-px h-6 mx-1 shrink-0" style={{ backgroundColor: 'var(--border)' }} />
        <button
          onClick={onAppliquer}
          disabled={!deltaValide}
          className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg font-bold transition flex items-center justify-center shrink-0"
          style={{
            color: deltaValide ? 'var(--color-light)' : 'var(--text-muted)',
            cursor: deltaValide ? 'pointer' : 'not-allowed',
          }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
