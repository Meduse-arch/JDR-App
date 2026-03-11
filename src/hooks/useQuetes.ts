import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'
import { queteService } from '../services/queteService'
import { Quete } from '../types'

export function useQuetes(personnageId?: string) {
  const sessionActive = useStore(s => s.sessionActive)
  const [quetes, setQuetes] = useState<Quete[]>([])
  const [chargement, setChargement] = useState(false)

  const charger = useCallback(async () => {
    if (!sessionActive) return
    setChargement(true)
    const data = personnageId 
      ? await queteService.getQuetesPersonnage(personnageId)
      : await queteService.getQuetes(sessionActive.id)
    setQuetes(data)
    setChargement(false)
  }, [sessionActive, personnageId])

  useEffect(() => {
    charger()
    
    // Temps réel automatique
    const channel = supabase
      .channel('quetes-sync-' + (personnageId || sessionActive?.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quetes' }, () => charger())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quete_recompenses' }, () => charger())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personnage_quetes' }, () => charger())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [charger, personnageId, sessionActive?.id])

  const supprimerQuete = async (id: string) => {
    setQuetes(prev => prev.filter(q => q.id !== id)) // Optimistic
    const success = await queteService.supprimerQuete(id)
    if (!success) charger()
    return success
  }

  return { quetes, charger, chargement, supprimerQuete }
}
