import { create } from 'zustand'
import { peerService } from '../services/peerService'

export type RoleId = 'admin' | 'mj' | 'joueur'
export type ModeId = 'mode-dark' | 'mode-light'
export type NavigationMode = 'basic' | 'immersive'
export type ItemViewMode = 'grid' | 'codex'
export type CharacterSheetMode = 'classic' | 'hero'
export type SessionListViewMode = 'list' | 'tarot'

export type Compte = { id: string; pseudo: string; role: RoleId }
export type Session = { id: string; nom: string; description: string; cree_par: string; created_at?: string; parametres?: any }
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
  image_url?: string | null
  couleur?: string | null
}

export type DiceResult = { 
  rolls: number[];
  total: number;
  bonus: number;
  diceString: string;
  label: string;
  color: string;
  secret?: boolean 
}

interface JdrState {
  compte: Compte | null
  sessionActive: Session | null
  roleEffectif: RoleId | null
  pageCourante: string
  pnjControle: Personnage | null
  personnageJoueur: Personnage | null
  mode: ModeId
  navigationMode: NavigationMode
  multiScreenEnabled: boolean
  showImmersiveNavButton: boolean
  itemDisplayMode: ItemViewMode
  characterSheetMode: CharacterSheetMode
  sessionListViewMode: SessionListViewMode
  diceResult: DiceResult[] | null
  diceSharingEnabled: boolean
  buffRolls: Record<string, number>
  clearBuffRolls: () => void
  enteringSession: { id: string, nom: string } | null
  authPage: 'accueil' | 'connexion' | 'inscription'
  libItems: any[]
  libCompetences: any[]
  allStats: any[]
  setLibItems: (items: any[]) => void
  setLibCompetences: (competences: any[]) => void
  setAllStats: (stats: any[]) => void
  setCompte: (c: Compte | null) => void
  setSessionActive: (s: Session | null) => void
  setRoleEffectif: (r: RoleId | null) => void
  setPageCourante: (p: string) => void
  setPnjControle: (pnj: Personnage | null) => void
  setPersonnageJoueur: (pj: Personnage | null) => void
  setMode: (m: ModeId) => void
  setNavigationMode: (m: NavigationMode) => void
  setMultiScreenEnabled: (enabled: boolean) => void
  setShowImmersiveNavButton: (show: boolean) => void
  setItemDisplayMode: (mode: ItemViewMode) => void
  setCharacterSheetMode: (mode: CharacterSheetMode) => void
  setSessionListViewMode: (mode: SessionListViewMode) => void
  setDiceResult: (diceResult: DiceResult[] | null, broadcast?: boolean) => void
  setDiceSharingEnabled: (enabled: boolean) => void
  setBuffRoll: (key: string, val: number) => void
  setEnteringSession: (s: { id: string, nom: string } | null) => void
  setAuthPage: (p: 'accueil' | 'connexion' | 'inscription') => void
  deconnexion: () => void
}

export const useStore = create<JdrState>((set, get) => ({
  compte: JSON.parse(localStorage.getItem('sigil-compte') || 'null'),
  sessionActive: JSON.parse(localStorage.getItem('sigil-session-active') || 'null'),
  roleEffectif: localStorage.getItem('sigil-role-effectif') as RoleId | null,
  pageCourante: 'sessions',
  pnjControle: JSON.parse(localStorage.getItem('sigil-pnj-controle') || 'null'),
  personnageJoueur: JSON.parse(localStorage.getItem('sigil-personnage-joueur') || 'null'),
  mode: (localStorage.getItem('sigil-mode') as ModeId) || 'mode-dark',
  navigationMode: (localStorage.getItem('sigil-nav-mode') as NavigationMode) || 'basic',
  multiScreenEnabled: localStorage.getItem('sigil-multi-screen') === 'true',
  showImmersiveNavButton: localStorage.getItem('sigil-immersive-nav-btn') !== 'false',
  itemDisplayMode: (localStorage.getItem('sigil-item-display-mode') as ItemViewMode) || 'grid',
  characterSheetMode: (localStorage.getItem('sigil-char-sheet-mode') as CharacterSheetMode) || 'classic',
  sessionListViewMode: (localStorage.getItem('sigil-session-list-mode') as SessionListViewMode) || 'list',
  diceResult: null,
  diceSharingEnabled: false,
  buffRolls: {},
  enteringSession: null,
  authPage: 'accueil',
  libItems: [],
  libCompetences: [],
  allStats: [],

  setLibItems: (libItems) => set({ libItems }),
  setLibCompetences: (libCompetences) => set({ libCompetences }),
  setAllStats: (allStats) => set({ allStats }),

  setCompte: (compte) => {
    if (compte) localStorage.setItem('sigil-compte', JSON.stringify(compte))
    else localStorage.removeItem('sigil-compte')
    set({ compte })
  },
  setSessionActive: (session) => {
    if (!session) {
      localStorage.removeItem('sigil-session-active')
      localStorage.removeItem('sigil-role-effectif')
      localStorage.removeItem('sigil-pnj-controle')
      localStorage.removeItem('sigil-personnage-joueur')
      sessionStorage.removeItem('sigil-selection-visitee')
    } else {
      localStorage.setItem('sigil-session-active', JSON.stringify(session))
    }
    const savedPnj = JSON.parse(localStorage.getItem('sigil-pnj-controle') || 'null')
    const savedPj = JSON.parse(localStorage.getItem('sigil-personnage-joueur') || 'null')
    const pnjControle = (session && savedPnj?.id_session === session.id) ? savedPnj : null
    const personnageJoueur = (session && savedPj?.id_session === session.id) ? savedPj : null
    if (!pnjControle) localStorage.removeItem('sigil-pnj-controle')
    if (!personnageJoueur) localStorage.removeItem('sigil-personnage-joueur')
    set({ sessionActive: session, pnjControle, personnageJoueur })
  },
  setRoleEffectif: (role) => {
    if (role) localStorage.setItem('sigil-role-effectif', role)
    else localStorage.removeItem('sigil-role-effectif')
    set({ roleEffectif: role })
  },
  setPageCourante: (page) => { set({ pageCourante: page }) },
  setPnjControle: (pnj) => {
    if (pnj) localStorage.setItem('sigil-pnj-controle', JSON.stringify(pnj))
    else localStorage.removeItem('sigil-pnj-controle')
    set({ pnjControle: pnj })
  },
  setPersonnageJoueur: (pj) => {
    if (pj) localStorage.setItem('sigil-personnage-joueur', JSON.stringify(pj))
    else localStorage.removeItem('sigil-personnage-joueur')
    set({ personnageJoueur: pj })
  },
  setMode: (mode) => { localStorage.setItem('sigil-mode', mode); set({ mode }) },
  setNavigationMode: (navigationMode) => { localStorage.setItem('sigil-nav-mode', navigationMode); set({ navigationMode }) },
  setMultiScreenEnabled: (multiScreenEnabled) => {
    localStorage.setItem('sigil-multi-screen', String(multiScreenEnabled));
    set({ multiScreenEnabled });
  },
  setShowImmersiveNavButton: (showImmersiveNavButton) => { 
    localStorage.setItem('sigil-immersive-nav-btn', String(showImmersiveNavButton)); 
    set({ showImmersiveNavButton }) 
  },
  setItemDisplayMode: (itemDisplayMode) => {
    localStorage.setItem('sigil-item-display-mode', itemDisplayMode);
    set({ itemDisplayMode });
  },
  setCharacterSheetMode: (characterSheetMode) => {
    localStorage.setItem('sigil-char-sheet-mode', characterSheetMode);
    set({ characterSheetMode });
  },
  setSessionListViewMode: (sessionListViewMode) => {
    localStorage.setItem('sigil-session-list-mode', sessionListViewMode);
    set({ sessionListViewMode });
  },
  setDiceResult: (diceResult, broadcast = true) => {
    const { sessionActive, diceSharingEnabled, compte } = get();
    if (broadcast && diceResult && sessionActive && compte) {
      const isSecretLocally = !diceSharingEnabled;
      const isSecret = isSecretLocally || diceResult.some(r => r.secret === true);
      const senderId = compte.id;
      const partagesDes = sessionActive.parametres?.partagesDes || {};
      const allowedViewers = partagesDes[senderId] || [];
      const payload = { diceResult, isSecret, senderId, allowedViewers };
      // MIGRATION WebRTC
      if (peerService.isHost) {
        peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'dice', payload });
      } else {
        peerService.sendToMJ({ type: 'ACTION', kind: 'dice_roll', payload });
      }
    }
    set({ diceResult });
  },
  setDiceSharingEnabled: (diceSharingEnabled) => set({ diceSharingEnabled }),
  setBuffRoll: (key, val) => set((state) => ({ buffRolls: { ...state.buffRolls, [key]: val } })),
  clearBuffRolls: () => set({ buffRolls: {} }),
  setEnteringSession: (enteringSession) => set({ enteringSession }),
  setAuthPage: (authPage) => set({ authPage }),
  deconnexion: () => {
    localStorage.clear()
    set({ 
      compte: null, 
      sessionActive: null, 
      roleEffectif: null, 
      pageCourante: 'sessions', 
      pnjControle: null, 
      personnageJoueur: null, 
      buffRolls: {}, 
      diceSharingEnabled: false,
      authPage: 'accueil'
    })
  },
}))
