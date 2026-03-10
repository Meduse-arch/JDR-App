import { supabase } from '../supabase';
import { Item, Modificateur, Stat, CategorieItem } from '../types';

export const itemsService = {
  /**
   * Récupère tous les items d'une session avec leurs modificateurs
   */
  getItems: async (idSession: string): Promise<(Item & { item_modificateurs: any[] })[]> => {
    const { data, error } = await supabase
      .from('items')
      .select('*, item_modificateurs(*)')
      .eq('id_session', idSession)
      .order('nom');
    
    if (error) {
      console.error("Erreur récupération items:", error);
      return [];
    }
    return data || [];
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
   * Crée un nouvel item avec ses modificateurs
   */
  createItem: async (
    idSession: string,
    idCompte: string | undefined,
    itemData: { nom: string; description: string; categorie: CategorieItem },
    modificateurs: Partial<Modificateur>[]
  ): Promise<Item | null> => {
    // 1. Création de l'item
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

    // 2. Création des modificateurs
    if (modificateurs.length > 0) {
      const { error: modifError } = await supabase
        .from('item_modificateurs')
        .insert(
          modificateurs.map(m => ({
            id_item: newItem.id,
            type: m.type || 'stat', // 'stat', 'hp_max', 'mana_max', etc.
            id_stat: m.id_stat || null,
            valeur: m.valeur,
          }))
        );
      
      if (modifError) {
        alert(`Attention : L'item a été créé mais les bonus ont échoué.\nErreur : ${modifError.message}\n\nAs-tu ajouté la colonne 'type' à la table 'item_modificateurs' ?`);
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
