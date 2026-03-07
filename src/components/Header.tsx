import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function Header() {
  const compte = useStore(s => s.compte)
  const setCompte = useStore(s => s.setCompte)
  const setSessionActive = useStore(s => s.setSessionActive)
  const sessionActive = useStore(s => s.sessionActive)
  const setPageCourante = useStore(s => s.setPageCourante)
  const [menuOuvert, setMenuOuvert] = useState(false)

  const seDeconnecter = () => {
    setCompte(null)
    setSessionActive(null)
    setMenuOuvert(false)
  }

  return (
    <div className="flex justify-between items-center px-8 py-4 bg-gray-900 border-b border-gray-800">
      <h1 className="text-xl font-bold text-purple-400">
        jdr app {compte?.role === 'admin' && <span className="text-yellow-400 text-sm">Mj</span>}
      </h1>

      <p className="text-gray-400 font-semibold text-sm">
        {sessionActive ? sessionActive.nom : 'Aucune session'}
      </p>

      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOuvert(!menuOuvert) }}
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
        >
          {compte?.pseudo} <span className="text-xs">{menuOuvert ? '▲' : '▼'}</span>
        </button>

        {menuOuvert && (
          <div
            className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-xl shadow-lg overflow-hidden z-10"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { setPageCourante('sessions'); setMenuOuvert(false) }}
              className="w-full text-left px-4 py-3 hover:bg-gray-700 transition text-sm"
            >
              🎲 Sessions
            </button>
            <button
              onClick={seDeconnecter}
              className="w-full text-left px-4 py-3 hover:bg-gray-700 transition text-sm text-red-400"
            >
              ← Se déconnecter
            </button>
          </div>
        )}
      </div>
    </div>
  )
}