import { Item, Modificateur, EffetActif, Stat, CategorieItem } from '../types';
import { tagsService } from './tagsService';
import { peerService } from './peerService';

// ADAPTATION Supabase→SQLite
const getDB = () => (window as any).db;

export const itemsService = {
  /**
   * Récupère tous les items d'une session
   */
  getItems: async (idSession: string): Promise<Item[]> => {
    const db = getDB();
    if (!db) return [];
    
    const resItems = await db.items.getAll();
    if (!resItems.success) return [];
    
    // Filtrage strict par session
    const items = resItems.data.filter((i: any) => String(i.id_session) === String(idSession))
                               .sort((a: any, b: any) => a.nom.localeCompare(b.nom));

    const [resModifs, resStats, resTags, resEffets, resItemTags] = await Promise.all([
      db.modificateurs.getAll(),
      db.stats.getAll(),
      db.tags.getAll(),
      db.effets_actifs.getAll(),
      db.item_tags.getAll()
    ]);

    return items.map((item: any) => {
      const modifs = resModifs.data?.filter((m: any) => m.id_item === item.id).map((m: any) => ({
        ...m,
        // ADAPTATION Supabase→SQLite : Normalisation String sur id_stat
        stats: resStats.data?.find((s: any) => String(s.id) === String(m.id_stat)),
        tags: resTags.data?.find((t: any) => String(t.id) === String(m.id_tag))
      })) || [];

      const effets = resEffets.data?.filter((e: any) => e.id_item === item.id).map((e: any) => ({
        ...e,
        // ADAPTATION Supabase→SQLite : INTEGER 0/1 -> boolean
        est_jet_de: e.est_jet_de === 1
      })) || [];
      
      const itemTags = resItemTags.data?.filter((it: any) => it.id_item === item.id).map((it: any) => 
        resTags.data?.find((t: any) => String(t.id) === String(it.id_tag))
      ).filter(Boolean) || [];

      return { ...item, modificateurs: modifs, effets_actifs: effets, tags: itemTags };
    });
  },

  /**
   * Récupère les stats disponibles (Référence)
   */
  getStats: async (): Promise<Stat[]> => {
    const db = getDB();
    if (!db) return [];
    const res = await db.stats.getAll();
    
    // ADAPTATION Supabase→SQLite : Normalisation IDs + Filtrage stats système (is_systeme)
    return res.success 
      ? res.data
          .map((s: any) => ({ ...s, id: String(s.id) }))
          .filter((s: any) => s.is_systeme !== 1)
      : [];
  },

  /**
   * Crée un nouvel item avec tous ses champs
   */
  createItem: async (
    idSession: string,
    idCompte: string | undefined,
    itemData: { nom: string; description: string; categorie: CategorieItem; image_url?: string | null },
    modificateurs: Partial<Modificateur>[],
    effetsActifs: Partial<EffetActif>[] = [],
    tagIds: string[] = []
  ): Promise<Item | null> => {
    const db = getDB();
    if (!db) return null;

    const newItem = {
      ...itemData,
      id: crypto.randomUUID(),
      id_session: String(idSession),
      cree_par: idCompte || null,
      created_at: new Date().toISOString()
    };

    const resItem = await db.items.create(newItem);
    if (!resItem.success) return null;

    await tagsService.setTagsForItem(newItem.id, tagIds);

    if (modificateurs.length > 0) {
      for (const m of modificateurs) {
        if (!m.id_stat) continue;
        await db.modificateurs.create({
          id: crypto.randomUUID(),
          id_stat: String(m.id_stat),
          valeur: Number(m.valeur) || 0,
          type_calcul: m.type_calcul || 'fixe',
          id_item: newItem.id,
          id_competence: null,
          id_personnage: null,
          nom_affiche: m.nom_affiche || null,
          id_tag: m.id_tag || null,
          des_stat_id: m.des_stat_id || null,
          des_nb: m.des_nb || null,
          des_faces: m.des_faces || null,
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
          id_competence: null,
          cible_jauge: e.cible_jauge,
          valeur: Number(e.valeur) || 0,
          id_stat_de: e.id_stat_de || null,
          des_nb: e.des_nb || null,
          des_faces: e.des_faces || null,
          des_stat_id: e.des_stat_id || null,
          est_cout: e.est_cout ? 1 : 0, // ADAPTATION Supabase→SQLite
          est_jet_de: e.est_jet_de ? 1 : 0, // ADAPTATION Supabase→SQLite
          created_at: new Date().toISOString()
        });
      }
    }

    const items = await itemsService.getItems(idSession);
    const stats = await itemsService.getStats();
    peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'session', payload: { type: 'library_update', items, stats } });

    return newItem as Item;
  },

  /**
   * Mise à jour complète
   */
  updateItem: async (idItem: string, itemData: any, modificateurs: any[], effetsActifs: any[] = [], tagIds: string[] = []) => {
    const db = getDB();
    if (!db) return false;
    
    // Nettoyer data
    const dataClean = {
      nom: itemData.nom,
      description: itemData.description,
      categorie: itemData.categorie,
      image_url: itemData.image_url || null,
    };

    const resItem = await db.items.update(idItem, dataClean);
    if (!resItem.success) return false;

    await tagsService.setTagsForItem(idItem, tagIds);
    await db.modificateurs.deleteByFields({ id_item: idItem });
    await db.effets_actifs.deleteByFields({ id_item: idItem });

    for (const m of modificateurs) {
      if (!m.id_stat) continue;
      await db.modificateurs.create({
        id: crypto.randomUUID(),
        id_item: idItem,
        id_stat: String(m.id_stat),
        valeur: Number(m.valeur) || 0,
        type_calcul: m.type_calcul || 'fixe',
        id_competence: null,
        id_personnage: null,
        nom_affiche: m.nom_affiche || null,
        id_tag: m.id_tag || null,
        des_stat_id: m.des_stat_id || null,
        des_nb: m.des_nb || null,
        des_faces: m.des_faces || null,
        created_at: new Date().toISOString()
      });
    }
    for (const e of effetsActifs) {
      if (!e.cible_jauge) continue;
      await db.effets_actifs.create({
        id: crypto.randomUUID(),
        id_item: idItem,
        id_competence: null,
        cible_jauge: e.cible_jauge,
        valeur: Number(e.valeur) || 0,
        id_stat_de: e.id_stat_de || null,
        des_nb: e.des_nb || null,
        des_faces: e.des_faces || null,
        des_stat_id: e.des_stat_id || null,
        est_cout: e.est_cout ? 1 : 0, // ADAPTATION Supabase→SQLite
        est_jet_de: e.est_jet_de ? 1 : 0, // ADAPTATION Supabase→SQLite
        created_at: new Date().toISOString()
      });
    }

    const { sessionActive } = (await import('../store/useStore')).useStore.getState();
    if (sessionActive) {
      const items = await itemsService.getItems(sessionActive.id);
      const stats = await itemsService.getStats();
      peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'session', payload: { type: 'library_update', items, stats } });
    }
    return true;
  },

  deleteItem: async (idItem: string): Promise<boolean> => {
    const db = getDB();
    if (!db) return false;
    const res = await db.items.delete(idItem);
    return res.success;
  }
};
