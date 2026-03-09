import { useState } from 'react'
import { useStore } from './store/useStore'
import Accueil from './pages/auth/Accueil'
import Connexion from './pages/auth/Connexion'
import Inscription from './pages/auth/Inscription'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import DashboardAdmin from './pages/admin/DashboardAdmin'
import DashboardJoueur from './pages/joueur/DashboardJoueur'
import PNJ from './pages/admin/PNJ'
import Joueurs from './pages/admin/Joueurs'
import Sessions from './pages/shared/Sessions'
import MonPersonnage from './pages/shared/MonPersonnage'
import LancerDes from './pages/shared/LancerDes'
import GererMJ from './pages/admin/GererMJ'
import Gerer from './pages/admin/gerer/Gerer'
import Items from './pages/admin/Items'
import MonInventaire from './pages/shared/MonInventaire'

type PageAuth = 'accueil' | 'connexion' | 'inscription'

function PageCourante() {
  const pageCourante = useStore(s => s.pageCourante)
  const roleEffectif = useStore(s => s.roleEffectif)

  const estAdminOuMJ = roleEffectif === 'admin' || roleEffectif === 'mj'

  if (pageCourante === 'sessions') return <Sessions />
  if (pageCourante === 'gerer-mj' && estAdminOuMJ) return <GererMJ />
  if (pageCourante === 'lancer-des') return <LancerDes />
  if (pageCourante === 'mon-personnage') return <MonPersonnage />
  if (pageCourante === 'pnj' && estAdminOuMJ) return <PNJ />
  if (pageCourante === 'joueurs' && estAdminOuMJ) return <Joueurs />
  if (pageCourante === 'gerer' && estAdminOuMJ) return <Gerer />
  if (pageCourante === 'items' && estAdminOuMJ) return <Items />
  if (pageCourante === 'mon-inventaire') return <MonInventaire />
  if (estAdminOuMJ) return <DashboardAdmin />
  return <DashboardJoueur />
}

export default function App() {
  const [pageAuth, setPageAuth] = useState<PageAuth>('accueil')
  const compte = useStore(s => s.compte)
  
  // 🎨 1. ON RÉCUPÈRE LE THÈME DEPUIS TON STORE (ou violet par défaut)
  const theme = useStore(s => s.theme) || 'theme-default'

  // 🎨 2. ON ENGLOBE TOUTE L'APP AVEC LA VARIABLE DU THÈME
  return (
    <div className={`${theme} font-sans h-screen overflow-hidden text-gray-100 bg-gray-950`}>
      {compte ? (
        <div className="flex flex-col h-full">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-gray-950 relative">
              <PageCourante />
            </main>
          </div>
        </div>
      ) : pageAuth === 'connexion' ? (
        <Connexion retour={() => setPageAuth('accueil')} />
      ) : pageAuth === 'inscription' ? (
        <Inscription retour={() => setPageAuth('accueil')} allerVersConnexion={() => setPageAuth('connexion')} />
      ) : (
        <Accueil allerVers={setPageAuth} />
      )}
    </div>
  )
}