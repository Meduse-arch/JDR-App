import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useStore, type Personnage } from '../Store/useStore'
import { personnageService } from '../services/personnageService'

export function usePersonnage() {
  const compte = useStore(s => s.compte)
  const pnjControle = useStore(s => s.pnjControle)
  const sessionActive = useStore(s => s.sessionActive)
  
  const [personnage, setPersonnage] = useState<Personnage | null>(null)
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
          
        if (data) setPersonnage(data as Personnage)
      } else {
        if (!compte || !sessionActive) return
        const { data, error } = await supabase
          .from('personnages')
          .select('*')
          .eq('id_session', sessionActive.id)
          .eq('lie_au_compte', compte.id)
          .eq('type', 'Joueur')
          .eq('is_template', false)
          .limit(1)
          
        if (error) console.error("Erreur query perso:", error)
        if (data && data.length > 0) setPersonnage(data[0] as Personnage)
        else setPersonnage(null)
      }
    } catch (error) {
      console.error("Erreur lors du chargement du personnage:", error)
    } finally {
      setChargement(false)
    }
  }, [compte, pnjControle, sessionActive])

  useEffect(() => {
    chargerPersonnage()
  }, [chargerPersonnage])

  const mettreAJourLocalement = async (updates: Partial<Personnage>) => {
    if (!personnage) return
    setPersonnage(prev => prev ? { ...prev, ...updates } : null)
    
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
