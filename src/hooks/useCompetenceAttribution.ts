import { useState, useCallback } from 'react'
import { competenceService } from '../services/competenceService'
import { usePersonnageCompetences } from './usePersonnageCompetences'
import { useCompetences } from './useCompetences'
import { Personnage } from '../types'

export function useCompetenceAttribution(personnage: Personnage | null) {
  const { competencesAcquises, chargerCompetencesAcquises, toggleActive } = usePersonnageCompetences(personnage)
  const { competences: toutesCompetences } = useCompetences()

  const [selection, setSelection] = useState<string[]>([])
  const [recherche, setRecherche] = useState('')
  const [chargement, setChargement] = useState(false)

  const toggleSelection = (id: string) => {
    setSelection(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const resetSelection = () => setSelection([])

  const toggleCompetence = useCallback(async (liaisonId: string, is_active: boolean) => {
    return await toggleActive(liaisonId, is_active)
  }, [toggleActive])

  const attribuerSelection = useCallback(async () => {
    if (!personnage || selection.length === 0) return false
    setChargement(true)
    try {
      let succesCount = 0
      for (const idComp of selection) {
        const ok = await competenceService.apprendreCompetence(personnage.id, idComp)
        if (ok) succesCount++
      }
      setSelection([])
      await chargerCompetencesAcquises(true)
      return succesCount
    } catch (e) {
      console.error(e)
      return false
    } finally {
      setChargement(false)
    }
  }, [personnage, selection, chargerCompetencesAcquises])

  const oublierCompetence = useCallback(async (idCompetence: string) => {
    if (!personnage) return false
    const success = await competenceService.oublierCompetence(personnage.id, idCompetence)
    if (success) await chargerCompetencesAcquises(true)
    return success
  }, [personnage, chargerCompetencesAcquises])

  const competencesDisponibles = (toutesCompetences || [])
    .filter(tc => !competencesAcquises.some(ca => ca.id_competence === tc.id))
    .filter(tc => (tc.nom || '').toLowerCase().includes(recherche.toLowerCase()))

  return {
    competencesAcquises,
    competencesDisponibles,
    selection,
    recherche,
    setRecherche,
    chargement,
    toggleSelection,
    resetSelection,
    attribuerSelection,
    oublierCompetence,
    toggleCompetence,
    chargerCompetencesAcquises
  }
}
