import React from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { MapToken as MapTokenType, MapChannel } from '../../types';
import { Personnage } from '../../store/useStore';

// ─── Panel d'info flottant au-dessus du token sélectionné ────────────────────

interface TokenInfoPanelProps {
  token: MapTokenType;
  activeChannelData: MapChannel;
  isMJ: boolean;
  personnageLocal: Personnage | null;
  onToggleVisibilite: (id: string, visible: boolean) => void;
  onSupprimer: (id: string) => void;
}

function TokenInfoPanel({
  token: t,
  activeChannelData,
  isMJ,
  personnageLocal,
  onToggleVisibilite,
  onSupprimer,
}: TokenInfoPanelProps) {
  const canDelete = isMJ || (personnageLocal && t.id_personnage === personnageLocal.id);

  return (
    <div
      data-panel="true"
      className="absolute -top-14 left-1/2 -translate-x-1/2 z-50
        bg-[rgba(10,8,5,0.95)] border border-[rgba(184,142,60,0.25)]
        px-3 py-2 rounded-lg text-xs flex items-center gap-3
        whitespace-nowrap shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-cinzel font-bold text-[#e8d9b0] truncate max-w-[130px] text-[11px]">{t.nom}</span>
        <span className="text-[rgba(200,168,75,0.35)] text-[9px] font-mono">
          ({Math.round(t.x / activeChannelData.grille_taille)}, {Math.round(t.y / activeChannelData.grille_taille)})
        </span>
      </div>

      {(isMJ || canDelete) && (
        <div className="flex gap-1.5 border-l border-[rgba(184,142,60,0.15)] pl-3">
          {isMJ && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onToggleVisibilite(t.id, !t.visible); }}
              className="w-6 h-6 rounded flex items-center justify-center text-[rgba(200,168,75,0.45)] hover:text-[#c8a84b] hover:bg-[rgba(200,168,75,0.1)] transition-all"
              title={t.visible ? 'Masquer' : 'Afficher'}
            >
              {t.visible ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          )}
          {canDelete && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onSupprimer(t.id); }}
              className="w-6 h-6 rounded flex items-center justify-center text-[rgba(180,50,50,0.5)] hover:text-[#e87a7a] hover:bg-[rgba(180,50,50,0.12)] transition-all"
              title="Supprimer"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}

      {/* Flèche bas */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0
        border-l-[6px] border-r-[6px] border-t-[6px]
        border-l-transparent border-r-transparent border-t-[rgba(10,8,5,0.95)]"
      />
    </div>
  );
}

// ─── Token principal ──────────────────────────────────────────────────────────

interface MapTokenProps {
  token: MapTokenType;
  zoom: number;
  activeChannelData: MapChannel;
  isMJ: boolean;
  personnageLocal: Personnage | null;
  isRulerActive: boolean;
  isBeingDragged: boolean;
  dragPos: { x: number; y: number } | null;
  isSelected: boolean;
  canDrag: boolean;
  onMouseDown: (e: React.MouseEvent, t: MapTokenType) => void;
  onTouchStart: (e: React.TouchEvent, t: MapTokenType) => void;
  onClick: (e: React.MouseEvent, t: MapTokenType) => void;
  onToggleVisibilite: (id: string, visible: boolean) => void;
  onSupprimer: (id: string) => void;
}

export function MapToken({
  token: t,
  zoom,
  activeChannelData,
  isMJ,
  personnageLocal,
  isRulerActive,
  isBeingDragged,
  dragPos,
  isSelected,
  canDrag,
  onMouseDown,
  onTouchStart,
  onClick,
  onToggleVisibilite,
  onSupprimer,
}: MapTokenProps) {
  const { grille_taille } = activeChannelData;
  const gZoom = grille_taille * zoom;
  const displayX = isBeingDragged && dragPos ? dragPos.x : t.x * zoom;
  const displayY = isBeingDragged && dragPos ? dragPos.y : t.y * zoom;
  const sizePx = gZoom * t.taille;

  const cursor = isRulerActive
    ? 'cursor-crosshair'
    : canDrag
      ? 'cursor-grab active:cursor-grabbing'
      : 'cursor-default';

  return (
    <div
      data-token="true"
      className={`group absolute rounded-full flex items-center justify-center font-cinzel font-bold text-white select-none
        ${cursor}
        ${!t.visible
          ? 'opacity-40 border-2 border-dashed border-[rgba(180,50,50,0.6)]'
          : isSelected || isBeingDragged
            ? 'border-2 border-[rgba(200,168,75,0.7)] shadow-[0_0_0_3px_rgba(200,168,75,0.15)]'
            : 'border-2 border-[rgba(255,255,255,0.18)] hover:border-[rgba(200,168,75,0.5)] hover:scale-105'
        }
        ${isBeingDragged ? 'z-50 scale-110 shadow-2xl' : 'z-10 hover:z-20 transition-transform duration-150'}
      `}
      style={{
        width: sizePx,
        height: sizePx,
        left: displayX,
        top: displayY,
        fontSize: Math.max(8, sizePx * 0.3),
        backgroundColor: t.image_url ? 'transparent' : t.couleur,
        backgroundImage: t.image_url ? `url(${t.image_url})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        textShadow: '0 1px 3px rgba(0,0,0,0.9)',
      }}
      onMouseDown={e => onMouseDown(e, t)}
      onTouchStart={e => onTouchStart(e, t)}
      onClick={e => onClick(e, t)}
      title={t.nom + (isMJ && t.id_personnage ? ' (Lié)' : '')}
    >
      {!t.image_url && t.nom.substring(0, 2).toUpperCase()}

      {isSelected && !isBeingDragged && (
        <TokenInfoPanel
          token={t}
          activeChannelData={activeChannelData}
          isMJ={isMJ}
          personnageLocal={personnageLocal}
          onToggleVisibilite={onToggleVisibilite}
          onSupprimer={onSupprimer}
        />
      )}
    </div>
  );
}