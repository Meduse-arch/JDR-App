import { supabase } from '../supabase'
import { PersonnageType } from '../Store/useStore'

export const bestiaireService = {
  /**
   * Récupère les modèles
   */
  getTemplates: async (sessionId: string, type: PersonnageType) => {
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
  getInstances: async (sessionId: string, type: PersonnageType | PersonnageType[]) => {
    const query = supabase
      .from('personnages')
      .select('*')
      .eq('id_session', sessionId)
      .eq('is_template', false)
    
    if (Array.isArray(type)) {
      query.in('type', type)
    } else {
      query.eq('type', type)
    }

    const { data } = await query
    return data || []
  },

  /**
   * Invoque (copie) un modèle vers une instance
   */
  instancier: async (template: any, sessionId: string, count: number, options?: { nom?: string, type?: PersonnageType }) => {
    try {
      for (let i = 0; i < count; i++) {
        const nomFinal = count > 1 ? `${options?.nom || template.nom} ${i + 1}` : (options?.nom || template.nom)
        const typeFinal = options?.type || template.type

        // 1. Copie du personnage
        const { data: nouveau, error: errPerso } = await supabase
          .from('personnages')
          .insert({
            id_session: sessionId,
            nom: nomFinal,
            type: typeFinal,
            is_template: false,
            template_id: template.id,
            hp_max: template.hp_max, hp_actuel: template.hp_max,
            mana_max: template.mana_max, mana_actuel: template.mana_max,
            stam_max: template.stam_max, stam_actuel: template.stam_max,
          })
          .select().single()

        if (errPerso || !nouveau) {
          console.error("Erreur instanciation perso:", errPerso)
          alert(`Erreur base de données : ${errPerso?.message || 'Impossible de créer le personnage'}. \n\nAs-tu bien ajouté le type 'Boss' via la commande SQL ?`)
          continue
        }

        // 2. Copie des stats
        const { data: stats } = await supabase.from('personnage_stats').select('id_stat, valeur').eq('id_personnage', template.id)
        if (stats && stats.length > 0) {
          await supabase.from('personnage_stats').insert(
            stats.map(s => ({ id_personnage: nouveau.id, id_stat: s.id_stat, valeur: s.valeur }))
          )
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

        // 5. Lien Session
        await supabase.from('session_joueurs').insert({ id_session: sessionId, id_personnage: nouveau.id })
      }
      return true
    } catch (e) { 
      console.error("Erreur instancier:", e)
      return false 
    }
  },

  /**
   * Supprimer
   */
  supprimerTemplate: async (id: string) => {
    const { error } = await supabase.from('personnages').delete().eq('id', id)
    return !error
  },

  supprimerInstance: async (id: string) => {
    const { error } = await supabase.from('personnages').delete().eq('id', id)
    return !error
  }
}
