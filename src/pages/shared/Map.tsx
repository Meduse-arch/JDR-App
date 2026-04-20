import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useStore, Personnage } from '../../store/useStore';
import { useMap } from '../../hooks/useMap';
import { supabase } from '../../supabase';
import { Lock, X } from 'lucide-react';
import MapHub from './MapHub';
import { MapCreationModal } from '../../components/map/MapCreationModal';
import { useMapDrag } from '../../hooks/useMapDrag';
import { useMapRuler } from '../../hooks/useMapRuler';
import { MapViewport } from '../../components/map/MapViewport';
import { useMapViewport } from '../../hooks/useMapViewport';
import { MapToolbar } from '../../components/map/MapToolbar';
import { Input } from '../../components/ui/Input';

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
  const [showTokensPanel, setShowTokensPanel] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showMapSidebar, setShowMapSidebar] = useState(false); 
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

  // --- VUE HUB : On garde le titre et le Header standard ---
  if (vue === 'hub') {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] relative">
        <MapHub
          channels={channels}
          roleEffectif={roleEffectif}
          channelActif={channelActif}
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

  // --- VUE CARTE ACTIVE : Remplit tout l'espace de contenu sans scroll ---
  return (
    <div
      className="absolute inset-0 z-10 bg-[#050402] flex overflow-hidden"
      onMouseMove={e => { handleMouseMove(e); handleRulerMove(e); handleCanvasMouseMove(e); }}
      onMouseUp={() => { handleMouseUp(); handleCanvasMouseUp(); }}
      onMouseLeave={() => { handleMouseUp(); handleCanvasMouseUp(); }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {isMapLocked && !isMJ && (
        <div className="absolute top-0 left-0 right-0 z-[60] bg-[rgba(180,50,50,0.12)] border-b border-[rgba(180,50,50,0.25)] text-[#e87a7a] py-1.5 text-center font-cinzel text-[11px] tracking-widest flex items-center justify-center gap-2">
          <Lock size={13} /> La carte est verrouillée par le MJ
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex h-full flex-shrink-0 relative">
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
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitMap={handleFitMap}
            onToggleRuler={toggleRuler}
            onRetourHub={() => { setVue('hub'); setChannelActif(null); }}
            onToggleTokenForm={() => setShowTokenForm(!showTokenForm)}
            onAjouterMonToken={handleAjouterMonToken}
            showTokensPanel={showTokensPanel}
            onToggleTokensPanel={() => setShowTokensPanel(p => !p)}
            showChatPanel={showChatPanel}
            onToggleChatPanel={() => setShowChatPanel(p => !p)}
            showMapList={showMapSidebar}
            onToggleMapList={() => setShowMapSidebar(s => !s)}
            onFocusToken={(t) => handleFocusToken(t, setSelectedTokenId)}
          />
          {showMapSidebar && (
            <MapHub
              channels={channels}
              roleEffectif={roleEffectif}
              channelActif={channelActif}
              mjVueMode="list"
              onEnterMap={(id) => { setChannelActif(id); }}
              onToggleChannel={toggleChannel}
              onDeleteChannel={supprimerChannel}
              onEditChannel={(id) => setEditingChannelId(id)}
              onCreateClick={() => setShowChannelForm(true)}
              sidebarOnly
            />
          )}

          {/* POPUP MJ : Création / Invocation de Token */}
          {isMJ && showTokenForm && (
            <div 
              className="absolute left-[56px] top-20 w-64 bg-[#0c0a07] border border-[#c8a84b]/30 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200"
              onMouseDown={e => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-[#c8a84b]/10 bg-[#c8a84b]/5 flex items-center justify-between">
                <span className="text-[10px] font-cinzel tracking-widest text-[#c8a84b] uppercase">Nouveau Token</span>
                <button onClick={() => setShowTokenForm(false)} className="text-[#c8a84b]/40 hover:text-[#c8a84b] transition-colors">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateToken} className="p-4 flex flex-col gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-cinzel text-[rgba(200,168,75,0.4)] uppercase ml-1">Lier un personnage</label>
                  <select
                    className="w-full bg-[#1a1612] border border-[#c8a84b]/30 rounded-lg px-2.5 py-2 text-[12px] text-[#e8d9b0] font-cinzel outline-none focus:border-[#c8a84b] transition-colors cursor-pointer"
                    value={newToken.id_personnage}
                    onChange={e => setNewToken({ ...newToken, id_personnage: e.target.value, nom: e.target.value ? '' : newToken.nom })}
                  >
                    <option value="" className="bg-[#1a1612] text-[#c8a84b]">— Token libre (PNJ / Objet) —</option>
                    {personnages
                      .filter(p => !p.is_template && !tokensActifs.some(t => t.id_personnage === p.id))
                      .map(p => (
                        <option key={p.id} value={p.id} className="bg-[#1a1612] text-[#e8d9b0]">
                          {p.nom}
                        </option>
                      ))
                    }
                  </select>
                </div>

                {!newToken.id_personnage && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-cinzel text-[rgba(200,168,75,0.4)] uppercase ml-1">Nom du token</label>
                      <Input
                        placeholder="Ex: Garde, Orc, Coffre..."
                        value={newToken.nom}
                        onChange={e => setNewToken({ ...newToken, nom: e.target.value })}
                        required
                        className="text-[11px] h-9 bg-black/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-cinzel text-[rgba(200,168,75,0.4)] uppercase ml-1">URL Image</label>
                      <Input
                        placeholder="https://..."
                        value={newToken.image_url}
                        onChange={e => setNewToken({ ...newToken, image_url: e.target.value })}
                        className="text-[11px] h-9 bg-black/40"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-cinzel text-[rgba(200,168,75,0.4)] uppercase ml-1">Couleur</label>
                    <div className="flex items-center gap-2 bg-black/40 border border-[rgba(184,142,60,0.15)] rounded-lg p-1">
                      <input
                        type="color"
                        value={newToken.couleur}
                        onChange={e => setNewToken({ ...newToken, couleur: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <span className="text-[10px] font-mono text-[rgba(200,168,75,0.5)] uppercase">{newToken.couleur}</span>
                    </div>
                  </div>
                  <div className="w-20 space-y-1">
                    <label className="text-[9px] font-cinzel text-[rgba(200,168,75,0.4)] uppercase ml-1">Taille</label>
                    <Input
                      type="number"
                      min="0.5" max="10" step="0.5"
                      value={newToken.taille}
                      onChange={e => setNewToken({ ...newToken, taille: parseFloat(e.target.value) || 1 })}
                      className="text-[11px] h-9 bg-black/40 text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 rounded-lg border border-[#c8a84b]/40 bg-[#c8a84b]/10 text-[#c8a84b] font-cinzel text-[11px] tracking-[.2em] hover:bg-[#c8a84b]/20 transition-all shadow-lg active:scale-[0.98]"
                >
                  Invoquer sur la carte
                </button>
              </form>
            </div>
          )}
        </div>

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
