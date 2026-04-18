import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { queteService } from '../services/queteService'
import { Quete } from '../types'
import { useRealtimeQuery } from './useRealtimeQuery'

export function useQuetes(personnageId?: string) {
  const sessionActive = useStore(s => s.sessionActive)
  const [quetes, setQuetes] = useState<Quete[]>([])
  const [chargement, setChargement] = useState(false)
  const lastUpdateRef = useRef<number>(0)

  const charger = useCallback(async (isRealtime = false) => {
    if (!sessionActive) return
    if (isRealtime && Date.now() - lastUpdateRef.current < 1000) return

    if (!isRealtime) setChargement(true)
    const data = personnageId 
      ? await queteService.getQuetesPersonnage(personnageId)
      : await queteService.getQuetes(sessionActive.id)
    setQuetes(data)
    if (!isRealtime) setChargement(false)
  }, [sessionActive, personnageId])

  useEffect(() => {
    charger()
  }, [charger])

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
    sessionId: sessionActive?.id,
    onReload: () => charger(true),
    enabled: !!sessionActive
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
