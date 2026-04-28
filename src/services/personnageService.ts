import { peerService } from './peerService'

const db = (window as any).db;

// Stockage global des timers pour le debouncing
const debounceTimers: Record<string, NodeJS.Timeout> = {};

const executerDebounced = (key: string, action: () => Promise<void>, delay = 300) => {
  if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(() => {
    action();
    delete debounceTimers[key];
  }, delay);
};

export const personnageService = {
  updatePVHybride: (_sessionId: string, idPersonnage: string, nouvelleValeur: number, max: number) => {
    const pvSecurises = Math.max(0, Math.min(max, nouvelleValeur));
    
    // MIGRATION WebRTC
    if (peerService.isHost) {
      // Côté MJ : broadcast à tout le monde et écriture SQLite
      peerService.broadcastToAll({
        type: 'STATE_UPDATE',
        entity: 'personnage',
        payload: { id_personnage: idPersonnage, type: 'hp', valeur: pvSecurises }
      });
      executerDebounced(`pv-${idPersonnage}`, async () => {
        await db.personnages.update(idPersonnage, { hp: pvSecurises });
      });
    } else {
      // Côté Joueur : envoyer une intention d'action
      peerService.sendToMJ({
        type: 'ACTION',
        kind: 'update_resource',
        payload: { id_personnage: idPersonnage, type: 'hp', valeur: pvSecurises }
      });
    }
  },

  updateManaHybride: (_sessionId: string, idPersonnage: string, nouvelleValeur: number, max: number) => {
    const manaSecurise = Math.max(0, Math.min(max, nouvelleValeur));
    
    // MIGRATION WebRTC
    if (peerService.isHost) {
      peerService.broadcastToAll({
        type: 'STATE_UPDATE',
        entity: 'personnage',
        payload: { id_personnage: idPersonnage, type: 'mana', valeur: manaSecurise }
      });
      executerDebounced(`mana-${idPersonnage}`, async () => {
        await db.personnages.update(idPersonnage, { mana: manaSecurise });
      });
    } else {
      peerService.sendToMJ({
        type: 'ACTION',
        kind: 'update_resource',
        payload: { id_personnage: idPersonnage, type: 'mana', valeur: manaSecurise }
      });
    }
  },

  updateStaminaHybride: (_sessionId: string, idPersonnage: string, nouvelleValeur: number, max: number) => {
    const stamSecurise = Math.max(0, Math.min(max, nouvelleValeur));
    
    // MIGRATION WebRTC
    if (peerService.isHost) {
      peerService.broadcastToAll({
        type: 'STATE_UPDATE',
        entity: 'personnage',
        payload: { id_personnage: idPersonnage, type: 'stam', valeur: stamSecurise }
      });
      executerDebounced(`stam-${idPersonnage}`, async () => {
        await db.personnages.update(idPersonnage, { stam: stamSecurise });
      });
    } else {
      peerService.sendToMJ({
        type: 'ACTION',
        kind: 'update_resource',
        payload: { id_personnage: idPersonnage, type: 'stam', valeur: stamSecurise }
      });
    }
  },

  updatePV: async (idPersonnage: string, nouvelleValeur: number, max: number) => {
    const pvSecurises = Math.max(0, Math.min(max, nouvelleValeur));
    const res = await db.personnages.update(idPersonnage, { hp: pvSecurises });
    return res.success;
  },

  updateMana: async (idPersonnage: string, nouvelleValeur: number, max: number) => {
    const manaSecurise = Math.max(0, Math.min(max, nouvelleValeur));
    const res = await db.personnages.update(idPersonnage, { mana: manaSecurise });
    return res.success;
  },

  updateStamina: async (idPersonnage: string, nouvelleValeur: number, max: number) => {
    const stamSecurise = Math.max(0, Math.min(max, nouvelleValeur));
    const res = await db.personnages.update(idPersonnage, { stam: stamSecurise });
    return res.success;
  },

  updatePersonnage: async (idPersonnage: string, updates: Partial<any>) => {
    const res = await db.personnages.update(idPersonnage, updates);
    return res.success;
  },

  /**
   * Hydrate une liste de personnages avec leurs stats calculées en minimisant les appels BDD
   */
  hydraterPersonnages: async (personnages: any[]) => {
    if (!personnages || personnages.length === 0) return [];
    if (!peerService.isHost) return personnages; // Les joueurs ne peuvent pas hydrater via BDD
    
    try {
      const resStats = await db.personnage_stats.getAll();
      const resStatsRef = await db.stats.getAll();
      if (!resStats.success || !resStatsRef.success) return personnages;

      const allPStats = resStats.data;
      const allRefs = resStatsRef.data;

      return personnages.map(p => {
        const perso = { ...p };
        const pStats = allPStats.filter((s: any) => s.id_personnage === p.id);
        
        // Inclure les stats brutes pour que le joueur puisse les voir
        perso.stats = pStats;

        const getStatVal = (nom: string) => {
          const sRef = allRefs.find((st: any) => st.nom === nom);
          if (!sRef) return 0;
          const ps = pStats.find((s: any) => s.id_stat === sRef.id);
          return ps ? ps.valeur : 0;
        };

        const con = getStatVal('Constitution');
        const int = getStatVal('Intelligence');
        const sag = getStatVal('Sagesse');
        const for_ = getStatVal('Force');
        const agi = getStatVal('Agilité');

        const hpBase = con > 0 ? con * 4 : (perso.hp || 10);
        const manaBase = (int > 0 || sag > 0) ? Math.round(((int + sag) / 2) * 10) : (perso.mana || 10);
        const stamBase = (for_ > 0 || agi > 0 || con > 0) ? Math.round(((for_ + agi + con) / 3) * 10) : (perso.stam || 10);

        perso.hp_max = getStatVal('PV Max') || getStatVal('HP Max') || hpBase;
        perso.mana_max = getStatVal('Mana Max') || manaBase;
        perso.stam_max = getStatVal('Stamina Max') || stamBase;

        return perso;
      });
    } catch (e) {
      console.error("Erreur hydratation masse:", e);
      return personnages;
    }
  },

  recalculerStats: async (idPersonnage: string) => {
    if (!peerService.isHost) return null; // Uniquement le MJ peut recalculer via BDD
    try {
      const resPerso = await db.personnages.getById(idPersonnage);
      if (!resPerso.success || !resPerso.data) return null;
      
      // 1. Hydrater les ressources max de base (HP, Mana, Stam)
      const hydrated = await personnageService.hydraterPersonnages([resPerso.data]);
      const perso = hydrated[0];

      // 2. Calculer les statistiques complexes (Force, Agilité, etc.) avec bonus
      const buffRolls = await statsService.getBuffRolls(idPersonnage);
      const fullStats = await statsService.calculateAllStats(idPersonnage, buffRolls, async (k, v) => {
        await statsService.saveBuffRoll(idPersonnage, k, v);
      });

      // Injecter les stats calculées dans l'objet perso pour le joueur
      perso.stats = fullStats.map(s => ({
        id_stat: s.id,
        valeur: s.valeur,
        base: s.base,
        bonus: s.bonus
      }));

      const updates: any = {};
      if (perso.hp > perso.hp_max) updates.hp = perso.hp_max;
      if (perso.mana > perso.mana_max) updates.mana = perso.mana_max;
      if (perso.stam > perso.stam_max) updates.stam = perso.stam_max;

      if (Object.keys(updates).length > 0) {
        await db.personnages.update(idPersonnage, updates);
        const finalPerso = { ...perso, ...updates };
        
        // On informe les joueurs du nouveau statut
        peerService.broadcastToAll({
          type: 'STATE_UPDATE',
          entity: 'personnage',
          payload: { id_personnage: idPersonnage, type: 'full', valeur: finalPerso }
        });

        return finalPerso;
      }
      
      // Toujours informer les joueurs du statut complet pour synchro stats
      peerService.broadcastToAll({
        type: 'STATE_UPDATE',
        entity: 'personnage',
        payload: { id_personnage: idPersonnage, type: 'full', valeur: perso }
      });

      return perso;
    } catch (error) {
      console.error("Exception dans recalculerStats:", error)
      return null
    }
  },

  updateBaseStat: async (idPersonnage: string, idStat: string, delta: number) => {
    const resStats = await db.personnage_stats.getAll();
    if (!resStats.success) return false;
    const data = resStats.data.find((s: any) => s.id_personnage === idPersonnage && s.id_stat === idStat);
    if (!data) return false;

    const updateRes = await db.personnage_stats.update(data.id, { valeur: data.valeur + delta });
    if (!updateRes.success) return false;

    await personnageService.recalculerStats(idPersonnage);
    return true;
  },

  deletePersonnage: async (idPersonnage: string) => {
    await db.session_joueurs.deleteByFields({ id_personnage: idPersonnage }).catch(() => {});
    
    const resPStats = await db.personnage_stats.getAll();
    if (resPStats.success) {
       for (const s of resPStats.data.filter((x: any) => x.id_personnage === idPersonnage)) await db.personnage_stats.delete(s.id);
    }
    
    const resInv = await db.inventaire.getAll();
    if (resInv.success) {
       for (const i of resInv.data.filter((x: any) => x.id_personnage === idPersonnage)) await db.inventaire.delete(i.id);
    }
    
    const resPComp = await db.personnage_competences.getAll();
    if (resPComp.success) {
       for (const c of resPComp.data.filter((x: any) => x.id_personnage === idPersonnage)) await db.personnage_competences.delete(c.id);
    }
    
    await db.personnage_quetes.deleteByFields({ id_personnage: idPersonnage }).catch(() => {});
    
    const resMapTok = await db.map_tokens.getAll();
    if (resMapTok.success) {
       for (const t of resMapTok.data.filter((x: any) => x.id_personnage === idPersonnage)) await db.map_tokens.delete(t.id);
    }

    const res = await db.personnages.delete(idPersonnage);
    return res.success;
  }
}
