import { supabase } from '../supabase';
import { Tag } from '../types';

export const tagsService = {
  getTags: async (idSession: string): Promise<Tag[]> => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('id_session', idSession)
      .order('nom');
    
    if (error) {
      console.error("Erreur récupération tags:", error);
      return [];
    }
    return data || [];
  },

  createTag: async (
    tagData: { nom: string; description: string; id_session: string }
  ): Promise<Tag | null> => {
    const { data, error } = await supabase
      .from('tags')
      .insert(tagData)
      .select()
      .single();

    if (error || !data) {
      console.error("Erreur création tag:", error);
      return null;
    }
    return data;
  },

  updateTag: async (
    idTag: string,
    updates: Partial<Tag>
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', idTag);

    if (error) {
      console.error("Erreur mise à jour tag:", error);
      return false;
    }
    return true;
  },

  deleteTag: async (idTag: string): Promise<boolean> => {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', idTag);
    
    if (error) {
      console.error("Erreur suppression tag:", error);
      return false;
    }
    return true;
  },

  getTagsForItem: async (itemId: string) => {
    const { data } = await supabase
      .from('item_tags')
      .select('id_tag, tags(id, nom)')
      .eq('id_item', itemId);
    return data?.map((d: any) => d.tags) || [];
  },

  getTagsForCompetence: async (competenceId: string) => {
    const { data } = await supabase
      .from('competence_tags')
      .select('id_tag, tags(id, nom)')
      .eq('id_competence', competenceId);
    return data?.map((d: any) => d.tags) || [];
  },

  setTagsForItem: async (itemId: string, tagIds: string[]) => {
    await supabase.from('item_tags').delete().eq('id_item', itemId);
    if (tagIds.length > 0) {
      await supabase.from('item_tags').insert(tagIds.map(id => ({ id_item: itemId, id_tag: id })));
    }
  },

  setTagsForCompetence: async (competenceId: string, tagIds: string[]) => {
    await supabase.from('competence_tags').delete().eq('id_competence', competenceId);
    if (tagIds.length > 0) {
      await supabase.from('competence_tags').insert(tagIds.map(id => ({ id_competence: competenceId, id_tag: id })));
    }
  }
};
