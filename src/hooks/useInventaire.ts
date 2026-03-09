import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'

// On définit à quoi ressemble un item dans l'inventaire pour aider TypeScript
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

  const chargerInventaire = async () => {
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
  }

  useEffect(() => {
    chargerInventaire()
  }, [compte, pnjControle])

  return { inventaire, chargement, rechargerInventaire: chargerInventaire }
}