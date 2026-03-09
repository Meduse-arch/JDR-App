import { supabase } from '../supabase';
import { Competence } from '../types';

export const competenceService = {
  /**
   * Récupère toutes les compétences de la base de données
   */
  getCompetences: async (): Promise<Competence[]> => {
    const { data, error } = await supabase
      .from('competences')
      .select('*')
      .order('nom');
    
    if (error) {
      console.error("Erreur récupération compétences:", error);
      return [];
    }
    return data || [];
  },

  /**
   * Crée une nouvelle compétence
   */
  createCompetence: async (
    competenceData: { nom: string; description: string; type: string }
  ): Promise<Competence | null> => {
    const { data: newComp, error } = await supabase
      .from('competences')
      .insert(competenceData)
      .select()
      .single();

    if (error || !newComp) {
      console.error("Erreur création compétence:", error);
      return null;
    }
    return newComp;
  },

  /**
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
