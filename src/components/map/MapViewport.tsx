import React from 'react';
import { MapChannel, MapToken as MapTokenType } from '../../types';
import { Personnage } from '../../store/useStore';
import { MapGrid } from './MapGrid';
import { MapToken } from './MapToken';
import { MapChatPopup } from './MapChatPopup';
import { Move } from 'lucide-react';

interface MapViewportProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  mapRef: React.RefObject<HTMLDivElement>;
  activeChannelData?: MapChannel;
  channelActif: string | null;
  tokens: MapTokenType[];
  tokensActifs: MapTokenType[];
  isMJ: boolean;
  personnageLocal: Personnage | null;
  zoom: number;
  pan: { x: number; y: number };
  isPanning: boolean;
  isDragging: boolean;
  isRulerActive: boolean;
  rulerStart: { x: number; y: number } | null;
  rulerEnd: { x: number; y: number } | null;
  rulerCurrentPos: { x: number; y: number } | null;
  currentRulerDistance?: { distCells: string; x: number; y: number } | null;
  draggedToken: { id: string } | null;
  dragPos: { x: number; y: number } | null;
  selectedTokenId: string | null;
  showMapChat: boolean;
  
  handleWheel: (e: React.WheelEvent) => void;
  handleCanvasMouseDown: (e: React.MouseEvent) => void;
  handleCanvasTouchStart: (e: React.TouchEvent) => void;
  handleCanvasTouchMove: (e: React.TouchEvent) => void;
  handleCanvasTouchEnd: (e: React.TouchEvent) => void;
  handleMapClick: (e: React.MouseEvent) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleFitMap: () => void;
  toggleRuler: () => void;
  setShowMapChat: (show: boolean | ((prev: boolean) => boolean)) => void;
  canDragToken: (t: MapTokenType) => boolean;
  handleMouseDown: (e: React.MouseEvent, t: MapTokenType) => void;
  handleTouchStart: (e: React.TouchEvent, t: MapTokenType) => void;
  setSelectedTokenId: (id: string | null | ((prev: string | null) => string | null)) => void;
  toggleVisibilite: (id: string, visible: boolean) => void;
  supprimerToken: (id: string) => void;
}

export function MapViewport({
  canvasRef,
  mapRef,
  activeChannelData,
  channelActif,
  tokens,
  tokensActifs,
  isMJ,
  personnageLocal,
  zoom,
  pan,
  isPanning,
  isDragging,
  isRulerActive,
  rulerStart,
  rulerEnd,
  rulerCurrentPos,
  currentRulerDistance,
  draggedToken,
  dragPos,
  selectedTokenId,
  showMapChat,

  handleWheel,
  handleCanvasMouseDown,
  handleCanvasTouchStart,
  handleCanvasTouchMove,
  handleCanvasTouchEnd,
  handleMapClick,
  setShowMapChat,
  canDragToken,
  handleMouseDown,
  handleTouchStart,
  setSelectedTokenId,
  toggleVisibilite,
  supprimerToken,
}: MapViewportProps) {
  const mapW = activeChannelData ? activeChannelData.largeur * activeChannelData.grille_taille * zoom : 0;
  const mapH = activeChannelData ? activeChannelData.hauteur * activeChannelData.grille_taille * zoom : 0;

  const canvasCursor = isRulerActive
    ? 'cursor-crosshair'
    : isDragging || isPanning
      ? 'cursor-grabbing'
      : 'cursor-grab';

  return (
    <div
      ref={canvasRef}
      className={`flex-1 relative overflow-hidden bg-[#0d0b08] select-none ${canvasCursor}`}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onTouchStart={handleCanvasTouchStart}
      onTouchMove={handleCanvasTouchMove}
      onTouchEnd={handleCanvasTouchEnd}
      onClick={handleMapClick}
    >
      {activeChannelData ? (
        <>
          {/* Canvas pan+zoom */}
          <div
            ref={mapRef}
            className="absolute origin-top-left"
            style={{
              width: mapW,
              height: mapH,
              transform: `translate(${pan.x}px, ${pan.y}px)`,
              willChange: 'transform',
            }}
          >
            {/* Image de fond */}
            {activeChannelData.image_url && (
              <img
                src={activeChannelData.image_url}
                alt={activeChannelData.nom}
                className="absolute inset-0 w-full h-full object-contain opacity-80 pointer-events-none"
                draggable={false}
              />
            )}

            <MapGrid activeChannelData={activeChannelData} zoom={zoom} />

            {/* Règle SVG */}
            {isRulerActive && rulerStart && (
              <svg className="absolute inset-0 pointer-events-none z-40" style={{ width: '100%', height: '100%' }}>
                <circle cx={rulerStart.x * zoom} cy={rulerStart.y * zoom} r={4} fill="#c8a84b" />
                {(rulerEnd || rulerCurrentPos) && (
                  <>
                    <line
                      x1={rulerStart.x * zoom} y1={rulerStart.y * zoom}
                      x2={(rulerEnd || rulerCurrentPos)!.x * zoom}
                      y2={(rulerEnd || rulerCurrentPos)!.y * zoom}
                      stroke="#c8a84b" strokeWidth="1.5" strokeDasharray="5 4"
                    />
                    <circle
                      cx={(rulerEnd || rulerCurrentPos)!.x * zoom}
                      cy={(rulerEnd || rulerCurrentPos)!.y * zoom}
                      r={4} fill="#c8a84b"
                    />
                  </>
                )}
              </svg>
            )}

            {/* Tokens */}
            {tokens
              .filter(t => isMJ || t.visible)
              .map(t => (
                <MapToken
                  key={t.id}
                  token={t}
                  zoom={zoom}
                  activeChannelData={activeChannelData}
                  isMJ={isMJ}
                  personnageLocal={personnageLocal}
                  isRulerActive={isRulerActive}
                  isBeingDragged={draggedToken?.id === t.id}
                  dragPos={dragPos}
                  isSelected={selectedTokenId === t.id}
                  canDrag={canDragToken(t)}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDragging) setSelectedTokenId(prev => prev === t.id ? null : t.id);
                  }}
                  onToggleVisibilite={toggleVisibilite}
                  onSupprimer={supprimerToken}
                />
              ))}
          </div>

          {/* Distance règle — dans le viewport */}
          {currentRulerDistance && (
            <div
              className="absolute z-50 pointer-events-none
                bg-[rgba(10,8,5,0.9)] border border-[rgba(200,168,75,0.3)]
                text-[#c8a84b] font-cinzel text-[11px] tracking-wider
                px-2.5 py-1 rounded-md shadow-lg"
              style={{
                left: currentRulerDistance.x * zoom + pan.x + 12,
                top: currentRulerDistance.y * zoom + pan.y + 12,
              }}
            >
              {currentRulerDistance.distCells} cases
            </div>
          )}

          {/* Hint navigation */}
          {!isPanning && !isRulerActive && !draggedToken && (
            <div className="absolute bottom-12 right-3 text-[rgba(200,168,75,0.15)] text-[9px] font-cinzel uppercase tracking-widest pointer-events-none select-none">
              Glisser · Molette
            </div>
          )}

          {/* ── Pop-up chat contextuel de la map ── */}
          {showMapChat && channelActif && (
            <MapChatPopup
              channelId={channelActif}
              channelNom={activeChannelData.nom}
              tokensOnMap={tokensActifs}
              onClose={() => setShowMapChat(false)}
            />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-[rgba(200,168,75,0.2)] font-cinzel gap-3">
          <Move size={40} className="opacity-30" />
          <span className="text-sm tracking-widest">
            {isMJ ? 'Sélectionnez ou créez une carte' : "Aucune carte n'est ouverte"}
          </span>
        </div>
      )}
    </div>
  );
}
