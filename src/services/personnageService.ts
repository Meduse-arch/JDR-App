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
   * Recalcule les statistiques et ressources maximum d'un personnage
   * Prend en compte les stats de base + les bonus d'équipement
   */
  recalculerStats: async (idPersonnage: string) => {
    try {
      // 1. Récupérer le personnage et ses stats de base
      const { data: perso, error: persoError } = await supabase
        .from('personnages')
        .select('*')
        .eq('id', idPersonnage)
        .single()

      const { data: baseStats, error: statsError } = await supabase
        .from('personnage_stats')
        .select('id_stat, valeur, stats(nom)')
        .eq('id_personnage', idPersonnage)

      if (persoError || statsError || !perso || !baseStats) return false

      // 2. Récupérer les items équipés et leurs modificateurs
      const { data: equipements } = await supabase
        .from('inventaire')
        .select('id_item')
        .eq('id_personnage', idPersonnage)
        .eq('equipe', true)

      const resourceBonuses: Record<string, number> = {
        hp_max: 0, mana_max: 0, stam_max: 0
      }
      const statBonusesByName: Record<string, number> = {}

      if (equipements && equipements.length > 0) {
        const itemIds = equipements.map(e => e.id_item)
        const { data: modifs } = await supabase
          .from('item_modificateurs')
          .select('*, stats(nom)')
          .in('id_item', itemIds)

        if (modifs) {
          modifs.forEach((mod: any) => {
            if (mod.type === 'stat' && mod.id_stat) {
              // On récupère le nom de la stat via id_stat pour le calcul
              const statFound = baseStats.find((s: any) => s.id_stat === mod.id_stat)
              if (statFound) {
                const nomStat = Array.isArray(statFound.stats) ? statFound.stats[0]?.nom : (statFound.stats as any)?.nom
                if (nomStat) {
                  statBonusesByName[nomStat] = (statBonusesByName[nomStat] || 0) + mod.valeur
                }
              }
            } else if (['hp_max', 'mana_max', 'stam_max'].includes(mod.type)) {
              resourceBonuses[mod.type] += mod.valeur
            }
          })
        }
      }

      // 3. Calculer les ressources de base à partir des statistiques de BASE + BONUS
      const statsFinales: Record<string, number> = {}
      baseStats.forEach((s: any) => {
        const nomStat = s.stats.nom
        const valeurBase = s.valeur
        const bonus = statBonusesByName[nomStat] || 0
        statsFinales[nomStat] = valeurBase + bonus
      })

      // Formules sur les stats finales (base + équipement)
      let new_hp_max   = (statsFinales['Constitution'] ?? 0) * 4
      let new_mana_max = Math.round(
        (((statsFinales['Intelligence'] ?? 0) + (statsFinales['Sagesse'] ?? 0)) / 2) * 10
      )
      let new_stam_max = Math.round(
        ((statsFinales['Force'] ?? 0) + (statsFinales['Agilité'] ?? 0) + (statsFinales['Constitution'] ?? 0)) / 3 * 10
      )

      // 4. Ajouter UNIQUEMENT les bonus directs de ressources de l'équipement
      new_hp_max   += resourceBonuses['hp_max']
      new_mana_max += resourceBonuses['mana_max']
      new_stam_max += resourceBonuses['stam_max']

      // 5. Préparer l'update (avec clamping des valeurs actuelles)
      const updates = {
        hp_max: new_hp_max,
        mana_max: new_mana_max,
        stam_max: new_stam_max,
        hp_actuel: Math.min(perso.hp_actuel, new_hp_max),
        mana_actuel: Math.min(perso.mana_actuel, new_mana_max),
        stam_actuel: Math.min(perso.stam_actuel, new_stam_max)
      }

      // 7. Mise à jour en base
      const { data: updatedPerso, error: updateError } = await supabase
        .from('personnages')
        .update(updates)
        .eq('id', idPersonnage)
        .select()
        .single()

      if (updateError) console.error("Erreur recalculerStats:", updateError)
      return updatedPerso || null
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
    const { error } = await supabase.from('personnages').delete().eq('id', idPersonnage)
    
    return !error
  }
}
