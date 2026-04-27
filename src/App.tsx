import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import Navigation from './components/Navigation'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import DashboardAdmin from './pages/admin/DashboardAdmin'
import DashboardJoueur from './pages/joueur/DashboardJoueur'
import Sessions from './pages/shared/Sessions'
import MonPersonnage from './pages/shared/MonPersonnage'
import MonInventaire from './pages/joueur/MonInventaire'
import MesCompetences from './pages/joueur/MesCompetences'
import Joueurs from './pages/admin/Joueurs'
import Items from './pages/admin/Items'
import Competences from './pages/admin/Competences'
import Quetes from './pages/admin/Quetes'
import MesQuetes from './pages/joueur/MesQuetes'
import LancerDes from './pages/shared/LancerDes'
import GererMj from './pages/admin/GererMj'
import Possession from './pages/admin/Possession'
import Tags from './pages/admin/Tags'
import { DiceRollModal } from './components/ui/modal'
import PageTransition from './components/ui/PageTransition'
import SessionTransitionPortal from './components/SessionTransitionPortal'
import RunicDecoder from './components/ui/RunicDecoder'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import { usePersonnage } from './hooks/usePersonnage'
import SelectionPersonnage from './pages/shared/SelectionPersonnage'
import { RUNES_PAGES } from './config/runes'
import { Layout } from 'lucide-react'
import Logs from './pages/admin/Logs'
import CarteMap from './pages/shared/Map'
import Chat from './pages/shared/Chat'

import Accueil from './pages/auth/Accueil'
import Connexion from './pages/auth/Connexion'
import Inscription from './pages/auth/Inscription'

import { TITRES_LEGENDE } from './config/titres'

export default function App() {
  const [navigationOpen, setNavigationOpen] = useState(false)
  
  // Gestion du mode Pop-out (fenêtre détachée)
  const fullUrl = window.location.href
  const isPopout = fullUrl.includes('/popout/')
  const popoutPage = isPopout ? fullUrl.split('/popout/')[1]?.split('?')[0]?.split('#')[0] : null

  const { 
    compte, 
    sessionActive, 
    pageCourante, 
    roleEffectif, 
    mode, 
    navigationMode,
    showImmersiveNavButton,
    setPageCourante, 
    enteringSession, 
    setEnteringSession, 
    setSessionActive, 
    setRoleEffectif,
    authPage,
    setAuthPage
    } = useStore()
  const currentMode = mode || localStorage.getItem('sigil-mode') || 'mode-dark'
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ne pas déclencher si l'utilisateur écrit dans un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      if (e.key === 'Escape') {
        setNavigationOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { personnage } = usePersonnage()
  const roleActuel = (compte?.role === 'admin') ? 'admin' : (roleEffectif || 'joueur');
  const isLocked = roleActuel === 'joueur' && !personnage;
  const showCenteredHeader = isLocked;

  // ÉCRAN 0 : AUTHENTIFICATION (ACCUEIL / CONNEXION / INSCRIPTION)
  if (!compte) {
    if (authPage === 'connexion') {
      return <Connexion retour={() => setAuthPage('accueil')} />
    }
    if (authPage === 'inscription') {
      return <Inscription 
        retour={() => setAuthPage('accueil')} 
        allerVersConnexion={() => setAuthPage('connexion')} 
      />
    }
    return <Accueil allerVers={(page) => setAuthPage(page)} />
  }

  const renderPageContent = (page = pageCourante) => {
    // On récupère les rôles depuis le store ou le localStorage pour les popouts
    const role = roleEffectif || localStorage.getItem('sigil-role-effectif')
    const isMJ = role === 'admin' || role === 'mj'

    switch (page) {
      case 'dashboard':      return isMJ ? <DashboardAdmin /> : <DashboardJoueur />
      case 'selection-personnage': return <SelectionPersonnage />
      case 'mon-personnage': return <MonPersonnage />
      case 'mon-inventaire': return <MonInventaire />
      case 'mes-competences':return <MesCompetences />
      case 'mes-quetes':     return <MesQuetes />
      case 'lancer-des':     return <LancerDes />
      case 'map':            return <CarteMap />
      case 'joueurs':        return <Joueurs />
      case 'items':          return <Items />
      case 'tags':           return <Tags />
      case 'logs':           return <Logs />
      case 'competences':    return <Competences />
      case 'quetes':         return <Quetes />
      case 'possession':     return <Possession />
      case 'gerer-mj':       return <GererMj />
      case 'chat':           return <Chat />
      default:               return isMJ ? <DashboardAdmin /> : <DashboardJoueur />
    }
  }

  // Rendu immédiat pour le mode Pop-out
  if (isPopout && popoutPage) {
    const activeSession = sessionActive || JSON.parse(localStorage.getItem('sigil-session-active') || 'null')
    if (activeSession) {
      return (
        <div className={`h-screen w-full overflow-hidden ${currentMode} bg-app text-primary relative`}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
            <span className="font-cinzel text-theme-main opacity-[0.03] text-[20rem] blur-[1px]">
              {RUNES_PAGES[popoutPage] || 'ᛟ'}
            </span>
          </div>
          <div className="relative z-10 h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
             {renderPageContent(popoutPage)}
          </div>
          <div className="absolute inset-0 vignette-effect pointer-events-none z-50" />
        </div>
      )
    }
  }

  const handlePortalComplete = async () => {
    if (!enteringSession || !compte) return

    const { data: session } = await supabase.from('sessions').select('*').eq('id', enteringSession.id).single()
    
    if (session) {
      let role: 'admin' | 'mj' | 'joueur' = 'joueur'
      if (compte.role === 'admin') {
        role = 'admin'
      } else {
        const { data } = await supabase.from('session_mj').select('*')
          .eq('id_session', session.id).eq('id_compte', compte.id).single()
        if (data) role = 'mj'
      }
      
      setRoleEffectif(role)
      setSessionActive(session)
      setPageCourante('dashboard')
      
      // Si navigation immersive, on ouvre le portail tout de suite
      if (navigationMode === 'immersive') {
        setNavigationOpen(true)
      }
    }
    
    setEnteringSession(null)
  }

  // ÉCRAN 1 : PORTE DES MONDES (SESSIONS)
  if (!sessionActive) return (
    <div className={`flex flex-col h-screen ${mode} bg-app text-primary relative overflow-hidden`}>
      {navigationMode === 'basic' && <Header />}
      
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/5">
        <Sessions />
      </div>

      {navigationMode === 'immersive' && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setNavigationOpen(true)}
          className="fixed bottom-6 left-6 z-[200] w-12 h-12 rounded-full bg-black/40 border border-theme-main/30 backdrop-blur-md flex items-center justify-center text-theme-main shadow-[0_0_20px_rgba(var(--color-main-rgb),0.2)] hover:border-theme-main hover:shadow-[0_0_30_rgba(var(--color-main-rgb),0.4)] transition-all group"
          title="Ouvrir le menu (Echap)"
        >
          <div className="absolute inset-0 rounded-full border border-theme-main/10 animate-ping opacity-20" />
          <Layout size={20} className="group-hover:rotate-90 transition-transform duration-500" />
        </motion.button>
      )}

      <div className="absolute inset-0 vignette-effect pointer-events-none z-50" />
      {enteringSession && (
        <SessionTransitionPortal 
          sessionNom={enteringSession.nom} 
          onComplete={handlePortalComplete} 
        />
      )}

      <Navigation
        open={navigationOpen}
        onClose={() => setNavigationOpen(false)}
      />
    </div>
  )

  // ÉCRAN 2 : LE CODEX DE L'ORACLE (SÉLECTION PERSONNAGE)
  if (roleEffectif === 'joueur' && !personnage) return (
    <div className={`h-screen w-full overflow-y-auto ${mode} bg-app`}>
      <SelectionPersonnage />
    </div>
  )

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${mode} bg-app text-primary relative`}>
      {navigationMode === 'basic' && <Header />}
      
      <div className="flex flex-1 overflow-hidden">
        {navigationMode === 'basic' && <Sidebar />}
        
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-black/5 relative">
          {/* Rune de fond unique et fixe (3% opacité) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
            <span className="font-cinzel text-theme-main opacity-[0.03] text-[30rem] md:text-[50rem] blur-[2px]">
              {RUNES_PAGES[pageCourante] || 'ᛟ'}
            </span>
          </div>

          <div className={`relative z-10 p-4 md:p-5 flex flex-col ${showCenteredHeader ? 'items-center justify-center min-h-[85vh]' : 'min-h-full'}`}>
            
            {/* TITRE ET RUNES (Sceau du Codex) */}
            <div className={`flex flex-col items-center justify-center text-center w-full ${showCenteredHeader ? 'mb-12' : 'mb-4 mt-2'}`}>
              <h1 className={`${showCenteredHeader ? 'text-4xl md:text-6xl' : 'text-lg md:text-xl'} font-cinzel font-black uppercase tracking-[0.3em] text-theme-main drop-shadow-[0_0_20px_rgba(var(--color-main-rgb),0.3)]`}>
                <RunicDecoder text={
                  pageCourante === 'selection-personnage' 
                    ? (roleActuel === 'admin' || roleActuel === 'mj' ? 'ORACLE DU CODEX' : "CODEX DE L'ORACLE")
                    : (TITRES_LEGENDE[pageCourante] || pageCourante.toUpperCase())
                } />
              </h1>
              <div className="flex items-center justify-center gap-4 md:gap-6 mt-1">
                {["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ"].map((rune, i) => (
                  <motion.span key={i} animate={{ opacity: [0.1, 0.6, 0.1] }} transition={{ duration: 4, repeat: Infinity, delay: i * 0.2 }} className="font-cinzel text-xs text-theme-main/60">{rune}</motion.span>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <PageTransition key={pageCourante + (personnage?.id || 'no-perso')}>
                <div className="w-full">
                  {isLocked ? (
                    <div className="text-center font-garamond italic opacity-20 text-xl">Cette connaissance est scellée jusqu'à votre incarnation.</div>
                  ) : (
                    renderPageContent()
                  )}
                </div>
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <div className="absolute inset-0 vignette-effect pointer-events-none z-50" />
      <DiceRollModal />
      {enteringSession && (
        <SessionTransitionPortal 
          sessionNom={enteringSession.nom} 
          onComplete={handlePortalComplete} 
        />
      )}

      {/* Overlay de navigation */}
      <Navigation
        open={navigationOpen}
        onClose={() => setNavigationOpen(false)}
      />

      {/* Bouton de secours Immersif (Auto sur mobile/tablette, optionnel sur PC) */}
      {navigationMode === 'immersive' && sessionActive && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: (showImmersiveNavButton || window.innerWidth < 1024) ? 1 : 0,
            scale: (showImmersiveNavButton || window.innerWidth < 1024) ? 1 : 0.8,
            pointerEvents: (showImmersiveNavButton || window.innerWidth < 1024) ? 'auto' : 'none'
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setNavigationOpen(true)}
          className="fixed bottom-6 left-6 z-[200] w-12 h-12 rounded-full bg-black/40 border border-theme-main/30 backdrop-blur-md flex items-center justify-center text-theme-main shadow-[0_0_20px_rgba(var(--color-main-rgb),0.2)] hover:border-theme-main hover:shadow-[0_0_30px_rgba(var(--color-main-rgb),0.4)] transition-all group lg:bottom-8 lg:left-8"
          title="Ouvrir le Grand Portail (Echap)"
        >
          <div className="absolute inset-0 rounded-full border border-theme-main/10 animate-ping opacity-20" />
          <Layout size={20} className="group-hover:rotate-90 transition-transform duration-500" />
        </motion.button>
      )}
    </div>
  )
}
