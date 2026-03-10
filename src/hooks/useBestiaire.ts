import { useState, useEffect, useCallback } from 'react'
import { bestiaireService } from '../services/bestiaireService'
import { type Personnage } from '../store/useStore'

export function useBestiaire(sessionId?: string) {
  const [templates, setTemplates] = useState<Personnage[]>([])
  const [monstres,  setMonstres]  = useState<Personnage[]>([])
  const [chargement, setChargement] = useState(true)

  const chargerDonnees = useCallback(async () => {
    if (!sessionId) {
      setTemplates([])
      setMonstres([])
      setChargement(false)
      return
    }

    setChargement(true)
    try {
      const tmpl = await bestiaireService.getTemplates(sessionId, 'Monstre')
      const actifs = await bestiaireService.getInstances(sessionId, 'Monstre')
      setTemplates(tmpl as Personnage[])
      setMonstres(actifs as Personnage[])
    } catch (e) {
      console.error(e)
    } finally {
      setChargement(false)
    }
  }, [sessionId])

  useEffect(() => {
    chargerDonnees()
  }, [chargerDonnees])

  const instancier = async (template: any, count: number, options?: { nom?: string }) => {
    if (!sessionId) return false
    const success = await bestiaireService.instancier(template, sessionId, count, options)
    if (success) await chargerDonnees()
    return success
  }

  const supprimer = async (id: string) => {
    const success = await bestiaireService.supprimerInstance(id)
    if (success) await chargerDonnees()
    return success
  }

  return {
    templates,
    monstres,
    chargement,
    recharger: chargerDonnees,
    instancier,
    supprimer
  }
}
