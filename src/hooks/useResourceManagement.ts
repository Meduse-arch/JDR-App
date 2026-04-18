import { useState, useCallback } from 'react'
import { type Personnage } from '../store/useStore'
import { useStore } from '../store/useStore'
import { logService } from '../services/logService'

export type RessourceKey = 'hp' | 'mana' | 'stam'

export function useResourceManagement(
  personnage: Personnage | null,
  mettreAJourLocalement: (updates: Partial<Personnage>) => Promise<void>,
  mettreAJourRessourceHybride?: (type: RessourceKey, valeur: number, max: number) => void
) {
  const [deltas, setDeltas] = useState<Record<RessourceKey, string>>({ hp: '', mana: '', stam: '' })
  const roleEffectif = useStore(s => s.roleEffectif)
  const sessionActive = useStore(s => s.sessionActive)
  const pnjControle = useStore(s => s.pnjControle)

  const updateDelta = (key: RessourceKey, value: string) => {
    setDeltas(prev => ({ ...prev, [key]: value }))
  }

  const adjustDelta = (key: RessourceKey, amount: number) => {
    setDeltas(prev => ({ 
      ...prev, 
      [key]: String((parseInt(prev[key]) || 0) + amount) 
    }))
  }

  const appliquerDelta = useCallback(async (key: RessourceKey) => {
    if (!personnage) return
    const delta = parseInt(deltas[key])
    if (isNaN(delta) || delta === 0) return

    const champActuel = key as keyof Personnage
    const champMax    = `${key}_max` as keyof Personnage
    const actuel = personnage[champActuel] as number
    const max    = personnage[champMax]    as number
    const nouveau = Math.max(0, Math.min(max, actuel + delta))

    if (mettreAJourRessourceHybride) {
      mettreAJourRessourceHybride(key, nouveau, max)
    } else {
      const updates = { [champActuel]: nouveau } as Partial<Personnage>
      await mettreAJourLocalement(updates)
    }

    if (roleEffectif === 'joueur' && sessionActive && !pnjControle) {
      const nomAffichage = key === 'hp' ? 'HP' : key === 'mana' ? 'Mana' : 'Stam'
      await logService.logAction({
        id_session: sessionActive.id,
        id_personnage: personnage.id,
        nom_personnage: personnage.nom,
        type: 'ressource',
        action: `${nomAffichage}: ${delta > 0 ? '+' : ''}${delta}`
      }).catch(console.error)
    }

    setDeltas(prev => ({ ...prev, [key]: '' }))
  }, [personnage, deltas, mettreAJourLocalement, mettreAJourRessourceHybride, roleEffectif, sessionActive, pnjControle])

  return {
    deltas,
    updateDelta,
    adjustDelta,
    appliquerDelta
  }
}
