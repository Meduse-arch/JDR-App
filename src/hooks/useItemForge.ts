import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { useItems } from './useItems'
import { itemsService } from '../services/itemsService'
import { tagsService } from '../services/tagsService'
import { Item, Modificateur, EffetActif, Tag, CategorieItem, Stat } from '../types'

export function useItemForge() {
  // FIX stats sessionId primitif : dépendre de l'ID (string) pour la stabilité du useEffect
  const sessionActiveId = useStore(s => s.sessionActive?.id)
  const compte = useStore(s => s.compte)
  const { charger, supprimerItem } = useItems()

  const [idEdition, setIdEdition] = useState<string | null>(null)
  const [form, setForm] = useState({ nom: '', description: '', categorie: 'Divers' as CategorieItem, image_url: '' as string | null })
  const [modifs, setModifs] = useState<Partial<Modificateur>[]>([])
  const [effets, setEffets] = useState<Partial<EffetActif>[]>([])
  const [enCours, setEnCours] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [tagsChoisis, setTagsChoisis] = useState<string[]>([])
  const [stats, setStats] = useState<Stat[]>([])

  // FIX stats sessionId primitif : Chargement forcé avec ID stable
  useEffect(() => {
    if (sessionActiveId) {
      itemsService.getStats().then(result => {
        console.log('[DEBUG] stats chargées dans useItemForge:', result);
        setStats(result);
      });
      // Récupération de l'objet complet via state pour les tags si nécessaire
      const { sessionActive } = useStore.getState();
      if (sessionActive) {
        tagsService.getTags(sessionActive.id).then(setTags)
      }
    }
  }, [sessionActiveId])

  const reset = () => {
    setIdEdition(null)
    setForm({ nom: '', description: '', categorie: 'Divers', image_url: '' })
    setModifs([]); setEffets([]); setTagsChoisis([])
  }

  const chargerPourEdition = (item: Item) => {
    setIdEdition(item.id)
    setForm({ nom: item.nom, description: item.description, categorie: item.categorie, image_url: item.image_url || '' })
    setModifs(item.modificateurs || [])
    setEffets(item.effets_actifs || [])
    setTagsChoisis(item.tags?.map(t => t.id) || [])
  }

  const sauvegarder = async () => {
    const { sessionActive } = useStore.getState();
    if (!sessionActive || !form.nom || enCours) return false
    setEnCours(true)
    
    // FIX update item : log temporaire
    console.log('[DEBUG update] idEdition:', idEdition, 'form:', form);

    let success = false
    try {
      if (idEdition) {
        success = await itemsService.updateItem(idEdition, form, modifs as Modificateur[], effets as EffetActif[], tagsChoisis)
      } else {
        success = !!(await itemsService.createItem(sessionActive.id, compte?.id, form, modifs, effets, tagsChoisis))
      }

      if (success) {
        await charger()
        reset()
      }
    } catch (e) {
      console.error("Erreur forge sauvegarde:", e)
    } finally {
      setEnCours(false)
    }
    return success
  }

  const toggleTag = (idTag: string) => {
    if (tagsChoisis.includes(idTag)) setTagsChoisis(tagsChoisis.filter(id => id !== idTag))
    else setTagsChoisis([...tagsChoisis, idTag])
  }

  const toggleStatModif = (idStat: string) => {
    const sid = String(idStat);
    const exists = modifs.find(m => String(m.id_stat) === sid)
    if (exists) setModifs(modifs.filter(m => String(m.id_stat) !== sid))
    else setModifs([...modifs, { id_stat: sid, type_calcul: 'fixe', valeur: 1 }])
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
    stats, 
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
