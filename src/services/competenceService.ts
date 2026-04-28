import { Competence } from '../types';
import { tagsService } from './tagsService';

const db = (window as any).db;

export const competenceService = {
  /**
   * Récupère toutes les compétences de la base de données
   */
  getCompetences: async (idSession: string): Promise<Competence[]> => {
    // MIGRATION: était une jointure SQL
    const resComp = await db.competences.getAll();
    if (!resComp.success) return [];
    const competences = resComp.data.filter((c: any) => c.id_session === idSession).sort((a: any, b: any) => a.nom.localeCompare(b.nom));

    const resModifs = await db.modificateurs.getAll();
    const resStats = await db.stats.getAll();
    const resTags = await db.tags.getAll();
    const resEffets = await db.effets_actifs.getAll();
    const resCompTags = await db.competence_tags.getAll();

    return competences.map((comp: any) => {
      const modifs = resModifs.data?.filter((m: any) => m.id_competence === comp.id).map((m: any) => ({
        ...m,
        stats: resStats.data?.find((s: any) => s.id === m.id_stat),
        tags: resTags.data?.find((t: any) => t.id === m.id_tag)
      })) || [];

      const effets = resEffets.data?.filter((e: any) => e.id_competence === comp.id).map((e: any) => ({
        ...e,
        est_cout: e.est_cout === 1,
        est_jet_de: e.est_jet_de === 1
      })) || [];
      
      const compTags = resCompTags.data?.filter((ct: any) => ct.id_competence === comp.id).map((ct: any) => 
        resTags.data?.find((t: any) => t.id === ct.id_tag)
      ).filter(Boolean) || [];

      return {
        ...comp,
        modificateurs: modifs,
        effets_actifs: effets,
        tags: compTags,
        condition_tags: compTags
      };
    });
  },

  /**
   * Met à jour une compétence existante
   */
  updateCompetence: async (
    idCompetence: string,
    competenceData: { nom: string; description: string; type: string, condition_type?: string | null, image_url?: string | null },
    modificateurs: Partial<any>[] = [],
    effetsActifs: Partial<any>[] = [],
    tagIds: string[] = []
  ): Promise<boolean> => {
    const finalData = {
      ...competenceData,
      condition_type: competenceData.type === 'passive_auto' ? competenceData.condition_type : null
    };

    const res = await db.competences.update(idCompetence, finalData);
    if (!res.success) return false;

    await tagsService.setTagsForCompetence(idCompetence, tagIds);

    const resModifs = await db.modificateurs.getAll();
    if (resModifs.success) {
      const toDelete = resModifs.data.filter((m: any) => m.id_competence === idCompetence);
      for (const m of toDelete) await db.modificateurs.delete(m.id);
    }

    const resEffets = await db.effets_actifs.getAll();
    if (resEffets.success) {
      const toDelete = resEffets.data.filter((e: any) => e.id_competence === idCompetence);
      for (const e of toDelete) await db.effets_actifs.delete(e.id);
    }

    for (const m of modificateurs) {
      if (!m.id_stat) continue;
      await db.modificateurs.create({
        id: crypto.randomUUID(),
        id_competence: idCompetence,
        id_stat: m.id_stat,
        valeur: m.valeur || 0,
        type_calcul: m.type_calcul || 'fixe',
        id_tag: m.id_tag || null,
        des_stat_id: m.des_stat_id || null,
        des_nb: m.des_nb || null,
        des_faces: m.des_faces || null,
        nom_affiche: m.nom_affiche || null,
        created_at: new Date().toISOString()
      });
    }

    for (const e of effetsActifs) {
      if (!e.cible_jauge) continue;
      await db.effets_actifs.create({
        id: crypto.randomUUID(),
        id_competence: idCompetence,
        cible_jauge: e.cible_jauge,
        valeur: e.valeur || 0,
        des_nb: e.des_nb || null,
        des_faces: e.des_faces || null,
        des_stat_id: e.des_stat_id || null,
        est_cout: e.est_cout ? 1 : 0,
        est_jet_de: e.est_jet_de ? 1 : 0,
        created_at: new Date().toISOString()
      });
    }

    return true;
  },

  /**
   * Crée une nouvelle compétence avec modificateurs et effets_actifs
   */
  createCompetence: async (
    competenceData: { nom: string; description: string; type: string, id_session: string, condition_type?: string | null, image_url?: string | null },
    modificateurs: Partial<any>[] = [],
    effetsActifs: Partial<any>[] = [],
    tagIds: string[] = []
  ): Promise<Competence | null> => {
    const finalData = {
      ...competenceData,
      id: crypto.randomUUID(),
      condition_type: competenceData.type === 'passive_auto' ? competenceData.condition_type : null,
      created_at: new Date().toISOString()
    };

    const res = await db.competences.create(finalData);
    if (!res.success) return null;
    const newComp = res.data;

    await tagsService.setTagsForCompetence(newComp.id, tagIds);

    for (const m of modificateurs) {
      if (!m.id_stat) continue;
      await db.modificateurs.create({
        id: crypto.randomUUID(),
        id_competence: newComp.id,
        id_stat: m.id_stat,
        valeur: m.valeur || 0,
        type_calcul: m.type_calcul || 'fixe',
        id_tag: m.id_tag || null,
        des_stat_id: m.des_stat_id || null,
        des_nb: m.des_nb || null,
        des_faces: m.des_faces || null,
        nom_affiche: m.nom_affiche || null,
        created_at: new Date().toISOString()
      });
    }

    for (const e of effetsActifs) {
      if (!e.cible_jauge) continue;
      await db.effets_actifs.create({
        id: crypto.randomUUID(),
        id_competence: newComp.id,
        cible_jauge: e.cible_jauge,
        valeur: e.valeur || 0,
        des_nb: e.des_nb || null,
        des_faces: e.des_faces || null,
        des_stat_id: e.des_stat_id || null,
        est_cout: e.est_cout ? 1 : 0,
        est_jet_de: e.est_jet_de ? 1 : 0,
        created_at: new Date().toISOString()
      });
    }

    // Refresh to get full data
    const all = await competenceService.getCompetences(competenceData.id_session);
    return all.find((c: any) => c.id === newComp.id) || newComp;
  },

  /**
   * Supprime une compétence
   */
  deleteCompetence: async (idCompetence: string): Promise<boolean> => {
    const res = await db.competences.delete(idCompetence);
    return res.success;
  },

  /**
   * Ajoute une compétence à un personnage
   */
  apprendreCompetence: async (idPersonnage: string, idCompetence: string): Promise<boolean> => {
    const resAll = await db.personnage_competences.getAll();
    if (resAll.success) {
      const exists = resAll.data.find((pc: any) => pc.id_personnage === idPersonnage && pc.id_competence === idCompetence);
      if (exists) return true;
    }

    const res = await db.personnage_competences.create({
      id: crypto.randomUUID(),
      id_personnage: idPersonnage,
      id_competence: idCompetence,
      niveau: 1,
      is_active: 0
    });
    return res.success;
  },

  /**
   * Oublier une compétence (retirer d'un personnage)
   */
  oublierCompetence: async (idPersonnage: string, idCompetence: string): Promise<boolean> => {
    const resAll = await db.personnage_competences.getAll();
    if (!resAll.success) return false;
    const exists = resAll.data.find((pc: any) => pc.id_personnage === idPersonnage && pc.id_competence === idCompetence);
    if (exists) {
      const res = await db.personnage_competences.delete(exists.id);
      return res.success;
    }
    return true;
  }
};