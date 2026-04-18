import { useState } from 'react';
import { Card } from './ui/card';
import { Heart, Zap, Flame, Plus, Minus } from 'lucide-react';

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

  const lowerLabel = label.toLowerCase();
  const Icon = (lowerLabel.includes('vie') || lowerLabel.includes('hp')) ? Heart : 
               lowerLabel.includes('mana') ? Zap : 
               (lowerLabel.includes('stamina') || lowerLabel.includes('stam')) ? Flame :
               Flame;

  return (
    <Card
      className="flex-col gap-4 p-6 relative group bg-black/60 rounded-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex justify-between items-end relative z-10">
        <div className="flex items-center gap-3">
          <Icon 
            size={20} 
            className="text-theme-main transition-transform duration-500 group-hover:scale-110" 
            style={{ color: isHovered ? color : undefined }} 
          />
          <span className="text-xs font-cinzel font-black uppercase tracking-widest text-theme-light">     
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-1 font-cinzel">
          <span className="text-2xl font-black text-primary">{actuel}</span>
          <span className="text-xs font-bold opacity-30 text-primary">/ {max}</span>
        </div>
      </div>

      <div className="relative h-4 w-full bg-black/80 rounded-sm border border-theme/30 p-[2px] shadow-inner">
        <div
          className="h-full rounded-sm transition-all duration-1000 ease-out relative"      
          style={{
            width: `${pourcentage}%`,
            background: `linear-gradient(to right, ${color}, ${color}cc)`,
            boxShadow: isHovered ? `0 0 15px ${color}66` : 'none'
          }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-white/10 w-full h-[1px] top-0" />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2 relative z-10">
        <div className="flex bg-black/40 rounded-sm p-1 border border-theme/20 flex-1 shadow-inner h-10">       
          <button
            onClick={onDeltaDecrement}
            className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-white/5 transition-colors text-theme-main active:scale-90"
          >
            <Minus size={14} />
          </button>
          <input
            type="text"
            value={delta}
            onChange={(e) => onDeltaChange(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent text-center font-cinzel font-black text-sm outline-none placeholder:opacity-20 text-primary"
          />
          <button
            onClick={onDeltaIncrement}
            className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-white/5 transition-colors text-theme-main active:scale-90"
          >
            <Plus size={14} />
          </button>
        </div>
        <button
          onClick={onAppliquer}
          className="px-6 h-10 rounded-sm font-cinzel font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 border border-theme-dark text-white shadow-lg shrink-0"
          style={{ 
            backgroundColor: color,
          }}
          disabled={!delta || delta === '0'}
        >
          Appliquer
        </button>
      </div>
    </Card>
  );
}
