import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function Sidebar() {
  const sessionActive  = useStore(s => s.sessionActive)
  const roleEffectif   = useStore(s => s.roleEffectif)
  const pageCourante   = useStore(s => s.pageCourante)
  const setPageCourante = useStore(s => s.setPageCourante)
  const pnjControle    = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const estAdminOuMJ      = roleEffectif === 'admin' || roleEffectif === 'mj'
  const afficherPersonnage = roleEffectif === 'joueur' || (estAdminOuMJ && pnjControle)

  const [menusOuverts, setMenusOuverts] = useState<Record<string, boolean>>({
    perso: true,
    utils: true,
    admin: false,
  })
  const toggleMenu = (id: string) =>
    setMenusOuverts(prev => ({ ...prev, [id]: !prev[id] }))

  /* ── Bouton de navigation simple ── */
  const NavItem = ({
    id, label, emoji, isSubItem = false,
  }: { id: string; label: string; emoji?: string; isSubItem?: boolean }) => {
    const actif = pageCourante === id
    return (
      <button
        onClick={() => setPageCourante(id)}
        className={`w-full text-left rounded-xl transition-all flex items-center gap-3
          ${isSubItem ? 'pl-10 pr-3 py-2 text-sm font-medium' : 'px-4 py-3 text-sm font-semibold'}`}
        style={{
          backgroundColor: actif
            ? (isSubItem ? 'color-mix(in srgb, var(--color-main) 15%, transparent)' : 'var(--color-main)')
            : 'transparent',
          color: actif
            ? (isSubItem ? 'var(--color-light)' : '#ffffff')
            : 'var(--text-secondary)',
        }}
        onMouseEnter={e => { if (!actif) e.currentTarget.style.backgroundColor = 'var(--bg-card)' }}
        onMouseLeave={e => { if (!actif) e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        {!isSubItem && <span>{emoji}</span>}
        <span className="truncate flex-1">{label}</span>
        {isSubItem && actif && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--color-main)' }}
          />
        )}
      </button>
    )
  }

  /* ── Groupe accordéon ── */
  const NavGroup = ({
    id, label, emoji, children,
  }: { id: string; label: string; emoji: string; children: React.ReactNode }) => {
    const ouvert = menusOuverts[id]
    return (
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => toggleMenu(id)}
          className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-3"
          style={{ color: ouvert ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <span>{emoji}</span>
          <span className="flex-1 truncate">{label}</span>
          <span
            className="text-[10px] transition-transform duration-200"
            style={{
              color: 'var(--text-muted)',
              transform: ouvert ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          >
            ▼
          </span>
        </button>

        {ouvert && (
          <div className="relative flex flex-col gap-0.5 mt-0.5 mb-1">
            {/* Ligne de hiérarchie */}
            <div
              className="absolute left-[1.35rem] top-2 bottom-2 w-px"
              style={{ backgroundColor: 'var(--border)' }}
            />
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside
      className="w-56 shrink-0 flex flex-col py-5 px-3 gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar border-r"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      {/* Badge rôle */}
      {sessionActive && roleEffectif && (
        <div
          className="mx-1 mb-4 px-3 py-1.5 rounded-xl text-xs font-black text-center tracking-wide uppercase border"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-main) 15%, transparent)',
            color: 'var(--color-light)',
            borderColor: 'color-mix(in srgb, var(--color-main) 40%, transparent)',
          }}
        >
          {roleEffectif === 'admin' ? '⚡ Admin'
            : roleEffectif === 'mj' ? '🎭 Maître du Jeu'
            : '🧑 Joueur'}
        </div>
      )}

      <NavItem id="dashboard" label="Dashboard" emoji="🏠" />

      {sessionActive && (
        <>
          {/* GROUPE PERSONNAGE */}
          {afficherPersonnage && (
            <NavGroup
              id="perso"
              label={pnjControle ? pnjControle.nom : 'Mon Personnage'}
              emoji="🎭"
            >
              <NavItem id="mon-personnage" label="Fiche de stats"   isSubItem />
              <NavItem id="mon-inventaire" label="Inventaire"       isSubItem />
              <NavItem id="mes-competences" label="Mes Compétences" isSubItem />

              {pnjControle && (
                <button
                  onClick={() => { setPnjControle(null); setPageCourante('dashboard') }}
                  className="w-full text-left pl-10 pr-3 py-2 mt-1 rounded-xl text-xs font-semibold transition flex items-center gap-2"
                  style={{ color: '#f87171' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
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

          {/* GROUPE ADMINISTRATION */}
          {estAdminOuMJ && (
            <div
              className="mt-3 pt-3 border-t flex flex-col gap-0.5"
              style={{ borderColor: 'var(--border)' }}
            >
              <NavGroup id="admin" label="Administration" emoji="👑">
                <NavItem id="pnj"         label="PNJ"         isSubItem />
                <NavItem id="bestiaire"   label="Bestiaire & Mobs"    isSubItem />
                <NavItem id="items"       label="Bibliothèque Items"   isSubItem />
                <NavItem id="competences" label="Compétences"         isSubItem />
                <NavItem id="joueurs"     label="Gérer les Joueurs"    isSubItem />
                <NavItem id="gerer"       label="Paramètres Session"   isSubItem />
                {roleEffectif === 'admin' && (
                  <NavItem id="gerer-mj" label="Gérer les MJ" isSubItem />
                )}
              </NavGroup>
            </div>
          )}
        </>
      )}
    </aside>
  )
}