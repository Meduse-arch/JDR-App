import { supabase } from '../supabase'

export const sessionService = {
  creerSession: async (nom: string, description: string, idCompte: string, roleGlobale: string) => {
    const { error, data: sessionInseree } = await supabase
      .from('sessions')
      .insert({ nom, description, cree_par: idCompte })
      .select('id')
      .single()

    if (!error && sessionInseree && roleGlobale === 'mj') {
      await supabase.from('session_mj').insert({ id_session: sessionInseree.id, id_compte: idCompte })
    }
    return !error
  },

  supprimerSession: async (id: string) => {
    await supabase.from('sessions').delete().eq('id', id)
  },

  getRoleDansSession: async (idSession: string, idCompte: string, roleGlobal: string) => {
    if (roleGlobal === 'admin') return 'admin'
    const { data } = await supabase.from('session_mj').select('*').eq('id_session', idSession).eq('id_compte', idCompte).single()
    return data ? 'mj' : 'joueur'
  },

  /**
   * Récupère les personnages d'une session par leur type
   */
  getSessionCharacters: async (sessionId: string) => {
    const { data: persos, error } = await supabase
      .from('v_personnages')
      .select('*')
      .eq('id_session', sessionId)

    if (error || !persos) return { joueurs: [], pnjs: [], monstres: [] }
    
    return {
      joueurs:  persos.filter(p => p.type === 'Joueur'),
      pnjs:     persos.filter(p => p.type === 'PNJ'),
      monstres: persos.filter(p => p.type === 'Monstre')
    }
  },

  getSessionMJs: async (sessionId: string) => {
    const { data, error } = await supabase.from('session_mj').select('comptes(*)').eq('id_session', sessionId)
    if (error) return []
    return data.map((d: any) => d.comptes)
  },

  ajouterMJ: async (sessionId: string, idCompte: string) => {
    const { error } = await supabase.from('session_mj').insert({ id_session: sessionId, id_compte: idCompte })
    return !error
  },

  retirerMJ: async (sessionId: string, idCompte: string) => {
    const { error } = await supabase.from('session_mj').delete().eq('id_session', sessionId).eq('id_compte', idCompte)
    return !error
  },

  getComptesDisponiblesMJ: async (sessionId: string) => {
    const { data: mjData } = await supabase.from('session_mj').select('id_compte').eq('id_session', sessionId)
    const { data: comptesData } = await supabase.from('comptes').select('*').in('role', ['joueur', 'mj'])
    if (comptesData) {
      const idsDeja = mjData?.map((d: any) => d.id_compte) || []
      return comptesData.filter((c: any) => !idsDeja.includes(c.id))
    }
    return []
  }
}
