import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'

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
}

export function usePersonnage() {
  const compte = useStore(s => s.compte)
  const pnjControle = useStore(s => s.pnjControle)
  
  const [personnage, setPersonnage] = useState<PersonnageDetail | null>(null)
  const [chargement, setChargement] = useState(true)

  const chargerPersonnage = async () => {
    setChargement(true)
    try {
      // Si le MJ contrôle un PNJ, on charge ce PNJ
      if (pnjControle) {
        const { data } = await supabase
          .from('personnages')
          .select('*')
          .eq('id', pnjControle.id)
          .single()
          
        if (data) setPersonnage(data as PersonnageDetail)
      } 
      // Sinon on charge le personnage du joueur connecté
      else {
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
  }

  useEffect(() => {
    chargerPersonnage()
  }, [compte, pnjControle])

  return { personnage, chargement, rechargerPersonnage: chargerPersonnage }
}