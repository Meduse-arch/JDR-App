import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

export default function Header() {
  const compte = useStore(s => s.compte)
  const setCompte = useStore(s => s.setCompte)
  const setSessionActive = useStore(s => s.setSessionActive)
  const sessionActive = useStore(s => s.sessionActive)
  const setPageCourante = useStore(s => s.setPageCourante)
  
  // 🎨 Variables pour le thème
  const theme = useStore(s => s.theme) || 'theme-default'
  const setTheme = useStore(s => s.setTheme)
  const [modeClair, setModeClair] = useState(false)

  // États pour les deux menus
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [menuThemeOuvert, setMenuThemeOuvert] = useState(false)

  // 🕵️‍♂️ DEUX RÉFÉRENCES : Une pour chaque menu
  const themeRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Écouteur global pour fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Si on clique hors du menu thème, on le ferme
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setMenuThemeOuvert(false)
      }
      // Si on clique hors du menu utilisateur, on le ferme
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setMenuOuvert(false)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const seDeconnecter = () => {
    setCompte(null)
    setSessionActive(null)
    setMenuOuvert(false)
  }

  const themes = [
    { id: 'theme-default', nom: 'Violet', couleur: 'bg-purple-500' },
    { id: 'theme-emerald', nom: 'Émeraude', couleur: 'bg-emerald-500' },
    { id: 'theme-rose', nom: 'Rose', couleur: 'bg-rose-500' },
    { id: 'theme-ocean', nom: 'Océan', couleur: 'bg-blue-500' },
  ]

  return (
    <div className="flex justify-between items-center px-8 py-4 bg-gray-900 border-b border-gray-800">
      
      {/* 🎨 Le titre utilise text-theme-light pour s'adapter à ton choix sans bug */}
      <h1 className="text-xl font-bold text-theme-light">
        jdr app {compte?.role === 'admin' && <span className="text-yellow-400 text-sm ml-2">Mj</span>}
      </h1>

      <p className="text-gray-400 font-semibold text-sm">
        {sessionActive ? sessionActive.nom : 'Aucune session'}
      </p>

      <div className="flex items-center gap-3">

        {/* 🎨 BOUTON THÈME */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setMenuThemeOuvert(!menuThemeOuvert)} // Plus de stopPropagation
            className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
          >
            🎨 Thème
          </button>

          {menuThemeOuvert && (
            <div className="absolute top-full right-0 mt-3 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 flex flex-col gap-4 z-10">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-3 block">Couleur d'accent</span>
                <div className="flex justify-between items-center px-1">
                  {themes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      title={t.nom}
                      className={`w-6 h-6 rounded-full transition-all duration-300 ${t.couleur}
                        ${theme === t.id ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'opacity-50 hover:opacity-100 hover:scale-110'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="w-full h-px bg-gray-700"></div>

              <div>
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-3 block">Mode d'affichage</span>
                <div className="flex bg-gray-900 rounded-lg p-1">
                  <button
                    onClick={() => setModeClair(false)}
                    className={`flex-1 text-xs py-1.5 rounded-md font-bold transition-all ${!modeClair ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    🌙 Sombre
                  </button>
                  <button
                    onClick={() => setModeClair(true)}
                    className={`flex-1 text-xs py-1.5 rounded-md font-bold transition-all ${modeClair ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    ☀️ Clair
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 👤 MENU UTILISATEUR */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setMenuOuvert(!menuOuvert)} // Plus de stopPropagation
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
          >
            {compte?.pseudo} <span className="text-xs">{menuOuvert ? '▲' : '▼'}</span>
          </button>

          {menuOuvert && (
            <div
              className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-xl shadow-lg overflow-hidden z-10 border border-gray-700"
            >
              <button
                onClick={() => { setPageCourante('sessions'); setMenuOuvert(false) }}
                className="w-full text-left px-4 py-3 hover:bg-gray-700 transition text-sm flex items-center gap-2"
              >
                <span>🎲</span> Sessions
              </button>
              <button
                onClick={seDeconnecter}
                className="w-full text-left px-4 py-3 hover:bg-red-500/10 hover:text-red-400 transition text-sm text-red-500 flex items-center gap-2"
              >
                <span>←</span> Se déconnecter
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}