import { useCallback } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'
import { rollDice, rollStatDice } from '../utils/rollDice'
import { Competence } from '../types'
import { verifierCoutsFixes } from '../utils/competenceUtils'
import { useToast } from './useToast'
import { logService } from '../services/logService'

import { statsService, StatValeur } from '../services/statsService'

export function useCompetenceUsage(
  personnage: any,
  mettreAJourLocalement: (updates: any) => Promise<void>,
  statsCalculees?: StatValeur[]
) {
  const { toasts, afficherToast } = useToast()
  const pnjControle = useStore(s => s.pnjControle)
  const setDiceResult = useStore(s => s.setDiceResult)
  const setBuffRoll = useStore(s => s.setBuffRoll)
  const sessionActive = useStore(s => s.sessionActive)
  const roleEffectif = useStore(s => s.roleEffectif)

  const utiliserCompetence = useCallback(async (comp: Competence) => {
    if (!personnage) return

    const effets = comp.effets_actifs || []
    if (effets.length === 0) {
      afficherToast(`La compétence ${comp.nom} n'a pas d'effets définis.`)
      return
    }

    const globalUpdates: any = {}
    const colors: Record<string, string> = { hp: '#ef4444', mana: '#3b82f6', stam: '#eab308', hp_max: '#dc2626', mana_max: '#2563eb', stam_max: '#ca8a04' }
    const labels: Record<string, string> = { hp: 'PV', mana: 'Mana', stam: 'Stamina', hp_max: 'PV Max', mana_max: 'Mana Max', stam_max: 'Stamina Max' }

    // 1. Vérifier les coûts fixes
    const erreurCout = verifierCoutsFixes(effets, personnage, labels, comp.nom);
    if (erreurCout) {
      afficherToast(erreurCout);
      return;
    }

    // 2. Récupérer les tags de la compétence utilisée et les tags actifs (équipement)
    const { data: usedCompTags } = await supabase.from('competence_tags').select('id_tag').eq('id_competence', comp.id);
    const compTags = usedCompTags?.map((ct: any) => ct.id_tag) || [];

    // Récupérer les tags de l'équipement pour gérer la déduplication des passifs "les_deux"
    const { data: equipInv } = await supabase.from('inventaire').select('items(item_tags(id_tag))').eq('id_personnage', personnage.id).eq('equipe', true);
    const activeItemTags = new Set<string>();
    equipInv?.forEach((inv: any) => inv.items?.item_tags?.forEach((it: any) => activeItemTags.add(it.id_tag)));

    // 3. Bonus de stats temporaires pour les jets de dés
    let bonusFixesStats: Record<string, number> = {};
    let bonusPctStats: Record<string, number> = {};

    if (compTags.length > 0) {
      const { data: personnageComps } = await supabase.from('personnage_competences').select('id_competence, is_active').eq('id_personnage', personnage.id);
      if (personnageComps && personnageComps.length > 0) {
        const allCompIds = personnageComps.map((pc: any) => pc.id_competence);
        const { data: conditionPassives } = await supabase
          .from('competences')
          .select('id, type, nom, condition_type, modificateurs(*)')
          .in('id', allCompIds)
          .in('type', ['passive_auto', 'passive_toggle'])
          .in('condition_type', ['skill', 'les_deux']);

        if (conditionPassives) {
          const uniquePassifs = Array.from(new Map(conditionPassives.map(p => [p.id, p])).values());
          const { data: allCondTags } = await supabase.from('competence_tags').select('id_competence, id_tag').in('id_competence', uniquePassifs.map(p => p.id));
          
          for (const passif of uniquePassifs) {
            if (passif.type === 'passive_toggle') {
              const pcEntry = personnageComps.find((pc: any) => pc.id_competence === passif.id);
              if (!pcEntry || !pcEntry.is_active) continue;
            }
            const passifTagIds = allCondTags?.filter(t => t.id_competence === passif.id).map(t => t.id_tag) || [];
            if (compTags.some(tid => passifTagIds.includes(tid))) {
              // On ajoute si c'est 'skill' OU si c'est 'les_deux' mais pas déjà couvert par un objet
              const alreadyActiveByItem = passif.condition_type === 'les_deux' && passifTagIds.some(tid => activeItemTags.has(tid));
              
              if (passif.condition_type === 'skill' || (passif.condition_type === 'les_deux' && !alreadyActiveByItem)) {
                passif.modificateurs?.forEach((m: any) => {
                  if (m.type_calcul === 'pourcentage') bonusPctStats[m.id_stat] = (bonusPctStats[m.id_stat] || 0) + m.valeur;
                  else bonusFixesStats[m.id_stat] = (bonusFixesStats[m.id_stat] || 0) + m.valeur;
                });
              }
            }
          }
        }
      }
    }

    const diceResults: any[] = [];
    let coutsTotaux: Record<string, number> = { hp: 0, mana: 0, stam: 0 };

    // 4. Appliquer les effets directs
    for (const e of effets) {
      let finalValue = e.valeur || 0
      const isCout = e.valeur < 0 || e.est_cout === true;
      
      if (e.des_nb || e.des_stat_id || e.cible_jauge === 'dice') {
        let rollRes;
        let statNom = '';
        let valeurStat = 10;

        if (e.des_stat_id) {
          const statTrouvee = statsCalculees?.find(s => s.id === e.des_stat_id);
          if (statTrouvee) {
            valeurStat = statTrouvee.valeur;
            statNom = statTrouvee.nom;
          } else {
            const { data: statsPerso } = await supabase.from('personnage_stats').select('valeur, stats(nom)').eq('id_personnage', personnage.id).eq('id_stat', e.des_stat_id).single()
            const statsData: any = statsPerso?.stats;
            statNom = (Array.isArray(statsData) ? statsData[0]?.nom : statsData?.nom) || 'Stat';
            valeurStat = statsPerso?.valeur || 10;
          }
          const finalValeurStat = Math.round((valeurStat + (bonusFixesStats[e.des_stat_id] || 0)) * (1 + (bonusPctStats[e.des_stat_id] || 0) / 100));
          rollRes = rollStatDice(finalValeurStat, e.valeur, statNom);
        } else {
          rollRes = rollDice(e.des_nb || 1, e.des_faces || 6, e.valeur)
        }
        
        finalValue = rollRes.total
        const typeLabel = isCout ? 'Coût' : 'Effet';
        const jaugeLabel = labels[e.cible_jauge] || '';
        const labelFinal = e.est_jet_de ? (statNom ? `Roll ${statNom}` : `Lancer de dés`) : (statNom ? `${typeLabel} ${jaugeLabel} (Dé ${statNom})` : `${typeLabel} ${jaugeLabel}`);
        diceResults.push({ ...rollRes, label: labelFinal, color: colors[e.cible_jauge] || '#a855f7', bonus: 0 });
      }

      if (isCout) {
        finalValue = -Math.abs(finalValue);
        if (e.cible_jauge === 'hp' || e.cible_jauge === 'mana' || e.cible_jauge === 'stam') {
            coutsTotaux[e.cible_jauge] += Math.abs(finalValue);
        }
      }
      if (e.est_jet_de || e.cible_jauge === 'dice') continue;

      const jauge = e.cible_jauge.toLowerCase();
      if (labels[jauge]) {
        const actuel = globalUpdates[jauge] ?? personnage[jauge] ?? 0;
        if (jauge.includes('_max')) globalUpdates[jauge] = Math.max(0, actuel + finalValue);
        else {
          const max = globalUpdates[`${jauge}_max`] ?? personnage[`${jauge}_max`] ?? 100;
          globalUpdates[jauge] = Math.max(0, Math.min(max, actuel + finalValue));
        }
      }
    }

    // 5. Déclencher les réactions (Passifs Auto, Toggle, Skills Actifs)
    if (comp.type !== 'passive_auto' && compTags.length > 0) {
      const { data: personnageComps } = await supabase.from('personnage_competences').select('id_competence, is_active').eq('id_personnage', personnage.id);
      if (personnageComps && personnageComps.length > 0) {
        const allCompIds = personnageComps.map((pc: any) => pc.id_competence);
        const { data: reactiveComps } = await supabase.from('competences').select('*, effets_actifs(*)').in('id', allCompIds).in('condition_type', ['skill', 'les_deux']);
        
        if (reactiveComps) {
          const uniqueReactives = Array.from(new Map(reactiveComps.map(c => [c.id, c])).values());
          const { data: reactTags } = await supabase.from('competence_tags').select('id_competence, id_tag').in('id_competence', uniqueReactives.map(r => r.id));

          for (const react of uniqueReactives) {
            if (react.id === comp.id) continue;
            if (react.type === 'passive_toggle') {
              const pcEntry = personnageComps.find((pc: any) => pc.id_competence === react.id);
              if (!pcEntry || !pcEntry.is_active) continue;
            }
            const reactTagIds = reactTags?.filter(t => t.id_competence === react.id).map(t => t.id_tag) || [];
            if (compTags.some(tid => reactTagIds.includes(tid))) {
              const effetsReact = (react.effets_actifs as any[]) || [];
              let triggered = false;
              for (const er of effetsReact) {
                if (er.est_cout) continue;
                let val = er.valeur || 0;
                if (er.des_nb || er.des_stat_id) {
                  const roll = er.des_stat_id ? rollStatDice(10, er.valeur, 'Stat') : rollDice(er.des_nb || 1, er.des_faces || 6, er.valeur);
                  val = roll.total;
                  diceResults.push({ ...roll, label: `REACTION: ${react.nom}`, color: react.type === 'active' ? '#f59e0b' : (react.type === 'passive_toggle' ? '#6366f1' : '#a855f7') });
                }
                const jauge = er.cible_jauge.toLowerCase();
                if (labels[jauge]) {
                  const actuel = globalUpdates[jauge] ?? personnage[jauge] ?? 0;
                  const max = globalUpdates[`${jauge}_max`] ?? personnage[`${jauge}_max`] ?? 100;
                  globalUpdates[jauge] = Math.max(0, Math.min(max, actuel + val));
                  triggered = true;
                }
              }
              if (triggered) afficherToast(`${react.type === 'active' ? '' : 'REACTION : '}${react.nom} !`);
            }
          }
        }
      }
    }

    if (diceResults.length > 0) {
      setDiceResult(null);
      setTimeout(() => {
        setDiceResult(diceResults);
      }, 10);
    }
    if (Object.keys(globalUpdates).length > 0) await mettreAJourLocalement(globalUpdates);
    
    if (sessionActive && !pnjControle) {
      await logService.logAction({
        id_session: sessionActive.id,
        id_personnage: personnage.id,
        nom_personnage: personnage.nom,
        type: 'competence',
        action: `Utilise ${comp.nom}`,
        details: {
          cout_mana: coutsTotaux.mana,
          cout_stam: coutsTotaux.stam,
          des: diceResults.map(d => ({ label: d.label, total: d.total })),
          resultat: diceResults
        }
      }).catch(console.error);
    }
    
    afficherToast(`Utilisation de ${comp.nom}`)
  }, [personnage, mettreAJourLocalement, setDiceResult, afficherToast, statsCalculees, roleEffectif, sessionActive, pnjControle])


  const toggleCompetence = useCallback(async (liaison: any, rechargerStatsCb?: () => Promise<void>, rechargerCompsCb?: (silencieux?: boolean) => Promise<void>) => {
    try {
      // Priorité à l'ID du store pour être raccordé
      const characterId = pnjControle?.id || personnage?.id;
      
      if (!characterId) {
        afficherToast("Erreur: Aucun personnage actif");
        return;
      }
      const comp = liaison.competence;
      const nouveauStatut = !liaison.is_active;

      const effets = comp.effets_actifs || [];
      const labels: Record<string, string> = { hp: 'PV', mana: 'Mana', stam: 'Stamina', hp_max: 'PV Max', mana_max: 'Mana Max', stam_max: 'Stamina Max' };
      const colors: Record<string, string> = { hp: '#ef4444', mana: '#3b82f6', stam: '#eab308', hp_max: '#dc2626', mana_max: '#2563eb', stam_max: '#ca8a04' };

      const globalUpdates: any = {};
      const diceResults: any[] = [];

      if (nouveauStatut) {
        const erreurCout = verifierCoutsFixes(effets, personnage, labels, comp.nom);
        if (erreurCout) {
          afficherToast(erreurCout);
          return;
        }

        // Bonus temporaires (similaire à utiliserCompetence)
        let bonusFixesStats: Record<string, number> = {};
        let bonusPctStats: Record<string, number> = {};
        const { data: usedCompTags } = await supabase.from('competence_tags').select('id_tag').eq('id_competence', comp.id);
        const compTags = usedCompTags?.map((ct: any) => ct.id_tag) || [];

        // Récupérer les tags de l'équipement
        const { data: equipInv } = await supabase.from('inventaire').select('items(item_tags(id_tag))').eq('id_personnage', characterId).eq('equipe', true);
        const activeItemTags = new Set<string>();
        equipInv?.forEach((inv: any) => inv.items?.item_tags?.forEach((it: any) => activeItemTags.add(it.id_tag)));

        if (compTags.length > 0) {
          const { data: personnageComps } = await supabase.from('personnage_competences').select('id_competence, is_active').eq('id_personnage', characterId);
          if (personnageComps && personnageComps.length > 0) {
            const allCompIds = personnageComps.map((pc: any) => pc.id_competence);
            const { data: conditionPassives } = await supabase.from('competences').select('id, type, nom, condition_type, modificateurs(*)').in('id', allCompIds).in('type', ['passive_auto', 'passive_toggle']).in('condition_type', ['skill', 'les_deux']);
            if (conditionPassives) {
              const uniquePassifs = Array.from(new Map(conditionPassives.map(p => [p.id, p])).values());
              const { data: allCondTags } = await supabase.from('competence_tags').select('id_competence, id_tag').in('id_competence', uniquePassifs.map(p => p.id));
              for (const passif of uniquePassifs) {
                if (passif.id === comp.id) continue;
                if (passif.type === 'passive_toggle') {
                  const pcEntry = personnageComps.find((pc: any) => pc.id_competence === passif.id);
                  if (!pcEntry || !pcEntry.is_active) continue;
                }
                const passifTagIds = allCondTags?.filter(t => t.id_competence === passif.id).map(t => t.id_tag) || [];
                if (compTags.some(tid => passifTagIds.includes(tid))) {
                  const alreadyActiveByItem = passif.condition_type === 'les_deux' && passifTagIds.some(tid => activeItemTags.has(tid));
                  if (passif.condition_type === 'skill' || (passif.condition_type === 'les_deux' && !alreadyActiveByItem)) {
                    passif.modificateurs?.forEach((m: any) => {
                      if (m.type_calcul === 'pourcentage') bonusPctStats[m.id_stat] = (bonusPctStats[m.id_stat] || 0) + m.valeur;
                      else bonusFixesStats[m.id_stat] = (bonusFixesStats[m.id_stat] || 0) + m.valeur;
                    });
                  }
                }
              }
            }
          }
        }

        // 1. Gérer les buffs de stats (dés)
        if (comp.modificateurs) {
          // Ajouter ses propres modificateurs au pool s'ils sont fixes ou % pour ses propres jets de dés
          comp.modificateurs.forEach((m: any) => {
            if (m.type_calcul === 'pourcentage') bonusPctStats[m.id_stat] = (bonusPctStats[m.id_stat] || 0) + m.valeur;
            else if (m.type_calcul === 'fixe') bonusFixesStats[m.id_stat] = (bonusFixesStats[m.id_stat] || 0) + m.valeur;
          });

          for (const m of comp.modificateurs) {
            if (m.type_calcul === 'roll_dice' || m.type_calcul === 'roll_stat') {
              const cacheKey = `${liaison.id}-${m.id}`;
              let rollRes;
              const cibleStat = statsCalculees?.find(s => s.id === m.id_stat);
              const cibleStatName = cibleStat?.nom || 'Stat';

              if (m.type_calcul === 'roll_dice') {
                rollRes = rollDice(m.des_nb || 1, m.des_faces || 6, m.valeur || 0);
              } else {
                const baseStat = statsCalculees?.find(s => s.id === m.des_stat_id);
                const valBase = baseStat?.valeur || 10;
                const fix = bonusFixesStats[m.des_stat_id!] || 0;
                const pct = bonusPctStats[m.des_stat_id!] || 0;
                const finalValeurStat = Math.round((valBase + fix) * (1 + pct / 100));
                rollRes = rollStatDice(finalValeurStat, m.valeur || 0, baseStat?.nom || 'Stat');
              }
              
              // On met à jour le store local immédiatement pour l'UI
              setBuffRoll(cacheKey, rollRes.total);
              // Sauvegarde en base ET on attend pour la cohérence du rechargement
              try {
                await statsService.saveBuffRoll(characterId, cacheKey, rollRes.total);
              } catch (err) {
                console.error("Erreur sauvegarde buff roll:", err);
              }
              
              diceResults.push({ ...rollRes, label: `Buff ${cibleStatName}`, color: '#10b981', bonus: 0 });
            }
          }
        }


        // 2. Gérer les effets de ressources
        for (const e of effets) {
          let finalValue = e.valeur || 0
          const isCout = e.valeur < 0 || e.est_cout === true;
          if (e.des_nb || e.des_stat_id || e.cible_jauge === 'dice') {
            let rollRes;
            let statNom = '';
            if (e.des_stat_id) {
              const statT = statsCalculees?.find(s => s.id === e.des_stat_id);
              const valBase = statT?.valeur || 10;
              statNom = statT?.nom || 'Stat';
              const finalValeurStat = Math.round((valBase + (bonusFixesStats[e.des_stat_id] || 0)) * (1 + (bonusPctStats[e.des_stat_id] || 0) / 100));
              rollRes = rollStatDice(finalValeurStat, e.valeur, statNom);
            } else {
              rollRes = rollDice(e.des_nb || 1, e.des_faces || 6, e.valeur)
            }
            finalValue = rollRes.total;
            const typeL = isCout ? 'Coût' : 'Effet';
            const jaugeL = labels[e.cible_jauge] || '';
            const labelF = e.est_jet_de ? (statNom ? `Roll ${statNom}` : `Lancer de dés`) : (statNom ? `${typeL} ${jaugeL} (Dé ${statNom})` : `${typeL} ${jaugeL}`);
            diceResults.push({ ...rollRes, label: labelF, color: colors[e.cible_jauge] || '#a855f7', bonus: 0 });
          }
          if (isCout) finalValue = -Math.abs(finalValue);
          if (e.est_jet_de || e.cible_jauge === 'dice') continue;
          const j = e.cible_jauge.toLowerCase();
          if (labels[j]) {
            const actuel = globalUpdates[j] ?? personnage[j] ?? 0;
            if (j.includes('_max')) globalUpdates[j] = Math.max(0, actuel + finalValue);
            else {
              const max = globalUpdates[`${j}_max`] ?? personnage[`${j}_max`] ?? 100;
              globalUpdates[j] = Math.max(0, Math.min(max, actuel + finalValue));
            }
          }
        }
      }

      // Mise à jour BDD
      const { error } = await supabase.from('personnage_competences').update({ is_active: nouveauStatut }).eq('id', liaison.id);
      if (error) { afficherToast(`Erreur : ${error.message}`); return; }

      if (rechargerCompsCb) await rechargerCompsCb(true);
      if (rechargerStatsCb) await rechargerStatsCb();

      // Après le toggle, on récupère les nouveaux Max depuis la vue
      const { data: updatedPerso } = await supabase.from('v_personnages').select('hp_max, mana_max, stam_max').eq('id', personnage.id).single();
      if (updatedPerso) {
        const final_hp = Math.max(0, Math.min(updatedPerso.hp_max, globalUpdates.hp ?? personnage.hp));
        const final_mana = Math.max(0, Math.min(updatedPerso.mana_max, globalUpdates.mana ?? personnage.mana));
        const final_stam = Math.max(0, Math.min(updatedPerso.stam_max, globalUpdates.stam ?? personnage.stam));
        globalUpdates.hp = final_hp; globalUpdates.mana = final_mana; globalUpdates.stam = final_stam;
      }

      if (Object.keys(globalUpdates).length > 0) await mettreAJourLocalement(globalUpdates);
      
      if (sessionActive && !pnjControle) {
        const detailsLog: any = {};
        if (nouveauStatut && diceResults.length > 0) {
          detailsLog.des = diceResults.map(d => ({ label: d.label, total: d.total }));
          detailsLog.resultat = diceResults;
          detailsLog.total = diceResults.reduce((acc, curr) => acc + (curr.total || 0), 0);
        }

        await logService.logAction({
          id_session: sessionActive.id,
          id_personnage: personnage.id,
          nom_personnage: personnage.nom,
          type: 'competence',
          action: nouveauStatut ? `Active ${comp.nom}` : `Désactive ${comp.nom}`,
          details: Object.keys(detailsLog).length > 0 ? detailsLog : undefined
        }).catch(console.error);
      }

      if (nouveauStatut) {
        afficherToast(`${comp.nom} activée !`);
        if (diceResults.length > 0) {
          setDiceResult(null);
          setTimeout(() => {
            setDiceResult(diceResults);
          }, 10);
        }
      } else {
        afficherToast(`${comp.nom} désactivée`);
      }
    } catch (err) {
      console.error("Erreur dans toggleCompetence:", err);
      afficherToast("Une erreur critique est survenue lors du toggle");
    }
  }, [personnage, afficherToast, mettreAJourLocalement, setDiceResult, setBuffRoll, statsCalculees, roleEffectif, sessionActive, pnjControle]);

  return { toasts, utiliserCompetence, toggleCompetence }
}
