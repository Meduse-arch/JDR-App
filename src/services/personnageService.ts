import { supabase } from '../supabase'
import { broadcastService } from './broadcastService'

// Stockage global des timers pour le debouncing
const debounceTimers: Record<string, NodeJS.Timeout> = {};

const executerDebounced = (key: string, action: () => Promise<void>, delay = 300) => {
  if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(() => {
    action();
    delete debounceTimers[key];
  }, delay);
};

export const personnageService = {
  /**
   * Modifie les Points de Vie de manière HYBRIDE (Broadcast immédiat + DB debouncé)
   */
  updatePVHybride: (sessionId: string, idPersonnage: string, nouvelleValeur: number, max: number) => {
    const pvSecurises = Math.max(0, Math.min(max, nouvelleValeur));
    
    // 1. Broadcast immédiat pour fluidité
    broadcastService.send(sessionId, 'update-ressource', {
      id_personnage: idPersonnage,
      type: 'hp',
      valeur: pvSecurises
    });

    // 2. DB debouncée
    executerDebounced(`pv-${idPersonnage}`, async () => {
      const { error } = await supabase
        .from('personnages')
        .update({ hp: pvSecurises })
        .eq('id', idPersonnage);
      if (error) console.error("Erreur mise à jour PV:", error);
    });
  },

  /**
   * Modifie le Mana de manière HYBRIDE
   */
  updateManaHybride: (sessionId: string, idPersonnage: string, nouvelleValeur: number, max: number) => {
    const manaSecurise = Math.max(0, Math.min(max, nouvelleValeur));
    
    broadcastService.send(sessionId, 'update-ressource', {
      id_personnage: idPersonnage,
      type: 'mana',
      valeur: manaSecurise
    });

    executerDebounced(`mana-${idPersonnage}`, async () => {
      const { error } = await supabase
        .from('personnages')
        .update({ mana: manaSecurise })
        .eq('id', idPersonnage);
      if (error) console.error("Erreur mise à jour Mana:", error);
    });
  },

  /**
   * Modifie la Stamina de manière HYBRIDE
   */
  updateStaminaHybride: (sessionId: string, idPersonnage: string, nouvelleValeur: number, max: number) => {
    const stamSecurise = Math.max(0, Math.min(max, nouvelleValeur));
    
    broadcastService.send(sessionId, 'update-ressource', {
      id_personnage: idPersonnage,
      type: 'stam',
      valeur: stamSecurise
    });

    executerDebounced(`stam-${idPersonnage}`, async () => {
      const { error } = await supabase
        .from('personnages')
        .update({ stam: stamSecurise })
        .eq('id', idPersonnage);
      if (error) console.error("Erreur mise à jour Stamina:", error);
    });
  },

  /**
   * Modifie les Points de Vie (soin ou dégâts)
   */
  updatePV: async (idPersonnage: string, nouvelleValeur: number, max: number) => {
    // On s'assure que les PV ne dépassent pas le max et ne tombent pas sous 0
    const pvSecurises = Math.max(0, Math.min(max, nouvelleValeur))
    
    const { error } = await supabase
      .from('personnages')
      .update({ hp: pvSecurises })
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
      .update({ mana: manaSecurise })
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
      .update({ stam: stamSecurise })
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
   * Recalcule les statistiques et ressources maximum d'un personnage
   * Prend en compte les stats de base + les bonus d'équipement
   */
  recalculerStats: async (idPersonnage: string) => {
    try {
      const { data: perso, error: persoError } = await supabase
        .from('v_personnages')
        .select('*')
        .eq('id', idPersonnage)
        .single()

      if (persoError || !perso) return false

      const updates = {
        hp: Math.min(perso.hp, perso.hp_max),
        mana: Math.min(perso.mana, perso.mana_max),
        stam: Math.min(perso.stam, perso.stam_max)
      }

      if (updates.hp !== perso.hp || updates.mana !== perso.mana || updates.stam !== perso.stam) {
        const { data: updatedPerso, error: updateError } = await supabase
          .from('personnages')
          .update(updates)
          .eq('id', idPersonnage)
          .select()
          .single()

        if (updateError) console.error("Erreur recalculerStats:", updateError)
        return updatedPerso || null
      }
      return perso
    } catch (error) {
      console.error("Exception dans recalculerStats:", error)
      return null
    }
  },

  /**
   * Modifie une statistique de base d'un personnage
   */
  updateBaseStat: async (idPersonnage: string, idStat: string, delta: number) => {
    // 1. Récupérer la valeur actuelle
    const { data, error: fetchError } = await supabase
      .from('personnage_stats')
      .select('valeur')
      .eq('id_personnage', idPersonnage)
      .eq('id_stat', idStat)
      .single()
    
    if (fetchError || !data) return false

    // 2. Mettre à jour la valeur
    const { error: updateError } = await supabase
      .from('personnage_stats')
      .update({ valeur: data.valeur + delta })
      .eq('id_personnage', idPersonnage)
      .eq('id_stat', idStat)
    
    if (updateError) return false

    // 3. Recalculer les ressources max car les stats de base influent sur HP/Mana/Stam max
    await personnageService.recalculerStats(idPersonnage)
    return true
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
    await supabase.from('personnage_quetes').delete().eq('id_personnage', idPersonnage)
    const { error } = await supabase.from('personnages').delete().eq('id', idPersonnage)
    
    if (error) console.error("Erreur suppression personnage:", error)
    return !error
  }
}
