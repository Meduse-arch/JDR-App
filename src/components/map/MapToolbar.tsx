import React from 'react';
import { ArrowLeft, Ruler, ZoomIn, ZoomOut, Maximize, Plus, Users, MessageSquare } from 'lucide-react';
import { Input } from '../ui/Input';
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
  newToken: any;
  personnages: Personnage[];
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitMap?: () => void;
  onToggleRuler: () => void;
  onRetourHub: () => void;
  onToggleTokenForm: () => void;
  onNewTokenChange: (t: any) => void;
  onCreateToken: (e: React.FormEvent) => void;
  onAjouterMonToken: () => void;
  // Panel latéral tokens (MJ)
  showTokensPanel: boolean;
  onToggleTokensPanel: () => void;
  // Panel latéral chat (MJ)
  showChatPanel: boolean;
  onToggleChatPanel: () => void;
  // Zoom vers un token depuis la liste
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
          ? 'bg-[rgba(180,50,50,0.15)] text-[#e87a7a] border border-[rgba(180,50,50,0.3)]'
          : 'bg-[rgba(200,168,75,0.14)] text-[#c8a84b] border border-[rgba(200,168,75,0.28)]'
        : 'text-[rgba(200,168,75,0.35)] hover:text-[rgba(200,168,75,0.75)] hover:bg-[rgba(200,168,75,0.07)] border border-transparent'
      }`}
  >
    {active && (
      <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-[#c8a84b] rounded-r" />
    )}
    {children}
  </button>
);

const Sep = () => (
  <div className="w-6 h-px bg-[rgba(184,142,60,0.12)] mx-auto my-1" />
);

export function MapToolbar({
  isMJ,
  zoom,
  isRulerActive,
  tokens,
  channelActif,
  activeChannelData,
  personnageLocal,
  hasMyToken,
  showTokenForm,
  newToken,
  personnages,
  onZoomIn,
  onZoomOut,
  onFitMap,
  onToggleRuler,
  onRetourHub,
  onToggleTokenForm,
  onNewTokenChange,
  onCreateToken,
  onAjouterMonToken,
  showTokensPanel,
  onToggleTokensPanel,
  showChatPanel,
  onToggleChatPanel,
  onFocusToken,
}: MapToolbarProps) {

  // IDs des personnages dont le token est déjà posé sur la map
  const personnagesDejaPosésSurMap = new Set(
    tokens.filter(t => !!t.id_personnage).map(t => t.id_personnage!)
  );

  // Personnages disponibles : pas template, et dont le token n'est pas déjà posé
  const personnagesDisponibles = personnages.filter(p =>
    !p.is_template && !personnagesDejaPosésSurMap.has(p.id)
  );

  return (
    <div className="flex h-full gap-0 flex-shrink-0">

      {/* ── Sidebar icônes 52px ── */}
      <div className="w-[52px] flex-shrink-0 flex flex-col items-center py-2.5 gap-1
        bg-[#090805] border-r border-[rgba(184,142,60,0.1)]">

        <IconBtn onClick={onRetourHub} title="Retour aux cartes">
          <ArrowLeft size={15} />
        </IconBtn>

        <Sep />

        <IconBtn onClick={onToggleRuler} active={isRulerActive} title="Règle (mesure distance)">
          <Ruler size={15} />
        </IconBtn>

        {isMJ && (
          <IconBtn onClick={onToggleTokensPanel} active={showTokensPanel} title="Tokens">
            <Users size={15} />
          </IconBtn>
        )}

        {isMJ && (
          <IconBtn onClick={onToggleChatPanel} active={showChatPanel} title="Chat de la carte">
            <MessageSquare size={15} />
          </IconBtn>
        )}

        <Sep />

        {/* Zoom */}
        <IconBtn onClick={onZoomOut} title="Dézoomer">
          <ZoomOut size={15} />
        </IconBtn>

        <button
          className="w-9 h-5 flex items-center justify-center font-mono text-[10px] text-[rgba(200,168,75,0.55)] select-none cursor-default"
          title={`Zoom : ${Math.round(zoom * 100)}%`}
        >
          {Math.round(zoom * 100)}%
        </button>

        <IconBtn onClick={onZoomIn} title="Zoomer">
          <ZoomIn size={15} />
        </IconBtn>

        {onFitMap && (
          <IconBtn onClick={onFitMap} title="Ajuster à l'écran">
            <Maximize size={14} />
          </IconBtn>
        )}

        {/* Joueur : ajouter son token */}
        {!isMJ && activeChannelData?.active && (
          <>
            <Sep />
            <IconBtn
              onClick={onAjouterMonToken}
              active={!hasMyToken && !!personnageLocal}
              title={
                hasMyToken ? 'Token déjà placé'
                  : !personnageLocal ? 'Aucun personnage lié'
                    : 'Placer mon token'
              }
            >
              <Plus size={15} />
            </IconBtn>
          </>
        )}

        {/* Hint SHIFT en bas */}
        <div className="mt-auto mb-1 flex flex-col items-center gap-0.5">
          <div className="w-6 h-px bg-[rgba(184,142,60,0.08)]" />
          <span
            className="text-[7px] font-cinzel tracking-widest text-[rgba(200,168,75,0.18)] text-center leading-tight mt-1"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            SHIFT
          </span>
        </div>
      </div>

      {/* ── Panel tokens (MJ uniquement, escamotable) ── */}
      {isMJ && showTokensPanel && (
        <div className="w-48 flex-shrink-0 flex flex-col h-full
          bg-[#0c0a07] border-r border-[rgba(184,142,60,0.1)] overflow-hidden">

          <div className="px-3 pt-3 pb-2 border-b border-[rgba(184,142,60,0.08)] flex items-center justify-between">
            <span className="text-[9px] font-cinzel tracking-[.2em] text-[rgba(200,168,75,0.4)] uppercase">Tokens</span>
            {channelActif && (
              <button
                onClick={onToggleTokenForm}
                className="w-6 h-6 rounded flex items-center justify-center text-[rgba(200,168,75,0.35)] hover:text-[#c8a84b] hover:bg-[rgba(200,168,75,0.08)] transition-all"
                title="Nouveau token"
              >
                <Plus size={13} />
              </button>
            )}
          </div>

          {/* Formulaire création token */}
          {showTokenForm && (
            <form
              onSubmit={onCreateToken}
              className="flex flex-col gap-2 px-3 py-2.5 border-b border-[rgba(184,142,60,0.08)] bg-[rgba(0,0,0,0.3)]"
            >
              <select
                className="w-full bg-[rgba(0,0,0,0.5)] border border-[rgba(184,142,60,0.15)] rounded px-2 py-1.5 text-[11px] text-[rgba(200,168,75,0.7)] font-cinzel outline-none focus:border-[rgba(200,168,75,0.4)] transition-colors"
                value={newToken.id_personnage}
                onChange={e => onNewTokenChange({ ...newToken, id_personnage: e.target.value, nom: e.target.value ? '' : newToken.nom })}
              >
                <option value="">— Token custom —</option>
                {personnagesDisponibles.map(p => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>

              {!newToken.id_personnage && (
                <>
                  <Input
                    placeholder="Nom"
                    value={newToken.nom}
                    onChange={e => onNewTokenChange({ ...newToken, nom: e.target.value })}
                    required
                    className="text-[11px] h-7"
                  />
                  <Input
                    placeholder="URL image"
                    value={newToken.image_url}
                    onChange={e => onNewTokenChange({ ...newToken, image_url: e.target.value })}
                    className="text-[11px] h-7"
                  />
                </>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newToken.couleur}
                  onChange={e => onNewTokenChange({ ...newToken, couleur: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0 flex-shrink-0"
                />
                <Input
                  type="number"
                  min="0.5" max="5" step="0.5"
                  value={newToken.taille}
                  onChange={e => onNewTokenChange({ ...newToken, taille: parseFloat(e.target.value) || 1 })}
                  placeholder="Taille"
                  className="flex-1 text-[11px] h-7"
                />
              </div>

              <button
                type="submit"
                className="w-full py-1.5 rounded border border-[rgba(200,168,75,0.3)] bg-[rgba(200,168,75,0.08)] text-[#c8a84b] font-cinzel text-[10px] tracking-wider hover:bg-[rgba(200,168,75,0.15)] transition-colors"
              >
                Ajouter
              </button>
            </form>
          )}

          {/* Liste des tokens — clic = zoom sur le token */}
          <div className="flex-1 overflow-y-auto custom-scrollbar py-1.5 px-2">
            {tokens.length === 0 ? (
              <p className="text-[10px] font-cinzel text-[rgba(200,168,75,0.2)] text-center py-4 italic">
                Aucun token
              </p>
            ) : (
              tokens.map(t => (
                <button
                  key={t.id}
                  onClick={() => onFocusToken(t)}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-[rgba(200,168,75,0.08)] transition-colors text-left"
                  title="Cliquer pour centrer sur ce token"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 border border-[rgba(255,255,255,0.15)]"
                    style={{ backgroundColor: t.couleur }}
                  />
                  <span className="text-[11px] text-[rgba(200,168,75,0.55)] truncate font-cinzel flex-1">{t.nom}</span>
                  {!t.visible && (
                    <span className="ml-auto text-[8px] text-[rgba(180,50,50,0.5)] flex-shrink-0">Caché</span>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="px-3 py-2 border-t border-[rgba(184,142,60,0.06)]">
            <p className="text-[9px] font-cinzel text-[rgba(200,168,75,0.18)] leading-snug">
              Clic pour centrer la vue
            </p>
          </div>
        </div>
      )}

      {/* ── Panel chat (MJ uniquement, escamotable) ── */}
      {isMJ && showChatPanel && (
        <div className="w-52 flex-shrink-0 flex flex-col h-full
          bg-[#0c0a07] border-r border-[rgba(184,142,60,0.1)] overflow-hidden">

          <div className="px-3 pt-3 pb-2 border-b border-[rgba(184,142,60,0.08)] flex items-center gap-2">
            <MessageSquare size={11} className="text-[rgba(200,168,75,0.4)]" />
            <span className="text-[9px] font-cinzel tracking-[.2em] text-[rgba(200,168,75,0.4)] uppercase">
              Chat carte
            </span>
          </div>

          <div className="flex-1 overflow-hidden min-h-0">
            <MapChatPanel
              channelId={channelActif}
              isMJ={isMJ}
              tokensOnMap={tokens}
            />
          </div>
        </div>
      )}
    </div>
  );
}