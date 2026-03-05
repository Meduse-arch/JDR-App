import { create } from 'zustand'

type Compte = { id: string; pseudo: string; role: string }
type Session = { id: string; nom: string; description: string; cree_par: string }
type Personnage = { id: string; nom: string; hp_actuel: number; hp_max: number; est_pnj: boolean }

type Store = {
  compte: Compte | null
  setCompte: (compte: Compte | null) => void
  sessionActive: Session | null
  setSessionActive: (session: Session | null) => void
  roleEffectif: 'admin' | 'mj' | 'joueur' | null
  setRoleEffectif: (role: 'admin' | 'mj' | 'joueur' | null) => void
  pageCourante: string
  setPageCourante: (page: string) => void
  pnjControle: Personnage | null
  setPnjControle: (pnj: Personnage | null) => void
}

export const useStore = create<Store>((set) => ({
  compte: null,
  setCompte: (compte) => set({ compte }),
  sessionActive: null,
  setSessionActive: (session) => set({ sessionActive: session }),
  roleEffectif: null,
  setRoleEffectif: (role) => set({ roleEffectif: role }),
  pageCourante: 'dashboard',
  setPageCourante: (page) => set({ pageCourante: page }),
  pnjControle: null,
  setPnjControle: (pnj) => set({ pnjControle: pnj }),
}))