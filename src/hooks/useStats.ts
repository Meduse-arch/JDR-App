import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'
import { useRealtimeQuery } from './useRealtimeQuery'
import { statsService, type StatValeur } from '../services/statsService'

export function useStats() {
  const compte = useStore(s => s.compte)
  const pnjControle = useStore(s => s.pnjControle)
  const sessionActive = useStore(s => s.sessionActive)
  const buffRolls = useStore(s => s.buffRolls)
  const setBuffRoll = useStore(s => s.setBuffRoll)

  const [stats, setStats] = useState<StatValeur[]>([])
  const [chargement, setChargement] = useState(true)

  const chargerStats = useCallback(async () => {
    setChargement(true)
    try {
      let idPersonnage: string | undefined = pnjControle?.id

      if (!idPersonnage) {
        if (!compte || !sessionActive) return
        const { data: persos } = await supabase
          .from('v_personnages')
          .select('id')
          .eq('id_session', sessionActive.id)
          .eq('lie_au_compte', compte.id)
          .eq('type', 'Joueur')
          .eq('is_template', false)
          .limit(1)
        
        if (!persos || persos.length === 0) return
        idPersonnage = persos[0].id
      }

      if (!idPersonnage) return
      const characterId: string = idPersonnage

      // 1. Charger les buff_rolls persistés en base (source de vérité partagée)
      const buffRollsBase = await statsService.getBuffRolls(characterId)
      // Fusionner avec le cache Zustand local (la base prime)
      const buffRollsEffectifs = { ...buffRolls, ...buffRollsBase }

      // 2. Calculer toutes les stats via le service
      const calculatedStats = await statsService.calculateAllStats(
        characterId, 
        buffRollsEffectifs,
        async (cacheKey, val) => {
          await statsService.saveBuffRoll(characterId, cacheKey, val)
          setBuffRoll(cacheKey, val)
        }
      )

      setStats(calculatedStats)
    } catch (error) {
      console.error("Erreur lors du chargement des stats:", error)
    } finally {
      setChargement(false)
    }
  }, [compte, pnjControle, sessionActive, buffRolls, setBuffRoll])

  useEffect(() => {
    chargerStats()
  }, [chargerStats])

  const lastUpdateRef = useRef<number>(0)

  useRealtimeQuery({
    tables: [
      { table: 'personnage_stats', filtered: false },
      { table: 'modificateurs', filtered: false },
      { table: 'effets_actifs', filtered: false },
      { table: 'personnage_competences', filtered: false },
      { table: 'inventaire', filtered: false },
      { table: 'personnage_buff_rolls', filtered: false },
    ],
    sessionId: sessionActive?.id,
    onReload: () => {
      if (Date.now() - lastUpdateRef.current < 1000) return
      chargerStats()
    },
    enabled: !!sessionActive
  })

  return { stats, chargement, rechargerStats: chargerStats }
}
