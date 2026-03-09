import { supabase } from '../supabase';
import { Item, Modificateur, Stat, CategorieItem } from '../types';

export const itemsService = {
  /**
   * Récupère tous les items d'une session
   */
  getItems: async (idSession: string): Promise<Item[]> => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
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
      .select('id, nom');
    
    if (error) {
      console.error("Erreur récupération stats:", error);
      return [];
    }
    return data || [];
  },

  /**
   * Récupère les modificateurs d'un item
   */
  getItemModificateurs: async (idItem: string): Promise<Modificateur[]> => {
    const { data, error } = await supabase
      .from('item_modificateurs')
      .select('*')
      .eq('id_item', idItem);
    
    if (error) {
      console.error("Erreur récupération modificateurs:", error);
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
    modificateurs: Modificateur[]
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
      console.error("Erreur création item:", itemError);
      return null;
    }

    if (modificateurs.length > 0) {
      const { error: modifError } = await supabase
        .from('item_modificateurs')
        .insert(
          modificateurs.map(m => ({
            id_item: newItem.id,
            type: m.type,
            id_stat: m.type === 'stat' ? m.id_stat : null,
            valeur: m.valeur,
          }))
        );
      
      if (modifError) {
        console.error("Erreur création modificateurs:", modifError);
      }
    }

    return newItem;
  },

  /**
   * Supprime un item (les modificateurs sont supprimés en cascade par la DB)
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
