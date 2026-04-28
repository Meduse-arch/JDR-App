import { Item, Modificateur, EffetActif, Stat, CategorieItem } from '../types';
import { tagsService } from './tagsService';
import { peerService } from './peerService';

// FIX Items affichage : Sécurisation de l'accès à la DB
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
    
    // FIX Items affichage : Comparaison souple des IDs de session
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
        // FIX Items affichage : Normalisation String sur id_stat
        stats: resStats.data?.find((s: any) => String(s.id) === String(m.id_stat)),
        tags: resTags.data?.find((t: any) => String(t.id) === String(m.id_tag))
      })) || [];

      const effets = resEffets.data?.filter((e: any) => e.id_item === item.id).map((e: any) => ({
        ...e,
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
    console.log('[DEBUG getStats] db disponible:', !!db);
    if (!db) return [];
    
    const res = await db.stats.getAll();
    console.log('[DEBUG getStats] résultat brut:', res);
    
    // FIX Items affichage : Normalisation IDs + Filtrage stats système (PV Max...)
    const STATS_SYSTEME = ['101', '102', '103'];
    const filtered = res.success 
      ? res.data
          .map((s: any) => ({ ...s, id: String(s.id) }))
          .filter((s: any) => !STATS_SYSTEME.includes(s.id))
      : [];
    
    console.log('[DEBUG getStats] résultat filtré:', filtered);
    return filtered;
  },

  /**
   * Crée un nouvel item avec validation de chaque étape
   */
  createItem: async (
    idSession: string,
    idCompte: string | undefined,
    itemData: { nom: string; description: string; categorie: CategorieItem; image_url?: string | null },
    modificateurs: Partial<Modificateur>[],
    effetsActifs: Partial<EffetActif>[] = [],
    tagIds: string[] = []
  ): Promise<Item | null> => {
    // FIX Items persistance
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
    if (!resItem.success) {
      console.error("Échec création item:", resItem.error);
      return null;
    }

    await tagsService.setTagsForItem(newItem.id, tagIds);

    if (modificateurs.length > 0) {
      for (const m of modificateurs) {
        if (!m.id_stat) continue;
        const resMod = await db.modificateurs.create({
          id: crypto.randomUUID(),
          id_item: newItem.id,
          id_stat: String(m.id_stat), // FIX Items affichage : id_stat en String
          type_calcul: m.type_calcul || 'fixe',
          valeur: Number(m.valeur) || 0,
          created_at: new Date().toISOString()
        });
        if (!resMod.success) console.error("Échec modificateur:", resMod.error);
      }
    }

    if (effetsActifs.length > 0) {
      for (const e of effetsActifs) {
        if (!e.cible_jauge) continue;
        const resEffet = await db.effets_actifs.create({
          id: crypto.randomUUID(),
          id_item: newItem.id,
          cible_jauge: e.cible_jauge,
          valeur: Number(e.valeur) || 0,
          est_jet_de: e.est_jet_de ? 1 : 0,
          created_at: new Date().toISOString()
        });
        if (!resEffet.success) console.error("Échec effet:", resEffet.error);
      }
    }

    // Refresh lib et broadcast
    const items = await itemsService.getItems(idSession);
    const stats = await itemsService.getStats();
    peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'session', payload: { type: 'library_update', items, stats } });

    return newItem as Item;
  },

  /**
   * Mise à jour avec nettoyage complet
   */
  updateItem: async (
    idItem: string, 
    itemData: any, 
    modificateurs: Partial<Modificateur>[], 
    effetsActifs: Partial<EffetActif>[] = [], 
    tagIds: string[] = []
  ): Promise<boolean> => {
    // FIX Items persistance & // FIX update item
    const db = getDB();
    if (!db) return false;

    // FIX update : ne passer que les champs connus de la table items
    const dataClean = {
      nom: itemData.nom,
      description: itemData.description,
      categorie: itemData.categorie,
      image_url: itemData.image_url || null,
    };
    
    console.log('[DEBUG update] idItem:', idItem, 'dataClean:', dataClean);

    const resUpdate = await db.items.update(idItem, dataClean);
    console.log('[DEBUG update] résultat:', resUpdate);
    if (!resUpdate.success) return false;

    await tagsService.setTagsForItem(idItem, tagIds);

    // Nettoyage via deleteByFields
    await db.modificateurs.deleteByFields({ id_item: idItem });
    await db.effets_actifs.deleteByFields({ id_item: idItem });

    for (const m of modificateurs) {
      if (!m.id_stat) continue;
      await db.modificateurs.create({
        id: crypto.randomUUID(),
        id_item: idItem,
        id_stat: String(m.id_stat),
        valeur: Number(m.valeur) || 0,
        type_calcul: m.type_calcul || 'fixe'
      });
    }

    for (const e of effetsActifs) {
      if (!e.cible_jauge) continue;
      await db.effets_actifs.create({
        id: crypto.randomUUID(),
        id_item: idItem,
        cible_jauge: e.cible_jauge,
        valeur: Number(e.valeur) || 0,
        est_jet_de: e.est_jet_de ? 1 : 0
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
