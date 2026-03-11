import { useState, useCallback } from 'react'
import { useStore } from '../store/useStore'

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

  const utiliserItem = useCallback(async (entry: any) => {
    if (!personnage) return

    const { items } = entry
    const modifs = items.item_modificateurs || []
    
    // 1. Calculer les bonus immédiats
    const updates: any = {}
    
    modifs.forEach((m: any) => {
      if (m.type === 'hp') {
        updates.hp_actuel = Math.min(personnage.hp_max, (updates.hp_actuel ?? personnage.hp_actuel) + m.valeur)
      }
      if (m.type === 'mana') {
        updates.mana_actuel = Math.min(personnage.mana_max, (updates.mana_actuel ?? personnage.mana_actuel) + m.valeur)
      }
      if (m.type === 'stam') {
        updates.stam_actuel = Math.min(personnage.stam_max, (updates.stam_actuel ?? personnage.stam_actuel) + m.valeur)
      }
    })

    // 2. Appliquer les changements (si soin par exemple)
    if (Object.keys(updates).length > 0) {
      await mettreAJourLocalement(updates)
      if (pnjControle && personnage.id === pnjControle.id) {
        setPnjControle({ ...pnjControle, ...updates })
      }
    }

    // 3. Consommer l'item (on diminue la quantité de 1)
    await consommerItemOptimiste(entry.id, 1)
    
    afficherToast(`Utilisation de ${items.nom}`)
  }, [personnage, mettreAJourLocalement, consommerItemOptimiste, pnjControle, setPnjControle])

  return { toasts, utiliserItem }
}
