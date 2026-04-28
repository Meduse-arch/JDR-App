import { Tag } from '../types';

const db = (window as any).db;

export const tagsService = {
  getTags: async (idSession: string): Promise<Tag[]> => {
    const res = await db.tags.getAll();
    if (!res.success) return [];
    return res.data.filter((t: any) => t.id_session === idSession).sort((a: any, b: any) => a.nom.localeCompare(b.nom));
  },

  createTag: async (tagData: { nom: string; description: string; id_session: string }): Promise<Tag | null> => {
    const newTag = { ...tagData, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    const res = await db.tags.create(newTag);
    return res.success ? newTag : null;
  },

  updateTag: async (idTag: string, updates: Partial<Tag>): Promise<boolean> => {
    const res = await db.tags.update(idTag, updates);
    return res.success;
  },

  deleteTag: async (idTag: string): Promise<boolean> => {
    const res = await db.tags.delete(idTag);
    return res.success;
  },

  getTagsForItem: async (itemId: string) => {
    // MIGRATION: était une jointure SQL entre item_tags et tags
    const resItemTags = await db.item_tags.getAll();
    if (!resItemTags.success) return [];
    const itemTags = resItemTags.data.filter((it: any) => it.id_item === itemId);
    
    const resTags = await db.tags.getAll();
    if (!resTags.success) return [];
    
    return itemTags.map((it: any) => resTags.data.find((t: any) => t.id === it.id_tag)).filter(Boolean);
  },

  getTagsForCompetence: async (competenceId: string) => {
    // MIGRATION: était une jointure SQL entre competence_tags et tags
    const resCompTags = await db.competence_tags.getAll();
    if (!resCompTags.success) return [];
    const compTags = resCompTags.data.filter((ct: any) => ct.id_competence === competenceId);
    
    const resTags = await db.tags.getAll();
    if (!resTags.success) return [];
    
    return compTags.map((ct: any) => resTags.data.find((t: any) => t.id === ct.id_tag)).filter(Boolean);
  },

  setTagsForItem: async (itemId: string, tagIds: string[]) => {
    await db.item_tags.deleteByFields({ id_item: itemId });
    for (const id of tagIds) {
      await db.item_tags.create({ id_item: itemId, id_tag: id });
    }
  },

  setTagsForCompetence: async (competenceId: string, tagIds: string[]) => {
    await db.competence_tags.deleteByFields({ id_competence: competenceId });
    for (const id of tagIds) {
      await db.competence_tags.create({ id_competence: competenceId, id_tag: id });
    }
  }
};