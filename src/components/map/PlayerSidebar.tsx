import { LogIn } from 'lucide-react';
import { MapChannel } from '../../types';
import { Personnage } from '../../store/useStore';

interface PlayerSidebarProps {
  channels: MapChannel[];
  channelActif: string | null;
  onEnterMap: (id: string) => void;
  personnageLocal: Personnage | null;
  hasMyToken: boolean;
  onAjouterMonToken: () => void;
  mapActive: boolean;
}

export function PlayerSidebar({
  channels,
  channelActif,
  onEnterMap,
  personnageLocal,
  hasMyToken,
  onAjouterMonToken,
  mapActive,
}: PlayerSidebarProps) {
  const activeChannels = channels.filter(c => c.active);
  const lockedChannels = channels.filter(c => !c.active);

  return (
    <div className="w-52 flex-shrink-0 flex flex-col h-full bg-[#09080580] border-r border-[rgba(184,142,60,0.12)]">
      <div className="px-3 pt-3 pb-2.5 border-b border-[rgba(184,142,60,0.1)]">
        <p className="text-[8px] font-cinzel tracking-[.28em] text-[rgba(200,168,75,0.3)] uppercase">Cartes</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-1.5 px-2">
        {activeChannels.length > 0 && (
          <>
            <p className="text-[8px] font-cinzel tracking-[.2em] text-[rgba(200,168,75,0.22)] uppercase px-2 pt-2 pb-1">
              Actives
            </p>
            {activeChannels.map(c => {
              const isActive = channelActif === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onEnterMap(c.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md mb-0.5 text-left transition-all duration-150
                    ${isActive
                      ? 'bg-[rgba(200,168,75,0.11)] border border-[rgba(200,168,75,0.22)]'
                      : 'hover:bg-[rgba(200,168,75,0.05)] border border-transparent'
                    }`}
                >
                  <div className="w-8 h-[22px] rounded flex-shrink-0 overflow-hidden border border-[rgba(200,168,75,0.1)] bg-[#1a150a]">
                    {c.image_url && (
                      <img src={c.image_url} alt="" className="w-full h-full object-cover opacity-75" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-cinzel truncate leading-tight tracking-wide
                      ${isActive ? 'text-[#c8a84b]' : 'text-[rgba(220,200,150,0.65)]'}`}>
                      {c.nom}
                    </p>
                  </div>
                  {isActive && mapActive && (
                    <LogIn size={10} className="text-[rgba(200,168,75,0.5)] flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </>
        )}

        {lockedChannels.length > 0 && (
          <>
            <p className="text-[8px] font-cinzel tracking-[.2em] text-[rgba(200,168,75,0.18)] uppercase px-2 pt-3 pb-1">
              Verrouillées
            </p>
            {lockedChannels.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md mb-0.5 opacity-35 cursor-not-allowed border border-transparent"
              >
                <div className="w-8 h-[22px] rounded flex-shrink-0 bg-[#111] border border-[rgba(255,255,255,0.04)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-cinzel truncate text-[rgba(200,168,75,0.25)]">{c.nom}</p>
                  <p className="text-[8px] text-[rgba(180,80,80,0.55)] tracking-wide">Verrouillée</p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer : personnage + bouton token */}
      <div className="border-t border-[rgba(184,142,60,0.1)] p-3 flex flex-col gap-2">
        {personnageLocal && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[rgba(124,107,191,0.2)] border border-[rgba(124,107,191,0.35)] flex items-center justify-center text-[9px] font-bold text-[#a090d8] flex-shrink-0">
              {personnageLocal.nom.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-[11px] font-cinzel text-[rgba(200,180,130,0.6)] truncate">
              {personnageLocal.nom}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#3db87a] ml-auto flex-shrink-0" />
          </div>
        )}
        {mapActive && (
          <button
            onClick={onAjouterMonToken}
            disabled={hasMyToken || !personnageLocal}
            className={`w-full py-1.5 rounded-md border font-cinzel text-[10px] tracking-wider flex items-center justify-center gap-1.5 transition-all
              ${hasMyToken || !personnageLocal
                ? 'border-[rgba(184,142,60,0.1)] text-[rgba(200,168,75,0.2)] cursor-not-allowed'
                : 'border-[rgba(200,168,75,0.28)] bg-[rgba(200,168,75,0.06)] text-[rgba(200,168,75,0.75)] hover:bg-[rgba(200,168,75,0.12)] hover:text-[#c8a84b]'
              }`}
            title={hasMyToken ? 'Token déjà placé' : !personnageLocal ? 'Aucun personnage lié' : 'Placer mon token'}
          >
            {hasMyToken ? '✓ Token placé' : 'Placer mon token'}
          </button>
        )}
      </div>
    </div>
  );
}
