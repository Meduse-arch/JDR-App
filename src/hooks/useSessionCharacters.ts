import { useState, useEffect, useCallback } from 'react'
import { sessionService } from '../services/sessionService'
import { personnageService } from '../services/personnageService'
import { type Personnage } from '../store/useStore'

export function useSessionCharacters(sessionId?: string) {
  const [joueurs, setJoueurs] = useState<Personnage[]>([])
  const [pnjs, setPnjs] = useState<Personnage[]>([])
  const [chargement, setChargement] = useState(true)

  const chargerDonnees = useCallback(async () => {
    if (!sessionId) {
      setJoueurs([])
      setPnjs([])
      setChargement(false)
      return
    }

    setChargement(true)
    const { joueurs, pnjs } = await sessionService.getSessionCharacters(sessionId)
    setJoueurs(joueurs)
    setPnjs(pnjs)
    setChargement(false)
  }, [sessionId])

  useEffect(() => {
    chargerDonnees()
  }, [chargerDonnees])

  const supprimerPersonnage = async (id: string) => {
    const success = await personnageService.deletePersonnage(id)
    if (success) await chargerDonnees()
    return success
  }

  return {
    joueurs,
    pnjs,
    chargement,
    recharger: chargerDonnees,
    supprimerPersonnage
  }
}
