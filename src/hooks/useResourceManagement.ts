import { useState } from 'react'
import { useStore, type Personnage } from '../store/useStore'

export type RessourceKey = 'hp' | 'mana' | 'stam'

export function useResourceManagement(
  personnage: Personnage | null,
  mettreAJourLocalement: (updates: Partial<Personnage>) => Promise<void>
) {
  const [deltas, setDeltas] = useState<Record<RessourceKey, string>>({ hp: '', mana: '', stam: '' })
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const updateDelta = (key: RessourceKey, value: string) => {
    setDeltas(prev => ({ ...prev, [key]: value }))
  }

  const adjustDelta = (key: RessourceKey, amount: number) => {
    setDeltas(prev => ({ 
      ...prev, 
      [key]: String((parseInt(prev[key]) || 0) + amount) 
    }))
  }

  const appliquerDelta = async (key: RessourceKey) => {
    if (!personnage) return
    const delta = parseInt(deltas[key])
    if (isNaN(delta) || delta === 0) return

    const champActuel = `${key}_actuel` as keyof Personnage
    const champMax    = `${key}_max`    as keyof Personnage
    const actuel = personnage[champActuel] as number
    const max    = personnage[champMax]    as number
    const nouveau = Math.max(0, Math.min(max, actuel + delta))

    const updates = { [champActuel]: nouveau } as Partial<Personnage>
    await mettreAJourLocalement(updates)

    if (pnjControle && pnjControle.id === personnage.id) {
      setPnjControle({ ...pnjControle, ...updates } as any)
    }

    setDeltas(prev => ({ ...prev, [key]: '' }))
  }

  return {
    deltas,
    updateDelta,
    adjustDelta,
    appliquerDelta
  }
}
