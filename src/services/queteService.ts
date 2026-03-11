import { supabase } from '../supabase'
import { Quete, Recompense } from '../types'

export const queteService = {
  /**
   * Récupère toutes les quêtes d'une session (Admin/MJ)
   */
  getQuetes: async (sessionId: string): Promise<Quete[]> => {
    const { data, error } = await supabase
      .from('quetes')
      .select('*, quete_recompenses(*, items(nom)), personnage_quetes(*, personnages(nom))')
      .eq('id_session', sessionId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error("Erreur getQuetes:", error)
      const { data: fallback } = await supabase
        .from('quetes')
        .select('*, quete_recompenses(*, items(nom))')
        .eq('id_session', sessionId)
        .order('created_at', { ascending: false })
      return (fallback || []) as Quete[]
    }
    return (data || []) as Quete[]
  },

  /**
   * Récupère les quêtes assignées à un personnage (Joueur)
   */
  getQuetesPersonnage: async (personnageId: string): Promise<Quete[]> => {
    const { data, error } = await supabase
      .from('personnage_quetes')
      .select('*, quetes(*, quete_recompenses(*, items(nom)))')
      .eq('id_personnage', personnageId)
    
    if (error) return []

    return data?.map((d: any) => ({
      ...d.quetes,
      suivie: d.suivie || false
    })) || []
  },

  /**
   * Crée ou modifie une quête (Logique unifiée)
   */
  upsertQuete: async (
    sessionId: string, 
    quete: Partial<Quete>, 
    participantsIds: string[], 
    recompenses: Partial<Recompense>[]
  ): Promise<boolean> => {
    const isUpdate = !!quete.id
    
    // 1. Gérer la quête principale
    const queteData = { 
      titre: quete.titre, 
      description: quete.description, 
      statut: quete.statut || 'En cours',
      id_session: sessionId 
    }

    let queteId = quete.id
    if (isUpdate) {
      const { error } = await supabase.from('quetes').update(queteData).eq('id', quete.id)
      if (error) return false
    } else {
      const { data, error } = await supabase.from('quetes').insert(queteData).select().single()
      if (error || !data) return false
      queteId = data.id
    }

    // 2. Gérer les récompenses (Nettoyage + Réinsertion)
    await supabase.from('quete_recompenses').delete().eq('id_quete', queteId)
    if (recompenses.length > 0) {
      const cleanRewards = recompenses.map(r => ({
        id_quete: queteId,
        type: r.type,
        id_item: r.id_item || null,
        valeur: r.valeur || 0,
        description: r.description || null
      }))
      await supabase.from('quete_recompenses').insert(cleanRewards)
    }

    // 3. Gérer les participants (Delta sync)
    const { data: current } = await supabase.from('personnage_quetes').select('id_personnage').eq('id_quete', queteId)
    const currentIds = current?.map(p => p.id_personnage) || []
    
    const toDelete = currentIds.filter(id => !participantsIds.includes(id))
    const toAdd    = participantsIds.filter(id => !currentIds.includes(id))

    if (toDelete.length > 0) await supabase.from('personnage_quetes').delete().eq('id_quete', queteId).in('id_personnage', toDelete)
    if (toAdd.length > 0)    await supabase.from('personnage_quetes').insert(toAdd.map(pid => ({ id_personnage: pid, id_quete: queteId })))

    return true
  },

  modifierStatut: async (queteId: string, statut: string) => {
    const { error } = await supabase.from('quetes').update({ statut }).eq('id', queteId)
    return !error
  },

  supprimerQuete: async (queteId: string) => {
    const { error } = await supabase.from('quetes').delete().eq('id', queteId)
    return !error
  },

  toggleSuivreQuete: async (personnageId: string, queteId: string, suivie: boolean) => {
    const { error } = await supabase
      .from('personnage_quetes')
      .update({ suivie })
      .eq('id_personnage', personnageId)
      .eq('id_quete', queteId)
    return !error
  }
}
