import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useStore, Personnage } from '../../store/useStore';
import { useMap } from '../../hooks/useMap';
import { supabase } from '../../supabase';
import { Lock } from 'lucide-react';
import MapHub from './MapHub';
import { MapCreationModal } from '../../components/map/MapCreationModal';
import { useMapDrag } from '../../hooks/useMapDrag';
import { useMapRuler } from '../../hooks/useMapRuler';
import { PlayerSidebar } from '../../components/map/PlayerSidebar';
import { MapViewport } from '../../components/map/MapViewport';
import { useMapViewport } from '../../hooks/useMapViewport';
import { MapToolbar } from '../../components/map/MapToolbar';

export default function CarteMap() {
  const { sessionActive, roleEffectif, personnageJoueur: personnage, compte } = useStore();
  const {
    channels,
    tokens,
    channelActif,
    setChannelActif,
    creerChannel,
    modifierChannel,
    supprimerChannel,
    toggleChannel,
    ajouterToken,
    deplacerToken,
    supprimerToken,
    toggleVisibilite,
    broadcastPosition,
  } = useMap(sessionActive?.id);

  const [personnages, setPersonnages] = useState<Personnage[]>([]);
  const [personnageLocal, setPersonnageLocal] = useState<Personnage | null>(null);

  useEffect(() => {
    async function loadPersonnageLocal() {
      if (roleEffectif === 'joueur' && sessionActive && compte) {
        const { data } = await supabase
          .from('personnages').select('*')
          .eq('id_session', sessionActive.id)
          .eq('lie_au_compte', compte.id)
          .single();
        if (data) setPersonnageLocal(data as Personnage);
      } else if (personnage) {
        setPersonnageLocal(personnage);
      }
    }
    loadPersonnageLocal();
  }, [roleEffectif, personnage, sessionActive, compte]);

  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const activeChannelData = useMemo(
    () => channels.find(c => c.id === channelActif),
    [channels, channelActif]
  );

  const {
    zoom, pan, isPanning,
    handleWheel, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp,
    handleFocusToken, handleZoomIn, handleZoomOut, handleFitMap
  } = useMapViewport({ activeChannelData, canvasRef, channelActif });

  const [vue, setVue] = useState<'hub' | 'map'>('hub');
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  const [showChannelForm, setShowChannelForm] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [showTokensPanel, setShowTokensPanel] = useState(true);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [mjVueMode, setMjVueMode] = useState<'grid' | 'list'>('grid');
  const [newToken, setNewToken] = useState({
    nom: '', image_url: '', couleur: '#c8a84b', taille: 1, id_personnage: ''
  });

  const [showMapChat, setShowMapChat] = useState(false);
  useEffect(() => { setShowMapChat(false); }, [channelActif]);

  useEffect(() => {
    async function loadPersonnages() {
      if (!sessionActive || (roleEffectif !== 'admin' && roleEffectif !== 'mj')) return;
      const { data } = await supabase.from('personnages').select('*').eq('id_session', sessionActive.id);
      if (data) setPersonnages(data as Personnage[]);
    }
    loadPersonnages();
  }, [sessionActive, roleEffectif]);

  const isMJ = roleEffectif === 'admin' || roleEffectif === 'mj';
  const isMapLocked = !isMJ && activeChannelData && !activeChannelData.active;
  const hasMyToken = personnageLocal
    ? tokens.some(t => t.id_personnage === personnageLocal.id)
    : false;

  const tokensActifs = useMemo(
    () => tokens.filter(t => t.id_channel === channelActif),
    [tokens, channelActif]
  );

  const {
    isRulerActive, rulerStart, rulerEnd, rulerCurrentPos,
    toggleRuler, handleRulerClick, handleRulerMove, renderRulerDistance,
  } = useMapRuler({ zoom, activeChannelData, mapRef, setSelectedTokenId });

  const handleMapClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-token]') && !target.closest('[data-panel]')) {
      setSelectedTokenId(null);
    }
    handleRulerClick(e);
  }, [handleRulerClick]);

  const {
    draggedToken, dragPos, isDragging, canDragToken,
    handleMouseDown, handleMouseMove, handleMouseUp,
    handleTouchStart, handleTouchMove, handleTouchEnd,
  } = useMapDrag({
    zoom, activeChannelData, mapRef, deplacerToken,
    onBroadcastPosition: broadcastPosition,
    isMJ, personnageLocal, isRulerActive,
    selectedTokenId, tokens,
  });

  const handleCreateChannel = async (data: {
    nom: string; image_url: string; largeur: number; hauteur: number; grille_taille: number;
  }) => {
    if (editingChannelId) {
      await modifierChannel(editingChannelId, data);
    } else {
      await creerChannel(data.nom, data.image_url, data.largeur, data.hauteur, data.grille_taille);
    }
    setShowChannelForm(false);
    setEditingChannelId(null);
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelActif) return;
    let nom = newToken.nom;
    let image_url = newToken.image_url;
    let couleur = newToken.couleur;
    if (newToken.id_personnage) {
      const p = personnages.find(p => p.id === newToken.id_personnage);
      if (p) { nom = p.nom; image_url = p.image_url || ''; couleur = p.couleur || newToken.couleur; }
    }
    await ajouterToken({
      id_channel: channelActif,
      nom, image_url, couleur,
      taille: newToken.taille,
      x: 0, y: 0, visible: true,
      id_personnage: newToken.id_personnage || null,
    });
    setNewToken({ nom: '', image_url: '', couleur: '#c8a84b', taille: 1, id_personnage: '' });
    setShowTokenForm(false);
  };

  const handleAjouterMonToken = async () => {
    if (!channelActif || !personnageLocal || hasMyToken) return;
    await ajouterToken({
      id_channel: channelActif,
      nom: personnageLocal.nom,
      image_url: personnageLocal.image_url || '',
      couleur: personnageLocal.couleur || '#c8a84b',
      taille: 1, x: 0, y: 0, visible: true,
      id_personnage: personnageLocal.id,
    });
  };

  if (sessionActive && (showChannelForm || editingChannelId !== null)) {
    return (
      <MapCreationModal
        sessionId={sessionActive.id}
        onClose={() => { setShowChannelForm(false); setEditingChannelId(null); }}
        onSubmit={handleCreateChannel}
        initialData={editingChannelId ? (() => {
          const c = channels.find(ch => ch.id === editingChannelId);
          if (!c) return undefined;
          return {
            nom: c.nom,
            image_url: c.image_url || '',
            largeur: c.largeur,
            hauteur: c.hauteur,
            grille_taille: c.grille_taille
          };
        })() : undefined}
      />
    );
  }

  if (vue === 'hub') {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] relative">
        <MapHub
          channels={channels}
          roleEffectif={roleEffectif}
          channelActif={channelActif}
          mjVueMode={mjVueMode}
          onToggleMjVueMode={() => setMjVueMode(m => m === 'grid' ? 'list' : 'grid')}
          onEnterMap={(id) => { setChannelActif(id); setVue('map'); }}
          onToggleChannel={toggleChannel}
          onDeleteChannel={supprimerChannel}
          onEditChannel={(id) => setEditingChannelId(id)}
          onCreateClick={() => setShowChannelForm(true)}
        />
      </div>
    );
  }

  const currentRulerDistance = renderRulerDistance();

  return (
    <div
      className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] relative overflow-hidden"
      onMouseMove={e => { handleMouseMove(e); handleRulerMove(e); handleCanvasMouseMove(e); }}
      onMouseUp={() => { handleMouseUp(); handleCanvasMouseUp(); }}
      onMouseLeave={() => { handleMouseUp(); handleCanvasMouseUp(); }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {isMapLocked && !isMJ && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-[rgba(180,50,50,0.12)] border-b border-[rgba(180,50,50,0.25)] text-[#e87a7a] py-1.5 text-center font-cinzel text-[11px] tracking-widest flex items-center justify-center gap-2">
          <Lock size={13} /> La carte est verrouillée par le MJ
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {!isMJ && (
          <PlayerSidebar
            channels={channels.filter(c => c.active)}
            channelActif={channelActif}
            onEnterMap={(id) => { setChannelActif(id); setVue('map'); }}
            personnageLocal={personnageLocal}
            hasMyToken={hasMyToken}
            onAjouterMonToken={handleAjouterMonToken}
            mapActive={true}
          />
        )}

        {isMJ && (
          <div className="flex h-full flex-shrink-0">
            <MapToolbar
              isMJ={isMJ}
              zoom={zoom}
              isRulerActive={isRulerActive}
              tokens={tokensActifs}
              channelActif={channelActif}
              activeChannelData={activeChannelData}
              personnageLocal={personnageLocal}
              hasMyToken={hasMyToken}
              showTokenForm={showTokenForm}
              newToken={newToken}
              personnages={personnages}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onFitMap={handleFitMap}
              onToggleRuler={toggleRuler}
              onRetourHub={() => { setVue('hub'); setChannelActif(null); }}
              onToggleTokenForm={() => setShowTokenForm(!showTokenForm)}
              onNewTokenChange={setNewToken}
              onCreateToken={handleCreateToken}
              onAjouterMonToken={handleAjouterMonToken}
              showTokensPanel={showTokensPanel}
              onToggleTokensPanel={() => setShowTokensPanel(p => !p)}
              showChatPanel={showChatPanel}
              onToggleChatPanel={() => setShowChatPanel(p => !p)}
              onFocusToken={(t) => handleFocusToken(t, setSelectedTokenId)}
            />
            {mjVueMode === 'list' && (
              <MapHub
                channels={channels}
                roleEffectif={roleEffectif}
                channelActif={channelActif}
                mjVueMode={mjVueMode}
                onToggleMjVueMode={() => setMjVueMode(m => m === 'grid' ? 'list' : 'grid')}
                onEnterMap={(id) => { setChannelActif(id); }}
                onToggleChannel={toggleChannel}
                onDeleteChannel={supprimerChannel}
                onEditChannel={(id) => setEditingChannelId(id)}
                onCreateClick={() => setShowChannelForm(true)}
                sidebarOnly
              />
            )}
          </div>
        )}

        <MapViewport
          canvasRef={canvasRef}
          mapRef={mapRef}
          activeChannelData={activeChannelData}
          channelActif={channelActif}
          tokens={tokens}
          tokensActifs={tokensActifs}
          isMJ={isMJ}
          personnageLocal={personnageLocal}
          zoom={zoom}
          pan={pan}
          isPanning={isPanning}
          isDragging={isDragging}
          isRulerActive={isRulerActive}
          rulerStart={rulerStart}
          rulerEnd={rulerEnd}
          rulerCurrentPos={rulerCurrentPos}
          currentRulerDistance={currentRulerDistance}
          draggedToken={draggedToken}
          dragPos={dragPos}
          selectedTokenId={selectedTokenId}
          showMapChat={showMapChat}
          handleWheel={handleWheel}
          handleCanvasMouseDown={(e) => handleCanvasMouseDown(e, isRulerActive)}
          handleMapClick={handleMapClick}
          handleZoomIn={handleZoomIn}
          handleZoomOut={handleZoomOut}
          handleFitMap={handleFitMap}
          toggleRuler={toggleRuler}
          setShowMapChat={setShowMapChat}
          canDragToken={canDragToken}
          handleMouseDown={handleMouseDown}
          handleTouchStart={handleTouchStart}
          setSelectedTokenId={setSelectedTokenId}
          toggleVisibilite={toggleVisibilite}
          supprimerToken={supprimerToken}
        />
      </div>
    </div>
  );
}
