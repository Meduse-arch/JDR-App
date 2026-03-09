import { create } from 'zustand'

// ============================================================
// TYPES EXPORTÉS — Source unique de vérité pour toute l'app
// Importez ces types dans vos pages au lieu de les redéclarer
// ============================================================

export type Compte = {
  id: string
  pseudo: string
  role: string
}

export type Session = {
  id: string
  nom: string
  description: string
  cree_par: string
  date_creation?: string
}

/**
 * Type complet d'un personnage tel que stocké en BDD.
 * Utilisé partout : joueurs, PNJ, pnjControle.
 * → Importez ce type depuis useStore plutôt que de le redéclarer localement.
 */
export type Personnage = {
  id: string
  nom: string
  hp_actuel: number
  hp_max: number
  mana_actuel: number
  mana_max: number
  stam_actuel: number
  stam_max: number
  est_pnj: boolean
  lie_au_compte?: string | null
  // Jointure optionnelle (présente dans DashboardAdmin via la requête Supabase)
  comptes?: { pseudo: string }
}

// Les 4 thèmes disponibles
export type ThemeId = 'theme-violet' | 'theme-emerald' | 'theme-rose' | 'theme-ocean'
export type ModeId  = 'mode-dark' | 'mode-light'

// ============================================================
// STORE ZUSTAND
// ============================================================

type Store = {
  compte: Compte | null
  setCompte: (compte: Compte | null) => void

  sessionActive: Session | null
  setSessionActive: (session: Session | null) => void

  roleEffectif: 'admin' | 'mj' | 'joueur' | null
  setRoleEffectif: (role: 'admin' | 'mj' | 'joueur' | null) => void

  pageCourante: string
  setPageCourante: (page: string) => void

  /**
   * Le personnage ou PNJ actuellement contrôlé par le MJ.
   * null = le MJ voit sa propre vue, ou le joueur voit son propre perso.
   * Quand défini, les hooks usePersonnage / useInventaire / useStats
   * fetchent les données de ce personnage au lieu de celles du compte connecté.
   */
  pnjControle: Personnage | null
  setPnjControle: (pnj: Personnage | null) => void

  // Thème couleur + mode luminosité séparés
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  mode: ModeId
  setMode: (mode: ModeId) => void
}

export const useStore = create<Store>()((set) => ({
  compte: JSON.parse(localStorage.getItem('jdr-compte') || 'null'),
  setCompte: (compte) => set({ compte }),

  sessionActive: null,
  setSessionActive: (session) => set({ sessionActive: session }),

  roleEffectif: null,
  setRoleEffectif: (role) => set({ roleEffectif: role }),

  pageCourante: 'dashboard',
  setPageCourante: (page) => set({ pageCourante: page }),

  pnjControle: null,
  setPnjControle: (pnj) => set({ pnjControle: pnj }),

  theme: (localStorage.getItem('jdr-theme') as ThemeId) || 'theme-violet',
  setTheme: (theme) => {
    localStorage.setItem('jdr-theme', theme)
    set({ theme })
  },

  mode: (localStorage.getItem('jdr-mode') as ModeId) || 'mode-dark',
  setMode:  (mode)  => {
    localStorage.setItem('jdr-mode', mode)
    set({ mode })
  },
}))