import { Item, Modificateur, EffetActif, Stat, CategorieItem } from '../types';
import { tagsService } from './tagsService';
import { peerService } from './peerService';

const db = (window as any).db;

export const itemsService = {
  /**
   * Récupère tous les items d'une session avec leurs modificateurs et effets
   */
  getItems: async (idSession: string): Promise<Item[]> => {
    if (!peerService.isHost) return [];
    
    const resItems = await db.items.getAll();
    if (!resItems.success) return [];
    const items = resItems.data.filter((i: any) => i.id_session === idSession).sort((a: any, b: any) => a.nom.localeCompare(b.nom));

    const resModifs = await db.modificateurs.getAll();
    const resStats = await db.stats.getAll();
    const resTags = await db.tags.getAll();
    const resEffets = await db.effets_actifs.getAll();
    const resItemTags = await db.item_tags.getAll();

    return items.map((item: any) => {
      const modifs = resModifs.data?.filter((m: any) => m.id_item === item.id).map((m: any) => ({
        ...m,
        stats: resStats.data?.find((s: any) => s.id === m.id_stat),
        tags: resTags.data?.find((t: any) => t.id === m.id_tag)
      })) || [];

      const effets = resEffets.data?.filter((e: any) => e.id_item === item.id).map((e: any) => ({
        ...e,
        est_jet_de: e.est_jet_de === 1
      })) || [];
      
      const itemTags = resItemTags.data?.filter((it: any) => it.id_item === item.id).map((it: any) => 
        resTags.data?.find((t: any) => t.id === it.id_tag)
      ).filter(Boolean) || [];

      return {
        ...item,
        modificateurs: modifs,
        effets_actifs: effets,
        tags: itemTags
      };
    });
  },

  /**
   * Met à jour un item existant
   */
  updateItem: async (
    idItem: string,
    itemData: { nom: string; description: string; categorie: CategorieItem; image_url?: string | null },
    modificateurs: Partial<Modificateur>[],
    effetsActifs: Partial<EffetActif>[] = [],
    tagIds: string[] = []
  ): Promise<boolean> => {
    if (!peerService.isHost) return false;
    const resItem = await db.items.update(idItem, itemData);
    if (!resItem.success) return false;

    await tagsService.setTagsForItem(idItem, tagIds);

    const resModifs = await db.modificateurs.getAll();
    if (resModifs.success) {
      const toDelete = resModifs.data.filter((m: any) => m.id_item === idItem);
      for (const m of toDelete) await db.modificateurs.delete(m.id);
    }

    const resEffets = await db.effets_actifs.getAll();
    if (resEffets.success) {
      const toDelete = resEffets.data.filter((e: any) => e.id_item === idItem);
      for (const e of toDelete) await db.effets_actifs.delete(e.id);
    }

    if (modificateurs.length > 0) {
      for (const m of modificateurs) {
        await db.modificateurs.create({
          id: crypto.randomUUID(),
          id_item: idItem,
          id_stat: m.id_stat,
          type_calcul: m.type_calcul || 'fixe',
          valeur: m.valeur || 0,
          id_tag: m.id_tag || null,
          des_stat_id: m.des_stat_id || null,
          des_nb: m.des_nb || null,
          des_faces: m.des_faces || null,
          nom_affiche: m.nom_affiche || null,
          created_at: new Date().toISOString()
        });
      }
    }

    if (effetsActifs.length > 0) {
      for (const e of effetsActifs) {
        await db.effets_actifs.create({
          id: crypto.randomUUID(),
          id_item: idItem,
          cible_jauge: e.cible_jauge,
          valeur: e.valeur || 0,
          des_nb: e.des_nb || null,
          des_faces: e.des_faces || null,
          des_stat_id: e.des_stat_id || null,
          est_jet_de: e.est_jet_de ? 1 : 0,
          created_at: new Date().toISOString()
        });
      }
    }

    return true;
  },

  /**
   * Récupère les stats disponibles
   */
  getStats: async (): Promise<Stat[]> => {
    if (!peerService.isHost) return [];
    const res = await db.stats.getAll();
    return res.success ? res.data : [];
  },

  /**
   * Crée un nouvel item avec ses modificateurs et effets actifs
   */
  createItem: async (
    idSession: string,
    idCompte: string | undefined,
    itemData: { nom: string; description: string; categorie: CategorieItem; image_url?: string | null },
    modificateurs: Partial<Modificateur>[],
    effetsActifs: Partial<EffetActif>[] = [],
    tagIds: string[] = []
  ): Promise<Item | null> => {
    if (!peerService.isHost) return null;
    const newItem = {
      ...itemData,
      id: crypto.randomUUID(),
      id_session: idSession,
      cree_par: idCompte || null,
      created_at: new Date().toISOString()
    };

    const resItem = await db.items.create(newItem);
    if (!resItem.success) {
      alert(`Erreur création item : ${resItem.error}`);
      return null;
    }

    await tagsService.setTagsForItem(newItem.id, tagIds);

    if (modificateurs.length > 0) {
      for (const m of modificateurs) {
        if (!m.id_stat) continue;
        await db.modificateurs.create({
          id: crypto.randomUUID(),
          id_item: newItem.id,
          id_stat: m.id_stat,
          type_calcul: m.type_calcul || 'fixe',
          valeur: m.valeur || 0,
          id_tag: m.id_tag || null,
          des_stat_id: m.des_stat_id || null,
          des_nb: m.des_nb || null,
          des_faces: m.des_faces || null,
          nom_affiche: m.nom_affiche || null,
          created_at: new Date().toISOString()
        });
      }
    }

    if (effetsActifs.length > 0) {
      for (const e of effetsActifs) {
        if (!e.cible_jauge) continue;
        await db.effets_actifs.create({
          id: crypto.randomUUID(),
          id_item: newItem.id,
          cible_jauge: e.cible_jauge,
          valeur: e.valeur || 0,
          des_nb: e.des_nb || null,
          des_faces: e.des_faces || null,
          des_stat_id: e.des_stat_id || null,
          est_jet_de: e.est_jet_de ? 1 : 0,
          created_at: new Date().toISOString()
        });
      }
    }

    return newItem as Item;
  },

  /**
   * Supprime un item
   */
  deleteItem: async (idItem: string): Promise<boolean> => {
    if (!peerService.isHost) return false;
    const res = await db.items.delete(idItem);
    return res.success;
  }
};
