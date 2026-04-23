import { useState, useRef, useCallback, useEffect } from 'react';
import { MapToken } from '../types';

interface MapViewportOptions {
  activeChannelData: any;
  canvasRef: React.RefObject<HTMLDivElement>;
  channelActif: string | null;
}

export function useMapViewport({ activeChannelData, canvasRef, channelActif }: MapViewportOptions) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  
  // Sauvegarder la taille du viewport pour détecter les changements
  const viewportSize = useRef({ w: 0, h: 0 });

  const getMapNatSize = useCallback(() => {
    if (!activeChannelData) return { w: 0, h: 0 };
    return {
      w: activeChannelData.largeur * activeChannelData.grille_taille,
      h: activeChannelData.hauteur * activeChannelData.grille_taille,
    };
  }, [activeChannelData]);

  const clampPan = useCallback((px: number, py: number, z: number, bypassClamp = false) => {
    if (!activeChannelData || !canvasRef.current) return { x: px, y: py };
    const vW = canvasRef.current.clientWidth;
    const vH = canvasRef.current.clientHeight;
    if (vW === 0 || vH === 0) return { x: px, y: py };

    const nat = getMapNatSize();
    const mapW = nat.w * z;
    const mapH = nat.h * z;

    const clampAxis = (p: number, mapSize: number, viewSize: number) => {
      if (mapSize <= viewSize) return (viewSize - mapSize) / 2;
      return Math.max(viewSize - mapSize, Math.min(0, p));
    };

    return { x: clampAxis(px, mapW, vW), y: clampAxis(py, mapH, vH) };
  }, [activeChannelData, getMapNatSize, canvasRef]);

  const applyFit = useCallback((el: HTMLDivElement) => {
    if (!activeChannelData) return;
    const vW = el.clientWidth;
    const vH = el.clientHeight;
    if (vW === 0 || vH === 0) return;
    const nat = getMapNatSize();
    const fz = Math.max(0.1, Math.min(vW / nat.w, vH / nat.h) * 0.97);
    setZoom(fz);
    setPan({ x: (vW - nat.w * fz) / 2, y: (vH - nat.h * fz) / 2 });
    viewportSize.current = { w: vW, h: vH };
  }, [activeChannelData, getMapNatSize]);

  // Initial fit when map is loaded
  useEffect(() => {
    if (!activeChannelData || !channelActif) return;
    const el = canvasRef.current;
    if (el && el.clientWidth > 0) {
      applyFit(el);
    }
  }, [channelActif, activeChannelData, applyFit, canvasRef]);

  // Observer les changements de taille du viewport pour compenser le pan
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW === 0 || newH === 0) continue;

        const oldW = viewportSize.current.w;
        const oldH = viewportSize.current.h;

        if (oldW !== 0 && (oldW !== newW || oldH !== newH)) {
          // Calculer le point de la map qui était au centre de l'ancien viewport
          setPan(prevPan => {
            const centerX = (oldW / 2 - prevPan.x) / zoom;
            const centerY = (oldH / 2 - prevPan.y) / zoom;

            // Calculer le nouveau pan pour que ce même point soit au centre du nouveau viewport
            const nextPanX = newW / 2 - centerX * zoom;
            const nextPanY = newH / 2 - centerY * zoom;

            return clampPan(nextPanX, nextPanY, zoom);
          });
        }

        viewportSize.current = { w: newW, h: newH };
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom, clampPan, canvasRef]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setZoom(prevZoom => {
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.max(0.2, Math.min(3, prevZoom * factor));
      const scale = newZoom / prevZoom;
      setPan(prevPan => clampPan(
        mouseX - scale * (mouseX - prevPan.x),
        mouseY - scale * (mouseY - prevPan.y),
        newZoom
      ));
      return newZoom;
    });
  }, [clampPan, canvasRef]);

  // --- SOURIS ---
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent, isRulerActive: boolean) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-token]')) return;
    if (isRulerActive) return;
    if (e.button === 0 || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    }
  }, [pan]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStart.current) return;
    const dx = e.clientX - panStart.current.mx;
    const dy = e.clientY - panStart.current.my;
    setPan(clampPan(panStart.current.px + dx, panStart.current.py + dy, zoom));
  }, [isPanning, zoom, clampPan]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
    panStart.current = null;
  }, []);

  // --- TACTILE ---
  const handleCanvasTouchStart = useCallback((e: React.TouchEvent, isRulerActive: boolean) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-token]')) return;
    if (isRulerActive) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsPanning(true);
      panStart.current = { mx: touch.clientX, my: touch.clientY, px: pan.x, py: pan.y };
      lastPinchDistance.current = null;
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastPinchDistance.current = dist;
    }
  }, [pan]);

  const handleCanvasTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning && panStart.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - panStart.current.mx;
      const dy = touch.clientY - panStart.current.my;
      setPan(clampPan(panStart.current.px + dx, panStart.current.py + dy, zoom));
    } else if (e.touches.length === 2 && lastPinchDistance.current !== null && canvasRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const factor = dist / lastPinchDistance.current;
      lastPinchDistance.current = dist;

      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

      setZoom(prevZoom => {
        const newZoom = Math.max(0.2, Math.min(3, prevZoom * factor));
        const scale = newZoom / prevZoom;
        setPan(prevPan => clampPan(
          centerX - scale * (centerX - prevPan.x),
          centerY - scale * (centerY - prevPan.y),
          newZoom
        ));
        return newZoom;
      });
    }
  }, [isPanning, zoom, clampPan, canvasRef]);

  const handleCanvasTouchEnd = useCallback(() => {
    setIsPanning(false);
    panStart.current = null;
    lastPinchDistance.current = null;
  }, []);

  const handleFocusToken = useCallback((token: MapToken, setSelectedTokenId: (id: string | null) => void) => {
    if (!canvasRef.current || !activeChannelData) return;

    const vW = canvasRef.current.clientWidth;
    const vH = canvasRef.current.clientHeight;
    const { grille_taille } = activeChannelData;

    const targetZoom = Math.max(zoom, 1.2);
    const tokenCX = token.x + (grille_taille * token.taille) / 2;
    const tokenCY = token.y + (grille_taille * token.taille) / 2;

    const newPanX = vW / 2 - tokenCX * targetZoom;
    const newPanY = vH / 2 - tokenCY * targetZoom;

    setZoom(targetZoom);
    setPan(clampPan(newPanX, newPanY, targetZoom));
    setSelectedTokenId(token.id);
  }, [activeChannelData, zoom, clampPan, canvasRef]);

  const handleZoomIn = useCallback(() => {
    if (!canvasRef.current) return;
    const vW = canvasRef.current.clientWidth;
    const vH = canvasRef.current.clientHeight;
    const newZoom = Math.min(3, zoom * 1.15);
    const scale = newZoom / zoom;
    setZoom(newZoom);
    setPan(clampPan(vW / 2 - scale * (vW / 2 - pan.x), vH / 2 - scale * (vH / 2 - pan.y), newZoom));
  }, [zoom, pan, clampPan, canvasRef]);

  const handleZoomOut = useCallback(() => {
    if (!canvasRef.current) return;
    const vW = canvasRef.current.clientWidth;
    const vH = canvasRef.current.clientHeight;
    const newZoom = Math.max(0.2, zoom / 1.15);
    const scale = newZoom / zoom;
    setZoom(newZoom);
    setPan(clampPan(vW / 2 - scale * (vW / 2 - pan.x), vH / 2 - scale * (vH / 2 - pan.y), newZoom));
  }, [zoom, pan, clampPan, canvasRef]);

  const handleFitMap = useCallback(() => {
    if (canvasRef.current) applyFit(canvasRef.current);
  }, [applyFit, canvasRef]);

  const handleCenterMap = useCallback(() => {
    if (!canvasRef.current || !activeChannelData) return;
    const vW = canvasRef.current.clientWidth;
    const vH = canvasRef.current.clientHeight;
    const nat = getMapNatSize();
    const mapW = nat.w * zoom;
    const mapH = nat.h * zoom;
    setPan(clampPan((vW - mapW) / 2, (vH - mapH) / 2, zoom));
  }, [activeChannelData, getMapNatSize, zoom, clampPan, canvasRef]);

  return {
    zoom,
    setZoom,
    pan,
    setPan,
    isPanning,
    handleWheel,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasTouchStart,
    handleCanvasTouchMove,
    handleCanvasTouchEnd,
    handleFocusToken,
    handleZoomIn,
    handleZoomOut,
    handleFitMap,
    handleCenterMap,
    applyFit
  };
}
