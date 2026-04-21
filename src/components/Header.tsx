import { useStore } from '../store/useStore'
import { usePersonnage } from '../hooks/usePersonnage'
import { Button } from './ui/Button'
import { Moon, Sun, Globe, LogOut, User, Settings } from 'lucide-react'
import { useState } from 'react'
import { AppSettingsModal } from './ui/modal'

export default function Header() {
  const [showSettings, setShowSettings] = useState(false)
  const { 
    mode, setMode, deconnexion, compte, sessionActive, setSessionActive, 
    setPageCourante 
  } = useStore()
  
  const { personnage } = usePersonnage()

  return (
    <header className="h-16 border-b border-theme flex items-center justify-between px-4 md:px-6 bg-surface backdrop-blur-xl shrink-0 z-50">
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => {
            const state = useStore.getState()
            // Sauvegarder tout le contexte de navigation
            sessionStorage.setItem('sigil-panic-page', state.pageCourante)
            if (state.sessionActive) {
              sessionStorage.setItem('sigil-panic-session', JSON.stringify(state.sessionActive))
            }
            if (state.roleEffectif) {
              sessionStorage.setItem('sigil-panic-role', state.roleEffectif)
            }
            if (state.pnjControle) {
              sessionStorage.setItem('sigil-panic-pnj', JSON.stringify(state.pnjControle))
            }
            window.location.reload()
          }}
          className="text-xl md:text-2xl font-cinzel font-black tracking-widest text-theme-main select-none hover:opacity-70 active:scale-95 transition-all cursor-pointer"
          title="Rafraîchir la page"
        >
          SIGIL
        </button>

        {sessionActive && (
          <button onClick={() => setSessionActive(null)} className="hidden sm:flex items-center gap-3 px-4 py-1.5 rounded-sm bg-black/20 border border-theme/30 hover:bg-black/30 transition-all group" title="Quitter la session">
            <Globe size={14} className="text-theme-main opacity-50 group-hover:opacity-100" />
            <span className="text-xs font-cinzel font-bold text-primary">{sessionActive.nom}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {sessionActive && (
          <div className="flex items-center gap-2 pr-4 border-r border-theme/20">
            <button
              onClick={() => setPageCourante('selection-personnage')}
              className="w-10 h-10 rounded-sm flex items-center justify-center bg-black/20 border border-theme/30 hover:bg-black/30 transition-all text-theme-main"
              title="Hub d'Incarnation (Changer de personnage)"
            ><User size={18} className={personnage ? 'opacity-100' : 'opacity-40'} /></button>
          </div>
        )}

        <button onClick={() => setShowSettings(true)}
          className="w-10 h-10 rounded-sm flex items-center justify-center bg-black/20 border border-theme/30 text-theme-main hover:bg-black/30 transition-all"
          title="Paramètres"
        >
          <Settings size={18} />
        </button>

        <button onClick={() => setMode(mode === 'mode-dark' ? 'mode-light' : 'mode-dark')}
          className="w-10 h-10 rounded-sm flex items-center justify-center bg-black/20 border border-theme/30 text-theme-main">
          {mode === 'mode-dark' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div className="flex items-center gap-4 pl-4 border-l border-theme/20">
          <span className="text-sm font-garamond font-bold text-primary opacity-80 hidden sm:inline">{compte?.pseudo}</span>
          <Button variant="ghost" size="sm" onClick={() => deconnexion()} className="font-cinzel text-[10px] text-red-700/60 hover:text-red-700">
            <LogOut size={14} className="mr-0 sm:mr-2" /><span className="hidden sm:inline">Quitter</span>
          </Button>
        </div>
      </div>

      {showSettings && (
        <AppSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </header>
  )
}
