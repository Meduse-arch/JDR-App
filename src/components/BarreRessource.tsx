import { useState } from 'react';
import { Card } from './ui/Card';

interface BarreRessourceProps {
  label: string;
  color: string;
  icon?: string;
  emoji: string;
  glow: string;
  gradient: string;
  actuel: number;
  max: number;
  delta: string | number;
  onDeltaChange: (val: string) => void;
  onDeltaDecrement: () => void;
  onDeltaIncrement: () => void;
  onAppliquer: () => void;
}

export function BarreRessource({
  label,
  color,
  emoji,
  glow,
  gradient,
  actuel,
  max,
  delta,
  onDeltaChange,
  onDeltaDecrement,
  onDeltaIncrement,
  onAppliquer,
}: BarreRessourceProps) {
  const [isHovered, setIsHovered] = useState(false);
  const pourcentage = Math.min(100, Math.max(0, (actuel / max) * 100));

  return (
    <Card 
      className="flex-col gap-4 p-6 relative overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Glow */}
      <div 
        className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity duration-500 group-hover:opacity-40"
        style={{ backgroundColor: glow }}
      />

      <div className="flex justify-between items-end relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black">{actuel}</span>
          <span className="text-xs font-bold opacity-30">/ {max}</span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
        {/* Progress Fill */}
        <div 
          className="h-full rounded-full transition-all duration-700 ease-out relative"
          style={{ 
            width: `${pourcentage}%`,
            background: gradient,
            boxShadow: isHovered ? `0 0 20px ${color}66` : 'none'
          }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-white/20 w-full h-[1px] top-0" />
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex items-center gap-3 mt-2 relative z-10">
        <div className="flex bg-black/20 rounded-xl p-1 border border-white/5 flex-1">
          <button 
            onClick={onDeltaDecrement}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors font-bold text-lg"
          >
            -
          </button>
          <input 
            type="text"
            value={delta}
            onChange={(e) => onDeltaChange(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent text-center font-black text-sm outline-none placeholder:opacity-20"
          />
          <button 
            onClick={onDeltaIncrement}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors font-bold text-lg"
          >
            +
          </button>
        </div>
        <button 
          onClick={onAppliquer}
          className="px-6 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30"
          style={{ 
            backgroundColor: color,
            color: '#fff',
            boxShadow: `0 4px 15px ${color}44`
          }}
          disabled={!delta || delta === '0'}
        >
          OK
        </button>
      </div>
    </Card>
  );
}
