import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { queteService } from '../services/queteService'
import { Quete } from '../types'
import { useRealtimeQuery } from './useRealtimeQuery'
import { peerService } from '../services/peerService'

export function useQuetes(personnageId?: string) {
  const sessionActive = useStore(s => s.sessionActive)
  const [quetes, setQuetes] = useState<Quete[]>([])
  const [chargement, setChargement] = useState(false)
  const lastUpdateRef = useRef<number>(0)

  const charger = useCallback(async (isRealtime = false) => {
    if (!sessionActive) return

    if (peerService.isHost) {
      if (!isRealtime) setChargement(true)
      const data = personnageId 
        ? await queteService.getQuetesPersonnage(personnageId)
        : await queteService.getQuetes(sessionActive.id)
      setQuetes(data)
      if (!isRealtime) setChargement(false)
    } else {
      if (!isRealtime) setChargement(true)
      peerService.requestResync(personnageId, 'quetes')
    }
  }, [sessionActive, personnageId])

  useEffect(() => {
    charger()
  }, [charger])

  // Abonnement WebRTC pour tous (MJ et joueurs)
  useEffect(() => {
    if (!sessionActive) return;

    const unsubResponse = peerService.onResyncResponse((msg) => {
      if (!peerService.isHost && msg.dataType === 'quetes') {
        setQuetes(msg.payload);
        setChargement(false);
      }
    });

    const unsubUpdate = peerService.onStateUpdate((msg) => {
      if (msg.entity === 'session' && (msg.payload.type === 'quetes_update' || msg.payload.type === 'library_update')) {
        charger(true);
      }
    });

    return () => {
      unsubResponse();
      unsubUpdate();
    };
  }, [sessionActive, charger]);

  const sessionActiveId = sessionActive?.id;

  useRealtimeQuery({
    tables: personnageId
      ? [
          { table: 'personnage_quetes', filtered: false },
          { table: 'quetes', filtered: false },
        ]
      : [
          { table: 'quetes', filtered: false },
          { table: 'quete_recompenses', filtered: false },
        ],
    sessionId: sessionActiveId,
    onReload: () => charger(true),
    enabled: peerService.isHost && !!sessionActiveId
  })

  const supprimerQuete = async (id: string) => {
    const memoire = [...quetes]
    lastUpdateRef.current = Date.now()
    setQuetes(prev => prev.filter(q => q.id !== id)) // Optimistic
    const success = await queteService.supprimerQuete(id)
    if (!success) setQuetes(memoire)
    return success
  }

  return { quetes, charger, chargement, supprimerQuete, setQuetes }
}
