import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useRealtimeQuery } from './useRealtimeQuery'
import { statsService, type StatValeur } from '../services/statsService'
import { statsEngine } from '../utils/statsEngine'

export function useStats() {
  const compte = useStore(s => s.compte) // AJOUTÉ : manquait au tour précédent
  const pnjControle = useStore(s => s.pnjControle)
  const personnageJoueur = useStore(s => s.personnageJoueur)
  const allStats = useStore(s => s.allStats)
  const sessionActive = useStore(s => s.sessionActive)
  const roleEffectif = useStore(s => s.roleEffectif)
  const setBuffRoll = useStore(s => s.setBuffRoll)
  const clearBuffRolls = useStore(s => s.clearBuffRolls)

  const [stats, setStats] = useState<StatValeur[]>([])
  const [chargement, setChargement] = useState(true)
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
      if (perso && perso.id === characterId) {
        const rawStats = perso.stats || [];
        
        const FALLBACK_NAMES: Record<string, string> = {
          '1': 'Force', '2': 'Agilité', '3': 'Constitution', 
          '4': 'Intelligence', '5': 'Sagesse', '6': 'Charisme', '7': 'Perception'
        };

        const formattedStats = rawStats.map((s: any) => {
          const sid = String(s.id_stat);
          const ref = allStats.find((r: any) => String(r.id) === sid);
          const nomStat = ref?.nom || FALLBACK_NAMES[sid] || `Stat ${sid}`;
          
          return {
            id: sid,
            nom: nomStat,
            valeur: s.valeur ?? 0,
            base: s.base ?? s.valeur ?? 0,
            bonus: s.bonus ?? 0,
            description: ref?.description || ""
          };
        });
        
        const ORDRE_STATS = ['Force', 'Agilité', 'Constitution', 'Intelligence', 'Sagesse', 'Perception', 'Charisme'];
        const sorted = statsEngine.trierStats(formattedStats, ORDRE_STATS);
        
        setStats(sorted);
        if (rawStats.length > 0) setChargement(false);
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
  }, [characterId, sessionActive?.id, setBuffRoll, pnjControle, personnageJoueur, allStats, roleEffectif, compte])

  useEffect(() => {
    chargerStats()
  }, [chargerStats])

  return { stats, chargement, rechargerStats: chargerStats }
}
