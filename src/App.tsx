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
import Sessions from './pages/shared/Sessions'
import MonPersonnage from './pages/joueur/MonPersonnage'

type PageAuth = 'accueil' | 'connexion' | 'inscription'

function PageCourante() {
  const pageCourante = useStore(s => s.pageCourante)
  const compte = useStore(s => s.compte)

  if (pageCourante === 'sessions') return <Sessions />
  if (pageCourante === 'pnj' && compte?.role === 'admin') return <PNJ />
  if (pageCourante === 'mon-personnage') return <MonPersonnage />
  if (compte?.role === 'admin') return <DashboardAdmin />
  return <DashboardJoueur />
}

export default function App() {
  const [pageAuth, setPageAuth] = useState<PageAuth>('accueil')
  const compte = useStore(s => s.compte)

  if (compte) return (
    <div className="flex flex-col h-screen bg-gray-950">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-950">
          <PageCourante />
        </main>
      </div>
    </div>
  )

  if (pageAuth === 'connexion') return (
    <Connexion retour={() => setPageAuth('accueil')} />
  )

  if (pageAuth === 'inscription') return (
    <Inscription retour={() => setPageAuth('accueil')} allerVersConnexion={() => setPageAuth('connexion')} />
  )

  return <Accueil allerVers={setPageAuth} />
}