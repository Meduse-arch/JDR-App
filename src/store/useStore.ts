import { create } from 'zustand'

export type RoleId = 'admin' | 'mj' | 'joueur'
export type ThemeId = 'theme-violet' | 'theme-bleu' | 'theme-vert' | 'theme-rouge' | 'theme-jaune' | 'theme-emerald' | 'theme-rose' | 'theme-ocean'
export type ModeId = 'mode-dark' | 'mode-light'

export type Compte = { id: string; pseudo: string; role: RoleId }
export type Session = { id: string; nom: string; description: string; cree_par: string; created_at?: string }
export type PersonnageType = 'Joueur' | 'PNJ' | 'Monstre' | 'Boss'

export type Personnage = {
  id: string
  id_session: string
  nom: string
  type: PersonnageType
  is_template: boolean
  template_id?: string | null
  lie_au_compte?: string | null
  hp: number
  hp_max: number
  mana: number
  mana_max: number
  stam: number
  stam_max: number
  created_at?: string
}

interface JdrState {
  compte: Compte | null
  sessionActive: Session | null
  roleEffectif: RoleId | null
  pageCourante: string
  pnjControle: Personnage | null
  theme: ThemeId
  mode: ModeId
  sidebarOuverte: boolean
  diceResult: ({ rolls: number[], total: number, bonus: number, diceString: string, label: string, color: string })[] | null
  setCompte: (c: Compte | null) => void
  setSessionActive: (s: Session | null) => void
  setRoleEffectif: (r: RoleId | null) => void
  setPageCourante: (p: string) => void
  setPnjControle: (pnj: Personnage | null) => void
  setTheme: (t: ThemeId) => void
  setMode: (m: ModeId) => void
  setSidebarOuverte: (o: boolean) => void
  setDiceResult: (res: ({ rolls: number[], total: number, bonus: number, diceString: string, label: string, color: string })[] | null) => void
  deconnexion: () => void
}

export const useStore = create<JdrState>((set) => ({
  compte: JSON.parse(localStorage.getItem('jdr-compte') || 'null'),
  sessionActive: JSON.parse(localStorage.getItem('jdr-session') || 'null'),
  roleEffectif: (localStorage.getItem('jdr-role-effectif') as RoleId) || null,
  pageCourante: 'sessions',
  pnjControle: JSON.parse(localStorage.getItem('jdr-pnj-controle') || 'null'),
  theme: (localStorage.getItem('jdr-theme') as ThemeId) || 'theme-violet',
  mode: (localStorage.getItem('jdr-mode') as ModeId) || 'mode-dark',
  sidebarOuverte: true,
  diceResult: null,
  setCompte: (compte) => {
    if (compte) localStorage.setItem('jdr-compte', JSON.stringify(compte))
    else localStorage.removeItem('jdr-compte')
    set({ compte })
  },
  setSessionActive: (session) => {
    if (session) localStorage.setItem('jdr-session', JSON.stringify(session))
    else {
      localStorage.removeItem('jdr-session')
      localStorage.removeItem('jdr-pnj-controle')
    }
    set({ sessionActive: session, sidebarOuverte: !!session, pnjControle: session ? JSON.parse(localStorage.getItem('jdr-pnj-controle') || 'null') : null })
  },
  setRoleEffectif: (role) => {
    if (role) localStorage.setItem('jdr-role-effectif', role)
    else localStorage.removeItem('jdr-role-effectif')
    set({ roleEffectif: role })
  },
  setPageCourante: (page) => {
    set({ pageCourante: page })
    if (window.innerWidth < 1024) set({ sidebarOuverte: false })
  },
  setPnjControle: (pnj) => {
    if (pnj) localStorage.setItem('jdr-pnj-controle', JSON.stringify(pnj))
    else localStorage.removeItem('jdr-pnj-controle')
    set({ pnjControle: pnj })
  },
  setTheme: (theme) => { localStorage.setItem('jdr-theme', theme); set({ theme }) },
  setMode: (mode) => { localStorage.setItem('jdr-mode', mode); set({ mode }) },
  setSidebarOuverte: (o) => set({ sidebarOuverte: o }),
  setDiceResult: (diceResult) => set({ diceResult }),
  deconnexion: () => {
    localStorage.clear()
    set({ compte: null, sessionActive: null, roleEffectif: null, pageCourante: 'sessions', pnjControle: null })
  },
}))
