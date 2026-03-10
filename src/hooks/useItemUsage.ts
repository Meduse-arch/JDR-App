import { useState, useCallback } from 'react'
import { personnageService } from '../services/personnageService'
import { useStore, type Personnage } from '../Store/useStore'
import { type InventaireEntry, type Modificateur } from '../types'

export function useItemUsage(
  personnage: Personnage | null,
  itemModifs: Record<string, Modificateur[]>,
  mettreAJourLocalement: (updates: Partial<Personnage>) => Promise<void>,
  consommerItemOptimiste: (idInventaire: string, quantiteActuelle: number) => Promise<void>,
  rechargerPersonnage: () => Promise<void>,
  rechargerStats: () => Promise<void>
) {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([])
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const afficherToast = useCallback((msg: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }, [])

  const utiliserItem = async (entry: InventaireEntry) => {
    if (!personnage) return
    const modifs = itemModifs[entry.items.id] || []
    
    // 1. Calculer les changements
    const updates: any = {}
    let message = `Utilisation de ${entry.items.nom}`

    modifs.forEach(m => {
      if (m.type === 'hp') {
        const total = Math.min(personnage.hp_max, personnage.hp_actuel + m.valeur)
        updates.hp_actuel = total
        message += ` (+${m.valeur} PV)`
      }
      if (m.type === 'mana') {
        const total = Math.min(personnage.mana_max, personnage.mana_actuel + m.valeur)
        updates.mana_actuel = total
        message += ` (+${m.valeur} Mana)`
      }
    })

    // 2. Appliquer localement
    await mettreAJourLocalement(updates)
    if (pnjControle && pnjControle.id === personnage.id) {
      setPnjControle({ ...pnjControle, ...updates })
    }

    // 3. Consommer l'item
    await consommerItemOptimiste(entry.id, entry.quantite)
    
    afficherToast(message)
  }

  return { toasts, utiliserItem }
}
