import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'
import { inventaireService } from '../services/inventaireService'

export type ItemInventaire = {
  id: string
  quantite: number
  equipe: boolean
  items: {
    id: string
    nom: string
    description: string
    categorie: string
  }
}

export function useInventaire() {
  const compte = useStore(s => s.compte)
  const pnjControle = useStore(s => s.pnjControle)
  
  const [inventaire, setInventaire] = useState<ItemInventaire[]>([])
  const [chargement, setChargement] = useState(true)

  const chargerInventaire = useCallback(async () => {
    setChargement(true)
    try {
      let idPersonnage = pnjControle?.id

      if (!idPersonnage) {
        if (!compte) return
        const { data: perso } = await supabase
          .from('personnages')
          .select('id')
          .eq('lie_au_compte', compte.id)
          .eq('est_pnj', false)
          .single()
        
        if (!perso) return
        idPersonnage = perso.id
      }

      const { data } = await supabase
        .from('inventaire')
        .select('id, quantite, equipe, items(id, nom, description, categorie)')
        .eq('id_personnage', idPersonnage)

      if (data) {
        setInventaire(data as any)
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'inventaire:", error)
    } finally {
      setChargement(false)
    }
  }, [compte, pnjControle])

  useEffect(() => {
    chargerInventaire()
  }, [chargerInventaire])

  const toggleEquipementOptimiste = async (idInventaire: string, estEquipe: boolean) => {
    // 1. Mise à jour optimiste locale
    setInventaire(prev => prev.map(item => 
      item.id === idInventaire ? { ...item, equipe: estEquipe } : item
    ))
    // 2. Appel au service pour la base de données
    const success = await inventaireService.toggleEquipement(idInventaire, estEquipe)
    if (!success) {
      // Annuler si erreur
      chargerInventaire()
    }
  }

  const consommerItemOptimiste = async (idInventaire: string, quantiteActuelle: number) => {
    // 1. Mise à jour optimiste locale
    if (quantiteActuelle <= 1) {
      setInventaire(prev => prev.filter(item => item.id !== idInventaire))
    } else {
      setInventaire(prev => prev.map(item => 
        item.id === idInventaire ? { ...item, quantite: quantiteActuelle - 1 } : item
      ))
    }
    // 2. Appel au service pour la base de données
    const success = await inventaireService.consommerItem(idInventaire, quantiteActuelle)
    if (!success) {
      chargerInventaire()
    }
  }

  return { 
    inventaire, 
    chargement, 
    rechargerInventaire: chargerInventaire,
    toggleEquipementOptimiste,
    consommerItemOptimiste
  }
}
