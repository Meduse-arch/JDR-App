import { supabase } from '../supabase';
import { Item, Modificateur, EffetActif, Stat, CategorieItem } from '../types';
import { tagsService } from './tagsService';

export const itemsService = {
  /**
   * Récupère tous les items d'une session avec leurs modificateurs et effets
   */
  getItems: async (idSession: string): Promise<Item[]> => {
    const { data, error } = await supabase
      .from('items')
      .select('*, modificateurs(*, stats:id_stat(nom), tags(nom)), effets_actifs(*), item_tags(id_tag, tags(id, nom))')
      .eq('id_session', idSession)
      .order('nom');
    
    if (error) {
      console.error("Erreur récupération items:", error);
      return [];
    }
    
    // Reformater pour que tags[] soit à plat
    return (data || []).map((item: any) => ({
      ...item,
      tags: item.item_tags?.map((it: any) => it.tags) || []
    }));
  },

  /**
   * Met à jour un item existant
   */
  updateItem: async (
    idItem: string,
    itemData: { nom: string; description: string; categorie: CategorieItem },
    modificateurs: Partial<Modificateur>[],
    effetsActifs: Partial<EffetActif>[] = [],
    tagIds: string[] = []
  ): Promise<boolean> => {
    // 1. Update de l'item
    const { error: itemError } = await supabase
      .from('items')
      .update(itemData)
      .eq('id', idItem);

    if (itemError) return false;

    // 2. Tags
    await tagsService.setTagsForItem(idItem, tagIds);

    // 3. Nettoyage des anciens modifs/effets
    await supabase.from('modificateurs').delete().eq('id_item', idItem);
    await supabase.from('effets_actifs').delete().eq('id_item', idItem);

    // 3. Réinsertion des modificateurs
    if (modificateurs.length > 0) {
      const validModifs = modificateurs.map(m => ({
        id_item: idItem,
        id_stat: m.id_stat,
        type_calcul: m.type_calcul || 'fixe',
        valeur: m.valeur || 0,
        id_tag: m.id_tag || null,
        des_stat_id: m.des_stat_id || null,
        des_nb: m.des_nb || null,
        des_faces: m.des_faces || null,
        nom_affiche: m.nom_affiche || null
      }));
      await supabase.from('modificateurs').insert(validModifs);
    }

    // 4. Réinsertion des effets
    if (effetsActifs.length > 0) {
      const validEffets = effetsActifs.map(e => ({
        id_item: idItem,
        cible_jauge: e.cible_jauge,
        valeur: e.valeur || 0,
        des_nb: e.des_nb || null,
        des_faces: e.des_faces || null,
        des_stat_id: e.des_stat_id || null,
        est_jet_de: e.est_jet_de || false
      }));
      await supabase.from('effets_actifs').insert(validEffets);
    }

    return true;
  },

  /**
   * Récupère les stats disponibles
   */
  getStats: async (): Promise<Stat[]> => {
    const { data, error } = await supabase
      .from('stats')
      .select('id, nom, description');
    
    if (error) {
      console.error("Erreur récupération stats:", error);
      return [];
    }
    return data || [];
  },

  /**
   * Crée un nouvel item avec ses modificateurs et effets actifs
   */
  createItem: async (
    idSession: string,
    idCompte: string | undefined,
    itemData: { nom: string; description: string; categorie: CategorieItem },
    modificateurs: Partial<Modificateur>[],
    effetsActifs: Partial<EffetActif>[] = [],
    tagIds: string[] = []
  ): Promise<Item | null> => {
    const { data: newItem, error: itemError } = await supabase
      .from('items')
      .insert({
        ...itemData,
        id_session: idSession,
        cree_par: idCompte,
      })
      .select()
      .single();

    if (itemError || !newItem) {
      alert(`Erreur création item : ${itemError?.message}`);
      return null;
    }

    // Tags
    await tagsService.setTagsForItem(newItem.id, tagIds);

    if (modificateurs.length > 0) {
      const validModifs = modificateurs
        .filter(m => m.id_stat)
        .map(m => ({
          id_item: newItem.id,
          id_stat: m.id_stat,
          type_calcul: m.type_calcul || 'fixe',
          valeur: m.valeur || 0,
          id_tag: m.id_tag || null,
          des_stat_id: m.des_stat_id || null,
          des_nb: m.des_nb || null,
          des_faces: m.des_faces || null,
          nom_affiche: m.nom_affiche || null
        }));

      if (validModifs.length > 0) {
        const { error: modifError } = await supabase
          .from('modificateurs')
          .insert(validModifs);
        
        if (modifError) {
          alert(`Erreur bonus : ${modifError.message}`);
        }
      }
    }

    if (effetsActifs.length > 0) {
      const validEffets = effetsActifs
        .filter(e => e.cible_jauge)
        .map(e => ({
          id_item: newItem.id,
          cible_jauge: e.cible_jauge,
          valeur: e.valeur || 0,
          des_nb: e.des_nb || null,
          des_faces: e.des_faces || null,
          des_stat_id: e.des_stat_id || null,
          est_jet_de: e.est_jet_de || false
        }));

      if (validEffets.length > 0) {
        const { error: effetError } = await supabase
          .from('effets_actifs')
          .insert(validEffets);
        
        if (effetError) {
          alert(`Erreur effets actifs : ${effetError.message}`);
        }
      }
    }

    return newItem;
  },

  /**
   * Supprime un item
   */
  deleteItem: async (idItem: string): Promise<boolean> => {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', idItem);
    
    if (error) {
      console.error("Erreur suppression item:", error);
      return false;
    }
    return true;
  }
};
