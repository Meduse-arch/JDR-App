import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Button } from './ui/Button';

const DiceRollModal: React.FC = () => {
  const { diceResult, setDiceResult } = useStore();
  const [isRolling, setIsRolling] = useState(false);
  const [showTotal, setShowTotal] = useState(false);
  const [animatedRolls, setAnimatedRolls] = useState<number[][]>([]);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const ANIMATION_DURATION = 1500; // ms
  const TOTAL_DELAY = 500; // ms

  const animate = (time: number) => {
    if (startTimeRef.current === null) startTimeRef.current = time;
    const progress = time - startTimeRef.current;

    if (progress < ANIMATION_DURATION) {
      // Randomize values for each die
      if (diceResult) {
        const newAnimatedRolls = diceResult.map(res => 
          res.rolls.map(() => Math.floor(Math.random() * 6) + 1)
        );
        setAnimatedRolls(newAnimatedRolls);
      }
      requestRef.current = requestAnimationFrame(animate);
    } else {
      // End animation
      setIsRolling(false);
      if (diceResult) {
        setAnimatedRolls(diceResult.map(res => res.rolls));
        // Wait before showing total
        setTimeout(() => setShowTotal(true), TOTAL_DELAY);
      }
    }
  };

  useEffect(() => {
    if (diceResult && diceResult.length > 0) {
      setIsRolling(true);
      setShowTotal(false);
      startTimeRef.current = null;
      requestRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
    }
  }, [diceResult]);

  if (!diceResult || diceResult.length === 0) return null;

  const totalGlobal = diceResult.reduce((sum, res) => sum + res.total, 0);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in duration-300" 
         style={{ backgroundColor: 'rgba(var(--bg-app-rgb, 0, 0, 0), 0.8)' }}>
      
      <div 
        className="relative w-full max-w-2xl rounded-[2.5rem] border-2 p-8 shadow-2xl flex flex-col items-center gap-8 animate-in zoom-in-95 duration-300 overflow-hidden"
        style={{ 
          borderColor: 'var(--color-main)', 
          backgroundColor: 'var(--bg-surface)', 
          color: 'var(--text-primary)' 
        }}
      >
        {/* Barre de couleur en haut */}
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-[2.5rem]" style={{ backgroundColor: 'var(--color-main)' }} />

        <div className="text-center">
          <h2 className="text-xl font-black uppercase tracking-[0.3em] opacity-90 mb-2">Résultat du lancer</h2>
          <div className="h-1 w-20 mx-auto rounded-full opacity-50" style={{ backgroundColor: 'var(--color-main)' }} />
        </div>

        {/* Grille des dés */}
        <div className={`w-full grid gap-4 ${diceResult.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {diceResult.map((res, idx) => (
            <div key={idx} 
                 className="rounded-3xl p-6 border flex flex-col items-center gap-3 relative overflow-hidden group" 
                 style={{ 
                   backgroundColor: 'var(--bg-card)', 
                   borderColor: 'color-mix(in srgb, var(--color-main) 40%, transparent)' 
                 }}>
               <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               
               <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1" style={{ color: 'var(--text-secondary)' }}>{res.label}</p>
               
               <div className="flex flex-wrap justify-center gap-2 mb-2">
                 {(animatedRolls[idx] || res.rolls.map(() => 1)).map((roll: number, i: number) => (
                   <div 
                     key={i} 
                     className="w-10 h-10 rounded-xl bg-black/20 border flex items-center justify-center font-bold text-lg shadow-inner"
                     style={{ color: 'var(--color-main)', borderColor: 'color-mix(in srgb, var(--color-main) 40%, transparent)' }}
                   >
                     {roll}
                   </div>
                 ))}
               </div>

               <div className="flex items-center gap-3">
                 <span className="text-4xl font-black italic tracking-tighter" style={{ color: 'var(--color-main)' }}>
                   {isRolling ? '?' : res.total}
                 </span>
                 {!isRolling && res.bonus !== 0 && (
                   <span className="text-sm font-bold opacity-40 px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
                     {res.bonus > 0 ? `+${res.bonus}` : res.bonus}
                   </span>
                 )}
               </div>
               
               <p className="text-[8px] font-bold opacity-20 uppercase tracking-tighter" style={{ color: 'var(--text-secondary)' }}>{res.diceString}</p>
            </div>
          ))}
        </div>

        {/* Total Global (si plusieurs lancers) */}
        {diceResult.length > 1 && (
          <div className="w-full flex flex-col items-center border-t pt-6 animate-in slide-in-from-bottom-4 duration-500 delay-300" 
               style={{ borderTopColor: 'var(--border)', opacity: showTotal ? 1 : 0.1 }}>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-2" style={{ color: 'var(--text-secondary)' }}>Total Combined</p>
            <div className="relative">
               <div className="absolute inset-0 blur-2xl opacity-20" style={{ backgroundColor: 'var(--color-main)' }} />
               <span className="text-8xl font-black italic tracking-tighter relative transition-all duration-500" 
                     style={{ color: 'var(--color-main)', textShadow: '0 0 40px color-mix(in srgb, var(--color-main) 40%, transparent)', transform: showTotal ? 'scale(1)' : 'scale(0.8)' }}>
                 {showTotal ? totalGlobal : '??'}
               </span>
            </div>
          </div>
        )}

        <Button
          size="lg"
          onClick={() => setDiceResult(null)}
          className="w-full sm:w-auto"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
};

export default DiceRollModal;
