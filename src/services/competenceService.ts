import { supabase } from '../supabase';
import { Competence } from '../types';
import { tagsService } from './tagsService';

export const competenceService = {
  /**
   * Récupère toutes les compétences de la base de données
   */
  getCompetences: async (idSession: string): Promise<Competence[]> => {
    console.log('competenceService.getCompetences appelé avec idSession:', idSession);
    const { data, error } = await supabase
      .from('competences')
      .select('*, modificateurs(*, stats:id_stat(nom), tags(nom)), effets_actifs(*), competence_tags(id_tag, tags(id, nom)), condition_type')
      .eq('id_session', idSession)
      .order('nom');

    if (error) {
      console.error("Erreur récupération compétences:", error);
      return [];
    }
    
    // Reformater pour que tags[] et condition_tags[] soient à plat
    return (data || []).map((comp: any) => ({
      ...comp,
      tags: comp.competence_tags?.map((ct: any) => ct.tags) || [],
      condition_tags: comp.competence_tags?.map((ct: any) => ct.tags) || []
    }));
  },

  /**
   * Met à jour une compétence existante
   */
  updateCompetence: async (
    idCompetence: string,
    competenceData: { nom: string; description: string; type: string, condition_type?: string | null },
    modificateurs: Partial<any>[] = [],
    effetsActifs: Partial<any>[] = [],
    tagIds: string[] = []
  ): Promise<boolean> => {
    const finalData = {
      ...competenceData,
      condition_type: competenceData.type === 'passive_auto' ? competenceData.condition_type : null
    };

    const { error: compError } = await supabase
      .from('competences')
      .update(finalData)
      .eq('id', idCompetence);

    if (compError) {
      console.error("Erreur update compétence:", compError);
      return false;
    }

    // Tags
    await tagsService.setTagsForCompetence(idCompetence, tagIds);

    // Suppression et réinsertion des modifs/effets (plus simple)
    await supabase.from('modificateurs').delete().eq('id_competence', idCompetence);
    await supabase.from('effets_actifs').delete().eq('id_competence', idCompetence);

    if (modificateurs.length > 0) {
      const validModifs = modificateurs
        .filter(m => m.id_stat)
        .map(m => ({
          id_competence: idCompetence,
          id_stat: m.id_stat,
          valeur: m.valeur || 0,
          type_calcul: m.type_calcul || 'fixe',
          id_tag: m.id_tag || null,
          id_item: null,
          id_personnage: null,
          des_stat_id: m.des_stat_id || null,
          des_nb: m.des_nb || null,
          des_faces: m.des_faces || null,
          nom_affiche: m.nom_affiche || null
        }));
      const { error: mError } = await supabase.from('modificateurs').insert(validModifs);
      if (mError) console.error("Erreur insertion modificateurs:", mError);
    }

    if (effetsActifs.length > 0) {
      const validEffets = effetsActifs
        .filter(e => e.cible_jauge)
        .map(e => ({
          id_competence: idCompetence,
          cible_jauge: (['hp', 'mana', 'stam', 'dice', 'hp_max', 'mana_max', 'stam_max'].includes(e.cible_jauge) ? e.cible_jauge : 'hp') as 'hp' | 'mana' | 'stam' | 'dice' | 'hp_max' | 'mana_max' | 'stam_max',
          valeur: e.valeur || 0,
          des_nb: e.des_nb || null,
          des_faces: e.des_faces || null,
          des_stat_id: e.des_stat_id || null,
          est_cout: e.est_cout || false,
          est_jet_de: e.est_jet_de || false
        }));
      const { error: eError } = await supabase.from('effets_actifs').insert(validEffets);
      if (eError) {
        console.error("Erreur insertion effets:", eError);
        // Fallback si la colonne dice pose problème
        if (validEffets.some(ve => ve.cible_jauge === 'dice')) {
           const fallbackEffets = validEffets.map(ve => ({ ...ve, cible_jauge: ve.cible_jauge === 'dice' ? 'hp' : ve.cible_jauge }));
           await supabase.from('effets_actifs').insert(fallbackEffets);
        }
      }
    }

    return true;
  },

  /**
   * Crée une nouvelle compétence avec modificateurs et effets_actifs
   */
  createCompetence: async (
    competenceData: { nom: string; description: string; type: string, id_session: string, condition_type?: string | null },
    modificateurs: Partial<any>[] = [],
    effetsActifs: Partial<any>[] = [],
    tagIds: string[] = []
  ): Promise<Competence | null> => {
    const finalData = {
      ...competenceData,
      condition_type: competenceData.type === 'passive_auto' ? competenceData.condition_type : null
    };

    const { data: newComp, error } = await supabase
      .from('competences')
      .insert(finalData)
      .select()
      .single();

    if (error || !newComp) {
      console.error("Erreur création compétence:", error);
      return null;
    }

    // Tags
    await tagsService.setTagsForCompetence(newComp.id, tagIds);

    if (modificateurs.length > 0) {
      const validModifs = modificateurs
        .filter(m => m.id_stat)
        .map(m => ({
          id_competence: newComp.id,
          id_stat: m.id_stat,
          valeur: m.valeur || 0,
          type_calcul: m.type_calcul || 'fixe',
          id_tag: m.id_tag || null,
          id_item: null,
          id_personnage: null,
          des_stat_id: m.des_stat_id || null,
          des_nb: m.des_nb || null,
          des_faces: m.des_faces || null,
          nom_affiche: m.nom_affiche || null
        }));

      if (validModifs.length > 0) {
        const { error: mError } = await supabase.from('modificateurs').insert(validModifs);
        if (mError) console.error("Erreur insertion modificateurs (création):", mError);
      }
    }

    if (effetsActifs.length > 0) {
      const validEffets = effetsActifs
        .filter(e => e.cible_jauge)
        .map(e => ({
          id_competence: newComp.id,
          cible_jauge: (['hp', 'mana', 'stam', 'dice', 'hp_max', 'mana_max', 'stam_max'].includes(e.cible_jauge) ? e.cible_jauge : 'hp') as 'hp' | 'mana' | 'stam' | 'dice' | 'hp_max' | 'mana_max' | 'stam_max',
          valeur: e.valeur || 0,
          des_nb: e.des_nb || null,
          des_faces: e.des_faces || null,
          des_stat_id: e.des_stat_id || null,
          est_cout: e.est_cout || false,
          est_jet_de: e.est_jet_de || false
        }));

      if (validEffets.length > 0) {
        const { error: eError } = await supabase.from('effets_actifs').insert(validEffets);
        if (eError) console.error("Erreur insertion effets (création):", eError);
      }
    }

    // Refresh to get full data with relations
    const { data: fullComp } = await supabase
      .from('competences')
      .select('*, modificateurs(*, stats:id_stat(nom), tags(nom)), effets_actifs(*), competence_tags(id_tag, tags(id, nom)), condition_type')
      .eq('id', newComp.id)
      .single();

    if (fullComp) {
      fullComp.tags = fullComp.competence_tags?.map((ct: any) => ct.tags) || [];
      fullComp.condition_tags = fullComp.competence_tags?.map((ct: any) => ct.tags) || [];
    }

    return fullComp || newComp;
  },  /**
   * Supprime une compétence
   */
  deleteCompetence: async (idCompetence: string): Promise<boolean> => {
    const { error } = await supabase
      .from('competences')
      .delete()
      .eq('id', idCompetence);
    
    if (error) {
      console.error("Erreur suppression compétence:", error);
      return false;
    }
    return true;
  },

  /**
   * Ajoute une compétence à un personnage
   */
  apprendreCompetence: async (idPersonnage: string, idCompetence: string): Promise<boolean> => {
    // Vérifie si le personnage possède déjà la compétence
    const { data: existing } = await supabase
      .from('personnage_competences')
      .select('id')
      .eq('id_personnage', idPersonnage)
      .eq('id_competence', idCompetence) // Column is id_competence
      .maybeSingle();

    if (existing) return true; // Déjà apprise

    const { error } = await supabase
      .from('personnage_competences')
      .insert({
        id_personnage: idPersonnage,
        id_competence: idCompetence
      });

    if (error) {
      console.error("Erreur ajout compétence:", error);
      return false;
    }

    return true;
  },

  /**
   * Oublier une compétence (retirer d'un personnage)
   */
  oublierCompetence: async (idPersonnage: string, idCompetence: string): Promise<boolean> => {
    const { error } = await supabase
      .from('personnage_competences')
      .delete()
      .eq('id_personnage', idPersonnage)
      .eq('id_competence', idCompetence);
      
    if (error) {
      console.error("Erreur lors du retrait de la compétence:", error);
      return false;
    }
    return true;
  }
};
