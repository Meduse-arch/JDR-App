import { useStore } from '../store/useStore'

type MenuItem = {
  id: string
  label: string
  emoji: string
  adminSeulement?: boolean
  necessiteSession?: boolean
}

const menus: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', emoji: '🏠' },
  { id: 'mon-personnage', label: 'Mon Personnage', emoji: '⚔️', necessiteSession: true },
  { id: 'pnj', label: 'PNJ', emoji: '👤', adminSeulement: true, necessiteSession: true },
]

export default function Sidebar() {
  const compte = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive)
  const pageCourante = useStore(s => s.pageCourante)
  const setPageCourante = useStore(s => s.setPageCourante)

  const menusFiltres = menus.filter(m => !m.adminSeulement || compte?.role === 'admin')

  return (
    <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-3 gap-1">
      {menusFiltres.map(menu => {
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
    </div>
  )
}