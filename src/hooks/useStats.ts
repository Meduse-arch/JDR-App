import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../Store/useStore'

export type StatValeur = {
  id: string
  nom: string
  description: string
  valeur: number
  base: number
  bonus: number
}

const ORDRE_STATS = ['Force', 'Agilité', 'Constitution', 'Intelligence', 'Sagesse', 'Perception', 'Charisme']

export function useStats() {
  const compte = useStore(s => s.compte)
  const pnjControle = useStore(s => s.pnjControle)
  
  const [stats, setStats] = useState<StatValeur[]>([])
  const [chargement, setChargement] = useState(true)

  const chargerStats = useCallback(async () => {
    setChargement(true)
    try {
      let idPersonnage = pnjControle?.id

      if (!idPersonnage) {
        if (!compte) return
        const { data: perso } = await supabase
          .from('personnages')
          .select('id')
          .eq('lie_au_compte', compte.id)
          .eq('type', 'Joueur')
          .eq('is_template', false)
          .single()
        
        if (!perso) return
        idPersonnage = perso.id
      }

      // 1. Récupérer les stats de base
      const { data: baseStats } = await supabase
        .from('personnage_stats')
        .select('valeur, id_stat, stats(id, nom, description)')
        .eq('id_personnage', idPersonnage)

      // 2. Récupérer les bonus des équipements équipés
      const { data: equipement } = await supabase
        .from('inventaire')
        .select(`
          equipe,
          items (
            item_modificateurs (
              id_stat,
              valeur,
              type
            )
          )
        `)
        .eq('id_personnage', idPersonnage)
        .eq('equipe', true)

      if (baseStats) {
        // Calcul des bonus par stat ID
        const bonusMap: Record<string, number> = {}
        equipement?.forEach(entry => {
          (entry.items as any)?.item_modificateurs?.forEach((m: any) => {
            if (m.id_stat) {
              bonusMap[m.id_stat] = (bonusMap[m.id_stat] || 0) + (m.valeur || 0)
            }
          })
        })

        const formatted = baseStats.map((d: any) => {
          const bonus = bonusMap[d.id_stat] || 0
          return {
            id: d.stats.id,
            nom: d.stats.nom,
            description: d.stats.description,
            base: d.valeur,
            bonus: bonus,
            valeur: d.valeur + bonus // Valeur finale affichée
          }
        })

        const sorted = formatted.sort((a, b) => ORDRE_STATS.indexOf(a.nom) - ORDRE_STATS.indexOf(b.nom))
        setStats(sorted)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des stats:", error)
    } finally {
      setChargement(false)
    }
  }, [compte, pnjControle])

  useEffect(() => {
    chargerStats()
  }, [chargerStats])

  return { 
    stats, 
    chargement, 
    rechargerStats: chargerStats 
  }
}
