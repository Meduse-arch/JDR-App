import { supabase } from '../supabase'

export interface Recompense {
  id: string
  id_quete: string
  type: 'Item' | 'Autre'
  id_item?: string | null
  valeur: number // Utilisé pour la quantité si c'est un item
  description?: string | null
  distribution: 'commune' | 'par_personne'
  items?: { nom: string } 
}

export interface Quete {
  id: string
  id_session: string
  titre: string
  description: string
  statut: 'En cours' | 'Terminée' | 'Échouée'
  created_at?: string
  quete_recompenses?: Recompense[]
  personnage_quetes?: { id_personnage: string, suivie: boolean }[]
}

export const queteService = {
  getQuetes: async (sessionId: string): Promise<Quete[]> => {
    const { data, error } = await supabase
      .from('quetes')
      .select('*, quete_recompenses(*, items(nom)), personnage_quetes(*)')
      .eq('id_session', sessionId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error("Erreur getQuetes:", error)
      const { data: fallback } = await supabase
        .from('quetes')
        .select('*, quete_recompenses(*, items(nom))')
        .eq('id_session', sessionId)
        .order('created_at', { ascending: false })
      return fallback || []
    }
    return data || []
  },

  getQuetesPersonnage: async (personnageId: string): Promise<Quete[]> => {
    const { data, error } = await supabase
      .from('personnage_quetes')
      .select('*, quetes(*, quete_recompenses(*, items(nom)))')
      .eq('id_personnage', personnageId)
    
    if (error) {
       console.error("Erreur getQuetesPersonnage:", error)
       return []
    }

    return data?.map((d: any) => ({
      ...d.quetes,
      suivie: d.suivie || false
    })) || []
  },

  creerQuete: async (sessionId: string, quete: Partial<Quete>, participantsIds: string[], recompenses: Partial<Recompense>[]) => {
    const { data: newQuete, error: qErr } = await supabase
      .from('quetes')
      .insert({ titre: quete.titre, description: quete.description, id_session: sessionId })
      .select().single()

    if (qErr || !newQuete) return false

    if (recompenses.length > 0) {
      await supabase.from('quete_recompenses').insert(
        recompenses.map(r => ({ 
          ...r, 
          id_quete: newQuete.id,
          distribution: r.distribution || 'commune'
        }))
      )
    }

    if (participantsIds.length > 0) {
      await supabase.from('personnage_quetes').insert(
        participantsIds.map(pid => ({ id_personnage: pid, id_quete: newQuete.id }))
      )
    }
    return true
  },

  modifierQuete: async (queteId: string, quete: Partial<Quete>, participantsIds: string[], recompenses: Partial<Recompense>[]) => {
    const { error: qErr } = await supabase
      .from('quetes')
      .update({ titre: quete.titre, description: quete.description, statut: quete.statut })
      .eq('id', queteId)

    if (qErr) return false

    await supabase.from('quete_recompenses').delete().eq('id_quete', queteId)
    if (recompenses.length > 0) {
      const cleanRewards = recompenses.map(r => ({
        id_quete: queteId,
        type: r.type,
        id_item: r.id_item || null,
        valeur: r.valeur || 0,
        description: r.description || null,
        distribution: r.distribution || 'commune'
      }))
      
      const { error: rErr } = await supabase.from('quete_recompenses').insert(cleanRewards)
      if (rErr) console.error("Erreur insertion récompenses:", rErr)
    }

    const { data: currentParticipants } = await supabase.from('personnage_quetes').select('id_personnage').eq('id_quete', queteId)
    const currentIds = currentParticipants?.map(p => p.id_personnage) || []
    
    const toDelete = currentIds.filter(id => !participantsIds.includes(id))
    if (toDelete.length > 0) {
      await supabase.from('personnage_quetes').delete().eq('id_quete', queteId).in('id_personnage', toDelete)
    }

    const toAdd = participantsIds.filter(id => !currentIds.includes(id))
    if (toAdd.length > 0) {
      await supabase.from('personnage_quetes').insert(
        toAdd.map(pid => ({ id_personnage: pid, id_quete: queteId }))
      )
    }

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
