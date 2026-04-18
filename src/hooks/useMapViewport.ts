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

  const getMapNatSize = useCallback(() => {
    if (!activeChannelData) return { w: 0, h: 0 };
    return {
      w: activeChannelData.largeur * activeChannelData.grille_taille,
      h: activeChannelData.hauteur * activeChannelData.grille_taille,
    };
  }, [activeChannelData]);

  const clampPan = useCallback((px: number, py: number, z: number) => {
    if (!activeChannelData || !canvasRef.current) return { x: px, y: py };
    const vW = canvasRef.current.clientWidth;
    const vH = canvasRef.current.clientHeight;
    const nat = getMapNatSize();
    const mapW = nat.w * z;
    const mapH = nat.h * z;
    const clampAxis = (p: number, mapSize: number, viewSize: number) =>
      mapSize <= viewSize ? (viewSize - mapSize) / 2 : Math.max(viewSize - mapSize, Math.min(0, p));
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
  }, [activeChannelData, getMapNatSize]);

  useEffect(() => {
    if (!activeChannelData) return;
    const el = canvasRef.current;
    if (!el) return;
    if (el.clientWidth > 0 && el.clientHeight > 0) { applyFit(el); return; }
    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) { applyFit(el); ro.disconnect(); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [channelActif, activeChannelData, applyFit, canvasRef]);

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
    handleFocusToken,
    handleZoomIn,
    handleZoomOut,
    handleFitMap,
    applyFit
  };
}
