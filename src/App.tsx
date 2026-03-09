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
import GererMJ from './pages/admin/GererMj'
import Gerer from './pages/admin/gerer/Gerer'
import Items from './pages/admin/Items'
import MonInventaire from './pages/shared/MonInventaire'

type PageAuth = 'accueil' | 'connexion' | 'inscription'

function PageCourante() {
  const pageCourante = useStore(s => s.pageCourante)
  const roleEffectif = useStore(s => s.roleEffectif)
  const estAdminOuMJ = roleEffectif === 'admin' || roleEffectif === 'mj'

  if (pageCourante === 'sessions')                    return <Sessions />
  if (pageCourante === 'gerer-mj' && estAdminOuMJ)    return <GererMJ />
  if (pageCourante === 'lancer-des')                  return <LancerDes />
  if (pageCourante === 'mon-personnage')               return <MonPersonnage />
  if (pageCourante === 'pnj'     && estAdminOuMJ)     return <PNJ />
  if (pageCourante === 'joueurs' && estAdminOuMJ)     return <Joueurs />
  if (pageCourante === 'gerer'   && estAdminOuMJ)     return <Gerer />
  if (pageCourante === 'items'   && estAdminOuMJ)     return <Items />
  if (pageCourante === 'mon-inventaire')              return <MonInventaire />
  if (estAdminOuMJ) return <DashboardAdmin />
  return <DashboardJoueur />
}

export default function App() {
  const [pageAuth, setPageAuth] = useState<PageAuth>('accueil')
  const compte = useStore(s => s.compte)

  // Les deux variables de thème sont maintenant séparées dans le store
  const theme = useStore(s => s.theme)   // ex: 'theme-violet'
  const mode  = useStore(s => s.mode)    // ex: 'mode-dark' | 'mode-light'

  // On les combine sur le div racine : CSS sait alors quelles variables appliquer
  // ex: <div class="theme-violet mode-light"> → lit les règles .theme-violet.mode-light
  return (
    <div
      className={`${theme} ${mode} font-sans h-screen overflow-hidden`}
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      {compte ? (
        <div className="flex flex-col h-full">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main
              className="flex-1 overflow-y-auto relative"
              style={{ backgroundColor: 'var(--bg-app)' }}
            >
              <PageCourante />
            </main>
          </div>
        </div>
      ) : pageAuth === 'connexion' ? (
        <Connexion retour={() => setPageAuth('accueil')} />
      ) : pageAuth === 'inscription' ? (
        <Inscription
          retour={() => setPageAuth('accueil')}
          allerVersConnexion={() => setPageAuth('connexion')}
        />
      ) : (
        <Accueil allerVers={setPageAuth} />
      )}
    </div>
  )
}