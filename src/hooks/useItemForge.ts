import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { useItems } from './useItems'
import { itemsService } from '../services/itemsService'
import { tagsService } from '../services/tagsService'
import { Item, Modificateur, EffetActif, Tag, CategorieItem } from '../types'

export function useItemForge() {
  const sessionActive = useStore(s => s.sessionActive)
  const compte = useStore(s => s.compte)
  const { charger, supprimerItem } = useItems()

  const [idEdition, setIdEdition] = useState<string | null>(null)
  const [form, setForm] = useState({ nom: '', description: '', categorie: 'Divers' as CategorieItem, image_url: '' as string | null })
  const [modifs, setModifs] = useState<Partial<Modificateur>[]>([])
  const [effets, setEffets] = useState<Partial<EffetActif>[]>([])
  const [enCours, setEnCours] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [tagsChoisis, setTagsChoisis] = useState<string[]>([])

  useEffect(() => {
    if (sessionActive) {
      tagsService.getTags(sessionActive.id).then(setTags)
    }
  }, [sessionActive])

  const reset = () => {
    setIdEdition(null)
    setForm({ nom: '', description: '', categorie: 'Divers', image_url: '' })
    setModifs([])
    setEffets([])
    setTagsChoisis([])
  }

  const chargerPourEdition = (item: Item) => {
    setIdEdition(item.id)
    setForm({ nom: item.nom, description: item.description, categorie: item.categorie, image_url: item.image_url || '' })
    setModifs(item.modificateurs || [])
    setEffets(item.effets_actifs || [])
    setTagsChoisis(item.tags?.map(t => t.id) || [])
  }

  const sauvegarder = async () => {
    if (!sessionActive || !form.nom || enCours) return false
    setEnCours(true)
    
    let success = false
    if (idEdition) {
      success = await itemsService.updateItem(idEdition, form, modifs as Modificateur[], effets as EffetActif[], tagsChoisis)
    } else {
      const newItem = await itemsService.createItem(sessionActive.id, compte?.id, form, modifs, effets, tagsChoisis)
      success = !!newItem
    }

    if (success) {
      await charger()
      reset()
    }
    setEnCours(false)
    return success
  }

  const toggleTag = (idTag: string) => {
    if (tagsChoisis.includes(idTag)) setTagsChoisis(tagsChoisis.filter(id => id !== idTag))
    else setTagsChoisis([...tagsChoisis, idTag])
  }

  const toggleStatModif = (idStat: string) => {
    const exists = modifs.find(m => m.id_stat === idStat)
    if (exists) setModifs(modifs.filter(m => m.id_stat !== idStat))
    else setModifs([...modifs, { id_stat: idStat, type_calcul: 'fixe', valeur: 1 }])
  }

  const toggleResModif = (type: string) => {
    const exists = effets.find(e => e.cible_jauge === type)
    if (exists) setEffets(effets.filter(e => e.cible_jauge !== type))
    else setEffets([...effets, { cible_jauge: type as any, valeur: 1 }])
  }

  const updateModif = (idx: number, updates: Partial<Modificateur>) => {
    setModifs(prev => {
      const newList = [...prev]
      newList[idx] = { ...newList[idx], ...updates }
      return newList
    })
  }

  const updateEffet = (idx: number, updates: Partial<EffetActif>) => {
    setEffets(prev => {
      const newList = [...prev]
      newList[idx] = { ...newList[idx], ...updates }
      return newList
    })
  }

  return {
    form, setForm,
    modifs, setModifs,
    effets, setEffets,
    enCours,
    idEdition,
    tags,
    tagsChoisis,
    reset,
    chargerPourEdition,
    sauvegarder,
    supprimer: supprimerItem,
    toggleStatModif,
    toggleResModif,
    updateModif,
    updateEffet,
    toggleTag
  }
}
