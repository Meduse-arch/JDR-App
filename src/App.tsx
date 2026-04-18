import { useEffect } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import DashboardAdmin from './pages/admin/DashboardAdmin'
import DashboardJoueur from './pages/joueur/DashboardJoueur'
import Connexion from './pages/auth/Connexion'
import Inscription from './pages/auth/Inscription'
import Accueil from './pages/auth/Accueil'
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
import Logs from './pages/admin/Logs'
import CarteMap from './pages/shared/Map'
import Chat from './pages/shared/Chat'

const TITRES_LEGENDE: Record<string, string> = {
  'sessions': "PORTE DES MONDES",
  'dashboard': "SANCTUAIRE",
  'selection-personnage': "ORACLE DU CODEX",
  'mon-personnage': "INCARNATION DE L'ÂME",
  'mon-inventaire': "POSSESSIONS DU MONDE",
  'mes-competences': "CODEX DES ARCANES",
  'mes-quetes': "CHRONIQUES DES LÉGENDES",
  'lancer-des': "VERDICT DE L'ORACLE",
  'pnj': "POPULATION ACTIVE",
  'joueurs': "HÉROS DU RÉCIT",
  'bestiaire': "BESTIAIRE ANCIEN",
  'items': "FORGE DES OBJETS",
  'competences': "FORGE DES ARCANES",
  'quetes': "RÉCIT DU MONDE",
  'gerer': "LOIS DE L'UNIVERS",
  'possession': "POSSESSION",
  'gerer-univers': "LOIS DE L'UNIVERS",
  'gerer-mj': "CONSEIL DES MAÎTRES",
  'tags': "SIGNES ET SYMBOLES",
  'chat': "CHRONIQUES DU CONSEIL",
};

export default function App() {
  const { 
    compte, 
    sessionActive, 
    pageCourante, 
    roleEffectif, 
    theme, 
    mode, 
    setPageCourante, 
    enteringSession, 
    setEnteringSession, 
    setSessionActive, 
    setRoleEffectif,
    setPnjControle
  } = useStore()

  useEffect(() => {
    const panicPage = sessionStorage.getItem('sigil-panic-page')
    const panicSession = sessionStorage.getItem('sigil-panic-session')
    const panicRole = sessionStorage.getItem('sigil-panic-role')
    const panicPnj = sessionStorage.getItem('sigil-panic-pnj')
    
    if (panicPage) {
      sessionStorage.removeItem('sigil-panic-page')
      sessionStorage.removeItem('sigil-panic-session')
      sessionStorage.removeItem('sigil-panic-role')
      sessionStorage.removeItem('sigil-panic-pnj')
      
      if (panicSession) setSessionActive(JSON.parse(panicSession))
      if (panicRole) setRoleEffectif(panicRole as any)
      if (panicPnj) setPnjControle(JSON.parse(panicPnj))
      setPageCourante(panicPage)
    }
  }, [])

  const { personnage } = usePersonnage()
  
  const roleActuel = (compte?.role === 'admin') ? 'admin' : (roleEffectif || 'joueur');
  const isLocked = roleActuel === 'joueur' && !personnage;
  const showCenteredHeader = isLocked;

  if (!compte) {
    if (pageCourante === 'inscription') {
      return <Inscription retour={() => setPageCourante('accueil')} allerVersConnexion={() => setPageCourante('connexion')} />
    }
    if (pageCourante === 'connexion') {
      return <Connexion retour={() => setPageCourante('accueil')} />
    }
    return <Accueil allerVers={(p) => setPageCourante(p)} />
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
    }
    
    setEnteringSession(null)
  }

  // ÉCRAN 1 : PORTE DES MONDES (SESSIONS)
  if (!sessionActive) return (
    <div className={`flex flex-col h-screen ${theme} ${mode} bg-app text-primary relative overflow-hidden`}>
      <Header />
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/5">
        <Sessions />
      </div>
      <div className="absolute inset-0 vignette-effect pointer-events-none z-50" />
      {enteringSession && (
        <SessionTransitionPortal 
          sessionNom={enteringSession.nom} 
          onComplete={handlePortalComplete} 
        />
      )}
    </div>
  )

  // ÉCRAN 2 : LE CODEX DE L'ORACLE (SÉLECTION PERSONNAGE)
  if (roleEffectif === 'joueur' && !personnage) return (
    <div className={`h-screen w-full overflow-y-auto ${theme} ${mode} bg-app`}>
      <SelectionPersonnage />
    </div>
  )

  const renderPageContent = () => {
    switch (pageCourante) {
      case 'dashboard':      return (roleEffectif === 'admin' || roleEffectif === 'mj') ? <DashboardAdmin /> : <DashboardJoueur />
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
      default:               return (roleEffectif === 'admin' || roleEffectif === 'mj') ? <DashboardAdmin /> : <DashboardJoueur />
    }
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${theme} ${mode} bg-app text-primary relative`}>
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
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
    </div>
  )
}