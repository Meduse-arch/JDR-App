import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { PersonnageCompetence } from '../types';
import { usePersonnage } from './usePersonnage';
import { competenceService } from '../services/competenceService';

export function usePersonnageCompetences() {
  const { personnage } = usePersonnage();
  const [competencesAcquises, setCompetencesAcquises] = useState<PersonnageCompetence[]>([]);
  const [chargement, setChargement] = useState(true);

  const chargerCompetencesAcquises = useCallback(async (silencieux = false) => {
    if (!personnage) {
      setCompetencesAcquises([]);
      setChargement(false);
      return;
    }
    
    if (!silencieux) setChargement(true);
    
    // Étape 1 : Récupérer les liaisons
    const { data: liaisons, error: liaisonError } = await supabase
      .from('personnage_competences')
      .select('*')
      .eq('id_personnage', personnage.id);

    if (liaisonError) {
      console.error("Erreur récupération liaisons:", liaisonError);
      if (!silencieux) setChargement(false);
      return;
    }

    if (liaisons && liaisons.length > 0) {
      // Étape 2 : Récupérer les données des compétences associées avec effets et modifs
      const idsCompetences = liaisons.map(l => l.id_competences || l.id_competence || l.competence_id);
      const { data: competencesData } = await supabase
        .from('competences')
        .select('*, effets_actifs(*), modificateurs(*)')
        .in('id', idsCompetences);

      if (competencesData) {
        // Étape 3 : Fusionner les deux
        const formated = liaisons.map(liaison => {
          const l_id = liaison.id_competences || liaison.id_competence || liaison.competence_id;
          const compInfo = competencesData.find(c => c.id === l_id);
          if (!compInfo) return null;
          return {
            id: liaison.id,
            id_personnage: liaison.id_personnage,
            id_competence: l_id,
            competence: compInfo
          };
        }).filter(item => item !== null);
        
        setCompetencesAcquises(formated as PersonnageCompetence[]);
      }
    } else {
      setCompetencesAcquises([]);
    }
    
    if (!silencieux) setChargement(false);
  }, [personnage]);

  useEffect(() => {
    // Premier chargement normal
    chargerCompetencesAcquises();
  }, [chargerCompetencesAcquises]);

  const apprendre = async (idCompetence: string) => {
    if (!personnage) return false;
    const success = await competenceService.apprendreCompetence(personnage.id, idCompetence);
    if (success) {
      // Rafraichissement silencieux pour éviter que la page clignote
      await chargerCompetencesAcquises(true);
    }
    return success;
  };

  const oublier = async (idPersonnage: string, idCompetence: string, idLiaison: string) => {
    const success = await competenceService.oublierCompetence(idPersonnage, idCompetence);
    if (success) {
      setCompetencesAcquises(prev => prev.filter(c => c.id !== idLiaison));
    }
    return success;
  };

  return {
    competencesAcquises,
    chargement,
    apprendre,
    oublier,
    chargerCompetencesAcquises
  };
}
