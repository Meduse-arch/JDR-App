import { supabase } from '../supabase'
import { personnageService } from './personnageService'

export const inventaireService = {
  /**
   * Équipe ou déséquipe un objet
   */
  toggleEquipement: async (idInventaire: string, estEquipe: boolean) => {
    // 1. Récupérer l'id du personnage avant modification
    const { data: entry } = await supabase
      .from('inventaire')
      .select('id_personnage')
      .eq('id', idInventaire)
      .single()

    if (!entry) return false

    // 2. Mettre à jour le statut d'équipement
    const { error } = await supabase
      .from('inventaire')
      .update({ equipe: estEquipe })
      .eq('id', idInventaire)
    
    if (error) {
      console.error("Erreur d'équipement:", error)
      return false
    }

    // 3. Recalculer les stats du personnage
    await personnageService.recalculerStats(entry.id_personnage)
    return true
  },

  /**
   * Utilise un objet (réduit sa quantité de 1, ou le supprime si c'est le dernier)
   */
  consommerItem: async (idInventaire: string, quantiteActuelle: number) => {
    // 1. Récupérer l'id du personnage et si l'item est équipé
    const { data: entry } = await supabase
      .from('inventaire')
      .select('id_personnage, equipe')
      .eq('id', idInventaire)
      .single()

    if (!entry) return false

    let success = false
    if (quantiteActuelle <= 1) {
      const { error } = await supabase.from('inventaire').delete().eq('id', idInventaire)
      success = !error
    } else {
      const { error } = await supabase.from('inventaire').update({ quantite: quantiteActuelle - 1 }).eq('id', idInventaire)
      success = !error
    }

    // 2. Si l'item était équipé et qu'il a été supprimé ou sa quantité réduite, 
    // on recalcule (au cas où, même si normalement on équipe 1 seul exemplaire d'un item non-consommable)
    if (success && entry.equipe) {
      await personnageService.recalculerStats(entry.id_personnage)
    }

    return success
  },

  /**
   * Jette un objet définitivement
   */
  jeterItem: async (idInventaire: string) => {
    const { data: entry } = await supabase
      .from('inventaire')
      .select('id_personnage, equipe')
      .eq('id', idInventaire)
      .single()

    if (!entry) return false

    const { error } = await supabase.from('inventaire').delete().eq('id', idInventaire)
    
    if (!error && entry.equipe) {
      await personnageService.recalculerStats(entry.id_personnage)
    }
    
    return !error
  },

  /**
   * Ajoute un objet à l'inventaire d'un personnage
   */
  addItem: async (idPersonnage: string, idItem: string, quantite: number) => {
    // On vérifie si l'item est déjà présent
    const { data: existing } = await supabase
      .from('inventaire')
      .select('id, quantite')
      .eq('id_personnage', idPersonnage)
      .eq('id_item', idItem)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('inventaire')
        .update({ quantite: existing.quantite + quantite })
        .eq('id', existing.id)
      return !error
    } else {
      const { error } = await supabase
        .from('inventaire')
        .insert({ id_personnage: idPersonnage, id_item: idItem, quantite })
      return !error
    }
  }
}
