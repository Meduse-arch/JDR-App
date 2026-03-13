import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useStore, type Personnage } from '../store/useStore'
import { personnageService } from '../services/personnageService'

export function usePersonnage() {
  const compte = useStore(s => s.compte)
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)
  const sessionActive = useStore(s => s.sessionActive)
  
  const [personnage, setPersonnage] = useState<Personnage | null>(null)
  const [chargement, setChargement] = useState(true)

  const chargerPersonnage = useCallback(async () => {
    setChargement(true)
    try {
      if (pnjControle) {
        const { data } = await supabase
          .from('v_personnages')
          .select('*')
          .eq('id', pnjControle.id)
          .single()
          
        if (data) setPersonnage(data as Personnage)
      } else {
        if (!compte || !sessionActive) return
        const { data, error } = await supabase
          .from('v_personnages')
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
  }, [compte, pnjControle?.id, sessionActive])

  useEffect(() => {
    chargerPersonnage()
  }, [chargerPersonnage])

  const mettreAJourLocalement = async (updates: Partial<Personnage>) => {
    if (!personnage) return

    // Pour la BDD, on ne veut envoyer que les champs qui existent dans 'personnages'
    const dbUpdates = { ...updates };
    delete dbUpdates.hp_max;
    delete dbUpdates.mana_max;
    delete dbUpdates.stam_max;

    if (Object.keys(dbUpdates).length > 0) {
      const success = await personnageService.updatePersonnage(personnage.id, dbUpdates)
      if (!success) {
        console.error("Erreur lors de la mise à jour BDD via mettreAJourLocalement")
      }
    }

    // On recharge TOUJOURS depuis la vue pour avoir les max à jour et les données consistantes
    const { data: updatedPerso } = await supabase
      .from('v_personnages')
      .select('*')
      .eq('id', personnage.id)
      .single()

    if (updatedPerso) {
      setPersonnage(updatedPerso as Personnage)
      if (pnjControle && pnjControle.id === personnage.id) {
        setPnjControle(updatedPerso as Personnage)
      }
    } else {
      chargerPersonnage() // fallback
    }
  }

  return { 
    personnage, 
    chargement, 
    rechargerPersonnage: chargerPersonnage,
    mettreAJourLocalement
  }
}
