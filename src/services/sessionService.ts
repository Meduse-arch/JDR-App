import { supabase } from '../supabase'

export const sessionService = {
  creerSession: async (nom: string, description: string, idCompte: string, roleGlobale: string) => {
    const { error, data: sessionInseree } = await supabase
      .from('sessions')
      .insert({ nom, description, cree_par: idCompte })
      .select('id')
      .single()

    // Si c'est un MJ qui crée, on le lie directement à la session
    if (!error && sessionInseree && roleGlobale === 'mj') {
      await supabase.from('session_mj').insert({ id_session: sessionInseree.id, id_compte: idCompte })
    }
    return !error
  },

  supprimerSession: async (id: string) => {
    await supabase.from('session_mj').delete().eq('id_session', id)
    await supabase.from('sessions').delete().eq('id', id)
  },

  getRoleDansSession: async (idSession: string, idCompte: string, roleGlobal: string) => {
    if (roleGlobal === 'admin') return 'admin'
    const { data } = await supabase.from('session_mj').select('*').eq('id_session', idSession).eq('id_compte', idCompte).single()
    return data ? 'mj' : 'joueur'
  }
}