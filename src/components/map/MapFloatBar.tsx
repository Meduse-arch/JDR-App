import React from 'react';
import { ZoomIn, ZoomOut, Maximize, Ruler, MessageSquare } from 'lucide-react';

interface MapFloatBarProps {
  zoom: number;
  isRulerActive: boolean;
  showMapChat: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitMap: () => void;
  onToggleRuler: () => void;
  onToggleMapChat: () => void;
}

const FBtn = ({
  onClick,
  active = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    title={title}
    className={`w-[30px] h-[30px] rounded-md flex items-center justify-center transition-all duration-150
      ${active
        ? 'bg-[rgba(200,168,75,0.18)] text-[#c8a84b] border border-[rgba(200,168,75,0.35)]'
        : 'bg-[rgba(200,168,75,0.04)] border border-[rgba(184,142,60,0.15)] text-[rgba(200,168,75,0.45)] hover:bg-[rgba(200,168,75,0.1)] hover:text-[rgba(200,168,75,0.8)]'
      }`}
  >
    {children}
  </button>
);

export function MapFloatBar({
  zoom,
  isRulerActive,
  showMapChat,
  onZoomIn,
  onZoomOut,
  onFitMap,
  onToggleRuler,
  onToggleMapChat,
}: MapFloatBarProps) {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2
      bg-[rgba(10,8,5,0.88)] border border-[rgba(184,142,60,0.18)] rounded-lg px-2.5 py-1.5
      shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
      <FBtn onClick={onZoomOut} title="Dézoomer (−)">
        <ZoomOut size={13} />
      </FBtn>

      <span className="font-mono text-[11px] text-[rgba(200,168,75,0.65)] min-w-[38px] text-center select-none">
        {Math.round(zoom * 100)}%
      </span>

      <FBtn onClick={onZoomIn} title="Zoomer (+)">
        <ZoomIn size={13} />
      </FBtn>

      <div className="w-px h-5 bg-[rgba(184,142,60,0.15)]" />

      <FBtn onClick={onToggleRuler} active={isRulerActive} title="Règle">
        <Ruler size={13} />
      </FBtn>

      <FBtn onClick={onFitMap} title="Ajuster à l'écran">
        <Maximize size={13} />
      </FBtn>

      <div className="w-px h-5 bg-[rgba(184,142,60,0.15)]" />

      <button
        onClick={onToggleMapChat}
        className={`w-8 h-8 flex items-center justify-center rounded-md border transition-all
          ${showMapChat
            ? 'bg-[rgba(200,168,75,0.18)] border-[rgba(200,168,75,0.4)] text-[#c8a84b] shadow-[0_0_8px_rgba(200,168,75,0.15)]'
            : 'bg-[rgba(200,168,75,0.04)] border-[rgba(200,168,75,0.15)] text-[rgba(200,168,75,0.4)] hover:text-[#c8a84b] hover:border-[rgba(200,168,75,0.35)]'
          }`}
        title="Chat de la carte"
      >
        <MessageSquare size={14} />
      </button>
    </div>
  );
}
