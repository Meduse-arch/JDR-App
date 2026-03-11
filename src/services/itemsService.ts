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

    if (modificateurs.length > 0) {
      const validModifs = modificateurs
        .filter(m => m.id_stat || m.type)
        .map(m => ({
          id_item: newItem.id,
          id_stat: m.id_stat || null,
          type: m.id_stat ? 'stat' : m.type,
          valeur: m.valeur || 0
        }));

      if (validModifs.length > 0) {
        const { error: modifError } = await supabase
          .from('item_modificateurs')
          .insert(validModifs);
        
        if (modifError) {
          alert(`Erreur bonus : ${modifError.message}`);
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
