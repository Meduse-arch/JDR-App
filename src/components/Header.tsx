import { useState, useEffect, useRef } from 'react'
import { useStore, type ThemeId, type ModeId } from '../store/useStore'

// ── Config des 4 thèmes ────────────────────────────────────────────────────
const THEMES: { id: ThemeId; nom: string; from: string; to: string }[] = [
  { id: 'theme-violet',  nom: 'Arcane',   from: '#a855f7', to: '#ec4899' },
  { id: 'theme-emerald', nom: 'Nature',   from: '#10b981', to: '#06b6d4' },
  { id: 'theme-rose',    nom: 'Flame',   from: '#f97316', to: '#f43f5e' },
  { id: 'theme-ocean',   nom: 'Océan',    from: '#3b82f6', to: '#6366f1' },
]

export default function Header() {
  const compte         = useStore(s => s.compte)
  const setCompte      = useStore(s => s.setCompte)
  const setSessionActive = useStore(s => s.setSessionActive)
  const sessionActive  = useStore(s => s.sessionActive)
  const setPageCourante = useStore(s => s.setPageCourante)
  const theme          = useStore(s => s.theme)
  const setTheme       = useStore(s => s.setTheme)
  const mode           = useStore(s => s.mode)
  const setMode        = useStore(s => s.setMode)

  const [menuOuvert,      setMenuOuvert]      = useState(false)
  const [menuThemeOuvert, setMenuThemeOuvert] = useState(false)
  const themeRef   = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Fermer au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node))
        setMenuThemeOuvert(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setMenuOuvert(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const seDeconnecter = () => {
    setCompte(null)
    setSessionActive(null)
    setMenuOuvert(false)
  }

  const themeActuel = THEMES.find(t => t.id === theme) ?? THEMES[0]
  const estDark = mode === 'mode-dark'

  return (
    <header
      className="flex justify-between items-center px-4 md:px-8 py-3 border-b shrink-0"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* ── Logo ── */}
      <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--color-light)' }}>
        JDR
        <span className="ml-1 font-light opacity-60" style={{ color: 'var(--text-secondary)' }}>app</span>
        {compte?.role === 'admin' && (
          <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-main) 20%, transparent)', color: 'var(--color-light)' }}>
            Admin
          </span>
        )}
      </h1>

      {/* ── Session active ── */}
      <p className="hidden sm:block text-sm font-semibold truncate max-w-[200px]"
        style={{ color: 'var(--text-secondary)' }}>
        {sessionActive ? `🎲 ${sessionActive.nom}` : 'Aucune session'}
      </p>

      {/* ── Contrôles droite ── */}
      <div className="flex items-center gap-2">

        {/* 🎨 Bouton thème */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setMenuThemeOuvert(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Mini dégradé qui montre le thème actif */}
            <span
              className="w-4 h-4 rounded-full shrink-0"
              style={{ background: `linear-gradient(135deg, ${themeActuel.from}, ${themeActuel.to})` }}
            />
            <span className="hidden md:inline">{themeActuel.nom}</span>
            <span className="text-[10px] opacity-50">{menuThemeOuvert ? '▲' : '▼'}</span>
          </button>

          {menuThemeOuvert && (
            <div
              className="absolute top-full right-0 mt-2 w-64 rounded-2xl shadow-2xl p-4 flex flex-col gap-4 z-50"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              }}
            >
              {/* Couleurs */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3"
                  style={{ color: 'var(--text-muted)' }}>
                  Palette
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: theme === t.id
                          ? `linear-gradient(135deg, ${t.from}22, ${t.to}22)`
                          : 'var(--bg-surface)',
                        border: `1px solid ${theme === t.id ? t.from : 'var(--border)'}`,
                        color: theme === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      <span
                        className="w-5 h-5 rounded-full shrink-0 shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
                      />
                      {t.nom}
                      {theme === t.id && (
                        <span className="ml-auto text-xs" style={{ color: t.from }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Séparateur */}
              <div style={{ height: 1, backgroundColor: 'var(--border)' }} />

              {/* Dark / Light toggle */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3"
                  style={{ color: 'var(--text-muted)' }}>
                  Luminosité
                </p>
                <div className="flex rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                  <button
                    onClick={() => setMode('mode-dark' as ModeId)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold transition-all"
                    style={{
                      backgroundColor: estDark ? 'var(--color-main)' : 'transparent',
                      color: estDark ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    🌙 Sombre
                  </button>
                  <button
                    onClick={() => setMode('mode-light' as ModeId)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold transition-all"
                    style={{
                      backgroundColor: !estDark ? 'var(--color-main)' : 'transparent',
                      color: !estDark ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    ☀️ Clair
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 👤 Menu utilisateur */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setMenuOuvert(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
              style={{ background: `linear-gradient(135deg, var(--color-main), var(--color-accent2))` }}
            >
              {compte?.pseudo?.[0]?.toUpperCase() ?? '?'}
            </span>
            <span className="hidden sm:inline max-w-[100px] truncate">{compte?.pseudo}</span>
            <span className="text-[10px] opacity-50">{menuOuvert ? '▲' : '▼'}</span>
          </button>

          {menuOuvert && (
            <div
              className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg overflow-hidden z-50"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              <button
                onClick={() => { setPageCourante('sessions'); setMenuOuvert(false) }}
                className="w-full text-left px-4 py-3 text-sm font-semibold flex items-center gap-2 transition-all"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                🎲 Sessions
              </button>
              <button
                onClick={seDeconnecter}
                className="w-full text-left px-4 py-3 text-sm font-semibold flex items-center gap-2 transition-all text-red-400"
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                ← Déconnexion
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}