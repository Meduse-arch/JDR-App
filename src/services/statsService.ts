import { supabase } from '../supabase'
import { rollDice, rollStatDice } from '../utils/rollDice'
import { statsEngine } from '../utils/statsEngine'

export interface StatValeur {
  id: string
  nom: string
  description: string
  valeur: number
  base: number
  bonus: number
}

export const statsService = {
  /**
   * Charge les buff_rolls persistés en base pour un personnage
   */
  getBuffRolls: async (idPersonnage: string): Promise<Record<string, number>> => {
    if (!idPersonnage) return {}
    const { data, error } = await supabase
      .from('personnage_buff_rolls')
      .select('cache_key, valeur')
      .eq('id_personnage', idPersonnage)

    if (error) {
      console.error("[StatsService] Erreur getBuffRolls:", error)
      return {}
    }

    const map: Record<string, number> = {}
    data?.forEach((row: any) => { map[row.cache_key] = row.valeur })
    return map
  },

  /**
   * Sauvegarde un buff roll en base
   */
saveBuffRoll: async (idPersonnage: string, cacheKey: string, valeur: number) => {
  console.log("=== saveBuffRoll APPELÉ ===", { idPersonnage, cacheKey, valeur })
  
  if (!idPersonnage || !cacheKey) {
    console.error("=== saveBuffRoll ABANDON : paramètres manquants ===", { idPersonnage, cacheKey })
    return
  }

  const { data, error, status, statusText } = await supabase
    .from('personnage_buff_rolls')
    .upsert(
      { id_personnage: idPersonnage, cache_key: cacheKey, valeur },
      { onConflict: 'id_personnage,cache_key' }
    )
    .select()

  console.log("=== saveBuffRoll RÉSULTAT ===", { data, error, status, statusText })
},

  /**
   * Nettoie les buff_rolls obsolètes
   */
  cleanupObsoleteBuffRolls: async (idPersonnage: string, activeKeys: Set<string>) => {
    const { data } = await supabase
      .from('personnage_buff_rolls')
      .select('id, cache_key')
      .eq('id_personnage', idPersonnage)

    const obsoletes = (data || [])
      .filter((row: any) => !activeKeys.has(row.cache_key))
      .map((row: any) => row.id)

    if (obsoletes.length > 0) {
      await supabase
        .from('personnage_buff_rolls')
        .delete()
        .in('id', obsoletes)
    }
  },

  /**
   * Calcule toutes les stats d'un personnage avec tous ses modificateurs
   */
  calculateAllStats: async (
    idPersonnage: string, 
    buffRollsCache: Record<string, number>,
    onNewRoll: (cacheKey: string, val: number) => Promise<void>
  ): Promise<StatValeur[]> => {
    const ORDRE_STATS = ['Force', 'Agilité', 'Constitution', 'Intelligence', 'Sagesse', 'Perception', 'Charisme']

    // 1. Stats de base
    const { data: baseStats } = await supabase
      .from('personnage_stats')
      .select('valeur, id_stat, stats(id, nom, description)')
      .eq('id_personnage', idPersonnage)

    if (!baseStats) return []

    // 2. Équipements équipés
    const { data: equipement } = await supabase
      .from('inventaire')
      .select(`
        id, equipe,
        items (
          modificateurs ( id, id_stat, valeur, type_calcul, des_nb, des_faces, des_stat_id ),
          item_tags ( id_tag )
        )
      `)
      .eq('id_personnage', idPersonnage)
      .eq('equipe', true)

    const equippedTagIds = new Set<string>()
    equipement?.forEach((inv: any) => {
      inv.items?.item_tags?.forEach((it: any) => { if (it.id_tag) equippedTagIds.add(it.id_tag) })
    })

    // 3. Modificateurs directs liés au personnage
    const { data: directModifs } = await supabase
      .from('modificateurs')
      .select('id, id_stat, valeur, type_calcul, des_nb, des_faces, des_stat_id')
      .eq('id_personnage', idPersonnage)

    // 4. Compétences acquises
    const { data: compAcquisesRaw } = await supabase
      .from('personnage_competences')
      .select(`
        id, is_active,
        competences (
          id, type, condition_type,
          modificateurs ( id, id_stat, valeur, type_calcul, des_nb, des_faces, des_stat_id )
        )
      `)
      .eq('id_personnage', idPersonnage)

    const compAcquisesMap = new Map<string, any>()
    compAcquisesRaw?.forEach(entry => {
      const c = entry.competences as any
      if (!c) return
      if (!compAcquisesMap.has(c.id) || entry.is_active) compAcquisesMap.set(c.id, entry)
    })
    const compAcquises = Array.from(compAcquisesMap.values())

    // Passifs toggle actifs
    const toggleEntries = compAcquises.filter((entry: any) =>
      entry.is_active === true && entry.competences?.type === 'passive_toggle'
    )
    const activeToggleIds = toggleEntries.map((entry: any) => entry.competences.id)
    const activeTagsPool = new Set<string>(equippedTagIds)

    if (activeToggleIds.length > 0) {
      const { data: toggleTags } = await supabase
        .from('competence_tags')
        .select('id_tag')
        .in('id_competence', activeToggleIds)
      toggleTags?.forEach((tt: any) => { if (tt.id_tag) activeTagsPool.add(tt.id_tag) })
    }

    const bonusFixes: Record<string, number> = {}
    const bonusPct: Record<string, number> = {}
    const clesActives = new Set<string>()

    const accumulerBonus = async (modificateurs: any[], sourceId: string) => {
      if (!modificateurs) return
      for (const m of modificateurs) {
        let val = m.valeur || 0

        if (m.type_calcul === 'roll_dice' || m.type_calcul === 'roll_stat') {
          const cacheKey = `${sourceId}-${m.id}`
          clesActives.add(cacheKey)

          if (buffRollsCache[cacheKey] !== undefined) {
            val = buffRollsCache[cacheKey]
          } else {
            let newRoll = 0
            if (m.type_calcul === 'roll_dice') {
              newRoll = rollDice(m.des_nb || 1, m.des_faces || 6, m.valeur || 0).total
            } else {
              const statRollBase = baseStats.find((s: any) => s.id_stat === m.des_stat_id)
              const valeurBaseRoll = statRollBase?.valeur || 10
              const statsData: any = statRollBase?.stats
              const nomBaseRoll = (Array.isArray(statsData) ? statsData[0]?.nom : statsData?.nom) || 'Stat'
              newRoll = rollStatDice(valeurBaseRoll, m.valeur || 0, nomBaseRoll).total
            }
            // Enregistrement forcé en base via le callback
            await onNewRoll(cacheKey, newRoll)
            buffRollsCache[cacheKey] = newRoll
            val = newRoll
          }
        }

        if (!m.id_stat) continue

        if (m.type_calcul === 'pourcentage') {
          bonusPct[m.id_stat] = (bonusPct[m.id_stat] || 0) + val
        } else {
          bonusFixes[m.id_stat] = (bonusFixes[m.id_stat] || 0) + val
        }
      }
    }

    // Accumulation
    // A. Équipements
    for (const entry of (equipement || [])) await accumulerBonus((entry.items as any)?.modificateurs, entry.id)
    
    // B. Modificateurs directs (on utilise l'ID du personnage comme sourceId pour la cacheKey)
    if (directModifs) await accumulerBonus(directModifs, idPersonnage)

    // C. Compétences
    for (const entry of compAcquises) {
      const c = entry.competences as any
      if (!c || c.type === 'passive_toggle') continue
      if (c.type === 'passive_auto' && !c.condition_type) await accumulerBonus(c.modificateurs, entry.id)
    }
    
    // Passifs auto avec conditions (tags)
    const passiveAutoComps = compAcquises.filter(entry => {
      const c = entry.competences as any
      return c && c.type === 'passive_auto' && ['item', 'les_deux'].includes(c.condition_type)
    })

    for (const entry of passiveAutoComps) {
      const pc = entry.competences as any
      const { data: condTags } = await supabase.from('competence_tags').select('id_tag').eq('id_competence', pc.id)
      const condTagIds = condTags?.map((ct: any) => ct.id_tag) || []
      if (Array.from(activeTagsPool).some(tid => condTagIds.includes(tid))) {
        await accumulerBonus(pc.modificateurs, entry.id)
      }
    }

    // Passifs toggle
    for (const entry of toggleEntries) await accumulerBonus(entry.competences.modificateurs, entry.id)

    await statsService.cleanupObsoleteBuffRolls(idPersonnage, clesActives)

    const statsCibles = baseStats.filter((d: any) => !['PV Max', 'Mana Max', 'Stamina Max'].includes(d.stats.nom))
    const formatted = statsCibles.map((d: any) => {
      const fixe = bonusFixes[d.id_stat] || 0
      const pct = bonusPct[d.id_stat] || 0
      const valeurFinale = statsEngine.calculerValeurFinale(d.valeur, fixe, pct)
      return {
        id: d.stats.id,
        nom: d.stats.nom,
        description: d.stats.description,
        base: d.valeur,
        bonus: valeurFinale - d.valeur,
        valeur: valeurFinale
      }
    })

    return statsEngine.trierStats(formatted, ORDRE_STATS)
  }
}
