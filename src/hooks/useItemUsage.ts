import { useState, useCallback } from 'react'
import { useStore } from '../Store/useStore'
import { type InventaireEntry } from '../types'

export function useItemUsage(
  personnage: any, 
  mettreAJourLocalement: (updates: any) => Promise<void>,
  consommerItemOptimiste: (id: string, q: number) => Promise<void>
) {
  const [toasts, setToasts] = useState<string[]>([])
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const afficherToast = (msg: string) => {
    setToasts(prev => [...prev, msg])
    setTimeout(() => setToasts(prev => prev.filter(t => t !== msg)), 3000)
  }

  const utiliserItem = useCallback(async (entry: InventaireEntry) => {
    if (!personnage) return

    const { items } = entry
    const message = `Utilisation de ${items.nom}`
    
    // 1. Calculer les bonus immédiats
    const updates: any = {}
    
    // Pour l'instant on gère juste un log, la logique de soin pourra être ajoutée ici
    console.log(message, entry)

    // 2. Appliquer les changements (si soin par exemple)
    if (Object.keys(updates).length > 0) {
      await mettreAJourLocalement(updates)
      if (pnjControle && personnage.id === pnjControle.id) {
        setPnjControle({ ...pnjControle, ...updates })
      }
    }

    // 3. Consommer l'item
    await consommerItemOptimiste(entry.id, entry.quantite)
    
    afficherToast(message)
  }, [personnage, mettreAJourLocalement, consommerItemOptimiste, pnjControle, setPnjControle])

  return { toasts, utiliserItem }
}
