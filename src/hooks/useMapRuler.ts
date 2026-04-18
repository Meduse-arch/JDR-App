import { useState, RefObject, MouseEvent } from 'react';
import { MapChannel } from '../types';

interface UseMapRulerParams {
  zoom: number;
  activeChannelData?: MapChannel;
  mapRef: RefObject<HTMLDivElement>;
  setSelectedTokenId: (id: string | null) => void;
}

export function useMapRuler({ zoom, activeChannelData, mapRef, setSelectedTokenId }: UseMapRulerParams) {
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerStart, setRulerStart] = useState<{ x: number, y: number } | null>(null);
  const [rulerEnd, setRulerEnd] = useState<{ x: number, y: number } | null>(null);
  const [rulerCurrentPos, setRulerCurrentPos] = useState<{ x: number, y: number } | null>(null);

  const toggleRuler = () => {
    setIsRulerActive(!isRulerActive);
    setRulerStart(null);
    setRulerEnd(null);
    setRulerCurrentPos(null);
    setSelectedTokenId(null);
  };

  const handleRulerClick = (e: MouseEvent) => {
    if (!isRulerActive || !activeChannelData || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    const clickY = (e.clientY - rect.top) / zoom;

    if (!rulerStart || (rulerStart && rulerEnd)) {
      setRulerStart({ x: clickX, y: clickY });
      setRulerEnd(null);
      setRulerCurrentPos(null);
    } else if (rulerStart && !rulerEnd) {
      setRulerEnd({ x: clickX, y: clickY });
      setRulerCurrentPos(null);
    }
  };

  const handleRulerMove = (e: MouseEvent) => {
    if (!isRulerActive || !activeChannelData || !mapRef.current) return;
    
    if (rulerStart && !rulerEnd) {
      const rect = mapRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / zoom;
      const currentY = (e.clientY - rect.top) / zoom;
      setRulerCurrentPos({ x: currentX, y: currentY });
    }
  };

  const renderRulerDistance = () => {
    if (!isRulerActive || !rulerStart || (!rulerEnd && !rulerCurrentPos) || !activeChannelData) return null;
    
    const currentEnd = rulerEnd || rulerCurrentPos;
    if (!currentEnd) return null;

    const dx = currentEnd.x - rulerStart.x;
    const dy = currentEnd.y - rulerStart.y;
    const distPx = Math.sqrt(dx * dx + dy * dy);
    const distCells = (distPx / activeChannelData.grille_taille).toFixed(1);

    return {
      distCells,
      x: currentEnd.x,
      y: currentEnd.y
    };
  };

  return {
    isRulerActive,
    rulerStart,
    rulerEnd,
    rulerCurrentPos,
    toggleRuler,
    handleRulerClick,
    handleRulerMove,
    renderRulerDistance
  };
}
