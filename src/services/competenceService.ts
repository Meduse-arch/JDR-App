import { Competence } from '../types';
import { tagsService } from './tagsService';
import { peerService } from './peerService';

// ADAPTATION Supabase→SQLite
const getDB = () => (window as any).db;

export const competenceService = {
  /**
   * Récupère toutes les compétences de la base de données
   */
  getCompetences: async (idSession: string): Promise<Competence[]> => {
    const db = getDB();
    if (!db) return [];

    const resComp = await db.competences.getAll();
    if (!resComp.success) return [];
    
    // Filtrage souple par session
    const competences = resComp.data.filter((c: any) => String(c.id_session) === String(idSession))
                                    .sort((a: any, b: any) => a.nom.localeCompare(b.nom));

    const [resModifs, resStats, resTags, resEffets, resCompTags] = await Promise.all([
      db.modificateurs.getAll(),
      db.stats.getAll(),
      db.tags.getAll(),
      db.effets_actifs.getAll(),
      db.competence_tags.getAll()
    ]);

    return competences.map((comp: any) => {
      const modifs = resModifs.data?.filter((m: any) => m.id_competence === comp.id).map((m: any) => ({
        ...m,
        // ADAPTATION Supabase→SQLite : Normalisation String sur id_stat
        stats: resStats.data?.find((s: any) => String(s.id) === String(m.id_stat)),
        tags: resTags.data?.find((t: any) => String(t.id) === String(m.id_tag))
      })) || [];

      const effets = resEffets.data?.filter((e: any) => e.id_competence === comp.id).map((e: any) => ({
        ...e,
        // ADAPTATION Supabase→SQLite : INTEGER 0/1 -> boolean
        est_cout: e.est_cout === 1,
        est_jet_de: e.est_jet_de === 1
      })) || [];
      
      const compTags = resCompTags.data?.filter((ct: any) => ct.id_competence === comp.id).map((ct: any) => 
        resTags.data?.find((t: any) => String(t.id) === String(ct.id_tag))
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
    const db = getDB();
    if (!db) return false;

    const finalData = {
      ...competenceData,
      condition_type: competenceData.type === 'passive_auto' ? competenceData.condition_type : null
    };

    const res = await db.competences.update(idCompetence, finalData);
    if (!res.success) return false;

    await tagsService.setTagsForCompetence(idCompetence, tagIds);

    // Nettoyage via deleteByFields
    await db.modificateurs.deleteByFields({ id_competence: idCompetence });
    await db.effets_actifs.deleteByFields({ id_competence: idCompetence });

    for (const m of modificateurs) {
      if (!m.id_stat) continue;
      await db.modificateurs.create({
        id: crypto.randomUUID(),
        id_competence: idCompetence,
        id_stat: String(m.id_stat), // ADAPTATION Supabase→SQLite
        valeur: Number(m.valeur) || 0,
        type_calcul: m.type_calcul || 'fixe',
        id_item: null,
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
        id_competence: idCompetence,
        id_item: null,
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
      const data = await competenceService.getCompetences(sessionActive.id);
      peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'session', payload: { type: 'library_update_competences', competences: data } });
    }

    return true;
  },

  /**
   * Crée une nouvelle compétence
   */
  createCompetence: async (
    competenceData: { nom: string; description: string; type: string, id_session: string, condition_type?: string | null, image_url?: string | null },
    modificateurs: Partial<any>[] = [],
    effetsActifs: Partial<any>[] = [],
    tagIds: string[] = []
  ): Promise<Competence | null> => {
    const db = getDB();
    if (!db) return null;

    const newId = crypto.randomUUID();
    const finalData = {
      ...competenceData,
      id: newId,
      condition_type: competenceData.type === 'passive_auto' ? competenceData.condition_type : null,
      created_at: new Date().toISOString()
    };

    const res = await db.competences.create(finalData);
    if (!res.success) return null;

    await tagsService.setTagsForCompetence(newId, tagIds);

    for (const m of modificateurs) {
      if (!m.id_stat) continue;
      await db.modificateurs.create({
        id: crypto.randomUUID(),
        id_competence: newId,
        id_stat: String(m.id_stat), // ADAPTATION Supabase→SQLite
        valeur: Number(m.valeur) || 0,
        type_calcul: m.type_calcul || 'fixe',
        id_item: null,
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
        id_competence: newId,
        id_item: null,
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

    const competences = await competenceService.getCompetences(competenceData.id_session);
    peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'session', payload: { type: 'library_update_competences', competences } });

    return competences.find((c: any) => c.id === newId) || (finalData as any);
  },

  deleteCompetence: async (idCompetence: string): Promise<boolean> => {
    const db = getDB();
    if (!db) return false;
    const res = await db.competences.delete(idCompetence);
    if (res.success) {
      const { sessionActive } = (await import('../store/useStore')).useStore.getState();
      if (sessionActive) {
        const data = await competenceService.getCompetences(sessionActive.id);
        peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'session', payload: { type: 'library_update_competences', competences: data } });
      }
    }
    return res.success;
  },

  apprendreCompetence: async (idPersonnage: string, idCompetence: string): Promise<boolean> => {
    const db = getDB();
    if (!db) return false;
    await db.personnage_competences.create({
      id: crypto.randomUUID(),
      id_personnage: idPersonnage,
      id_competence: idCompetence,
      niveau: 1,
      is_active: 0
    });
    return true;
  },

  oublierCompetence: async (idPersonnage: string, idCompetence: string): Promise<boolean> => {
    const db = getDB();
    if (!db) return false;
    await db.personnage_competences.deleteByFields({ id_personnage: idPersonnage, id_competence: idCompetence });
    return true;
  }
};
