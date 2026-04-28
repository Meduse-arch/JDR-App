import { InventaireEntry } from '../types'
import { peerService } from './peerService'
import { useStore } from '../store/useStore'

const db = (window as any).db;

export const inventaireService = {
  /**
   * Récupère l'inventaire complet d'un personnage
   */
  getInventaire: async (personnageId: string): Promise<InventaireEntry[]> => {
    if (!peerService.isHost) {
      // LOGIQUE JOUEUR : via personnage hydraté
      const { personnageJoueur, pnjControle } = useStore.getState();
      const p = pnjControle || personnageJoueur;
      if (p && p.id === personnageId && p.inventaire) {
        return p.inventaire as InventaireEntry[];
      }
      return [];
    }

    // LOGIQUE MJ : SQLite
    const resInv = await db.inventaire.getAll();
    if (!resInv.success) return [];
    const inv = resInv.data.filter((i: any) => i.id_personnage === personnageId);

    const resItems = await db.items.getAll();
    const resModifs = await db.modificateurs.getAll();
    const resStats = await db.stats.getAll();
    const resEffets = await db.effets_actifs.getAll();
    const resItemTags = await db.item_tags.getAll();
    const resTags = await db.tags.getAll();

    return inv.map((entry: any) => {
      const item = resItems.data?.find((it: any) => it.id === entry.id_item) || {};
      const modifs = resModifs.data?.filter((m: any) => m.id_item === item.id).map((m: any) => ({
        ...m,
        stats: resStats.data?.find((s: any) => s.id === m.id_stat)
      })) || [];
      const effets = resEffets.data?.filter((e: any) => e.id_item === item.id) || [];
      const itemTags = resItemTags.data?.filter((it: any) => it.id_item === item.id).map((it: any) => 
        resTags.data?.find((t: any) => t.id === it.id_tag)
      ).filter(Boolean) || [];

      return {
        ...entry,
        equipe: entry.equipe === 1,
        items: { ...item, modificateurs: modifs, effets_actifs: effets, tags: itemTags }
      };
    }) as unknown as InventaireEntry[];
  },

  /**
   * Ajoute ou incrémente un item dans l'inventaire
   */
  ajouterItem: async (personnageId: string, itemId: string, quantite: number = 1) => {
    if (peerService.isHost) {
      const resInv = await db.inventaire.getAll();
      if (!resInv.success) return false;
      const existing = resInv.data.find((i: any) => i.id_personnage === personnageId && i.id_item === itemId);

      if (existing) {
        const res = await db.inventaire.update(existing.id, { quantite: existing.quantite + quantite });
        return res.success;
      } else {
        const res = await db.inventaire.create({
          id: crypto.randomUUID(), id_personnage: personnageId, id_item: itemId, quantite, equipe: 0
        });
        return res.success;
      }
    } else {
      // Joueur envoie ACTION
      peerService.sendToMJ({ type: 'ACTION', kind: 'add_item', payload: { personnageId, itemId, quantite } });
      return true;
    }
  },

  /**
   * Change l'état d'équipement d'un objet
   */
  toggleEquipement: async (entryId: string, equipe: boolean) => {
    if (peerService.isHost) {
      const res = await db.inventaire.update(entryId, { equipe: equipe ? 1 : 0 });
      return res.success;
    } else {
      peerService.sendToMJ({ type: 'ACTION', kind: 'toggle_equip', payload: { entryId, equipe } });
      return true;
    }
  },

  /**
   * Retire une quantité d'un objet
   */
  retirerItem: async (entryId: string, quantiteARetirer: number = 1) => {
    if (peerService.isHost) {
      const res = await db.inventaire.getById(entryId);
      if (!res.success || !res.data) return false;
      const nouvelleQuantite = res.data.quantite - quantiteARetirer;
      if (nouvelleQuantite <= 0) {
        return (await db.inventaire.delete(entryId)).success;
      } else {
        return (await db.inventaire.update(entryId, { quantite: nouvelleQuantite })).success;
      }
    } else {
      peerService.sendToMJ({ type: 'ACTION', kind: 'remove_item', payload: { entryId, quantite: quantiteARetirer } });
      return true;
    }
  }
}