import React from 'react';
import { ArrowLeft, Ruler, ZoomIn, ZoomOut, Maximize, Plus, Users, MessageSquare, Map as MapIcon, UserPlus } from 'lucide-react';
import { MapToken, MapChannel } from '../../types';
import { Personnage } from '../../store/useStore';
import { MapChatPanel } from './MapChatPanel';

interface MapToolbarProps {
  isMJ: boolean;
  zoom: number;
  isRulerActive: boolean;
  tokens: MapToken[];
  channelActif: string | null;
  activeChannelData: MapChannel | undefined;
  personnageLocal: Personnage | null;
  hasMyToken: boolean;
  showTokenForm: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitMap?: () => void;
  onToggleRuler: () => void;
  onRetourHub: () => void;
  onToggleTokenForm: () => void;
  onAjouterMonToken: () => void;
  showTokensPanel: boolean;
  onToggleTokensPanel: () => void;
  showChatPanel: boolean;
  onToggleChatPanel: () => void;
  showMapList?: boolean;
  onToggleMapList?: () => void;
  onFocusToken: (token: MapToken) => void;
}

const IconBtn = ({
  onClick,
  active = false,
  title,
  children,
  danger = false,
}: {
  onClick?: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
  danger?: boolean;
}) => (
  <button
    onClick={onClick}
    title={title}
    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 relative
      ${active
        ? danger
          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
          : 'bg-[#c8a84b]/15 text-[#c8a84b] border border-[#c8a84b]/30'
        : 'text-[#c8a84b]/35 hover:text-[#c8a84b]/80 hover:bg-[#c8a84b]/5 border border-transparent'
      }`}
  >
    {active && <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-[#c8a84b] rounded-r" />}
    {children}
  </button>
);

const Sep = () => <div className="w-6 h-px bg-[#c8a84b]/10 mx-auto my-1" />;

export function MapToolbar({
  isMJ, zoom, isRulerActive, tokens, channelActif,
  personnageLocal, hasMyToken, showTokenForm, onZoomIn, onZoomOut, onFitMap,
  onToggleRuler, onRetourHub, onToggleTokenForm, onAjouterMonToken,
  showTokensPanel, onToggleTokensPanel, showChatPanel, onToggleChatPanel,
  showMapList, onToggleMapList, onFocusToken,
}: MapToolbarProps) {

  return (
    <div className="flex h-full gap-0 flex-shrink-0">
      {/* ── Sidebar icônes 52px ── */}
      <div className="w-[52px] flex-shrink-0 flex flex-col items-center py-2.5 gap-1 bg-[#090805] border-r border-[#c8a84b]/10">
        <IconBtn onClick={onRetourHub} title="Retour au Hub"><ArrowLeft size={15} /></IconBtn>
        {onToggleMapList && <IconBtn onClick={onToggleMapList} active={showMapList} title="Liste des cartes"><MapIcon size={15} /></IconBtn>}
        <Sep />
        <IconBtn onClick={onToggleRuler} active={isRulerActive} title="Règle de mesure"><Ruler size={15} /></IconBtn>
        <IconBtn onClick={onToggleTokensPanel} active={showTokensPanel} title="Liste des tokens"><Users size={15} /></IconBtn>
        <IconBtn onClick={onToggleChatPanel} active={showChatPanel} title="Chat de la carte"><MessageSquare size={15} /></IconBtn>
        {channelActif && (
          <IconBtn
            onClick={isMJ ? onToggleTokenForm : onAjouterMonToken}
            active={isMJ ? showTokenForm : (!hasMyToken && !!personnageLocal)}
            title={isMJ ? 'Nouveau token' : 'Poser mon personnage'}
          >
            {isMJ ? <Plus size={16} /> : <UserPlus size={16} />}
          </IconBtn>
        )}
        <Sep />
        <IconBtn onClick={onZoomOut} title="Dézoomer"><ZoomOut size={15} /></IconBtn>
        <div className="w-full h-4 flex items-center justify-center font-mono text-[9px] text-[#c8a84b]/40 select-none tracking-tighter">{Math.round(zoom * 100)}%</div>
        <IconBtn onClick={onZoomIn} title="Zoomer"><ZoomIn size={15} /></IconBtn>
        {onFitMap && <IconBtn onClick={onFitMap} title="Ajuster à l'écran"><Maximize size={14} /></IconBtn>}
      </div>

      {/* ── Panel tokens ── */}
      {showTokensPanel && (
        <div className="w-48 flex-shrink-0 flex flex-col h-full bg-[#0c0a07] border-r border-[#c8a84b]/10 overflow-hidden">
          <div className="px-3 py-2 border-b border-[#c8a84b]/5"><span className="text-[9px] font-cinzel tracking-[.15em] text-[#c8a84b]/50 uppercase">Tokens</span></div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {(() => {
              const displayedTokens = isMJ ? tokens : tokens.filter(t => t.visible);
              return displayedTokens.length === 0 ? <p className="text-[10px] font-cinzel text-white/10 text-center py-6 italic opacity-50">Aucun token</p> :
              displayedTokens.map(t => (
                <button key={t.id} onClick={() => onFocusToken(t)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-white/5 text-left truncate group transition-all">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: t.couleur }} />
                  <span className="text-[11px] text-white/40 font-cinzel truncate flex-1 group-hover:text-white/80 transition-colors">{t.nom}</span>
                  {isMJ && !t.visible && <span className="text-[7px] font-cinzel text-red-500/50 uppercase tracking-tighter">Caché</span>}
                </button>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ── Panel chat ── */}
      {showChatPanel && (
        <div className="w-64 flex-shrink-0 flex flex-col h-full bg-[#0c0a07] border-r border-[#c8a84b]/10 overflow-hidden" onMouseDown={e => e.stopPropagation()}>
          <div className="px-3 py-2 border-b border-[#c8a84b]/5 flex items-center gap-2">
            <MessageSquare size={11} className="text-[#c8a84b]/30" />
            <span className="text-[9px] font-cinzel tracking-[.15em] text-[#c8a84b]/50 uppercase">Chat carte</span>
          </div>
          <div className="flex-1 overflow-hidden"><MapChatPanel channelId={channelActif} isMJ={isMJ} tokensOnMap={tokens} /></div>
        </div>
      )}
    </div>
  );
}
