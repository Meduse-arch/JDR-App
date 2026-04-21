import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { menuMJ, menuJoueur } from '../config/menus'
import { LogOut, X, User, Compass, Zap, Scroll, Globe, ChevronRight, Moon, Sun, Settings } from 'lucide-react'
import { usePersonnage } from '../hooks/usePersonnage'
import { TITRES_LEGENDE } from '../config/titres'
import { AppSettingsModal } from './ui/modal'

interface Props {
  open: boolean
  onClose: () => void
}

export default function Navigation({ open, onClose }: Props) {
  const [showSettings, setShowSettings] = useState(false)
  const { 
    pageCourante, setPageCourante, roleEffectif, pnjControle, 
    setPnjControle, deconnexion, sessionActive, setSessionActive,
    mode, setMode, navigationMode
  } = useStore()
  const { personnage } = usePersonnage()

  // Si on change le mode vers 'basic' depuis les paramètres internes, 
  // on ferme automatiquement le portail.
  useEffect(() => {
    if (navigationMode === 'basic' && open) {
      onClose()
    }
  }, [navigationMode, open, onClose])

  const isMJ = (roleEffectif === 'admin' || roleEffectif === 'mj') && !pnjControle
  const menu = isMJ ? menuMJ : menuJoueur

  // Organisation par branches
  const branches = isMJ ? [
    { id: 'nord', label: 'Immersion', icon: <Compass size={16}/>, items: ['map', 'chat', 'lancer-des'] },
    { id: 'ouest', label: 'Codex', icon: <User size={16}/>, items: ['selection-personnage', 'logs', 'tags'] },
    { id: 'est', label: 'Forge', icon: <Zap size={16}/>, items: ['items', 'competences', 'quetes'] }
  ] : [
    { id: 'nord', label: 'Aventure', icon: <Compass size={16}/>, items: ['map', 'chat', 'lancer-des'] },
    { id: 'ouest', label: 'Identité', icon: <User size={16}/>, items: ['selection-personnage', 'mon-personnage'] },
    { id: 'est', label: 'Possessions', icon: <Scroll size={16}/>, items: ['mon-inventaire', 'mes-competences', 'mes-quetes'] }
  ]

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleNav = (id: string) => {
    setPageCourante(id)
    onClose()
  }

  const NavButton = ({ itemId }: { itemId: string }) => {
    const item = menu.find(m => m.id === itemId)
    if (!item) return null
    const isActive = pageCourante === itemId

    return (
      <button
        onClick={() => handleNav(itemId)}
        className={`
          relative flex items-center gap-4 p-4 rounded-sm border transition-all duration-300 group
          ${isActive 
            ? 'bg-theme-main border-theme-main shadow-[0_0_30px_rgba(var(--color-main-rgb),0.2)]' 
            : 'bg-surface/40 border-theme/10 hover:border-theme-main/40 hover:bg-surface/80'}
        `}
      >
        <div className={`
          w-10 h-10 flex items-center justify-center rounded-full border font-cinzel text-xl transition-all
          ${isActive 
            ? 'bg-app text-theme-main border-app' 
            : 'bg-app/40 text-theme-main border-theme/10 group-hover:border-theme-main/30'}
        `}>
          {item.rune}
        </div>
        <div className="flex flex-col items-start">
          <span className={`font-cinzel text-[10px] uppercase tracking-[0.2em] font-bold ${isActive ? 'text-app' : 'text-theme-main'}`}>
            {TITRES_LEGENDE[itemId] || item.label.toUpperCase()}
          </span>
          <span className={`font-garamond italic text-[11px] opacity-60 ${isActive ? 'text-app/80' : 'text-text-secondary'}`}>
            {item.label}
          </span>
        </div>
      </button>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] bg-app flex flex-col overflow-hidden"
        >
          {/* Effets de fond immersifs */}
          <div className="absolute inset-0 vignette-effect opacity-70 pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.02] flex items-center justify-center pointer-events-none select-none">
            <span className="font-cinzel text-[60rem] text-theme-main translate-y-20">ᚦ</span>
          </div>

          {/* ── ZONE DE FERMETURE & THEME (TOP) ── */}
          <div className="absolute top-8 left-8 right-8 z-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Toggle Thème */}
              <button 
                onClick={() => setMode(mode === 'mode-dark' ? 'mode-light' : 'mode-dark')}
                className="group flex items-center gap-3 text-theme-main opacity-40 hover:opacity-100 transition-all"
              >
                <div className="w-10 h-10 rounded-full border border-theme/20 flex items-center justify-center group-hover:border-theme-main transition-colors">
                  {mode === 'mode-dark' ? <Moon size={18} /> : <Sun size={18} />}
                </div>
                <span className="font-cinzel text-[10px] uppercase tracking-[0.4em]">
                  Mode {mode === 'mode-dark' ? 'Obscur' : 'Clair'}
                </span>
              </button>

              {/* Bouton Paramètres */}
              <button 
                onClick={() => setShowSettings(true)}
                className="group flex items-center gap-3 text-theme-main opacity-40 hover:opacity-100 transition-all ml-4"
              >
                <div className="w-10 h-10 rounded-full border border-theme/20 flex items-center justify-center group-hover:border-theme-main transition-colors">
                  <Settings size={18} />
                </div>
                <span className="font-cinzel text-[10px] uppercase tracking-[0.4em]">Configuration</span>
              </button>
            </div>

            {/* Fermer */}
            <button 
              onClick={onClose}
              className="group flex items-center gap-3 text-theme-main opacity-40 hover:opacity-100 transition-all"
            >
              <span className="font-cinzel text-[10px] uppercase tracking-[0.4em]">Retour au Monde</span>
              <div className="w-10 h-10 rounded-full border border-theme/20 flex items-center justify-center group-hover:border-theme-main transition-colors">
                <X size={18} />
              </div>
            </button>
          </div>

          {/* ── CONTENU CENTRAL ── */}
          <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
            
            {/* TITRE DU PORTAIL */}
            <div className="mb-16 text-center">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-block px-6 py-1 border-y border-theme/20 mb-4"
              >
                <span className="font-cinzel text-[10px] uppercase tracking-[0.8em] text-theme-main opacity-60">Le Grand Portail</span>
              </motion.div>
              <h2 className="font-cinzel text-4xl font-black tracking-[0.3em] text-theme-main drop-shadow-2xl">SIGIL</h2>
            </div>

            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
              
              {/* Branche Ouest */}
              <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col gap-6">
                <div className="flex items-center gap-3 border-b border-theme/10 pb-3">
                  <span className="text-theme-main opacity-40">{branches.find(b => b.id === 'ouest')?.icon}</span>
                  <h3 className="font-cinzel text-[10px] uppercase tracking-widest text-theme-main font-bold">{branches.find(b => b.id === 'ouest')?.label}</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {branches.find(b => b.id === 'ouest')?.items.map(id => <NavButton key={id} itemId={id} />)}
                </div>
              </motion.div>

              {/* Centre (Nord & Hub) */}
              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col gap-12 items-center">
                <div className="w-full flex flex-col gap-4 items-center">
                   <div className="flex items-center gap-3 border-b border-theme/10 pb-3 w-full justify-center">
                    <span className="text-theme-main opacity-40">{branches.find(b => b.id === 'nord')?.icon}</span>
                    <h3 className="font-cinzel text-[10px] uppercase tracking-widest text-theme-main font-bold">{branches.find(b => b.id === 'nord')?.label}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 w-full">
                    {branches.find(b => b.id === 'nord')?.items.map(id => <NavButton key={id} itemId={id} />)}
                  </div>
                </div>

                <div className="relative group">
                   <div className="absolute -inset-4 bg-theme-main/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                   <NavButton itemId="dashboard" />
                </div>
              </motion.div>

              {/* Branche Est */}
              <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-col gap-6">
                <div className="flex items-center gap-3 border-b border-theme/10 pb-3">
                  <span className="text-theme-main opacity-40">{branches.find(b => b.id === 'est')?.icon}</span>
                  <h3 className="font-cinzel text-[10px] uppercase tracking-widest text-theme-main font-bold">{branches.find(b => b.id === 'est')?.label}</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {branches.find(b => b.id === 'est')?.items.map(id => <NavButton key={id} itemId={id} />)}
                </div>
              </motion.div>

            </div>
          </main>

          {/* ── FOOTER (SESSIONS & COMPTE) ── */}
          <footer className="relative z-10 h-32 px-12 border-t border-theme/10 bg-surface/40 backdrop-blur-xl flex items-center justify-between">
            
            {/* GESTION SESSION */}
            <div className="flex items-center gap-6">
               <div className="flex flex-col">
                  <span className="text-[9px] font-cinzel uppercase tracking-widest text-theme-main opacity-50 mb-1">Monde Actuel</span>
                  <div className="flex items-center gap-4 group cursor-pointer" onClick={() => { setSessionActive(null); onClose(); }}>
                    <div className="w-12 h-12 rounded-sm border border-theme/20 bg-black/10 flex items-center justify-center text-theme-main group-hover:border-theme-main transition-all">
                      <Globe size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-cinzel text-sm font-bold text-primary group-hover:text-theme-main transition-colors">{sessionActive?.nom || 'AUCUN MONDE'}</span>
                      <span className="flex items-center gap-1 text-[10px] font-garamond italic text-text-secondary">
                        Changer de session <ChevronRight size={10} />
                      </span>
                    </div>
                  </div>
               </div>
            </div>

            {/* COMPTE ACTIONS */}
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-cinzel uppercase tracking-widest text-theme-main opacity-50">Incarne par</span>
                <span className="text-sm font-cinzel font-bold text-primary tracking-widest uppercase">{useStore.getState().compte?.pseudo}</span>
              </div>

              <div className="flex items-center gap-3">
                {pnjControle && (
                  <button
                    onClick={() => setPnjControle(null)}
                    className="h-12 px-6 rounded-sm bg-red-950/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all font-cinzel text-[10px] uppercase tracking-widest"
                  >
                    Libérer l'hôte
                  </button>
                )}
                <button
                  onClick={() => deconnexion()}
                  className="h-12 px-6 rounded-sm border border-theme/20 text-text-secondary hover:border-red-500/40 hover:text-red-500 transition-all font-cinzel text-[10px] uppercase tracking-widest flex items-center gap-2 group"
                >
                  <LogOut size={14} className="opacity-40 group-hover:opacity-100" />
                  <span className="opacity-60 group-hover:opacity-100">Déconnexion</span>
                </button>
              </div>
            </div>
          </footer>
        </motion.div>
      )}

      {/* Modal Paramètres */}
      {showSettings && (
        <AppSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </AnimatePresence>
  )
}
