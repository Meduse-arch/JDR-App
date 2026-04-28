import { InventaireEntry } from '../types'

const db = (window as any).db;

export const inventaireService = {
  /**
   * Récupère l'inventaire complet d'un personnage avec les détails des items
   */
  getInventaire: async (personnageId: string): Promise<InventaireEntry[]> => {
    // MIGRATION: était une jointure SQL complexe
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
        items: {
          ...item,
          modificateurs: modifs,
          effets_actifs: effets,
          tags: itemTags
        }
      };
    }) as unknown as InventaireEntry[];
  },

  /**
   * Ajoute ou incrémente un item dans l'inventaire
   */
  ajouterItem: async (personnageId: string, itemId: string, quantite: number = 1) => {
    const resInv = await db.inventaire.getAll();
    if (!resInv.success) return false;
    const existing = resInv.data.find((i: any) => i.id_personnage === personnageId && i.id_item === itemId);

    if (existing) {
      const res = await db.inventaire.update(existing.id, { quantite: existing.quantite + quantite });
      return res.success;
    } else {
      const res = await db.inventaire.create({
        id: crypto.randomUUID(),
        id_personnage: personnageId,
        id_item: itemId,
        quantite,
        equipe: 0
      });
      return res.success;
    }
  },

  /**
   * Change l'état d'équipement d'un objet
   */
  toggleEquipement: async (entryId: string, equipe: boolean) => {
    const res = await db.inventaire.update(entryId, { equipe: equipe ? 1 : 0 });
    return res.success;
  },

  /**
   * Retire une quantité d'un objet (et supprime la ligne si 0)
   */
  retirerItem: async (entryId: string, quantiteARetirer: number = 1) => {
    const res = await db.inventaire.getById(entryId);
    if (!res.success || !res.data) return false;

    const nouvelleQuantite = res.data.quantite - quantiteARetirer;

    if (nouvelleQuantite <= 0) {
      const delRes = await db.inventaire.delete(entryId);
      return delRes.success;
    } else {
      const upRes = await db.inventaire.update(entryId, { quantite: nouvelleQuantite });
      return upRes.success;
    }
  }
}