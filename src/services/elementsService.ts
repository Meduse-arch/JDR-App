import { supabase } from '../supabase';
import { Element } from '../types';

export const elementsService = {
  getElements: async (idSession: string): Promise<Element[]> => {
    const { data, error } = await supabase
      .from('elements')
      .select('*')
      .eq('id_session', idSession)
      .order('nom');
    
    if (error) {
      console.error("Erreur récupération éléments:", error);
      return [];
    }
    return data || [];
  },

  createElement: async (
    elementData: { nom: string; description: string; couleur: string; emoji: string; id_session: string }
  ): Promise<Element | null> => {
    const { data, error } = await supabase
      .from('elements')
      .insert(elementData)
      .select()
      .single();

    if (error || !data) {
      console.error("Erreur création élément:", error);
      return null;
    }
    return data;
  },

  updateElement: async (
    idElement: string,
    updates: Partial<Element>
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('elements')
      .update(updates)
      .eq('id', idElement);

    if (error) {
      console.error("Erreur mise à jour élément:", error);
      return false;
    }
    return true;
  },

  deleteElement: async (idElement: string): Promise<boolean> => {
    const { error } = await supabase
      .from('elements')
      .delete()
      .eq('id', idElement);
    
    if (error) {
      console.error("Erreur suppression élément:", error);
      return false;
    }
    return true;
  }
};