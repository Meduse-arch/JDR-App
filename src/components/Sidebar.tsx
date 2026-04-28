import { useState } from 'react';
import { useStore } from '../store/useStore';
import { menuMJ, menuJoueur } from '../config/menus';
import { RUNES_PAGES } from '../config/runes';
import { LogOut } from 'lucide-react';

export default function Sidebar() {
  const { 
    pageCourante, setPageCourante, 
    roleEffectif, sessionActive, 
    pnjControle, setPnjControle 
  } = useStore()

  const [collapsed, setCollapsed] = useState(true)

  const isMJ = roleEffectif === 'admin' || roleEffectif === 'mj'

  const handleNav = (id: string) => {
    setPageCourante(id)
  }

  const menu = (roleEffectif === 'admin' || roleEffectif === 'mj') && !pnjControle 
    ? menuMJ 
    : menuJoueur

  if (!sessionActive) return null

  return (
    <>
      {/* Main Sidebar */}
      <aside
        className="border-r border-theme flex flex-col shrink-0 overflow-hidden transition-all duration-300 relative z-[100]"
        style={{ 
          backgroundColor: 'var(--bg-surface)',
          width: collapsed ? '72px' : '288px'
        }}
      >
        {/* Zone scrollable — scrollbar toujours présente et identique peu importe le rôle */}
        <div
          className="flex-1 p-6 flex flex-col pt-6"
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(var(--color-main-rgb, 184,142,60),0.18) transparent',
          }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-3 mb-4 text-theme-main hover:bg-white/5 transition-all rounded-sm"
          >
            <span className="font-cinzel text-lg">{collapsed ? 'ᛁ' : 'ᛁ'}</span>
          </button>

          {!collapsed && (
            <p className="font-cinzel text-xs uppercase tracking-widest text-theme-main mb-6 border-b border-theme pb-2">
              {pnjControle ? `Possession: ${pnjControle.nom}` : 'Sommaire'}
            </p>
          )}

          <nav className="flex flex-col gap-2">
            {menu.map(item => {
              const actif = pageCourante === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  title={item.label}
                  className={`flex items-center gap-4 px-4 py-3 rounded-sm font-garamond text-lg transition-all duration-300 w-full
                    ${collapsed ? 'justify-center px-2' : ''}
                    ${actif ? 'bg-theme-main text-white shadow-md border border-theme-dark' : 'text-primary hover:bg-card hover:translate-x-1'}`}
                >
                  <span className={`font-cinzel text-xl shrink-0 ${actif ? 'text-white' : 'text-theme-main'}`}>
                    {item.rune}
                  </span>
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </button>
              )
            })}

            {isMJ && pnjControle && !collapsed && (
              <div className="mt-8 pt-6 border-t border-theme flex flex-col gap-2">
                <p className="font-cinzel text-[10px] text-muted-theme mb-2 ml-4">Actions MJ</p>
                <button
                  onClick={() => setPageCourante('selection-personnage')}
                  className={`flex items-center gap-3 px-4 py-2 rounded-sm text-sm font-garamond transition-all ${
                    pageCourante === 'selection-personnage' ? 'bg-card text-primary' : 'text-secondary hover:text-primary hover:bg-card-hover'
                   }`}
                 >
                  <span className="font-cinzel text-theme-light">{RUNES_PAGES['selection-personnage']}</span> Gestion
                 </button>
                <button
                  onClick={() => { setPnjControle(null); setPageCourante('dashboard') }}
                  className="flex items-center gap-3 px-4 py-2 rounded-sm text-sm font-garamond text-red-700 hover:bg-red-950/20 transition-all mt-2 border border-transparent hover:border-red-900"
                >
                  <LogOut size={16} strokeWidth={1.5} /> Libérer l'hôte
                </button>
              </div>
            )}

          </nav>
        </div>

        <div className="p-6 border-t border-theme bg-card/50 shrink-0">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-4'}`}>
            <div className="w-10 h-10 rounded-full bg-theme-dark flex items-center justify-center border-2 border-theme-main shadow-md shrink-0">
              <span className="font-cinzel font-bold text-white text-sm">
                {roleEffectif?.[0].toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <div>
                <p className="font-cinzel text-[10px] text-muted-theme uppercase tracking-wider">Rôle Actuel</p>
                <p className="font-garamond text-lg font-bold text-theme-light capitalize">
                  {roleEffectif === 'mj' ? 'Maître du Jeu' : roleEffectif}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}