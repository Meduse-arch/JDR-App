import { useState, useEffect, useRef, MouseEvent, TouchEvent, RefObject } from 'react';
import { MapToken, MapChannel } from '../types';
import { Personnage } from '../store/useStore';

interface UseMapDragParams {
  zoom: number;
  activeChannelData?: MapChannel;
  mapRef: RefObject<HTMLDivElement>;
  deplacerToken: (id: string, x: number, y: number) => void;
  onBroadcastPosition?: (id: string, x: number, y: number) => void;
  setLocalAction?: (id: string | null, active: boolean) => void;
  isMJ: boolean;
  personnageLocal: Personnage | null;
  isRulerActive: boolean;
  selectedTokenId: string | null;
  tokens: MapToken[];
}

export function useMapDrag({
  zoom,
  activeChannelData,
  mapRef,
  deplacerToken,
  onBroadcastPosition,
  setLocalAction,
  isMJ,
  personnageLocal,
  isRulerActive,
  selectedTokenId,
  tokens,
}: UseMapDragParams) {
  const [draggedToken, setDraggedToken] = useState<{
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Throttling pour le broadcast (pour ne pas saturer le réseau)
  const lastBroadcastRef = useRef<number>(0);

  // Suivi de shiftKey en temps réel — fiable contrairement au mouseup event
  const isShiftPressedRef = useRef(false);

  // Refs pour éviter les dépendances changeantes dans WASD
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;
  const activeChannelRef = useRef(activeChannelData);
  activeChannelRef.current = activeChannelData;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') isShiftPressedRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') isShiftPressedRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Déplacement ZQSD : 1 case à la fois sur le token sélectionné
  useEffect(() => {
    if (!selectedTokenId) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const activeData = activeChannelRef.current;
      if (!activeData) return;

      // Ignorer si focus dans un input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const keyMap: Record<string, [number, number]> = {
        z: [0, -1], q: [-1, 0], s: [0, 1], d: [1, 0],
        Z: [0, -1], Q: [-1, 0], S: [0, 1], D: [1, 0],
        ArrowUp: [0, -1], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowRight: [1, 0],
      };

      const delta = keyMap[e.key];
      if (!delta) return;

      const token = tokensRef.current.find((t) => t.id === selectedTokenId);
      if (!token || !canDragToken(token)) return;

      e.preventDefault();

      const { grille_taille, largeur, hauteur } = activeData;
      const newX = Math.max(0, Math.min(token.x + delta[0] * grille_taille, largeur * grille_taille));
      const newY = Math.max(0, Math.min(token.y + delta[1] * grille_taille, hauteur * grille_taille));

      // Marquer comme action locale pour ignorer les updates realtime/broadcast pendant l'action
      setLocalAction?.(selectedTokenId, true);
      
      // Broadcast immédiat pour la fluidité chez les autres
      onBroadcastPosition?.(selectedTokenId, newX, newY);
      
      // Update DB (qui mettra à jour le state local)
      deplacerToken(selectedTokenId, newX, newY);
      
      // Relâcher après un court délai
      setTimeout(() => setLocalAction?.(selectedTokenId, false), 100);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedTokenId, deplacerToken, onBroadcastPosition, setLocalAction]);

  const isMapLocked = !isMJ && activeChannelData && !activeChannelData.active;

  const canDragToken = (t: MapToken): boolean => {
    if (isMJ) return true;
    if (isMapLocked) return false;
    return !!personnageLocal && t.id_personnage === personnageLocal.id;
  };

  const startDrag = (
    t: MapToken,
    clientX: number,
    clientY: number
  ) => {
    if (isRulerActive || !canDragToken(t) || !activeChannelData || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const startX = clientX - rect.left;
    const startY = clientY - rect.top;

    setDraggedToken({ id: t.id, startX, startY, initialX: t.x, initialY: t.y });
    setDragPos({ x: t.x * zoom, y: t.y * zoom });
    setIsDragging(false);
    
    // Bloquer les updates externes sur ce token
    setLocalAction?.(t.id, true);
  };

  const handleMouseDown = (e: MouseEvent, t: MapToken) => {
    e.stopPropagation();
    e.preventDefault();
    startDrag(t, e.clientX, e.clientY);
  };

  const handleTouchStart = (e: TouchEvent, t: MapToken) => {
    e.stopPropagation();
    if (e.touches.length > 1) return;
    startDrag(t, e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isRulerActive || !draggedToken || !mapRef.current || !activeChannelRef.current) return;

    setIsDragging(true);

    const rect = mapRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const dx = currentX - draggedToken.startX;
    const dy = currentY - draggedToken.startY;

    let newPixelX = draggedToken.initialX * zoom + dx;
    let newPixelY = draggedToken.initialY * zoom + dy;

    // Snap en temps réel pendant le drag si Shift enfoncé
    if (isShiftPressedRef.current) {
      const gs = activeChannelRef.current.grille_taille * zoom;
      newPixelX = Math.round(newPixelX / gs) * gs;
      newPixelY = Math.round(newPixelY / gs) * gs;
    }

    setDragPos({ x: newPixelX, y: newPixelY });

    // BROADCAST : On envoie la position aux autres toutes les 50ms
    const now = Date.now();
    if (onBroadcastPosition && now - lastBroadcastRef.current > 50) {
      onBroadcastPosition(draggedToken.id, newPixelX / zoom, newPixelY / zoom);
      lastBroadcastRef.current = now;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isRulerActive || !draggedToken || !mapRef.current || !activeChannelRef.current) return;
    if (e.touches.length > 1) return;

    setIsDragging(true);
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    const rect = mapRef.current.getBoundingClientRect();
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;

    const dx = currentX - draggedToken.startX;
    const dy = currentY - draggedToken.startY;

    let newPixelX = draggedToken.initialX * zoom + dx;
    let newPixelY = draggedToken.initialY * zoom + dy;

    if (isShiftPressedRef.current) {
      const gs = activeChannelRef.current.grille_taille * zoom;
      newPixelX = Math.round(newPixelX / gs) * gs;
      newPixelY = Math.round(newPixelY / gs) * gs;
    }

    setDragPos({ x: newPixelX, y: newPixelY });

    // BROADCAST : Même chose pour le tactile
    const now = Date.now();
    if (onBroadcastPosition && now - lastBroadcastRef.current > 50) {
      onBroadcastPosition(draggedToken.id, newPixelX / zoom, newPixelY / zoom);
      lastBroadcastRef.current = now;
    }
  };

  const handleMouseUp = () => {
    if (!draggedToken || !dragPos || !activeChannelRef.current) return;

    let finalX = dragPos.x / zoom;
    let finalY = dragPos.y / zoom;

    // Snap final si Shift encore enfoncé au moment du drop
    if (isShiftPressedRef.current) {
      finalX = Math.round(finalX / activeChannelRef.current.grille_taille) * activeChannelRef.current.grille_taille;
      finalY = Math.round(finalY / activeChannelRef.current.grille_taille) * activeChannelRef.current.grille_taille;
    }

    finalX = Math.max(0, Math.min(finalX, activeChannelRef.current.largeur * activeChannelRef.current.grille_taille));
    finalY = Math.max(0, Math.min(finalY, activeChannelRef.current.hauteur * activeChannelRef.current.grille_taille));

    deplacerToken(draggedToken.id, Math.round(finalX), Math.round(finalY));
    
    // Relâcher le blocage local après un petit délai pour laisser l'update DB revenir
    const tid = draggedToken.id;
    setTimeout(() => setLocalAction?.(tid, false), 500);

    setDraggedToken(null);
    setDragPos(null);

    setTimeout(() => setIsDragging(false), 50);
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  return {
    draggedToken,
    dragPos,
    isDragging,
    canDragToken,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}