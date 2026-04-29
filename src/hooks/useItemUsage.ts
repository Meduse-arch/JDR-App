import { useCallback } from 'react'
import { useStore } from '../store/useStore'
import { rollDice, rollStatDice } from '../utils/rollDice'
import { useToast } from './useToast'
import { logService } from '../services/logService'

import { StatValeur } from '../services/statsService'

export function useItemUsage(
  personnage: any, 
  mettreAJourLocalement: (updates: any) => Promise<void>,
  consommerItemOptimiste: (id: string, q: number) => Promise<void>,
  statsCalculees?: StatValeur[]
) {
  const { toasts, afficherToast } = useToast()
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)
  const setDiceResult = useStore(s => s.setDiceResult)
  const sessionActive = useStore(s => s.sessionActive)
  const roleEffectif = useStore(s => s.roleEffectif)

  const utiliserItem = useCallback(async (entry: any) => {
    if (!personnage) return

    const { items } = entry
    const effets = items.effets_actifs || []
    
    // 1. Calculer les bonus immédiats
    const updates: any = {}
    
    // Couleurs par jauge
    const colors: Record<string, string> = { hp: '#ef4444', mana: '#3b82f6', stam: '#eab308', hp_max: '#dc2626', mana_max: '#2563eb', stam_max: '#ca8a04' }
    const labels: Record<string, string> = { hp: 'Soin / Dégâts PV', mana: 'Restauration Mana', stam: 'Restauration Stamina', hp_max: 'PV Max', mana_max: 'Mana Max', stam_max: 'Stamina Max' }

    const diceResults: any[] = [];

    for (const e of effets) {
      let finalValue = e.valeur || 0
      
      // ADAPTATION Supabase→SQLite : INTEGER (0/1) -> Boolean
      const isCout = e.valeur < 0 || e.est_cout === 1 || e.est_cout === true;
      const isJetDe = e.est_jet_de === 1 || e.est_jet_de === true;
      
      // LOGIQUE DE DÉS
      if (e.des_nb || e.des_stat_id) {
        let rollRes;
        let statNom = 'Stat';
        let valeurStat = 10;
        
        if (e.des_stat_id) {
          // ADAPTATION Supabase→SQLite : Normalisation String sur ID
          const sid = String(e.des_stat_id);
          const statTrouvee = statsCalculees?.find(s => String(s.id) === sid);
          
          if (statTrouvee) {
            valeurStat = statTrouvee.valeur;
            statNom = statTrouvee.nom;
          } else {
            // Dé sur stat (lecture directe si non calculé)
            try {
              const db = (window as any).db;
              if (db) {
                const resPStats = await db.personnage_stats.getAll();
                const pStat = resPStats.success ? resPStats.data.find((s: any) => String(s.id_personnage) === String(personnage.id) && String(s.id_stat) === sid) : null;
                const resStats = await db.stats.getAll();
                const statObj = resStats.success ? resStats.data.find((s: any) => String(s.id) === sid) : null;
                
                statNom = statObj?.nom || 'Stat';
                valeurStat = pStat?.valeur || 10;
              }
            } catch (err) {
              valeurStat = 10;
              statNom = 'Stat';
            }
          }
          rollRes = rollStatDice(valeurStat, e.valeur, statNom)
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

      // ADAPTATION Supabase→SQLite : INTEGER (0/1) -> Boolean
      if (isJetDe) continue;

      if (e.cible_jauge === 'hp') {
        updates.hp = Math.max(0, Math.min(personnage.hp_max, (updates.hp ?? personnage.hp) + finalValue))
      }
      if (e.cible_jauge === 'mana') {
        updates.mana = Math.max(0, Math.min(personnage.mana_max, (updates.mana ?? personnage.mana) + finalValue))
      }
      if (e.cible_jauge === 'stam') {
        updates.stam = Math.max(0, Math.min(personnage.stam_max, (updates.stam ?? personnage.stam) + finalValue))
      }
      if (e.cible_jauge === 'hp_max') {
        updates.hp_max = Math.max(0, (updates.hp_max ?? personnage.hp_max) + finalValue)
      }
      if (e.cible_jauge === 'mana_max') {
        updates.mana_max = Math.max(0, (updates.mana_max ?? personnage.mana_max) + finalValue)
      }
      if (e.cible_jauge === 'stam_max') {
        updates.stam_max = Math.max(0, (updates.stam_max ?? personnage.stam_max) + finalValue)
      }
    }

    if (diceResults.length > 0) {
      setDiceResult(diceResults);
    }

    // 2. Appliquer les changements (si soin par exemple)
    if (Object.keys(updates).length > 0) {
      await mettreAJourLocalement(updates)
    }

    // 3. Consommer l'item (on diminue la quantité de 1)
    await consommerItemOptimiste(entry.id, 1)

    if (roleEffectif === 'joueur' && sessionActive && !pnjControle) {
      await logService.logAction({
        id_session: sessionActive.id,
        id_personnage: personnage.id,
        nom_personnage: personnage.nom,
        type: 'item',
        action: `Utilise ${items.nom}`,
        details: diceResults.length > 0 ? {
          des: diceResults.map(d => ({ label: d.label, total: d.total })),
          resultat: diceResults
        } : undefined
      }).catch(console.error)
    }
    
    afficherToast(`Utilisation de ${items.nom}`)
  }, [personnage, mettreAJourLocalement, consommerItemOptimiste, pnjControle, setPnjControle, setDiceResult, afficherToast, statsCalculees, roleEffectif, sessionActive])

  return { toasts, utiliserItem }
}
