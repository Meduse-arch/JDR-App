import React, { useState, useEffect } from 'react';
import { DECODE_DURATION } from '../../utils/constants';

interface RunicDecoderProps {
  text: string;
  speed?: number; // Vitesse de changement des runes (ms)
  revealSpeed?: number; // Temps avant de fixer la lettre suivante (ms)
  className?: string;
}

const RUNES = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᚻ", "ᚼ", "ᛁ", "ᛃ", "ᛇ", "ᛈ", "ᛉ", "ᛊ", "ᛏ", "ᛒ", "ᛖ", "ᛗ", "ᛚ", "ᛜ", "ᛞ", "ᛟ"];

const RunicDecoder: React.FC<RunicDecoderProps> = ({ 
  text, 
  speed = 60, 
  revealSpeed, 
  className = "" 
}) => {
  const [displayText, setDisplayText] = useState("");

  // Logique de timing dynamique : Vitesse de révélation calculée pour durer DECODE_DURATION ms au total
  const finalRevealSpeed = revealSpeed || (DECODE_DURATION / (text.length || 1));

  useEffect(() => {
    let iteration = 0;
    let interval: NodeJS.Timeout;

    // On initialise avec des runes de la même longueur que le texte
    setDisplayText(
      text.split("").map(() => RUNES[Math.floor(Math.random() * RUNES.length)]).join("")
    );

    interval = setInterval(() => {
      setDisplayText(() =>
        text
          .split("")
          .map((char, index) => {
            // Si l'index est inférieur à l'itération actuelle, on affiche la vraie lettre
            if (index < iteration) {
              return char;
            }
            // Sinon, on affiche une rune aléatoire (en respectant les espaces)
            if (char === " ") return " ";
            return RUNES[Math.floor(Math.random() * RUNES.length)];
          })
          .join("")
      );

      if (iteration >= text.length) {
        clearInterval(interval);
      }

      iteration += 1 / (finalRevealSpeed / speed);
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, finalRevealSpeed]);

  return (
    <span className={`${className} font-serif tracking-widest`}>
      {displayText}
    </span>
  );
};

export default RunicDecoder;
