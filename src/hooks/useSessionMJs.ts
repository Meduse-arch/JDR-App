import { useState, useEffect, useCallback } from 'react'
import { sessionService } from '../services/sessionService'

export type Compte = { id: string; pseudo: string; role: string }

export function useSessionMJs(sessionId?: string) {
  const [mjSession, setMjSession] = useState<Compte[]>([])
  const [disponibles, setDisponibles] = useState<Compte[]>([])
  const [chargement, setChargement] = useState(true)

  const chargerMJs = useCallback(async () => {
    if (!sessionId) {
      setMjSession([])
      setDisponibles([])
      setChargement(false)
      return
    }

    setChargement(true)
    const [mjs, dispo] = await Promise.all([
      sessionService.getSessionMJs(sessionId),
      sessionService.getComptesDisponiblesMJ(sessionId)
    ])

    setMjSession(mjs)
    setDisponibles(dispo)
    setChargement(false)
  }, [sessionId])

  useEffect(() => {
    chargerMJs()
  }, [chargerMJs])

  const ajouterMJ = async (idCompte: string) => {
    if (!sessionId) return false
    const success = await sessionService.ajouterMJ(sessionId, idCompte)
    if (success) await chargerMJs()
    return success
  }

  const retirerMJ = async (idCompte: string) => {
    if (!sessionId) return false
    const success = await sessionService.retirerMJ(sessionId, idCompte)
    if (success) await chargerMJs()
    return success
  }

  return {
    mjSession,
    disponibles,
    chargement,
    recharger: chargerMJs,
    ajouterMJ,
    retirerMJ
  }
}
