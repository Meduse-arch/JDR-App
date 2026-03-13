import { useStore } from '../store/useStore'

export default function Sidebar() {
  const { 
    pageCourante, setPageCourante, 
    roleEffectif, sessionActive, 
    pnjControle, setPnjControle, 
    sidebarOuverte, setSidebarOuverte 
  } = useStore()

  const isMJ = roleEffectif === 'admin' || roleEffectif === 'mj'

  const handleNav = (id: string) => {
    setPageCourante(id)
    // On ne ferme automatiquement QUE si on est en mode "mobile" (largeur < 1024px)
    if (window.innerWidth < 1024) {
      setSidebarOuverte(false)
    }
  }

  // Menus
  const menuMJ = [
    { id: 'dashboard',    label: 'Tableau de bord', icon: '🏰' },
    { id: 'joueurs',      label: 'Joueurs & MJ',    icon: '👥' },
    { id: 'pnj',          label: 'PNJ',             icon: '👤' },
    { id: 'bestiaire',    label: 'Bestiaire',       icon: '🐉' },
    { id: 'items',        label: 'Objets',          icon: '🎒' },
    { id: 'competences',  label: 'Compétences',     icon: '✨' },
    { id: 'elements',     label: 'Éléments',        icon: '⚛️' },
    { id: 'quetes',       label: 'Quêtes',          icon: '📜' },
    { id: 'lancer-des',   label: 'Lancer des dés',  icon: '🎲' },
    { id: 'gerer',        label: 'Possession',      icon: '🎭' },
    { id: 'gerer-univers',label: 'Gérer Univers',   icon: '⚙️' },
  ]

  const menuPossession = [
    { id: 'mon-personnage', label: 'Ma Fiche',        icon: '📖' },
    { id: 'mon-inventaire', label: 'Mon Sac',         icon: '🎒' },
    { id: 'mes-competences',label: 'Mes Skills',      icon: '✨' },
    { id: 'mes-quetes',     label: 'Mes Quêtes',      icon: '📜' },
    { id: 'lancer-des',     label: 'Lancer des dés',  icon: '🎲' },
  ]

  const menuJoueur = [
    { id: 'dashboard',      label: 'Mon Destin',      icon: '🕯️' },
    { id: 'mon-personnage', label: 'Ma Fiche',        icon: '📖' },
    { id: 'mon-inventaire', label: 'Mon Sac',         icon: '🎒' },
    { id: 'mes-competences',label: 'Mes Skills',      icon: '✨' },
    { id: 'mes-quetes',     label: 'Mes Quêtes',      icon: '📜' },
    { id: 'lancer-des',     label: 'Lancer des dés',  icon: '🎲' },
  ]

  let menu = isMJ ? (pnjControle ? menuPossession : menuMJ) : menuJoueur

  if (!sessionActive) return null

  return (
    <>
      {/* Overlay pour mobile */}
      {sidebarOuverte && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSidebarOuverte(false)}
        />
      )}

      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 border-r border-theme flex flex-col shrink-0 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${sidebarOuverte ? 'translate-x-0 lg:ml-0' : '-translate-x-full lg:translate-x-0 lg:-ml-64'}`}
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col pt-20 lg:pt-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-6 text-main">
            {pnjControle ? `Incarne : ${pnjControle.nom}` : 'Navigation'}
          </p>

          <nav className="flex flex-col gap-1">
            {menu.map(item => {
              const actif = pageCourante === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group ${actif ? 'bg-main text-white shadow-lg shadow-main/20' : 'hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: actif ? 'var(--color-main)' : 'transparent' }}
                >
                  <span className={`text-lg transition-transform group-hover:scale-110 ${actif ? 'filter-none' : 'grayscale opacity-50'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              )
            })}

            {isMJ && pnjControle && (
              <div className="mt-6 pt-6 border-t border-white/5 flex flex-col gap-1">
                <p className="text-[9px] font-black uppercase opacity-20 mb-2 ml-4">Pouvoirs MJ</p>
                <button onClick={() => handleNav('gerer')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${pageCourante === 'gerer' ? 'bg-white/10 text-white' : 'opacity-40 hover:opacity-100'}`}>
                  <span>🎭</span> Possession
                </button>
                <button onClick={() => handleNav('gerer-univers')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${pageCourante === 'gerer-univers' ? 'bg-white/10 text-white' : 'opacity-40 hover:opacity-100'}`}>
                  <span>⚙️</span> Gérer Univers
                </button>
                <button onClick={() => { setPnjControle(null); handleNav('dashboard') }} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-red-400 hover:bg-red-500/10 transition-all mt-2">
                  <span>✖</span> Lâcher l'hôte
                </button>
              </div>
            )}
          </nav>
        </div>

        <div className="p-6 border-t border-theme">
          <div className="p-4 rounded-2xl bg-black/20 border border-white/5 flex flex-col gap-1">
            <p className="text-[9px] font-black uppercase opacity-30 tracking-widest">Rôle Actuel</p>
            <p className="text-xs font-bold uppercase tracking-tighter" style={{ color: 'var(--color-light)' }}>
              {roleEffectif === 'mj' ? 'Maître du Jeu' : roleEffectif}
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
