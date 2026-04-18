import React, { useState } from 'react';
import { MapChannel } from '../../types';
import { Plus, Pencil, Lock, Unlock, Trash2, Map as MapIcon, LogIn, LayoutGrid, List } from 'lucide-react';

interface MapHubProps {
  channels: MapChannel[];
  roleEffectif: string | null;
  channelActif: string | null;
  mjVueMode?: 'grid' | 'list';
  onToggleMjVueMode?: () => void;
  onEnterMap: (id: string) => void;
  onToggleChannel: (id: string, active: boolean) => void;
  onDeleteChannel: (id: string) => void;
  onCreateClick: () => void;
  onEditChannel: (id: string) => void;
  /** Si true, affiche uniquement la sidebar liste (mode MJ avec map ouverte) */
  sidebarOnly?: boolean;
}

export default function MapHub({
  channels,
  roleEffectif,
  channelActif,
  mjVueMode = 'grid',
  onToggleMjVueMode,
  onEnterMap,
  onToggleChannel,
  onDeleteChannel,
  onCreateClick,
  onEditChannel,
  sidebarOnly = false,
}: MapHubProps) {
  const isMJ = roleEffectif === 'admin' || roleEffectif === 'mj';
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const visibleChannels = isMJ ? channels : channels.filter(c => c.active);
  const activeChannels = visibleChannels.filter(c => c.active);
  const lockedChannels = visibleChannels.filter(c => !c.active);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDeleteChannel(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 2500);
    }
  };

  // ─── Vue Joueur : sidebar style Discord ───────────────────────────────────────
  if (!isMJ) {
    if (visibleChannels.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-[#8a7a5a]">
          <MapIcon size={40} className="opacity-20" />
          <p className="font-cinzel text-sm tracking-widest opacity-50">Le Maître du Jeu prépare la carte…</p>
        </div>
      );
    }

    return (
      <div className="flex h-full overflow-hidden">
        {/* Sidebar channels */}
        <div className="w-56 flex-shrink-0 flex flex-col h-full bg-[#09080580] border-r border-[rgba(184,142,60,0.12)]">
          <div className="px-3 pt-4 pb-3 border-b border-[rgba(184,142,60,0.1)]">
            <p className="text-[9px] font-cinzel tracking-[.25em] text-[rgba(200,168,75,0.35)] uppercase">Cartes</p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar py-2 px-2">
            {activeChannels.length > 0 && (
              <>
                <p className="text-[8px] font-cinzel tracking-[.2em] text-[rgba(200,168,75,0.25)] uppercase px-2 pt-2 pb-1">Actives</p>
                {activeChannels.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onEnterMap(c.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md mb-0.5 text-left transition-all duration-150
                      ${channelActif === c.id
                        ? 'bg-[rgba(200,168,75,0.12)] border border-[rgba(200,168,75,0.22)]'
                        : 'hover:bg-[rgba(200,168,75,0.06)] border border-transparent'
                      }`}
                  >
                    <div className="w-8 h-6 rounded flex-shrink-0 overflow-hidden border border-[rgba(200,168,75,0.1)] bg-[#1a150a]">
                      {c.image_url && (
                        <img src={c.image_url} alt="" className="w-full h-full object-cover opacity-80" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-cinzel truncate leading-tight
                        ${channelActif === c.id ? 'text-[#c8a84b]' : 'text-[rgba(220,200,150,0.7)]'}`}>
                        {c.nom}
                      </p>
                    </div>
                    {channelActif === c.id && (
                      <LogIn size={10} className="text-[#c8a84b] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </>
            )}

            {lockedChannels.length > 0 && (
              <>
                <p className="text-[8px] font-cinzel tracking-[.2em] text-[rgba(200,168,75,0.2)] uppercase px-2 pt-3 pb-1">Verrouillées</p>
                {lockedChannels.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md mb-0.5 opacity-40 cursor-not-allowed border border-transparent"
                  >
                    <div className="w-8 h-6 rounded flex-shrink-0 bg-[#111] border border-[rgba(255,255,255,0.04)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-cinzel truncate text-[rgba(200,168,75,0.25)]">{c.nom}</p>
                      <p className="text-[8px] text-[rgba(180,80,80,0.6)] tracking-wider">Verrouillée</p>
                    </div>
                    <Lock size={9} className="text-[rgba(180,80,80,0.4)] flex-shrink-0" />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Zone de preview de la carte active */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {channelActif ? (
            <div className="flex-1 flex items-center justify-center text-[rgba(200,168,75,0.3)] font-cinzel text-sm tracking-widest">
              Entrez dans la carte pour jouer
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[rgba(200,168,75,0.25)]">
              <MapIcon size={36} className="opacity-30" />
              <p className="font-cinzel text-xs tracking-widest">Sélectionnez une carte</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Vue MJ sidebar (mode liste avec map ouverte) ────────────────────────────
  if (isMJ && sidebarOnly) {
    return (
      <div className="w-52 flex-shrink-0 flex flex-col h-full bg-[#09080580] border-r border-[rgba(184,142,60,0.12)]">
        <div className="px-3 pt-3 pb-2.5 border-b border-[rgba(184,142,60,0.1)] flex items-center justify-between">
          <p className="text-[9px] font-cinzel tracking-[.25em] text-[rgba(200,168,75,0.35)] uppercase">Cartes</p>
          <button
            onClick={onCreateClick}
            className="w-6 h-6 rounded flex items-center justify-center text-[rgba(200,168,75,0.35)] hover:text-[#c8a84b] hover:bg-[rgba(200,168,75,0.08)] transition-all"
            title="Nouvelle carte"
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar py-1.5 px-2">
          {visibleChannels.length === 0 && (
            <p className="text-[10px] font-cinzel text-[rgba(200,168,75,0.2)] text-center py-6 italic">Aucune carte</p>
          )}
          {visibleChannels.map(c => (
            <div
              key={c.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md mb-0.5 cursor-pointer group transition-all duration-150 border
                ${channelActif === c.id
                  ? 'bg-[rgba(200,168,75,0.11)] border-[rgba(200,168,75,0.22)]'
                  : 'hover:bg-[rgba(200,168,75,0.05)] border-transparent'
                }`}
              onClick={() => onEnterMap(c.id)}
            >
              <div className="w-8 h-[22px] rounded flex-shrink-0 overflow-hidden border border-[rgba(200,168,75,0.1)] bg-[#1a150a]">
                {c.image_url
                  ? <img src={c.image_url} alt="" className="w-full h-full object-cover opacity-75" />
                  : <div className="w-full h-full flex items-center justify-center"><MapIcon size={10} className="text-[rgba(200,168,75,0.2)]" /></div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-cinzel truncate leading-tight tracking-wide
                  ${channelActif === c.id ? 'text-[#c8a84b]' : 'text-[rgba(220,200,150,0.65)]'}`}>
                  {c.nom}
                </p>
                <p className={`text-[8px] font-cinzel tracking-wider mt-0.5
                  ${c.active ? 'text-[rgba(93,232,158,0.5)]' : 'text-[rgba(232,122,122,0.4)]'}`}>
                  {c.active ? 'Ouverte' : 'Verrouillée'}
                </p>
              </div>
              {/* Actions inline au hover */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); onEditChannel(c.id); }}
                  className="w-5 h-5 rounded flex items-center justify-center text-[rgba(200,168,75,0.35)] hover:text-[#c8a84b] hover:bg-[rgba(200,168,75,0.1)] transition-all"
                  title="Modifier"
                >
                  <Pencil size={9} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onToggleChannel(c.id, !c.active); }}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all
                    ${c.active ? 'text-[rgba(93,232,158,0.5)] hover:text-[#5de89e]' : 'text-[rgba(255,255,255,0.2)] hover:text-[#5de89e]'} hover:bg-[rgba(45,180,100,0.1)]`}
                  title={c.active ? 'Verrouiller' : 'Ouvrir'}
                >
                  {c.active ? <Unlock size={9} /> : <Lock size={9} />}
                </button>
                <button
                  onClick={e => handleDelete(e, c.id)}
                  className={`rounded flex items-center justify-center transition-all
                    ${confirmDeleteId === c.id
                      ? 'px-1 bg-[rgba(180,50,50,0.25)] border border-[rgba(180,50,50,0.4)] text-[#e87a7a] text-[7px] font-cinzel'
                      : 'w-5 h-5 text-[rgba(180,50,50,0.35)] hover:text-[#e87a7a] hover:bg-[rgba(180,50,50,0.1)]'
                    }`}
                  title="Supprimer"
                >
                  {confirmDeleteId === c.id ? '✓' : <Trash2 size={9} />}
                </button>
              </div>
              {channelActif === c.id && (
                <LogIn size={9} className="text-[rgba(200,168,75,0.5)] flex-shrink-0 ml-0.5" />
              )}
            </div>
          ))}
        </div>

        <div className="px-3 py-2 border-t border-[rgba(184,142,60,0.08)]">
          <p className="text-[8px] font-cinzel text-[rgba(200,168,75,0.18)] leading-snug">
            {channels.filter(c => c.active).length} ouverte{channels.filter(c => c.active).length > 1 ? 's' : ''} · {channels.length} total
          </p>
        </div>
      </div>
    );
  }

  // ─── Vue MJ : grille de cartes ────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-cinzel text-[18px] font-semibold tracking-[.2em] text-[#c8a84b]"
            style={{ textShadow: '0 0 20px rgba(200,168,75,0.25)' }}>
            Cartographie du Monde
          </h2>
          <p className="text-[9px] font-cinzel tracking-[.25em] text-[rgba(200,168,75,0.3)] mt-0.5">
            {channels.length} carte{channels.length > 1 ? 's' : ''} · {channels.filter(c => c.active).length} ouverte{channels.filter(c => c.active).length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle grille / liste */}
          {onToggleMjVueMode && (
            <button
              onClick={onToggleMjVueMode}
              title={mjVueMode === 'grid' ? 'Vue liste' : 'Vue grille'}
              className="flex items-center gap-1.5 border border-[rgba(200,168,75,0.2)] bg-[rgba(200,168,75,0.04)] text-[rgba(200,168,75,0.5)] px-2.5 py-2 rounded-md hover:bg-[rgba(200,168,75,0.1)] hover:text-[#c8a84b] hover:border-[rgba(200,168,75,0.4)] transition-all duration-150"
            >
              {mjVueMode === 'grid'
                ? <List size={14} />
                : <LayoutGrid size={14} />
              }
              <span className="font-cinzel text-[9px] tracking-[.12em]">
                {mjVueMode === 'grid' ? 'Liste' : 'Grille'}
              </span>
            </button>
          )}
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 border border-[rgba(200,168,75,0.35)] bg-[rgba(200,168,75,0.06)] text-[rgba(200,168,75,0.8)] px-3 py-2 rounded-md font-cinzel text-[10px] tracking-[.12em] hover:bg-[rgba(200,168,75,0.12)] hover:border-[rgba(200,168,75,0.6)] hover:text-[#c8a84b] transition-all duration-150"
          >
            <Plus size={13} />
            Nouvelle carte
          </button>
        </div>
      </div>

      {/* ── Vue liste style Discord ── */}
      {mjVueMode === 'list' ? (
        <div className="flex flex-col gap-1 max-w-xl">
          {visibleChannels.length === 0 && (
            <p className="font-cinzel text-[rgba(200,168,75,0.25)] text-sm text-center py-8 tracking-widest">
              Aucune carte
            </p>
          )}
          {visibleChannels.map(c => (
            <div
              key={c.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer group transition-all duration-150
                ${channelActif === c.id
                  ? 'bg-[rgba(200,168,75,0.09)] border-[rgba(200,168,75,0.22)]'
                  : 'bg-[rgba(200,168,75,0.02)] border-[rgba(184,142,60,0.1)] hover:bg-[rgba(200,168,75,0.06)] hover:border-[rgba(184,142,60,0.22)]'
                }`}
              onClick={() => onEnterMap(c.id)}
            >
              {/* Miniature */}
              <div className="w-10 h-7 rounded flex-shrink-0 overflow-hidden border border-[rgba(200,168,75,0.12)] bg-[#1a140a]">
                {c.image_url
                  ? <img src={c.image_url} alt="" className="w-full h-full object-cover opacity-80" />
                  : <div className="w-full h-full flex items-center justify-center"><MapIcon size={12} className="text-[rgba(200,168,75,0.2)]" /></div>
                }
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-cinzel text-[12px] tracking-wider text-[rgba(220,200,150,0.8)] truncate">
                    {c.nom}
                  </span>
                  <span className={`text-[8px] font-cinzel tracking-[.1em] px-1.5 py-0.5 rounded-sm border flex-shrink-0
                    ${c.active
                      ? 'bg-[rgba(45,180,100,0.12)] text-[rgba(93,232,158,0.8)] border-[rgba(45,180,100,0.2)]'
                      : 'bg-[rgba(180,50,50,0.1)] text-[rgba(232,122,122,0.7)] border-[rgba(180,50,50,0.2)]'
                    }`}>
                    {c.active ? 'Ouverte' : 'Verrouillée'}
                  </span>
                </div>
                <p className="text-[9px] font-cinzel text-[rgba(200,168,75,0.3)] tracking-wider mt-0.5">
                  {c.largeur} × {c.hauteur} cases
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); onEditChannel(c.id); }}
                  className="w-7 h-7 rounded bg-[rgba(200,168,75,0.06)] border border-[rgba(184,142,60,0.15)] flex items-center justify-center text-[rgba(200,168,75,0.4)] hover:text-[#c8a84b] hover:bg-[rgba(200,168,75,0.12)] transition-all"
                  title="Modifier"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onToggleChannel(c.id, !c.active); }}
                  className={`w-7 h-7 rounded bg-[rgba(200,168,75,0.06)] border border-[rgba(184,142,60,0.15)] flex items-center justify-center transition-all
                    ${c.active ? 'text-[#5de89e] hover:bg-[rgba(45,180,100,0.1)]' : 'text-[rgba(255,255,255,0.25)] hover:text-[#5de89e]'}`}
                  title={c.active ? 'Verrouiller' : 'Ouvrir'}
                >
                  {c.active ? <Unlock size={11} /> : <Lock size={11} />}
                </button>
                <button
                  onClick={e => handleDelete(e, c.id)}
                  className={`h-7 rounded border flex items-center justify-center transition-all
                    ${confirmDeleteId === c.id
                    ? 'px-2 bg-[rgba(180,50,50,0.25)] border-[rgba(180,50,50,0.4)] text-[#e87a7a] text-[9px] font-cinzel tracking-wider whitespace-nowrap'                      : 'w-7 bg-[rgba(200,168,75,0.04)] border-[rgba(184,142,60,0.12)] text-[rgba(180,50,50,0.35)] hover:bg-[rgba(180,50,50,0.12)] hover:text-[#e87a7a]'
                    }`}
                  title="Supprimer"
                >
                  {confirmDeleteId === c.id ? 'Confirmer ?' : <Trash2 size={11} />}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onEnterMap(c.id); }}
                  className="w-7 h-7 rounded bg-[rgba(200,168,75,0.08)] border border-[rgba(200,168,75,0.2)] flex items-center justify-center text-[rgba(200,168,75,0.6)] hover:text-[#c8a84b] hover:bg-[rgba(200,168,75,0.14)] transition-all"
                  title="Entrer"
                >
                  <LogIn size={11} />
                </button>
              </div>
            </div>
          ))}

          {/* Empty state liste */}
          <div
            onClick={onCreateClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-[rgba(200,168,75,0.1)] bg-transparent cursor-pointer hover:border-[rgba(200,168,75,0.28)] hover:bg-[rgba(200,168,75,0.04)] transition-all group mt-1"
          >
            <div className="w-10 h-7 rounded border border-dashed border-[rgba(200,168,75,0.15)] flex items-center justify-center">
              <Plus size={11} className="text-[rgba(200,168,75,0.25)] group-hover:text-[rgba(200,168,75,0.5)]" />
            </div>
            <span className="font-cinzel text-[11px] tracking-wider text-[rgba(200,168,75,0.2)] group-hover:text-[rgba(200,168,75,0.45)] transition-colors">
              Nouvelle carte
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleChannels.map(c => (
            <div
              key={c.id}
              className="relative rounded-lg overflow-hidden border border-[rgba(184,142,60,0.18)] bg-[#0d0b08] cursor-pointer group transition-all duration-200 hover:-translate-y-0.5"
              style={{ aspectRatio: '4/3' }}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onEnterMap(c.id)}
            >
              {/* Image */}
              {c.image_url ? (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${c.image_url})` }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1a140a]">
                  <MapIcon size={32} className="text-[rgba(200,168,75,0.1)]" />
                </div>
              )}

              {/* Gradient */}
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(5,4,2,0.96) 0%, rgba(5,4,2,0.35) 55%, rgba(5,4,2,0.08) 100%)' }}
              />

              {/* Hover overlay */}
              <div className={`absolute inset-0 border rounded-lg border-[rgba(200,168,75,0.3)] bg-[rgba(200,168,75,0.04)] transition-opacity duration-200 pointer-events-none
                ${hoveredId === c.id ? 'opacity-100' : 'opacity-0'}`}
              />

              {/* Bouton Entrer centré au hover */}
              <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200
                ${hoveredId === c.id ? 'opacity-100' : 'opacity-0'}`}>
                <button
                  onClick={(e) => { e.stopPropagation(); onEnterMap(c.id); }}
                  className="bg-[rgba(200,168,75,0.15)] border border-[rgba(200,168,75,0.5)] text-[#c8a84b] font-cinzel text-[10px] tracking-[.2em] px-4 py-2 rounded-md hover:bg-[rgba(200,168,75,0.25)] transition-colors"
                >
                  Entrer
                </button>
              </div>

              {/* Contenu bas de carte */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-[9px] font-cinzel tracking-[.1em] text-[rgba(200,168,75,0.35)] mb-0.5">
                  {c.largeur} × {c.hauteur} cases
                </p>
                <div className="flex items-end justify-between gap-2">
                  <p className="font-cinzel text-[13px] font-semibold tracking-[.12em] text-[#e8d9b0] leading-tight"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                    {c.nom}
                  </p>
                  <span className={`text-[8px] font-cinzel tracking-[.12em] px-2 py-0.5 rounded-sm flex-shrink-0 border
                    ${c.active
                      ? 'bg-[rgba(45,180,100,0.15)] text-[#5de89e] border-[rgba(45,180,100,0.25)]'
                      : 'bg-[rgba(180,50,50,0.15)] text-[#e87a7a] border-[rgba(180,50,50,0.25)]'
                    }`}>
                    {c.active ? 'Ouverte' : 'Verrouillée'}
                  </span>
                </div>

                {/* Actions */}
                <div className={`flex items-center justify-end gap-1.5 mt-2 transition-all duration-150
                  ${hoveredId === c.id ? 'opacity-100' : 'opacity-0'}`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditChannel(c.id); }}
                    className="w-7 h-7 rounded bg-[rgba(0,0,0,0.7)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(255,255,255,0.4)] hover:bg-[rgba(200,168,75,0.15)] hover:border-[rgba(200,168,75,0.3)] hover:text-[#c8a84b] transition-all"
                    title="Modifier"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleChannel(c.id, !c.active); }}
                    className={`w-7 h-7 rounded bg-[rgba(0,0,0,0.7)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center transition-all
                      ${c.active
                        ? 'text-[#5de89e] hover:bg-[rgba(45,180,100,0.1)]'
                        : 'text-[rgba(255,255,255,0.3)] hover:bg-[rgba(45,180,100,0.1)] hover:text-[#5de89e]'
                      }`}
                    title={c.active ? 'Verrouiller' : 'Ouvrir'}
                  >
                    {c.active ? <Unlock size={11} /> : <Lock size={11} />}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, c.id)}
                    className={`h-7 rounded bg-[rgba(0,0,0,0.7)] border flex items-center justify-center transition-all
                      ${confirmDeleteId === c.id
                        ? 'px-2 bg-[rgba(180,50,50,0.3)] border-[rgba(180,50,50,0.5)] text-[#e87a7a] text-[9px] font-cinzel tracking-wider'
                        : 'px-2 bg-[rgba(180,50,50,0.3)] border-[rgba(180,50,50,0.5)] text-[#e87a7a] text-[9px] font-cinzel tracking-wider whitespace-nowrap'                      }`}
                    title="Supprimer"
                  >
                    {confirmDeleteId === c.id ? 'Confirmer ?' : <Trash2 size={11} />}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state / Nouvelle carte */}
          <div
            onClick={onCreateClick}
            className="rounded-lg border border-dashed border-[rgba(200,168,75,0.15)] bg-[rgba(200,168,75,0.02)] cursor-pointer flex flex-col items-center justify-center gap-2 hover:border-[rgba(200,168,75,0.35)] hover:bg-[rgba(200,168,75,0.05)] transition-all duration-200 group"
            style={{ aspectRatio: '4/3' }}
          >
            <MapIcon size={24} className="text-[rgba(200,168,75,0.2)] group-hover:text-[rgba(200,168,75,0.4)] transition-colors" />
            <p className="text-[9px] font-cinzel tracking-[.15em] text-[rgba(200,168,75,0.2)] group-hover:text-[rgba(200,168,75,0.4)] transition-colors">
              Nouvelle carte
            </p>
          </div>
        </div>
      )}
    </div>
  );
}