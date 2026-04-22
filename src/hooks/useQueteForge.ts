import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { useQuetes } from './useQuetes'
import { queteService } from '../services/queteService'
import { sessionService } from '../services/sessionService'
import { itemsService } from '../services/itemsService'
import { Quete, Recompense, Item, Personnage } from '../types'

export function useQueteForge() {
  const sessionActive = useStore(s => s.sessionActive)
  const { charger: rechargerQuetes, supprimerQuete } = useQuetes()
  
  const [joueurs, setJoueurs] = useState<Personnage[]>([])
  const [itemsDispos, setItemsDispos] = useState<Item[]>([])
  
  const [form, setForm] = useState<Partial<Quete>>({ titre: '', description: '', statut: 'En cours', image_url: '' })
  const [recompenses, setRecompenses] = useState<Partial<Recompense>[]>([])
  const [participants, setParticipants] = useState<string[]>([])
  const [sauvegardant, setSauvegardant] = useState(false)

  useEffect(() => {
    if (sessionActive) {
      sessionService.getSessionCharacters(sessionActive.id).then(j => setJoueurs(j.joueurs))
      itemsService.getItems(sessionActive.id).then(setItemsDispos)
    }
  }, [sessionActive])

  const reset = () => {
    setForm({ titre: '', description: '', statut: 'En cours', image_url: '' })
    setRecompenses([])
    setParticipants([])
  }

  const chargerPourEdition = (q: Quete) => {
    setForm(q)
    setRecompenses(q.quete_recompenses ? JSON.parse(JSON.stringify(q.quete_recompenses)) : [])
    setParticipants(q.personnage_quetes?.map(p => p.id_personnage) || [])
  }

  const sauvegarder = async () => {
    if (!sessionActive || !form.titre || sauvegardant) return false
    setSauvegardant(true)
    try {
      const success = await queteService.upsertQuete(sessionActive.id, form, participants, recompenses)
      if (success) {
        await rechargerQuetes()
        reset()
      }
      return success
    } catch (e) {
      console.error(e)
      return false
    } finally {
      setSauvegardant(false)
    }
  }

  const addRecompense = (type: 'Item' | 'Autre') => {
    setRecompenses(prev => [...prev, { type, valeur: type === 'Item' ? 1 : 0 }])
  }

  const removeRecompense = (idx: number) => {
    setRecompenses(prev => prev.filter((_, i) => i !== idx))
  }

  const updateRecompense = (idx: number, updates: Partial<Recompense>) => {
    setRecompenses(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...updates }
      return next
    })
  }

  const toggleParticipant = (id: string) => {
    setParticipants(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const modifierStatut = async (id: string, statut: Quete['statut']) => {
    const success = await queteService.modifierStatut(id, statut)
    if (success) await rechargerQuetes()
    return success
  }

  return {
    joueurs, itemsDispos,
    form, setForm,
    recompenses,
    participants,
    sauvegardant,
    reset,
    chargerPourEdition,
    sauvegarder,
    supprimer: supprimerQuete,
    addRecompense, removeRecompense, updateRecompense,
    toggleParticipant,
    modifierStatut
  }
}
