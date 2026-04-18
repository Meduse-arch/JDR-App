import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { useCompetences } from './useCompetences'
import { itemsService } from '../services/itemsService'
import { tagsService } from '../services/tagsService'
import { Stat, Modificateur, EffetActif, Tag, Competence } from '../types'

export function useCompetenceForge() {
  const sessionActive = useStore(s => s.sessionActive)
  const { supprimerCompetence, creerCompetence, modifierCompetence } = useCompetences()

  // Metadata
  const [stats, setStats] = useState<Stat[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  // Form state
  const [idEdition, setIdEdition] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [typeComp, setTypeComp] = useState('active')
  const [tagsChoisis, setTagsChoisis] = useState<string[]>([])
  const [modifs, setModifs] = useState<Partial<Modificateur>[]>([])
  const [effets, setEffets] = useState<Partial<EffetActif>[]>([])
  const [couts, setCouts] = useState<Partial<EffetActif>[]>([])
  const [jetsDes, setJetsDes] = useState<Partial<EffetActif>[]>([])
  const [conditionTags, setConditionTags] = useState<string[]>([])
  const [conditionType, setConditionType] = useState<'item' | 'skill' | 'les_deux' | null>(null)

  useEffect(() => {
    itemsService.getStats().then(s => setStats((s || []).filter(st => !['PV Max', 'Mana Max', 'Stamina Max'].includes(st.nom))))
    if (sessionActive) {
      tagsService.getTags(sessionActive.id).then(setTags)
    }
  }, [sessionActive])

  const reset = () => {
    setIdEdition(null)
    setNom('')
    setDescription('')
    setTypeComp('active')
    setModifs([])
    setEffets([])
    setCouts([])
    setJetsDes([])
    setTagsChoisis([])
    setConditionTags([])
    setConditionType(null)
  }

  const chargerPourEdition = (comp: Competence) => {
    setIdEdition(comp.id)
    setNom(comp.nom)
    setDescription(comp.description)
    setTypeComp(comp.type)
    setModifs(comp.modificateurs || [])
    setConditionType(comp.condition_type || null)
    
    const tousEffets = comp.effets_actifs || []
    setJetsDes(tousEffets.filter(e => e.est_jet_de === true))
    setEffets(tousEffets.filter(e => !e.est_jet_de && !e.est_cout))
    setCouts(tousEffets.filter(e => !e.est_jet_de && e.est_cout === true))
    
    if (comp.type === 'passive_auto') {
      setConditionTags(comp.tags?.map(t => t.id) || [])
      setTagsChoisis([])
    } else {
      setConditionTags([])
      setTagsChoisis(comp.tags?.map(t => t.id) || [])
    }
  }

  const sauvegarder = async () => {
    if (!nom || !sessionActive) return false
    
    const finalModifs = modifs.map(m => ({
      ...m,
      id_tag: m.id_tag || null
    }))

    const finalEffets = [
      ...effets.map(e => ({ ...e, est_cout: false, est_jet_de: false })),
      ...couts.map(e => ({ ...e, est_cout: true, est_jet_de: false })),
      ...jetsDes.map(e => ({ ...e, est_cout: false, est_jet_de: true, cible_jauge: e.cible_jauge || 'hp' }))
    ].filter(e => !!e.cible_jauge)

    const compData = { 
      nom, 
      description, 
      type: typeComp as any, 
      condition_type: typeComp === 'passive_auto' ? conditionType : null
    }

    const finalTags = typeComp === 'passive_auto' ? conditionTags : tagsChoisis

    let success = false
    if (idEdition) {
      success = await modifierCompetence(idEdition, compData, finalModifs as any[], finalEffets as any[], finalTags)
    } else {
      const newComp = await creerCompetence(
        { ...compData, id_session: sessionActive.id },
        finalModifs as any[],
        finalEffets as any[],
        finalTags
      )
      success = !!newComp
    }

    if (success) reset()
    return success
  }

  const toggleConditionTag = (idTag: string) => {
    if (conditionTags.includes(idTag)) setConditionTags(conditionTags.filter(id => id !== idTag))
    else setConditionTags([...conditionTags, idTag])
  }

  const addModif = () => setModifs(prev => [...prev, { id_stat: stats[0]?.id, type_calcul: 'fixe', valeur: 0 }])
  const removeModif = (idx: number) => setModifs(prev => prev.filter((_, i) => i !== idx))
  const updateModif = (idx: number, updates: Partial<Modificateur>) => {
    setModifs(prev => {
      const newList = [...prev]
      newList[idx] = { ...newList[idx], ...updates }
      return newList
    })
  }

  const addEffet = (type: 'ressources' | 'couts' | 'dés') => {
    const defaultJauge = 'hp' as const
    const newEffet: Partial<EffetActif> = { 
      cible_jauge: defaultJauge, 
      valeur: type === 'dés' ? 0 : 10, 
      des_nb: type === 'dés' ? 1 : null,
      des_faces: type === 'dés' ? 6 : null,
      des_stat_id: null,
      est_cout: type === 'couts',
      est_jet_de: type === 'dés'
    }
    
    if (type === 'couts') setCouts(prev => [...prev, newEffet])
    else if (type === 'dés') setJetsDes(prev => [...prev, newEffet])
    else setEffets(prev => [...prev, newEffet])
  }

  const removeEffet = (idx: number, type: 'ressources' | 'couts' | 'dés') => {
    if (type === 'dés') setJetsDes(prev => prev.filter((_, i) => i !== idx))
    else if (type === 'couts') setCouts(prev => prev.filter((_, i) => i !== idx))
    else setEffets(prev => prev.filter((_, i) => i !== idx))
  }

  const updateEffet = (idx: number, updates: Partial<EffetActif>, type: 'ressources' | 'couts' | 'dés') => {
    const setter = type === 'dés' ? setJetsDes : (type === 'couts' ? setCouts : setEffets)
    setter(prev => {
      const newList = [...prev]
      newList[idx] = { ...newList[idx], ...updates }
      return newList
    })
  }

  const toggleTag = (idTag: string) => {
    if (tagsChoisis.includes(idTag)) setTagsChoisis(tagsChoisis.filter(id => id !== idTag))
    else setTagsChoisis([...tagsChoisis, idTag])
  }

  return {
    stats, tags,
    nom, setNom,
    description, setDescription,
    typeComp, setTypeComp,
    tagsChoisis,
    modifs, setModifs,
    effets, setEffets,
    couts, setCouts,
    jetsDes, setJetsDes,
    idEdition,
    conditionTags, toggleConditionTag,
    conditionType, setConditionType,
    reset,
    chargerPourEdition,
    sauvegarder,
    supprimer: supprimerCompetence,
    addModif, removeModif, updateModif,
    addEffet, removeEffet, updateEffet,
    toggleTag
  }
}
