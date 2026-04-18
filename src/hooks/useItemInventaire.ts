import { useState, useCallback } from 'react'
import { inventaireService } from '../services/inventaireService'
import { useInventaire } from './useInventaire'
import { useItems } from './useItems'
import { Personnage, Item, InventaireEntry } from '../types'

interface PanierItem {
  item: Item;
  quantite: number;
}

export function useItemInventaire(personnage: Personnage | null) {
  const { inventaire, charger: chargerInventaire, equiper, retirer } = useInventaire(personnage?.id, personnage?.nom ?? undefined)  
  const { items: itemsBibliotheque } = useItems()
  const [panier, setPanier] = useState<Map<string, PanierItem>>(new Map())
  const [recherche, setRecherche] = useState('')
  const [sauvegardant, setSauvegardant] = useState(false)

  const toggleEquipement = useCallback(async (entry: InventaireEntry) => {
    if (!personnage) return
    await equiper(entry.id, !entry.equipe)
  }, [personnage, equiper])

  const togglePanier = (item: Item) => {
    setPanier(prev => {
      const next = new Map(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        next.set(item.id, { item, quantite: 1 })
      }
      return next
    })
  }

  const updateQuantitePanier = (id: string, delta: number) => {
    setPanier(prev => {
      const next = new Map(prev)
      const entry = next.get(id)
      if (entry) {
        const nv = Math.max(1, entry.quantite + delta)
        next.set(id, { ...entry, quantite: nv })
      }
      return next
    })
  }

  const resetPanier = () => setPanier(new Map())

  const ajouterItem = useCallback(async (itemId: string) => {
    if (!personnage) return false
    const ok = await inventaireService.ajouterItem(personnage.id, itemId, 1)
    if (ok) {
      await chargerInventaire()
    }
    return ok
  }, [personnage, chargerInventaire])

  const confirmerEnvoi = useCallback(async () => {
    if (!personnage || panier.size === 0) return false
    setSauvegardant(true)
    try {
      let total = 0
      for (const [id, entry] of panier.entries()) {
        const ok = await inventaireService.ajouterItem(personnage.id, id, entry.quantite)
        if (ok) total++
      }
      setPanier(new Map())
      await chargerInventaire()
      return total
    } catch (e) {
      console.error(e)
      return false
    } finally {
      setSauvegardant(false)
    }
  }, [personnage, panier, chargerInventaire])

  const retirerUn = useCallback(async (entry: InventaireEntry) => {
    await retirer(entry.id, 1)
  }, [retirer])

  const supprimerItemCompletement = useCallback(async (entryId: string) => {
    await retirer(entryId, 99999)
  }, [retirer])

  const itemsBibliothequeFiltrés = itemsBibliotheque
    .filter(i => i.nom.toLowerCase().includes(recherche.toLowerCase()))

  return {
    inventaire,
    itemsBibliothequeFiltrés,
    panier,
    recherche,
    setRecherche,
    sauvegardant,
    togglePanier,
    toggleEquipement,
    updateQuantitePanier,
    resetPanier,
    confirmerEnvoi,
    ajouterItem,
    retirerUn,
    supprimerItemCompletement
  }
}
