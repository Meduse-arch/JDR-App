import { supabase } from '../supabase'

export const personnageService = {
  /**
   * Modifie les Points de Vie (soin ou dégâts)
   */
  updatePV: async (idPersonnage: string, nouvelleValeur: number, max: number) => {
    // On s'assure que les PV ne dépassent pas le max et ne tombent pas sous 0
    const pvSecurises = Math.max(0, Math.min(max, nouvelleValeur))
    
    const { error } = await supabase
      .from('personnages')
      .update({ hp_actuel: pvSecurises })
      .eq('id', idPersonnage)
    
    if (error) console.error("Erreur mise à jour PV:", error)
    return !error
  },

  /**
   * Modifie le Mana
   */
  updateMana: async (idPersonnage: string, nouvelleValeur: number, max: number) => {
    const manaSecurise = Math.max(0, Math.min(max, nouvelleValeur))
    
    const { error } = await supabase
      .from('personnages')
      .update({ mana_actuel: manaSecurise })
      .eq('id', idPersonnage)
      
    return !error
  },

  /**
   * Modifie la Stamina
   */
  updateStamina: async (idPersonnage: string, nouvelleValeur: number, max: number) => {
    const stamSecurise = Math.max(0, Math.min(max, nouvelleValeur))
    
    const { error } = await supabase
      .from('personnages')
      .update({ stam_actuel: stamSecurise })
      .eq('id', idPersonnage)
      
    return !error
  },

  /**
   * Modifie plusieurs champs d'un personnage à la fois
   */
  updatePersonnage: async (idPersonnage: string, updates: Partial<any>) => {
    const { error } = await supabase
      .from('personnages')
      .update(updates)
      .eq('id', idPersonnage)
    
    if (error) console.error("Erreur mise à jour personnage:", error)
    return !error
  },

  /**
   * Supprime un personnage et toutes ses données liées
   */
  deletePersonnage: async (idPersonnage: string) => {
    // Les suppressions en cascade devraient être gérées par la DB, 
    // mais on peut aussi le faire explicitement si besoin.
    // Ici on suit la logique existante du composant.
    await supabase.from('session_joueurs').delete().eq('id_personnage', idPersonnage)
    await supabase.from('personnage_stats').delete().eq('id_personnage', idPersonnage)
    await supabase.from('inventaire').delete().eq('id_personnage', idPersonnage)
    await supabase.from('personnage_competences').delete().eq('id_personnage', idPersonnage)
    const { error } = await supabase.from('personnages').delete().eq('id', idPersonnage)
    
    return !error
  }
}
