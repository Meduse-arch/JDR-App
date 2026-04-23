import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import RunicDecoder from './ui/RunicDecoder';
import { useStore } from '../store/useStore';

interface Props {
  sessionNom: string;
  onComplete: () => void;
}

const DECORATIVE_RUNES = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ"];

const SessionTransitionPortal: React.FC<Props> = ({ sessionNom, onComplete }) => {
  const { setPageCourante } = useStore();
  
  useEffect(() => {
    // Séquence de transition totale (1500ms)
    // Révélation calée sur DECODE_DURATION (800ms) par le moteur
    // Laisse 700ms de lecture fixe avant de déclencher la sortie
    const completeTimer = setTimeout(() => {
      setPageCourante('dashboard');
      onComplete();
    }, 1500);

    return () => clearTimeout(completeTimer);
  }, [onComplete, setPageCourante]);

  // Calcul dynamique de la taille de police
  const getFontSize = (text: string) => {
    if (text.length > 25) return "text-3xl md:text-5xl";
    if (text.length > 15) return "text-4xl md:text-6xl";
    return "text-5xl md:text-8xl";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        filter: "blur(30px)", 
        scale: 1.05,
      }}
      transition={{ 
        duration: 0.8,
        ease: "easeOut"
      }}
      className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Vignette profonde */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none z-10" />
      
      {/* Rune Ansuz (ᚨ) d'Odin - Aura Éthérée Massive */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <span className="font-cinzel text-theme-main opacity-15 blur-[4px] text-[35rem] md:text-[50rem]">
          ᚨ
        </span>
      </div>

      <div className="relative z-20 flex flex-col items-center text-center px-8 w-full max-w-5xl">
        {/* Nom de la session - Décryptage automatique via le moteur (800ms) */}
        <motion.div 
          exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
          className="mb-4 w-full overflow-hidden"
        >
          <RunicDecoder 
            text={sessionNom.toUpperCase()} 
            className={`${getFontSize(sessionNom)} font-cinzel font-black tracking-[0.2em] text-theme-main block leading-tight whitespace-nowrap`}
          />
        </motion.div>

        {/* Soulignement Runique Vibrant */}
        <div className="flex gap-4 mb-10">
          {DECORATIVE_RUNES.map((rune, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0.2 }}
              animate={{ 
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity, 
                delay: i * 0.1,
                ease: "easeInOut"
              }}
              className="font-cinzel text-2xl text-theme-main select-none"
            >
              {rune}
            </motion.span>
          ))}
        </div>

        {/* Barre de progression mystique */}
        <motion.div 
          exit={{ opacity: 0, width: "0%" }}
          className="mt-2 w-32 h-[1px] bg-theme-main/10 relative overflow-hidden"
        >
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.5, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-theme-main to-transparent"
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SessionTransitionPortal;
