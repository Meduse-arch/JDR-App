import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'

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
  const sessionActive = useStore(s => s.sessionActive)
  
  const [stats, setStats] = useState<StatValeur[]>([])
  const [chargement, setChargement] = useState(true)

  const chargerStats = useCallback(async () => {
    setChargement(true)
    try {
      let idPersonnage = pnjControle?.id

      if (!idPersonnage) {
        if (!compte || !sessionActive) return
        const { data: persos, error } = await supabase
          .from('v_personnages')
          .select('id')
          .eq('id_session', sessionActive.id)
          .eq('lie_au_compte', compte.id)
          .eq('type', 'Joueur')
          .eq('is_template', false)
          .limit(1)
        
        if (error || !persos || persos.length === 0) return
        idPersonnage = persos[0].id
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
            modificateurs (
              id_stat,
              valeur,
              type_calcul
            )
          )
        `)
        .eq('id_personnage', idPersonnage)
        .eq('equipe', true)

      // 3. Récupérer les bonus des compétences passives
      const { data: compAcquises } = await supabase
        .from('personnage_competences')
        .select(`
          is_active,
          competences (
            type,
            modificateurs (
              id_stat,
              valeur,
              type_calcul
            )
          )
        `)
        .eq('id_personnage', idPersonnage)

      if (baseStats) {
        // 4. Calculer les bonus
        const bonusFixes: Record<string, number> = {}
        const bonusPct: Record<string, number> = {}
        
        // Helper pour accumuler les bonus
        const accumulerBonus = (modificateurs: any[]) => {
          modificateurs?.forEach((m: any) => {
            if (!m.id_stat) return
            if (m.type_calcul === 'pourcentage') {
              bonusPct[m.id_stat] = (bonusPct[m.id_stat] || 0) + (m.valeur || 0)
            } else {
              bonusFixes[m.id_stat] = (bonusFixes[m.id_stat] || 0) + (m.valeur || 0)
            }
          })
        }

        // Accumuler depuis l'équipement
        equipement?.forEach(entry => accumulerBonus((entry.items as any)?.modificateurs))

        // Accumuler depuis les compétences passives
        compAcquises?.forEach(entry => {
          const c = entry.competences as any
          if (!c) return
          const estApplicable = c.type === 'passive_auto' || (c.type === 'passive_toggle' && entry.is_active)
          if (estApplicable) accumulerBonus(c.modificateurs)
        })

        // Filtrer les stats système
        const statsCibles = baseStats.filter((d: any) => 
          !['PV Max', 'Mana Max', 'Stamina Max'].includes(d.stats.nom)
        )

        const formatted = statsCibles.map((d: any) => {
          const fixe = bonusFixes[d.id_stat] || 0
          const pct = bonusPct[d.id_stat] || 0
          
          // Formule : (Base + Fixe) * (1 + % / 100)
          const basePlusFixe = d.valeur + fixe
          const valeurFinale = Math.round(basePlusFixe * (1 + pct / 100))
          
          return {
            id: d.stats.id,
            nom: d.stats.nom,
            description: d.stats.description,
            base: d.valeur,
            bonus: valeurFinale - d.valeur, // Le bonus total (fixe + %)
            valeur: valeurFinale
          }
        })

        const sorted = formatted.sort((a, b) => {
          const idxA = ORDRE_STATS.indexOf(a.nom)
          const idxB = ORDRE_STATS.indexOf(b.nom)
          if (idxA === -1 && idxB === -1) return a.nom.localeCompare(b.nom)
          if (idxA === -1) return 1
          if (idxB === -1) return -1
          return idxA - idxB
        })
        setStats(sorted)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des stats:", error)
    } finally {
      setChargement(false)
    }
  }, [compte, pnjControle, sessionActive])

  useEffect(() => {
    chargerStats()
  }, [chargerStats])

  return { 
    stats, 
    chargement, 
    rechargerStats: chargerStats 
  }
}
