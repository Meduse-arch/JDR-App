import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useRealtimeQuery } from './useRealtimeQuery'
import { statsService, type StatValeur } from '../services/statsService'

export function useStats() {
  const pnjControle = useStore(s => s.pnjControle)
  const personnageJoueur = useStore(s => s.personnageJoueur)
  const sessionActive = useStore(s => s.sessionActive)
  const setBuffRoll = useStore(s => s.setBuffRoll)
  const clearBuffRolls = useStore(s => s.clearBuffRolls)

  const [stats, setStats] = useState<StatValeur[]>([])
  const [chargement, setChargement] = useState(true)
  const lastUpdateRef = useRef<number>(0)
  const lastCharacterIdRef = useRef<string | null>(null)

  // L'ID du personnage est soit celui contrôlé par le MJ, soit celui du Joueur
  const characterId = pnjControle?.id || personnageJoueur?.id

  // On ne vide le cache QUE si on change réellement de personnage
  useEffect(() => {
    if (characterId && characterId !== lastCharacterIdRef.current) {
      clearBuffRolls()
      lastCharacterIdRef.current = characterId
    }
  }, [characterId, clearBuffRolls])

  const chargerStats = useCallback(async () => {
    if (!characterId || !sessionActive) {
      setStats([])
      setChargement(false)
      return
    }

    setChargement(true)
    lastUpdateRef.current = Date.now()
    try {
      // 1. Charger les buff_rolls persistés en base (source de vérité partagée)
      const buffRollsBase = await statsService.getBuffRolls(characterId)
      
      // 2. Fusionner avec le cache Zustand local (la base est prioritaire)
      const currentBuffRolls = useStore.getState().buffRolls
      const buffRollsEffectifs = { ...currentBuffRolls, ...buffRollsBase }

      // 3. Calculer toutes les stats via le service
      // Récupère le rôle au moment de l'exécution (pas dans les deps)
      const { roleEffectif, pnjControle } = useStore.getState()

      // Le MJ qui surveille un personnage qu'il ne contrôle pas ne doit pas écrire en BDD
      const estMjSpectateur = roleEffectif === 'mj' && !pnjControle?.id

      const calculatedStats = await statsService.calculateAllStats(
        characterId, 
        buffRollsEffectifs,
        async (cacheKey, val) => {
          if (!estMjSpectateur) {
            // Joueur ou MJ qui contrôle un PNJ : il est l'auteur du jet, il sauvegarde
            await statsService.saveBuffRoll(characterId, cacheKey, val)
          }
          // Dans tous les cas on met à jour le cache local pour l'affichage immédiat
          setBuffRoll(cacheKey, val)
        }
      )

      setStats(calculatedStats)
    } catch (error) {
      console.error("[useStats] Erreur lors du chargement des stats:", error)
    } finally {
      setChargement(false)
    }
  }, [characterId, sessionActive?.id, setBuffRoll]) // Dépendances stabilisées

  useEffect(() => {
    chargerStats()
  }, [chargerStats])

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
      // Rechargement inconditionnel pour assurer la synchro BDD
      chargerStats()
    },
    enabled: !!sessionActive && !!characterId
  })

  return { stats, chargement, rechargerStats: chargerStats }
}
