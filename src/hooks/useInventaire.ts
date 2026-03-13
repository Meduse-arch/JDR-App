import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { inventaireService } from '../services/inventaireService'
import { InventaireEntry } from '../types'

export function useInventaire(personnageId: string | undefined) {
  const [inventaire, setInventaire] = useState<InventaireEntry[]>([])
  const [chargement, setChargement] = useState(false)

  const charger = useCallback(async () => {
    if (!personnageId) return
    setChargement(true)
    const data = await inventaireService.getInventaire(personnageId)
    setInventaire(data)
    setChargement(false)
  }, [personnageId])

  useEffect(() => {
    charger()
    if (!personnageId) return

    const channel = supabase
      .channel(`inv-${personnageId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventaire', filter: `id_personnage=eq.${personnageId}` }, () => charger())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [charger, personnageId])

  return { inventaire, chargement, charger, setInventaire }
}
