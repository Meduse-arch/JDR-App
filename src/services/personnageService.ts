import { peerService } from './peerService'
import { useStore } from '../store/useStore'

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
      if (!resPerso.success || !resPerso.data) return false;
      const perso = resPerso.data;

      const store = useStore.getState();
      const personnageStore = store.personnageJoueur?.id === idPersonnage 
        ? store.personnageJoueur 
        : store.pnjControle?.id === idPersonnage 
          ? store.pnjControle 
          : null;

      const hpMax = perso.hp_max ?? personnageStore?.hp_max ?? perso.hp;
      const manaMax = perso.mana_max ?? personnageStore?.mana_max ?? perso.mana;
      const stamMax = perso.stam_max ?? personnageStore?.stam_max ?? perso.stam;

      const updates = {
        hp: Math.min(perso.hp, hpMax),
        mana: Math.min(perso.mana, manaMax),
        stam: Math.min(perso.stam, stamMax)
      };

      if (updates.hp !== perso.hp || updates.mana !== perso.mana || updates.stam !== perso.stam) {
        const updateRes = await db.personnages.update(idPersonnage, updates);
        return updateRes.success ? updateRes.data : null;
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
