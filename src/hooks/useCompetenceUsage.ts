import { useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'
import { rollDice, rollStatDice } from '../utils/rollDice'
import { Competence } from '../types'

export function useCompetenceUsage(
  personnage: any,
  mettreAJourLocalement: (updates: any) => Promise<void>
) {
  const [toasts, setToasts] = useState<string[]>([])
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)
  const setDiceResult = useStore(s => s.setDiceResult)

  const afficherToast = (msg: string) => {
    setToasts(prev => [...prev, msg])
    setTimeout(() => setToasts(prev => prev.filter(t => t !== msg)), 3000)
  }

  const utiliserCompetence = useCallback(async (comp: Competence) => {
    if (!personnage) return

    const effets = comp.effets_actifs || []
    
    if (effets.length === 0) {
      afficherToast(`La compétence ${comp.nom} n'a pas d'effets définis.`)
      return
    }

    const updates: any = {}
    
    const colors: Record<string, string> = { hp: '#ef4444', mana: '#3b82f6', stam: '#eab308' }
    const labels: Record<string, string> = { hp: 'PV', mana: 'Mana', stam: 'Stamina' }

    // 1. Vérifier si le personnage peut payer les coûts fixes
    for (const e of effets) {
      if (!e.est_cout) continue;
      const jauge = e.cible_jauge?.toLowerCase();
      if (!jauge || !labels[jauge]) continue;

      let coutValue = Math.abs(e.valeur || 0);
      
      // On ne vérifie que les coûts fixes pour l'instant (les dés sont imprévisibles)
      if (!e.des_nb && !e.des_stat_id) {
        const actuel = personnage[jauge] ?? 0;
        if (actuel < coutValue) {
          afficherToast(`❌ Pas assez de ${labels[jauge]} pour utiliser ${comp.nom} ! (${actuel}/${coutValue})`);
          return;
        }
      }
    }

    const diceResults: any[] = [];

    for (const e of effets) {
      let finalValue = e.valeur || 0
      const isCout = e.valeur < 0 || e.est_cout === true;
      
      // LOGIQUE DE DÉS
      if (e.des_nb || e.des_stat_id || e.cible_jauge === 'dice') {
        let rollRes;
        let statNom = '';
        if (e.des_stat_id) {
          try {
            const { data: statsPerso } = await supabase.from('personnage_stats').select('valeur, stats(nom)').eq('id_personnage', personnage.id).eq('id_stat', e.des_stat_id).single()
            statNom = statsPerso?.stats?.nom || 'Stat';
            rollRes = rollStatDice(statsPerso?.valeur || 10, e.valeur, statNom)
          } catch (err) {
            rollRes = rollDice(1, 20, e.valeur)
          }
        } else {
          rollRes = rollDice(e.des_nb || 1, e.des_faces || 6, e.valeur)
        }
        
        finalValue = rollRes.total
        
        // Construction du label
        const isGeneric = e.est_jet_de === true;
        const typeLabel = isCout ? 'Coût' : 'Effet';
        const jaugeLabel = labels[e.cible_jauge] || '';
        
        let labelFinal = '';
        if (isGeneric) {
          labelFinal = statNom ? `Roll ${statNom}` : `Lancer de dés`;
        } else {
          labelFinal = statNom ? `${typeLabel} ${jaugeLabel} (Dé ${statNom})` : `${typeLabel} ${jaugeLabel}`;
        }
        
        diceResults.push({ 
          ...rollRes, 
          label: labelFinal, 
          color: colors[e.cible_jauge] || '#a855f7',
          bonus: 0
        });
      }

      // S'assurer que les coûts sont soustraits
      if (isCout) {
        finalValue = -Math.abs(finalValue);
      }

      // Si c'est un jet de dé pur (est_jet_de), on ne modifie PAS les jauges du personnage
      if (e.est_jet_de) continue;

      if (e.cible_jauge === 'dice') continue;

      const jauge = e.cible_jauge.toLowerCase();
      if (labels[jauge]) {
        const actuel = updates[jauge] ?? personnage[jauge]
        const max = personnage[`${jauge}_max`] || 100
        updates[jauge] = Math.max(0, Math.min(max, actuel + finalValue))
      }
    }

    if (diceResults.length > 0) {
      setDiceResult(null); // On reset avant de mettre le nouveau pour forcer le refresh
      setTimeout(() => setDiceResult(diceResults), 10);
    }

    if (Object.keys(updates).length > 0) {
      await mettreAJourLocalement(updates)
      if (pnjControle && personnage.id === pnjControle.id) {
        setPnjControle({ ...pnjControle, ...updates })
      }
      
      // Persister en BDD
      await supabase.from('personnages').update(updates).eq('id', personnage.id)
    }

    afficherToast(`Utilisation de ${comp.nom}`)
  }, [personnage, mettreAJourLocalement, pnjControle, setPnjControle, setDiceResult])

  return { toasts, utiliserCompetence }
}
