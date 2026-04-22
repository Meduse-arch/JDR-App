import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapChannel } from '../../types';
import { Plus, Lock, Unlock, Trash2, Map as MapIcon, LogIn, PencilLine } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface MapHubProps {
  channels: MapChannel[];
  roleEffectif: string | null;
  channelActif: string | null;
  mjVueMode?: 'grid' | 'list';
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
  onEnterMap,
  onToggleChannel,
  onDeleteChannel,
  onCreateClick,
  onEditChannel,
  sidebarOnly = false,
}: MapHubProps) {
  const pnjControle = useStore(s => s.pnjControle);
  const isMJ = (roleEffectif === 'admin' || roleEffectif === 'mj') && !pnjControle;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const visibleChannels = isMJ ? channels : channels.filter(c => c.active);

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

  // ─── Vue Sidebar (mode liste avec map ouverte) ────────────────────────────
  if (sidebarOnly) {
    return (
      <div className="w-52 flex-shrink-0 flex flex-col h-full bg-[#09080580] border-r border-[rgba(184,142,60,0.12)]">
        <div className="px-3 pt-3 pb-2.5 border-b border-[rgba(184,142,60,0.1)] flex items-center justify-between">
          <p className="text-[9px] font-cinzel tracking-[.25em] text-[rgba(200,168,75,0.35)] uppercase">Cartes</p>
          {isMJ && (
            <button
              onClick={onCreateClick}
              className="w-6 h-6 rounded flex items-center justify-center text-[rgba(200,168,75,0.35)] hover:text-[#c8a84b] hover:bg-[rgba(200,168,75,0.08)] transition-all"
              title="Nouvelle carte"
            >
              <Plus size={13} />
            </button>
          )}
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
                {isMJ && (
                  <p className={`text-[8px] font-cinzel tracking-wider mt-0.5
                    ${c.active ? 'text-[rgba(93,232,158,0.5)]' : 'text-[rgba(232,122,122,0.4)]'}`}>
                    {c.active ? 'Ouverte' : 'Verrouillée'}
                  </p>
                )}
              </div>
              
              {isMJ && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); onEditChannel(c.id); }}
                    className="w-5 h-5 rounded flex items-center justify-center text-[rgba(200,168,75,0.35)] hover:text-[#c8a84b] hover:bg-[rgba(200,168,75,0.1)] transition-all"
                  >
                    <PencilLine size={9} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onToggleChannel(c.id, !c.active); }}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-all ${c.active ? 'text-[rgba(93,232,158,0.5)]' : 'text-[rgba(255,255,255,0.2)]'}`}
                  >
                    {c.active ? <Unlock size={9} /> : <Lock size={9} />}
                  </button>
                  <button
                    onClick={e => handleDelete(e, c.id)}
                    className="w-5 h-5 text-[rgba(180,50,50,0.35)] hover:text-[#e87a7a]"
                  >
                    <Trash2 size={9} />
                  </button>
                </div>
              )}
              {channelActif === c.id && <LogIn size={9} className="text-[rgba(200,168,75,0.5)] ml-0.5" />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Vue MJ & Joueur : grille de cartes (HUB) ─────────────────────────────────
  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 py-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-cinzel text-[18px] font-semibold tracking-[.2em] text-[#c8a84b]">Cartographie</h2>
          <p className="text-[9px] font-cinzel tracking-[.25em] text-[rgba(200,168,75,0.3)] mt-0.5">
            {visibleChannels.length} carte{visibleChannels.length > 1 ? 's' : ''} disponible{visibleChannels.length > 1 ? 's' : ''}
          </p>
        </div>
        {isMJ && (
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 border border-[rgba(200,168,75,0.35)] bg-[rgba(200,168,75,0.06)] text-[rgba(200,168,75,0.8)] px-3 py-2 rounded-md font-cinzel text-[10px] tracking-[.12em] hover:bg-[rgba(200,168,75,0.12)] hover:text-[#c8a84b] transition-all"
          >
            <Plus size={13} /> Nouvelle carte
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
        {visibleChannels.map(c => (
          <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            key={c.id}
          >
            <div
              className="relative rounded-lg overflow-hidden border border-[rgba(184,142,60,0.18)] bg-[#0d0b08] cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 h-full"
              style={{ aspectRatio: '4/3' }}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onEnterMap(c.id)}
            >
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
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,4,2,0.96) 0%, rgba(5,4,2,0.35) 55%, rgba(5,4,2,0.08) 100%)' }} />
              
              <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${hoveredId === c.id ? 'opacity-100' : 'opacity-0'}`}>
                <button className="bg-[rgba(200,168,75,0.15)] border border-[rgba(200,168,75,0.5)] text-[#c8a84b] font-cinzel text-[10px] tracking-[.2em] px-4 py-2 rounded-md">
                  Entrer
                </button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-[9px] font-cinzel tracking-[.1em] text-[rgba(200,168,75,0.35)] mb-0.5">{c.largeur} × {c.hauteur} cases</p>
                <p className="font-cinzel text-[13px] font-semibold tracking-[.12em] text-[#e8d9b0] truncate">{c.nom}</p>
                
                {isMJ && (
                  <div className={`flex items-center justify-end gap-1.5 mt-2 transition-all ${hoveredId === c.id ? 'opacity-100' : 'opacity-0'}`}>
                    <button onClick={(e) => { e.stopPropagation(); onEditChannel(c.id); }} className="w-7 h-7 rounded bg-[rgba(0,0,0,0.7)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(255,255,255,0.4)] hover:text-[#c8a84b] transition-all"><PencilLine size={11} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onToggleChannel(c.id, !c.active); }} className="w-7 h-7 rounded bg-[rgba(0,0,0,0.7)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center transition-all"><Unlock size={11} /></button>
                    <button onClick={(e) => handleDelete(e, c.id)} className="px-2 h-7 rounded bg-[rgba(180,50,50,0.3)] border border-[rgba(180,50,50,0.5)] text-[#e87a7a] text-[9px] font-cinzel tracking-wider">{confirmDeleteId === c.id ? 'Confirmer' : <Trash2 size={11} />}</button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {isMJ && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            key="new-map-btn"
          >
            <div onClick={onCreateClick} className="rounded-lg border border-dashed border-[rgba(200,168,75,0.15)] bg-[rgba(200,168,75,0.02)] cursor-pointer flex flex-col items-center justify-center gap-2 hover:bg-[rgba(200,168,75,0.05)] transition-all h-full" style={{ aspectRatio: '4/3' }}>
              <Plus size={24} className="text-[rgba(200,168,75,0.2)]" />
              <p className="text-[9px] font-cinzel tracking-[.15em] text-[rgba(200,168,75,0.2)]">Nouvelle carte</p>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
