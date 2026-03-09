import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'
import { personnageService } from '../services/personnageService'

export type PersonnageDetail = {
  id: string
  nom: string
  hp_actuel: number
  hp_max: number
  mana_actuel: number
  mana_max: number
  stam_actuel: number
  stam_max: number
  est_pnj: boolean
  lie_au_compte?: string | null
}

export function usePersonnage() {
  const compte = useStore(s => s.compte)
  const pnjControle = useStore(s => s.pnjControle)
  
  const [personnage, setPersonnage] = useState<PersonnageDetail | null>(null)
  const [chargement, setChargement] = useState(true)

  const chargerPersonnage = useCallback(async () => {
    setChargement(true)
    try {
      if (pnjControle) {
        const { data } = await supabase
          .from('personnages')
          .select('*')
          .eq('id', pnjControle.id)
          .single()
          
        if (data) setPersonnage(data as PersonnageDetail)
      } else {
        if (!compte) return
        const { data } = await supabase
          .from('personnages')
          .select('*')
          .eq('lie_au_compte', compte.id)
          .eq('est_pnj', false)
          .single()
          
        if (data) setPersonnage(data as PersonnageDetail)
      }
    } catch (error) {
      console.error("Erreur lors du chargement du personnage:", error)
    } finally {
      setChargement(false)
    }
  }, [compte, pnjControle])

  useEffect(() => {
    chargerPersonnage()
  }, [chargerPersonnage])

  const mettreAJourLocalement = async (updates: Partial<PersonnageDetail>) => {
    if (!personnage) return
    // 1. Mise à jour optimiste locale
    setPersonnage(prev => prev ? { ...prev, ...updates } : null)
    
    // 2. Appel au service pour la base de données
    const success = await personnageService.updatePersonnage(personnage.id, updates)
    if (!success) {
      chargerPersonnage()
    }
  }

  return { 
    personnage, 
    chargement, 
    rechargerPersonnage: chargerPersonnage,
    mettreAJourLocalement
  }
}
