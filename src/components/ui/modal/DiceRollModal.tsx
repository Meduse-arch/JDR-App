import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore, type DiceResult } from '../../../store/useStore';
import { broadcastService } from '../../../services/broadcastService';
import RunicDecoder from '../RunicDecoder';
import { ModalContainer } from './ModalContainer';

const RUNES = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᚻ", "ᚼ", "ᛁ", "ᛃ", "ᛇ", "ᛈ", "ᛉ", "ᛊ", "ᛏ", "ᛒ", "ᛖ", "ᛗ", "ᛚ", "ᛜ", "ᛞ", "ᛟ"];

const getDestiny = (roll: number, faces: number, isTotal: boolean = false, nb: number = 1) => {
  if (!isTotal || nb === 1) {
    if (roll === 1) return { char: 'ᛃ', label: 'Ruine Absolue' };
    if (roll >= faces) return { char: 'ᛜ', label: 'Réussite Légendaire' };
  }
  
  const maxPossible = faces * nb;
  const pct = maxPossible > 0 ? Math.round((roll / maxPossible) * 100) : 50;
  
  if (pct > 80) return { char: 'ᛟ', label: 'Triomphe' };
  if (pct > 60) return { char: 'ᚨ', label: 'Faveur' };
  if (pct > 40) return { char: 'ᛁ', label: 'Équilibre' };
  if (pct > 20) return { char: 'ᚱ', label: 'Résistance' };
  return { char: 'ᚦ', label: 'Adversité' };
};

const DiceShape = ({ faces, className }: { faces: number, className?: string }) => {
  const stroke = "rgba(var(--color-main-rgb), 0.4)";
  const props = { fill: "none", stroke, strokeWidth: "1.2", className };
  switch (faces) {
    case 4: return <svg viewBox="0 0 100 100" {...props}><path d="M50 15 L85 80 L15 80 Z" /></svg>;
    case 6: return <svg viewBox="0 0 100 100" {...props}><rect x="20" y="20" width="60" height="60" /></svg>;
    case 8: return <svg viewBox="0 0 100 100" {...props}><path d="M50 10 L85 50 L50 90 L15 50 Z" /></svg>;
    case 10: return <svg viewBox="0 0 100 100" {...props}><path d="M50 10 L85 40 L72 85 L28 85 L15 40 Z" /></svg>;
    case 12: return <svg viewBox="0 0 100 100" {...props}><path d="M50 10 L80 25 L90 55 L70 85 L30 85 L10 55 L20 25 Z" /></svg>;
    case 20: return <svg viewBox="0 0 100 100" {...props}><path d="M50 10 L85 28 L85 72 L50 90 L15 72 L15 28 Z" /></svg>;
    default: return <svg viewBox="0 0 100 100" {...props}><circle cx="50" cy="50" r="40" /></svg>;
  }
};

const STAT_ABBR: Record<string, string> = { 'Force': 'FOR', 'Agilité': 'AGI', 'Constitution': 'CON', 'Intelligence': 'INT', 'Sagesse': 'SAG', 'Perception': 'PER', 'Charisme': 'CHA' };
const getAbbreviatedLabel = (label: string) => STAT_ABBR[label] ?? label.substring(0, 3).toUpperCase();

export const DiceRollModal: React.FC = () => {
  const { diceResult, setDiceResult, sessionActive, mode } = useStore();
  const [phase, setPhase] = useState<'rolling' | 'rune' | 'reveal'>('rolling');
  const [displayRune, setDisplayRune] = useState('');

  useEffect(() => {
    if (!sessionActive?.id) return;
    const unsubscribe = broadcastService.subscribe(sessionActive.id, 'dice-roll', (payload) => {
      if (Array.isArray(payload)) { setDiceResult(payload, false); return; }
      const { diceResult, isSecret, senderId, allowedViewers } = payload;
      if (isSecret) {
        const state = useStore.getState();
        const myId = state.compte?.id;
        if (myId && myId !== senderId) {
          let isAllowed = Array.isArray(allowedViewers) && allowedViewers.includes(myId);
          if (!isAllowed) {
            const partagesDes = state.sessionActive?.parametres?.partagesDes || {};
            if ((partagesDes[senderId] || []).includes(myId)) isAllowed = true;
          }
          if (!isAllowed) return;
        }
      }
      setDiceResult(diceResult, false);
    });
    return () => unsubscribe();
  }, [sessionActive?.id, setDiceResult]);

  const rollInfo = useMemo(() => {
    if (!diceResult || diceResult.length === 0) return null;
    
    let totalRoll = 0;
    let totalMaxPossible = 0;
    let totalNb = 0;

    diceResult.forEach((res: DiceResult) => {
      const match = res.diceString.match(/(\d+)d\(?([^=)]+)=?(\d+)?\)?/);
      const nb = match ? parseInt(match[1]) : 1;
      let faces = 20;
      if (match) {
        const val = match[3] || match[2];
        faces = parseInt(val) || 20;
      }
      totalRoll += res.rolls.reduce((a: number, b: number) => a + b, 0);
      totalMaxPossible += nb * faces;
      totalNb += res.rolls.length;
    });

    if (totalNb === 1 && diceResult[0]) {
      const match = diceResult[0].diceString.match(/(\d+)d\(?([^=)]+)=?(\d+)?\)?/);
      let faces = 20;
      if (match) {
        const val = match[3] || match[2];
        faces = parseInt(val) || 20;
      }
      return getDestiny(totalRoll, faces, true, 1);
    }
    return getDestiny(totalRoll, totalMaxPossible, true, totalNb);
  }, [diceResult]);

  useEffect(() => {
    if (!diceResult) { 
      setPhase('rolling'); 
      return; 
    }
    
    // Forcer la phase de roulement à chaque nouveau jet
    setPhase('rolling');
    
    const interval = setInterval(() => { setDisplayRune(RUNES[Math.floor(Math.random() * RUNES.length)]); }, 40);
    const runeTimeout = setTimeout(() => {
      clearInterval(interval);
      if (rollInfo) setDisplayRune(rollInfo.char);
      setPhase('rune');
    }, 500);
    const revealTimeout = setTimeout(() => { setPhase('reveal'); }, 800);
    return () => { clearInterval(interval); clearTimeout(runeTimeout); clearTimeout(revealTimeout); };
  }, [diceResult, rollInfo]);

  if (!diceResult || !rollInfo) return null;

  const totalGlobal = diceResult.reduce((sum: number, r: DiceResult) => sum + r.total, 0);

  return createPortal(
    <div className={mode}>
      <ModalContainer onClose={() => setDiceResult(null)} className="items-center z-[10000]">
        <div className="flex flex-col items-center gap-3 py-4">
          {phase !== 'reveal' ? (
            <span className={`font-serif leading-none transition-all duration-300 ${
              phase === 'rune' 
                ? 'text-6xl text-theme-main drop-shadow-[0_0_20px_rgba(var(--color-main-rgb),0.8)]' 
                : 'text-5xl text-theme-main opacity-40'
            }`}>{displayRune}</span>
          ) : (
            <div className="flex flex-col items-center gap-1 animate-in fade-in duration-300">
              <span className="text-2xl font-serif text-theme-main opacity-70 animate-pulse drop-shadow-[0_0_10px_rgba(var(--color-main-rgb),0.6)]">{rollInfo.char}</span>
              <div className="relative flex items-center justify-center">
                {diceResult.length === 1 && (() => {
                  const match = diceResult[0].diceString.match(/(\d+)d\(?([^=)]+)=?(\d+)?\)?/)
                  const val = match ? (match[3] || match[2]) : '20'
                  return <DiceShape faces={parseInt(val) || 20} className="absolute w-24 h-24 opacity-[0.06]" />
                })()}
                <span className="relative text-7xl font-cinzel font-black text-theme-main drop-shadow-[0_0_15px_rgba(var(--color-main-rgb),0.3)] leading-none z-10">{totalGlobal}</span>
              </div>
              <div className="text-[10px] font-cinzel font-black tracking-[0.3em] uppercase text-theme-main mt-1">
                <RunicDecoder text={rollInfo.label} />
              </div>
            </div>
          )}
        </div>

        {phase === 'reveal' && (
          <div className="animate-in fade-in duration-500 w-full flex flex-col gap-6">
            <div className="flex flex-row flex-wrap justify-center gap-4 w-full px-4">
              {diceResult.map((res: DiceResult, i: number) => {
                const match = res.diceString.match(/(\d+)d\(?([^=)]+)=?(\d+)?\)?/);
                const rawLabel = match && match[2] && isNaN(parseInt(match[2])) ? match[2] : null;
                const label = rawLabel ? getAbbreviatedLabel(rawLabel) : `D${match ? (match[3] || match[2]) : 20}`;
                const faces = match ? (parseInt(match[3] || match[2]) || 20) : 20;
                return res.rolls.map((val: number, j: number) => (
                  <div key={`${i}-${j}`} className="flex flex-col items-center gap-1 min-w-[30px]">
                    <DiceShape faces={faces} className="w-5 h-5 opacity-40" />
                    <span className="font-cinzel text-[8px] text-theme-main opacity-40 uppercase text-center">{label}</span>
                    <span className="font-cinzel font-black text-sm text-theme-main">{val}</span>
                  </div>
                ));
              })}
            </div>
            <div className="flex flex-wrap justify-center gap-2 opacity-60 w-full pt-4 border-t border-theme/10">
              {diceResult.map((res: DiceResult, i: number) => (
                <div key={i} className="text-[9px] font-mono border border-theme-main/20 px-2 py-0.5 text-theme-main bg-theme-main/5 uppercase">{res.diceString} = {res.total}</div>
              ))}
            </div>
          </div>
        )}
      </ModalContainer>
    </div>,
    document.body
  );
};

export default DiceRollModal;
