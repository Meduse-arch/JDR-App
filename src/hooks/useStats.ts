import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useRealtimeQuery } from './useRealtimeQuery'
import { statsService, type StatValeur } from '../services/statsService'

export function useStats() {
  const pnjControle = useStore(s => s.pnjControle)
  const personnageJoueur = useStore(s => s.personnageJoueur)
  const allStats = useStore(s => s.allStats) // Watch the library
  const sessionActive = useStore(s => s.sessionActive)
  const roleEffectif = useStore(s => s.roleEffectif)
  const setBuffRoll = useStore(s => s.setBuffRoll)
  const clearBuffRolls = useStore(s => s.clearBuffRolls)

  const [stats, setStats] = useState<StatValeur[]>([])
  const [chargement, setChargement] = useState(true)
  const lastUpdateRef = useRef<number>(0)
  const lastCharacterIdRef = useRef<string | null>(null)

  const characterId = pnjControle?.id || personnageJoueur?.id

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

    // --- LOGIQUE JOUEUR (Source: Store WebRTC) ---
    if (roleEffectif === 'joueur') {
      const perso = pnjControle || personnageJoueur;
      // On accepte soit perso.stats (nouvelle version), soit on attend le MJ
      if (perso && perso.id === characterId) {
        const rawStats = perso.stats || [];
        console.log(`[useStats] Hydratation stats pour le joueur (${rawStats.length} stats reçues, bibliothèque de ${allStats.length} noms)`);
        
        const formattedStats = rawStats.map((s: any) => {
          const ref = allStats.find((r: any) => r.id === s.id_stat);
          return {
            id: s.id_stat,
            nom: ref?.nom || "Stat",
            valeur: s.valeur ?? 0,
            base: s.base ?? s.valeur ?? 0,
            bonus: s.bonus ?? 0,
            description: ref?.description || ""
          };
        }).filter(s => s.nom !== "Stat" || allStats.length === 0);
        
        const ORDRE_STATS = ['Force', 'Agilité', 'Constitution', 'Intelligence', 'Sagesse', 'Perception', 'Charisme'];
        const sorted = statsEngine.trierStats(formattedStats, ORDRE_STATS);
        
        setStats(sorted);
        if (rawStats.length > 0 || allStats.length > 0) {
          setChargement(false);
        }
        return;
      }
    }

    // --- LOGIQUE MJ (Calcul complexe SQLite) ---
    if (roleEffectif !== 'joueur') {
      setChargement(true)
      try {
        const buffRollsBase = await statsService.getBuffRolls(characterId)
        const currentBuffRolls = useStore.getState().buffRolls
        const buffRollsEffectifs = { ...currentBuffRolls, ...buffRollsBase }
        const estMjSpectateur = roleEffectif === 'mj' && !pnjControle?.id

        const calculatedStats = await statsService.calculateAllStats(
          characterId, 
          buffRollsEffectifs,
          async (cacheKey, val) => {
            if (!estMjSpectateur) await statsService.saveBuffRoll(characterId, cacheKey, val)
            setBuffRoll(cacheKey, val)
          }
        )
        setStats(calculatedStats)
      } catch (error) {
        console.error("[useStats] Erreur MJ stats:", error)
      } finally {
        setChargement(false)
      }
    }
  }, [characterId, sessionActive?.id, setBuffRoll, pnjControle, personnageJoueur, allStats, roleEffectif])

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
