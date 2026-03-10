import { supabase } from '../supabase'

export const bestiaireService = {
  /**
   * Récupère les modèles
   */
  getTemplates: async (sessionId: string, type: 'Monstre' | 'PNJ') => {
    const { data } = await supabase
      .from('personnages')
      .select('*')
      .eq('id_session', sessionId)
      .eq('is_template', true)
      .eq('type', type)
    return data || []
  },

  /**
   * Récupère les instances actives
   */
  getInstances: async (sessionId: string, type: 'Monstre' | 'PNJ') => {
    const { data } = await supabase
      .from('personnages')
      .select('*')
      .eq('id_session', sessionId)
      .eq('is_template', false)
      .eq('type', type)
    return data || []
  },

  /**
   * Invoque (copie) un modèle vers une instance
   */
  instancier: async (template: any, sessionId: string, count: number, options?: { nom?: string }) => {
    try {
      for (let i = 0; i < count; i++) {
        const nomFinal = count > 1 ? `${options?.nom || template.nom} ${i + 1}` : (options?.nom || template.nom)

        // 1. Copie du personnage
        const { data: nouveau, error: errPerso } = await supabase
          .from('personnages')
          .insert({
            id_session: sessionId,
            nom: nomFinal,
            type: template.type,
            is_template: false,
            template_id: template.id,
            hp_max: template.hp_max, hp_actuel: template.hp_max,
            mana_max: template.mana_max, mana_actuel: template.mana_max,
            stam_max: template.stam_max, stam_actuel: template.stam_max,
          })
          .select().single()

        if (errPerso || !nouveau) continue

        // 2. Copie des stats (les 7 stats)
        const { data: stats } = await supabase.from('personnage_stats').select('id_stat, valeur').eq('id_personnage', template.id)
        if (stats && stats.length > 0) {
          await supabase.from('personnage_stats').insert(
            stats.map(s => ({ id_personnage: nouveau.id, id_stat: s.id_stat, valeur: s.valeur }))
          )
        } else {
          // Si pas de stats sur le template, on met les 7 stats de base à 10
          const { data: allStats } = await supabase.from('stats').select('id')
          if (allStats) {
            await supabase.from('personnage_stats').insert(
              allStats.map(s => ({ id_personnage: nouveau.id, id_stat: s.id, valeur: 10 }))
            )
          }
        }

        // 3. Copie de l'inventaire
        const { data: inv } = await supabase.from('inventaire').select('id_item, quantite, equipe').eq('id_personnage', template.id)
        if (inv && inv.length > 0) {
          await supabase.from('inventaire').insert(inv.map(item => ({ id_personnage: nouveau.id, id_item: item.id_item, quantite: item.quantite, equipe: item.equipe })))
        }

        // 4. Copie des compétences
        const { data: comp } = await supabase.from('personnage_competences').select('id_competence, niveau').eq('id_personnage', template.id)
        if (comp && comp.length > 0) {
          await supabase.from('personnage_competences').insert(comp.map(c => ({ id_personnage: nouveau.id, id_competence: c.id_competence, niveau: c.niveau })))
        }

        // 5. Lien Session (table session_joueurs pour compatibilité dashboard)
        await supabase.from('session_joueurs').insert({ id_session: sessionId, id_personnage: nouveau.id })
      }
      return true
    } catch (e) { return false }
  },

  /**
   * Supprime un modèle
   */
  supprimerTemplate: async (id: string) => {
    const { error } = await supabase.from('personnages').delete().eq('id', id)
    return !error
  },

  /**
   * Supprime une instance active
   */
  supprimerInstance: async (id: string) => {
    const { error } = await supabase.from('personnages').delete().eq('id', id)
    return !error
  }
}
