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
  }
}