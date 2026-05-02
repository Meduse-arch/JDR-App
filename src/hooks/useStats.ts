import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useRealtimeQuery } from './useRealtimeQuery'
import { statsService, type StatValeur } from '../services/statsService'
import { statsEngine } from '../utils/statsEngine'
import { peerService } from '../services/peerService'

export function useStats() {
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
    const state = useStore.getState();
    const currentCharacterId = state.pnjControle?.id || state.personnageJoueur?.id;
    const currentSession = state.sessionActive;
    const currentRole = state.roleEffectif;

    if (!currentCharacterId || !currentSession) {
      setStats([])
      setChargement(false)
      return
    }

    // --- LOGIQUE JOUEUR (Source: Store WebRTC) ---
    if (currentRole === 'joueur') {
      const perso = state.pnjControle || state.personnageJoueur;
      if (perso && perso.id === currentCharacterId) {
        const rawStats = perso.stats || [];
        
        const FALLBACK_NAMES: Record<string, string> = {
          '1': 'Force', '2': 'Agilité', '3': 'Constitution', 
          '4': 'Intelligence', '5': 'Sagesse', '6': 'Charisme', '7': 'Perception',
          'a1000000-0000-0000-0000-000000000001': 'Force',
          'a1000000-0000-0000-0000-000000000002': 'Agilité',
          'a1000000-0000-0000-0000-000000000003': 'Constitution',
          'a1000000-0000-0000-0000-000000000004': 'Intelligence',
          'a1000000-0000-0000-0000-000000000005': 'Sagesse',
          'a1000000-0000-0000-0000-000000000006': 'Charisme',
          'a1000000-0000-0000-0000-000000000007': 'Perception'
        };

        const SYSTEM_STAT_IDS = [
          '101', '102', '103',
          'a1000000-0000-0000-0000-000000000101',
          'a1000000-0000-0000-0000-000000000102',
          'a1000000-0000-0000-0000-000000000103'
        ];
        const SYSTEM_STAT_NAMES = ['PV Max', 'Mana Max', 'Stamina Max', 'hp_max', 'mana_max', 'stam_max', 'HP Max'];

        const formattedStats = rawStats.map((s: any) => {
          const sid = String(s.id_stat);
          const ref = state.allStats.find((r: any) => String(r.id) === sid);
          const nomStat = s.nom || ref?.nom || FALLBACK_NAMES[sid] || `Stat ${sid}`;
          
          return {
            id: sid,
            nom: nomStat,
            valeur: s.valeur ?? 0,
            base: s.base ?? s.valeur ?? 0,
            bonus: s.bonus ?? 0,
            description: ref?.description || ""
          };
        }).filter(s => !SYSTEM_STAT_IDS.includes(String(s.id)) && !SYSTEM_STAT_NAMES.includes(s.nom));
        
        const ORDRE_STATS = ['Force', 'Agilité', 'Constitution', 'Intelligence', 'Sagesse', 'Perception', 'Charisme'];
        const sorted = statsEngine.trierStats(formattedStats, ORDRE_STATS);
        
        setStats(sorted);
        if (rawStats.length > 0) setChargement(false);
        return;
      }
    }

    // --- LOGIQUE MJ (Calcul complexe SQLite) ---
    if (currentRole !== 'joueur') {
      setChargement(true)
      try {
        const buffRollsBase = await statsService.getBuffRolls(currentCharacterId)
        const currentBuffRolls = useStore.getState().buffRolls
        const buffRollsEffectifs = { ...currentBuffRolls, ...buffRollsBase }
        const estMjSpectateur = currentRole === 'mj' && !state.pnjControle?.id

        const calculatedStats = await statsService.calculateAllStats(
          currentCharacterId, 
          buffRollsEffectifs,
          async (cacheKey, val) => {
            if (!estMjSpectateur) await statsService.saveBuffRoll(currentCharacterId, cacheKey, val)
            state.setBuffRoll(cacheKey, val)
          }
        )
        setStats(calculatedStats)
      } catch (error) {
        console.error("[useStats] Erreur MJ stats:", error)
      } finally {
        setChargement(false)
      }
    }
  }, [])

  // Synchronisation pour les joueurs via WebRTC
  useEffect(() => {
    if (peerService.isHost) return;

    const unsubUpdate = peerService.onStateUpdate((msg) => {
      if (msg.entity === 'session' && (msg.payload.type === 'library_update' || msg.payload.type === 'library_update_competences')) {
        // usePersonnage s'occupe déjà de demander le resync 'full'
      }
    });

    return () => unsubUpdate();
  }, []);

  const currentCharacterId = pnjControle?.id || personnageJoueur?.id;
  const currentSessionId = sessionActive?.id;

  // Déclenche chargerStats dès que l'ID change
  useEffect(() => {
    chargerStats()
  }, [chargerStats, currentCharacterId, currentSessionId])

  useEffect(() => {
    // Si on est MJ, on doit recharger les stats locales de la fiche quand un item ou une compétence change
    const state = useStore.getState();
    if (state.roleEffectif !== 'joueur') {
      const unsub = peerService.onStateUpdate((msg: any) => {
        if (msg.entity === 'session' && (msg.payload.type === 'library_update' || msg.payload.type === 'library_update_competences')) {
          chargerStats();
        }
      });
      return () => unsub();
    }
  }, [chargerStats]);

  return { stats, chargement, rechargerStats: chargerStats }
}
