import { useState, useEffect, useRef } from 'react'
import { useStore, type ThemeId } from '../store/useStore'
import { Button } from './ui/Button'

const THEMES: { id: ThemeId; nom: string; from: string; to: string }[] = [
  { id: 'theme-violet',  nom: 'Arcane',   from: '#a855f7', to: '#ec4899' },
  { id: 'theme-emerald', nom: 'Nature',   from: '#10b981', to: '#06b6d4' },
  { id: 'theme-rose',    nom: 'Flame',    from: '#f97316', to: '#f43f5e' },
  { id: 'theme-ocean',   nom: 'Océan',    from: '#3b82f6', to: '#6366f1' },
]

export default function Header() {
  const { theme, setTheme, mode, setMode, deconnexion, compte, sessionActive, setSessionActive, setPageCourante, sidebarOuverte, setSidebarOuverte } = useStore()

  const [menuThemeOuvert, setMenuThemeOuvert] = useState(false)
  const themeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node))
        setMenuThemeOuvert(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const themeActuel = THEMES.find(t => t.id === theme) ?? THEMES[0]

  return (
    <header className="h-16 border-b border-theme flex items-center justify-between px-4 md:px-6 bg-surface backdrop-blur-xl shrink-0 z-50">
      <div className="flex items-center gap-3 md:gap-4">
        {sessionActive && (
          <button 
            onClick={() => setSidebarOuverte(!sidebarOuverte)}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 active:scale-90 transition-transform"
          >
            {sidebarOuverte ? '✕' : '☰'}
          </button>
        )}

        <h1 className="text-lg md:text-xl font-black italic tracking-tighter cursor-pointer hover:scale-105 transition-transform" 
          style={{ color: 'var(--color-light)' }}
          onClick={() => setPageCourante('dashboard')}
        >
          JDR<span className="text-primary opacity-20">APP</span>
        </h1>
        
        {sessionActive && (
          <button 
            onClick={() => setSessionActive(null)}
            className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
          >
            <span className="text-[10px] font-black opacity-30 uppercase group-hover:text-main transition-colors">Univers</span>
            <span className="text-xs font-bold">{sessionActive.nom}</span>
            <span className="text-[10px] opacity-20 ml-1">⇄</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setMenuThemeOuvert(!menuThemeOuvert)}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:scale-110 transition-all"
          >
            <span className="w-4 h-4 rounded-full" style={{ background: `linear-gradient(135deg, ${themeActuel.from}, ${themeActuel.to})` }} />
          </button>

          {menuThemeOuvert && (
            <div className="absolute top-full right-0 mt-2 w-48 p-2 rounded-2xl bg-card border border-theme shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
              <div className="grid grid-cols-1 gap-1">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t.id); setMenuThemeOuvert(false) }}
                    className={`flex items-center gap-3 p-2 rounded-xl text-xs font-bold transition-all ${theme === t.id ? 'bg-main/20 text-main' : 'hover:bg-white/5'}`}
                  >
                    <span className="w-4 h-4 rounded-full" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }} />
                    {t.nom}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setMode(mode === 'mode-dark' ? 'mode-light' : 'mode-dark')}
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
        >
          {mode === 'mode-dark' ? '🌙' : '☀️'}
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-white/5">
          <span className="text-xs font-bold opacity-80">{compte?.pseudo}</span>
          <Button variant="ghost" size="sm" onClick={() => deconnexion()} className="text-[10px] uppercase font-black opacity-40 hover:opacity-100">
            Quitter
          </Button>
        </div>
      </div>
    </header>
  )
}
