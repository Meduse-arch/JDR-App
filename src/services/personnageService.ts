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

  recalculerStats: async (idPersonnage: string) => {
    try {
      const resPerso = await db.personnages.getById(idPersonnage);
      if (!resPerso.success || !resPerso.data) return null;
      const perso = { ...resPerso.data };

      // Récupérer toutes les stats du personnage
      const resStats = await db.personnage_stats.getAll();
      const resStatsRef = await db.stats.getAll();
      if (!resStats.success || !resStatsRef.success) return perso;

      const pStats = resStats.data.filter((s: any) => s.id_personnage === idPersonnage);
      const getStatVal = (nom: string) => {
        const sRef = resStatsRef.data.find((st: any) => st.nom === nom);
        if (!sRef) return 0;
        const ps = pStats.find((s: any) => s.id_stat === sRef.id);
        return ps ? ps.valeur : 0;
      };

      // Calcul des max théoriques (base)
      const con = getStatVal('Constitution');
      const int = getStatVal('Intelligence');
      const sag = getStatVal('Sagesse');
      const for_ = getStatVal('Force');
      const agi = getStatVal('Agilité');

      // Si les stats de base sont à 0, on garde les valeurs actuelles du perso ou 10 par défaut
      const hpBase = con > 0 ? con * 4 : (perso.hp || 10);
      const manaBase = (int > 0 || sag > 0) ? Math.round(((int + sag) / 2) * 10) : (perso.mana || 10);
      const stamBase = (for_ > 0 || agi > 0 || con > 0) ? Math.round(((for_ + agi + con) / 3) * 10) : (perso.stam || 10);

      // Chercher si des valeurs max sont explicitement stockées
      const hpMaxStat = getStatVal('PV Max') || getStatVal('HP Max') || hpBase;
      const manaMaxStat = getStatVal('Mana Max') || manaBase;
      const stamMaxStat = getStatVal('Stamina Max') || stamBase;

      perso.hp_max = hpMaxStat;
      perso.mana_max = manaMaxStat;
      perso.stam_max = stamMaxStat;

      const updates: any = {};
      if (perso.hp > perso.hp_max) updates.hp = perso.hp_max;
      if (perso.mana > perso.mana_max) updates.mana = perso.mana_max;
      if (perso.stam > perso.stam_max) updates.stam = perso.stam_max;

      if (Object.keys(updates).length > 0) {
        await db.personnages.update(idPersonnage, updates);
        return { ...perso, ...updates };
      }
      
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
