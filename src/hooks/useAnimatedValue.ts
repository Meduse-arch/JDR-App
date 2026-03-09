import { useState, useEffect, useRef } from 'react';

/**
 * Hook pour animer un nombre qui change vers une cible
 */
export function useAnimatedValue(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    if (prev.current === target) return;
    const start    = prev.current;
    const diff     = target - start;
    const startTs  = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTs) / duration);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + diff * ease));
      if (t < 1) requestAnimationFrame(tick);
      else prev.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return display;
}
