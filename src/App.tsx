import { useStore } from './Store/useStore'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import DashboardAdmin from './pages/admin/DashboardAdmin'
import DashboardJoueur from './pages/joueur/DashboardJoueur'
import Connexion from './pages/auth/Connexion'
import Inscription from './pages/auth/Inscription'
import Accueil from './pages/auth/Accueil'
import Sessions from './pages/shared/Sessions'
import MonPersonnage from './pages/shared/MonPersonnage'
import MonInventaire from './pages/shared/MonInventaire'
import MesCompetences from './pages/shared/MesCompetences'
import PNJ from './pages/admin/PNJ'
import Joueurs from './pages/admin/Joueurs'
import Bestiaire from './pages/admin/Bestiaire'
import Items from './pages/admin/Items'
import Competences from './pages/admin/Competences'
import Gerer from './pages/admin/gerer/Gerer'
import GererQuetes from './pages/admin/GererQuetes'
import MesQuetes from './pages/joueur/MesQuetes'
import LancerDes from './pages/shared/LancerDes'
import GererMj from './pages/admin/GererMj'
import Possession from './pages/admin/Possession'

export default function App() {
  const { compte, sessionActive, pageCourante, roleEffectif, theme, mode, setPageCourante } = useStore()

  if (!compte) {
    if (pageCourante === 'inscription') {
      return <Inscription retour={() => setPageCourante('accueil')} allerVersConnexion={() => setPageCourante('connexion')} />
    }
    if (pageCourante === 'connexion') {
      return <Connexion retour={() => setPageCourante('accueil')} />
    }
    return <Accueil allerVers={(p) => setPageCourante(p)} />
  }

  if (!sessionActive) return (
    <div className={`flex flex-col h-screen ${theme} ${mode} bg-app text-primary`}>
      <Header />
      <div className="flex-1 overflow-y-auto bg-black/5">
        <Sessions />
      </div>
    </div>
  )

  const renderPage = () => {
    switch (pageCourante) {
      case 'dashboard':      return (roleEffectif === 'admin' || roleEffectif === 'mj') ? <DashboardAdmin /> : <DashboardJoueur />
      case 'mon-personnage': return <MonPersonnage />
      case 'mon-inventaire': return <MonInventaire />
      case 'mes-competences':return <MesCompetences />
      case 'mes-quetes':     return <MesQuetes />
      case 'lancer-des':     return <LancerDes />
      case 'pnj':            return <PNJ />
      case 'joueurs':        return <Joueurs />
      case 'bestiaire':      return <Bestiaire />
      case 'items':          return <Items />
      case 'competences':    return <Competences />
      case 'quetes':         return <GererQuetes />
      case 'gerer':          return <Possession /> 
      case 'gerer-univers':  return <Gerer />      
      case 'gerer-mj':       return <GererMj />
      default:               return (roleEffectif === 'admin' || roleEffectif === 'mj') ? <DashboardAdmin /> : <DashboardJoueur />
    }
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${theme} ${mode} bg-app text-primary`}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-y-auto custom-scrollbar bg-black/5">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  )
}
