import { create } from 'zustand'

type Compte = { id: string; pseudo: string; role: string }
type Session = { id: string; nom: string; description: string }

type Store = {
  compte: Compte | null
  setCompte: (compte: Compte | null) => void
  sessionActive: Session | null
  setSessionActive: (session: Session | null) => void
  pageCourante: string
  setPageCourante: (page: string) => void
}

export const useStore = create<Store>((set) => ({
  compte: null,
  setCompte: (compte) => set({ compte }),
  sessionActive: null,
  setSessionActive: (session) => set({ sessionActive: session }),
  pageCourante: 'dashboard',
  setPageCourante: (page) => set({ pageCourante: page }),
}))