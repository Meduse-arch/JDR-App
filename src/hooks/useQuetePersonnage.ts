import { useState, useCallback, useRef } from 'react'
import { queteService } from '../services/queteService'
import { useQuetes } from './useQuetes'
import { Personnage, Quete } from '../types'

export function useQuetePersonnage(personnage: Personnage | null) {
  const { quetes, charger: chargerQuetes, setQuetes } = useQuetes(personnage?.id)
  const [filtreSuivies, setFiltreSuivies] = useState(false)
  const lastUpdateRef = useRef<number>(0)

  const toggleSuivre = useCallback(async (q: Quete & { suivie?: boolean }) => {
    if (!personnage) return false
    const memoire = [...quetes]
    lastUpdateRef.current = Date.now()

    const nouveauStatut = !q.suivie
    // Optimistic
    setQuetes(prev => prev.map(item => 
      item.id === q.id ? { ...item, suivie: nouveauStatut } : item
    ))

    try {
      const success = await queteService.toggleSuivreQuete(personnage.id, q.id, nouveauStatut)
      if (!success) throw new Error("Erreur BDD")
    } catch (e) {
      setQuetes(memoire)
      console.error(e)
      return false
    }
    return true
  }, [personnage, quetes, setQuetes])

  const quetesFiltrees = filtreSuivies ? quetes.filter(q => (q as any).suivie) : quetes

  return {
    quetes: quetesFiltrees,
    toutesQuetes: quetes,
    filtreSuivies,
    setFiltreSuivies,
    toggleSuivre,
    chargerQuetes
  }
}
