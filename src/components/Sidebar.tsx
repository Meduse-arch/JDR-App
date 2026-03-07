import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function Sidebar() {
  const sessionActive = useStore(s => s.sessionActive)
  const roleEffectif = useStore(s => s.roleEffectif)
  const pageCourante = useStore(s => s.pageCourante)
  const setPageCourante = useStore(s => s.setPageCourante)
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const estAdminOuMJ = roleEffectif === 'admin' || roleEffectif === 'mj'
  const afficherPersonnage = roleEffectif === 'joueur' || (estAdminOuMJ && pnjControle)

  // Gère l'état d'ouverture des groupes de menus
  const [menusOuverts, setMenusOuverts] = useState<Record<string, boolean>>({
    perso: true,  // Le menu du perso est ouvert par défaut
    utils: true,  // Les utilitaires aussi
    admin: false  // L'admin est fermé par défaut pour pas surcharger
  })

  const toggleMenu = (id: string) => {
    setMenusOuverts(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Composant pour un bouton simple
  const NavItem = ({ id, label, emoji, isSubItem = false }: { id: string, label: string, emoji?: string, isSubItem?: boolean }) => {
    const actif = pageCourante === id
    return (
      <button
        onClick={() => setPageCourante(id)}
        className={`w-full text-left rounded-lg transition flex items-center gap-3
          ${isSubItem ? 'pl-11 pr-4 py-2 text-sm font-medium' : 'px-4 py-3 text-sm font-semibold'}
          ${actif
            ? (isSubItem ? 'text-purple-400 bg-purple-900/20' : 'bg-purple-600 text-white')
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
      >
        {!isSubItem && <span>{emoji}</span>}
        <span className="truncate flex-1">{label}</span>
        {isSubItem && actif && <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>}
      </button>
    )
  }

  // Composant pour un groupe (dossier)
  const NavGroup = ({ id, label, emoji, children }: { id: string, label: string, emoji: string, children: React.ReactNode }) => {
    const ouvert = menusOuverts[id]
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={() => toggleMenu(id)}
          className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition flex items-center gap-3
            ${ouvert ? 'text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
        >
          <span>{emoji}</span>
          <span className="flex-1 truncate">{label}</span>
          <span className="text-[10px] text-gray-500 transition-transform duration-200" style={{ transform: ouvert ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
            ▼
          </span>
        </button>
        {ouvert && (
          <div className="relative flex flex-col gap-1 mt-1 mb-2">
            {/* Ligne verticale de hiérarchie */}
            <div className="absolute left-[1.35rem] top-2 bottom-2 w-px bg-gray-700"></div>
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-3 gap-2 overflow-y-auto overflow-x-hidden custom-scrollbar">

      {/* Badge du rôle en haut */}
      {sessionActive && roleEffectif && (
        <div className={`mx-2 mb-4 px-3 py-1.5 rounded-lg text-xs font-bold text-center tracking-wide uppercase
          ${roleEffectif === 'admin' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/50' :
            roleEffectif === 'mj' ? 'bg-purple-900/50 text-purple-400 border border-purple-700/50' :
            'bg-gray-800/80 text-gray-400 border border-gray-700'}`}>
          {roleEffectif === 'admin' ? '⚡ Admin' : roleEffectif === 'mj' ? '🎭 Maître du Jeu' : '🧑 Joueur'}
        </div>
      )}

      {/* Menu principal hors session */}
      <NavItem id="dashboard" label="Dashboard" emoji="🏠" />

      {/* N'afficher la suite que si une session est active */}
      {sessionActive && (
        <>
          {/* GROUPE PERSONNAGE */}
          {afficherPersonnage && (
            <NavGroup id="perso" label={pnjControle ? pnjControle.nom : 'Mon Personnage'} emoji="🎭">
              <NavItem id="mon-personnage" label="Fiche de stats" isSubItem />
              <NavItem id="mon-inventaire" label="Inventaire & Sac" isSubItem />
              
              {/* Bouton rouge pour lâcher le PNJ */}
              {pnjControle && (
                <button
                  onClick={() => { setPnjControle(null); setPageCourante('dashboard') }}
                  className="w-full text-left pl-11 pr-4 py-2 mt-1 rounded-lg text-xs font-semibold transition text-red-400 hover:bg-red-900/30 flex items-center gap-2"
                >
                  <span>✖️</span> Lâcher le contrôle
                </button>
              )}
            </NavGroup>
          )}

          {/* GROUPE UTILITAIRES */}
          <NavGroup id="utils" label="Utilitaires" emoji="🛠️">
            <NavItem id="lancer-des" label="Lancer des dés" isSubItem />
          </NavGroup>

          {/* GROUPE ADMINISTRATION (MJ/Admin seulement) */}
          {estAdminOuMJ && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <NavGroup id="admin" label="Administration" emoji="👑">
                <NavItem id="pnj" label="Bestiaire & PNJ" isSubItem />
                <NavItem id="items" label="Bibliothèque Items" isSubItem />
                <NavItem id="joueurs" label="Gérer les Joueurs" isSubItem />
                <NavItem id="gerer" label="Paramètres Session" isSubItem />
                
                {roleEffectif === 'admin' && (
                  <NavItem id="gerer-mj" label="Gérer les MJ" isSubItem />
                )}
              </NavGroup>
            </div>
          )}
        </>
      )}

    </div>
  )
}