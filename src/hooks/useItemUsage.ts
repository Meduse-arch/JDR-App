import { useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'
import { rollDice, rollStatDice } from '../utils/rollDice'

export function useItemUsage(
  personnage: any, 
  mettreAJourLocalement: (updates: any) => Promise<void>,
  consommerItemOptimiste: (id: string, q: number) => Promise<void>
) {
  const [toasts, setToasts] = useState<string[]>([])
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)
  const setDiceResult = useStore(s => s.setDiceResult)

  const afficherToast = (msg: string) => {
    setToasts(prev => [...prev, msg])
    setTimeout(() => setToasts(prev => prev.filter(t => t !== msg)), 3000)
  }

  const utiliserItem = useCallback(async (entry: any) => {
    if (!personnage) return

    const { items } = entry
    const effets = items.effets_actifs || []
    
    // 1. Calculer les bonus immédiats
    const updates: any = {}
    
    // Couleurs par jauge
    const colors: Record<string, string> = { hp: '#ef4444', mana: '#3b82f6', stam: '#eab308' }
    const labels: Record<string, string> = { hp: 'Soin / Dégâts PV', mana: 'Restauration Mana', stam: 'Restauration Stamina' }

    const diceResults: any[] = [];

    for (const e of effets) {
      let finalValue = e.valeur || 0
      const isCout = e.valeur < 0 || e.est_cout === true;
      
      // LOGIQUE DE DÉS
      if (e.des_nb || e.des_stat_id) {
        let rollRes;
        
        if (e.des_stat_id) {
          // Dé sur stat
          const { data: statsPerso } = await supabase.from('personnage_stats').select('valeur, stats(nom)').eq('id_personnage', personnage.id).eq('id_stat', e.des_stat_id).single()
          rollRes = rollStatDice(statsPerso?.valeur || 10, e.valeur, statsPerso?.stats?.nom || 'Stat')
        } else {
          // Dé fixe
          rollRes = rollDice(e.des_nb, e.des_faces || 6, e.valeur)
        }

        finalValue = rollRes.total
        diceResults.push({ ...rollRes, label: labels[e.cible_jauge] || 'Effet', color: colors[e.cible_jauge] || '#ffffff', bonus: 0 })
      }

      // S'assurer que les coûts sont soustraits
      if (isCout) {
        finalValue = -Math.abs(finalValue);
      }

      // Si c'est un jet de dé pur (est_jet_de), on ne modifie PAS les jauges du personnage
      if (e.est_jet_de) continue;

      if (e.cible_jauge === 'hp') {
        updates.hp = Math.max(0, Math.min(personnage.hp_max, (updates.hp ?? personnage.hp) + finalValue))
      }
      if (e.cible_jauge === 'mana') {
        updates.mana = Math.max(0, Math.min(personnage.mana_max, (updates.mana ?? personnage.mana) + finalValue))
      }
      if (e.cible_jauge === 'stam') {
        updates.stam = Math.max(0, Math.min(personnage.stam_max, (updates.stam ?? personnage.stam) + finalValue))
      }
    }

    if (diceResults.length > 0) {
      setDiceResult(null);
      setTimeout(() => setDiceResult(diceResults), 10);
    }

    // 2. Appliquer les changements (si soin par exemple)
    if (Object.keys(updates).length > 0) {
      await mettreAJourLocalement(updates)
      if (pnjControle && personnage.id === pnjControle.id) {
        setPnjControle({ ...pnjControle, ...updates })
      }
    }

    // 3. Consommer l'item (on diminue la quantité de 1)
    await consommerItemOptimiste(entry.id, 1)
    
    afficherToast(`Utilisation de ${items.nom}`)
  }, [personnage, mettreAJourLocalement, consommerItemOptimiste, pnjControle, setPnjControle, setDiceResult])

  return { toasts, utiliserItem }
}
