import { useStore } from '../store/useStore'

type MenuItem = {
  id: string
  label: string
  emoji: string
  adminOuMJ?: boolean
  necessiteSession?: boolean
}

const menusBase: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', emoji: '🏠' },
  { id: 'joueurs', label: 'Joueurs', emoji: '🧑‍🤝‍🧑', adminOuMJ: true, necessiteSession: true },
  { id: 'pnj', label: 'PNJ', emoji: '👤', adminOuMJ: true, necessiteSession: true },
  { id: 'gerer-mj', label: 'Gérer les MJ', emoji: '🎭', adminOuMJ: true, necessiteSession: true },
  { id: 'lancer-des', label: 'Lancer des dés', emoji: '🎲', necessiteSession: true },
]

export default function Sidebar() {
  const compte = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive)
  const roleEffectif = useStore(s => s.roleEffectif)
  const pageCourante = useStore(s => s.pageCourante)
  const setPageCourante = useStore(s => s.setPageCourante)
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const estAdminOuMJ = roleEffectif === 'admin' || roleEffectif === 'mj'
  const menus = menusBase.filter(m => !m.adminOuMJ || estAdminOuMJ)
  const afficherPersonnage = roleEffectif === 'joueur' || (estAdminOuMJ && pnjControle)

  return (
    <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-3 gap-1">

      {sessionActive && roleEffectif && (
        <div className={`mx-2 mb-4 px-3 py-1 rounded-lg text-xs font-semibold text-center
          ${roleEffectif === 'admin' ? 'bg-yellow-900 text-yellow-400' :
            roleEffectif === 'mj' ? 'bg-purple-900 text-purple-400' :
            'bg-gray-800 text-gray-400'}`}>
          {roleEffectif === 'admin' ? '⚡ Admin' : roleEffectif === 'mj' ? '🎭 MJ' : '🧑 Joueur'}
        </div>
      )}

      {menus.map(menu => {
        const bloque = menu.necessiteSession && !sessionActive
        const actif = pageCourante === menu.id

        return (
          <div key={menu.id} className="relative group">
            <button
              onClick={() => !bloque && setPageCourante(menu.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition flex items-center gap-3
                ${actif ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
                ${bloque ? 'opacity-40 cursor-not-allowed' : ''}
              `}
            >
              <span>{menu.emoji}</span>
              <span>{menu.label}</span>
              {bloque && <span className="ml-auto text-xs">🔒</span>}
            </button>
            {bloque && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-700 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-20">
                Rejoins une session d'abord
              </div>
            )}
          </div>
        )
      })}

      {afficherPersonnage && sessionActive && (
        <div className="relative group">
          <button
            onClick={() => setPageCourante('mon-personnage')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition flex items-center gap-3
              ${pageCourante === 'mon-personnage' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
            `}
          >
            <span>⚔️</span>
            <span className="truncate">{pnjControle ? pnjControle.nom : 'Mon Personnage'}</span>
          </button>
          {pnjControle && (
            <button
              onClick={() => { setPnjControle(null); setPageCourante('dashboard') }}
              className="w-full text-left px-4 py-3 rounded-lg text-sm transition text-red-400 hover:bg-gray-800 flex items-center gap-3"
            >
              <span>✖️</span>
              <span>Lâcher le personnage</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}