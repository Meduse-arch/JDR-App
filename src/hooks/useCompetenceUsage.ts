import { useCallback } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'
import { rollDice, rollStatDice } from '../utils/rollDice'
import { Competence } from '../types'
import { verifierCoutsFixes } from '../utils/competenceUtils'
import { useToast } from './useToast'

export function useCompetenceUsage(
  personnage: any,
  mettreAJourLocalement: (updates: any) => Promise<void>
) {
  const { toasts, afficherToast } = useToast()
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)
  const setDiceResult = useStore(s => s.setDiceResult)

  const utiliserCompetence = useCallback(async (comp: Competence) => {
    if (!personnage) return

    const effets = comp.effets_actifs || []
    
    if (effets.length === 0) {
      afficherToast(`La compétence ${comp.nom} n'a pas d'effets définis.`)
      return
    }

    const updates: any = {}
    
    const colors: Record<string, string> = { hp: '#ef4444', mana: '#3b82f6', stam: '#eab308', hp_max: '#dc2626', mana_max: '#2563eb', stam_max: '#ca8a04' }
    const labels: Record<string, string> = { hp: 'PV', mana: 'Mana', stam: 'Stamina', hp_max: 'PV Max', mana_max: 'Mana Max', stam_max: 'Stamina Max' }

    // 1. Vérifier si le personnage peut payer les coûts fixes
    const erreurCout = verifierCoutsFixes(effets, personnage, labels, comp.nom);
    if (erreurCout) {
      afficherToast(erreurCout);
      return;
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
            const statsData: any = statsPerso?.stats;
            statNom = (Array.isArray(statsData) ? statsData[0]?.nom : statsData?.nom) || 'Stat';
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
        const actuel = updates[jauge] ?? personnage[jauge] ?? 0;
        if (jauge.includes('_max')) {
          updates[jauge] = Math.max(0, actuel + finalValue);
        } else {
          const max = personnage[`${jauge}_max`] || 100;
          updates[jauge] = Math.max(0, Math.min(max, actuel + finalValue));
        }
      }
    }

    if (diceResults.length > 0) {
      setDiceResult(null); // On reset avant de mettre le nouveau pour forcer le refresh
      setTimeout(() => setDiceResult(diceResults), 10);
    }

    if (Object.keys(updates).length > 0) {
      await mettreAJourLocalement(updates)
    }

    afficherToast(`Utilisation de ${comp.nom}`)
  }, [personnage, mettreAJourLocalement, pnjControle, setPnjControle, setDiceResult, afficherToast])

  const toggleCompetence = useCallback(async (liaison: any, rechargerStatsCb?: () => Promise<void>) => {
    if (!personnage) return;
    const comp = liaison.competence;
    const nouveauStatut = !liaison.is_active;

    const effets = comp.effets_actifs || [];
    const labels: Record<string, string> = { hp: 'PV', mana: 'Mana', stam: 'Stamina' };
    const colors: Record<string, string> = { hp: '#ef4444', mana: '#3b82f6', stam: '#eab308' };

    let updatesActifs: any = {};
    const diceResults: any[] = [];

    // Si on active, on vérifie d'abord les coûts et on calcule les effets actifs
    if (nouveauStatut) {
      const erreurCout = verifierCoutsFixes(effets, personnage, labels, comp.nom);
      if (erreurCout) {
        afficherToast(erreurCout);
        return; // Annuler l'activation si pas assez de ressources
      }

      for (const e of effets) {
        let finalValue = e.valeur || 0
        const isCout = e.valeur < 0 || e.est_cout === true;
        
        if (e.des_nb || e.des_stat_id || e.cible_jauge === 'dice') {
          let rollRes;
          let statNom = '';
          if (e.des_stat_id) {
            try {
              const { data: statsPerso } = await supabase.from('personnage_stats').select('valeur, stats(nom)').eq('id_personnage', personnage.id).eq('id_stat', e.des_stat_id).single()
              const statsData: any = statsPerso?.stats;
              statNom = (Array.isArray(statsData) ? statsData[0]?.nom : statsData?.nom) || 'Stat';
              rollRes = rollStatDice(statsPerso?.valeur || 10, e.valeur, statNom)
            } catch (err) {
              rollRes = rollDice(1, 20, e.valeur)
            }
          } else {
            rollRes = rollDice(e.des_nb || 1, e.des_faces || 6, e.valeur)
          }
          
          finalValue = rollRes.total
          
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

        if (isCout) {
          finalValue = -Math.abs(finalValue);
        }

        if (e.est_jet_de) continue;
        if (e.cible_jauge === 'dice') continue;

        const jauge = e.cible_jauge.toLowerCase();
        if (labels[jauge]) {
          const actuel = updatesActifs[jauge] ?? personnage[jauge] ?? 0;
          if (jauge.includes('_max')) {
            updatesActifs[jauge] = Math.max(0, actuel + finalValue);
          } else {
            const max = personnage[`${jauge}_max`] || 100;
            updatesActifs[jauge] = Math.max(0, Math.min(max, actuel + finalValue));
          }
        }
      }
    }

    // 1. Mettre à jour l'état dans personnage_competences
    const { error } = await supabase
      .from('personnage_competences')
      .update({ is_active: nouveauStatut })
      .eq('id', liaison.id);

    if (error) {
      afficherToast(`❌ Erreur lors du toggle : ${error.message}`);
      return;
    }

    if (nouveauStatut) {
      // Appliquer les modificateurs dans la table modificateurs
      if (comp.modificateurs && comp.modificateurs.length > 0) {
        const modifsToInsert = comp.modificateurs.map((m: any) => ({
          id_personnage: personnage.id,
          id_competence: comp.id,
          id_stat: m.id_stat,
          valeur: m.valeur,
          type_calcul: m.type_calcul,
          des_stat_id: m.des_stat_id,
          des_nb: m.des_nb,
          des_faces: m.des_faces
        }));
        await supabase.from('modificateurs').insert(modifsToInsert);
      }
      afficherToast(`🟢 ${comp.nom} activée !`);
      
      if (diceResults.length > 0) {
        setDiceResult(null);
        setTimeout(() => setDiceResult(diceResults), 10);
      }
    } else {
      // Supprimer les modificateurs associés à cette compétence et ce personnage
      await supabase
        .from('modificateurs')
        .delete()
        .eq('id_competence', comp.id)
        .eq('id_personnage', personnage.id);

      afficherToast(`⚫ ${comp.nom} désactivée`);
    }

    // Après toggle, on récupère les nouveaux max depuis v_personnages
    const { data: updatedPerso } = await supabase
      .from('v_personnages')
      .select('hp_max, mana_max, stam_max')
      .eq('id', personnage.id)
      .single();

    if (updatedPerso) {
      // Clamper les jauges actuelles en prenant en compte les effets actifs
      const base_hp = updatesActifs.hp !== undefined ? updatesActifs.hp : (personnage.hp || 0);
      const base_mana = updatesActifs.mana !== undefined ? updatesActifs.mana : (personnage.mana || 0);
      const base_stam = updatesActifs.stam !== undefined ? updatesActifs.stam : (personnage.stam || 0);

      const final_hp = Math.max(0, Math.min(updatedPerso.hp_max, base_hp));
      const final_mana = Math.max(0, Math.min(updatedPerso.mana_max, base_mana));
      const final_stam = Math.max(0, Math.min(updatedPerso.stam_max, base_stam));

      const fullUpdates = {
        hp: final_hp,
        mana: final_mana,
        stam: final_stam
      };
      
      await mettreAJourLocalement(fullUpdates);
    }

    if (rechargerStatsCb) await rechargerStatsCb();

  }, [personnage, afficherToast, mettreAJourLocalement, setDiceResult]);

  return { toasts, utiliserCompetence, toggleCompetence }
}
