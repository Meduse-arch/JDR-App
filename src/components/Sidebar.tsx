import { useStore } from '../Store/useStore'

export default function Sidebar() {
  const pageCourante = useStore(s => s.pageCourante)
  const setPageCourante = useStore(s => s.setPageCourante)
  const roleEffectif = useStore(s => s.roleEffectif)
  const sessionActive = useStore(s => s.sessionActive)
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const isMJ = roleEffectif === 'admin' || roleEffectif === 'mj'

  // Menu Standard MJ
  const menuMJ = [
    { id: 'dashboard',    label: 'Tableau de bord', icon: '🏰' },
    { id: 'joueurs',      label: 'Joueurs & MJ',    icon: '👥' },
    { id: 'pnj',          label: 'PNJ',             icon: '👤' },
    { id: 'bestiaire',    label: 'Bestiaire',       icon: '🐉' },
    { id: 'items',        label: 'Objets',          icon: '🎒' },
    { id: 'competences',  label: 'Compétences',     icon: '✨' },
    { id: 'quetes',       label: 'Quêtes',          icon: '📜' },
    { id: 'lancer-des',   label: 'Lancer des dés',  icon: '🎲' },
    { id: 'gerer',        label: 'Possession',      icon: '🎭' },
    { id: 'gerer-univers',label: 'Gérer Univers',   icon: '⚙️' },
  ]

  // Menu Possession (SANS dashboard pour immersion totale)
  const menuPossession = [
    { id: 'mon-personnage', label: 'Ma Fiche',        icon: '📖' },
    { id: 'mon-inventaire', label: 'Mon Sac',         icon: '🎒' },
    { id: 'mes-competences',label: 'Mes Skills',      icon: '✨' },
    { id: 'mes-quetes',     label: 'Mes Quêtes',      icon: '📜' },
    { id: 'lancer-des',     label: 'Lancer des dés',  icon: '🎲' },
  ]

  // Menu Joueur Standard
  const menuJoueur = [
    { id: 'dashboard',      label: 'Mon Destin',      icon: '🕯️' },
    { id: 'mon-personnage', label: 'Ma Fiche',        icon: '📖' },
    { id: 'mon-inventaire', label: 'Mon Sac',         icon: '🎒' },
    { id: 'mes-competences',label: 'Mes Skills',      icon: '✨' },
    { id: 'mes-quetes',     label: 'Mes Quêtes',      icon: '📜' },
    { id: 'lancer-des',     label: 'Lancer des dés',  icon: '🎲' },
  ]

  let menu = menuJoueur
  if (isMJ) {
    menu = pnjControle ? menuPossession : menuMJ
  }

  if (!sessionActive) return null

  return (
    <aside 
      className="w-64 border-r border-theme flex flex-col shrink-0 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col">
        
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-6 text-main">
          {pnjControle ? `Incarne : ${pnjControle.nom}` : 'Navigation'}
        </p>

        <nav className="flex flex-col gap-1">
          {menu.map(item => {
            const actif = pageCourante === item.id
            return (
              <button
                key={item.id}
                onClick={() => setPageCourante(item.id)}
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
              <button onClick={() => setPageCourante('gerer')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${pageCourante === 'gerer' ? 'bg-white/10 text-white' : 'opacity-40 hover:opacity-100'}`}>
                <span>🎭</span> Possession
              </button>
              <button onClick={() => setPageCourante('gerer-univers')} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${pageCourante === 'gerer-univers' ? 'bg-white/10 text-white' : 'opacity-40 hover:opacity-100'}`}>
                <span>⚙️</span> Gérer Univers
              </button>
              <button onClick={() => { setPnjControle(null); setPageCourante('dashboard') }} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-red-400 hover:bg-red-500/10 transition-all mt-2">
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
  )
}
