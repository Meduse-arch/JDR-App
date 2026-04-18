import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { PersonnageCompetence, Personnage } from '../types';
import { usePersonnage } from './usePersonnage';
import { competenceService } from '../services/competenceService';
import { useRealtimeQuery } from './useRealtimeQuery';
import { useStore } from '../store/useStore';

export function usePersonnageCompetences(personnageExterne?: Personnage | null) {
  const { personnage: personnageStore } = usePersonnage();
  const personnage = personnageExterne ?? personnageStore;
  const sessionActive = useStore(s => s.sessionActive);
  const [competencesAcquises, setCompetencesAcquises] = useState<PersonnageCompetence[]>([]);
  const [chargement, setChargement] = useState(true);
  const lastUpdateRef = useRef<number>(0);

  const chargerCompetencesAcquises = useCallback(async (silencieux = false, isRealtime = false) => {
    if (!personnage) {
      setCompetencesAcquises([]);
      setChargement(false);
      return;
    }

    if (isRealtime && Date.now() - lastUpdateRef.current < 1000) return;
    
    if (!silencieux) setChargement(true);
    
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
      const idsCompetences = liaisons.map(l => l.id_competence || l.competence_id || l.id_competences);
      const { data: competencesData } = await supabase
        .from('competences')
        .select('*, effets_actifs(*), modificateurs(*)')
        .in('id', idsCompetences);

      if (competencesData) {
        const formated = liaisons.map(liaison => {
          const l_id = liaison.id_competence || liaison.competence_id || liaison.id_competences;
          const compInfo = competencesData.find(c => c.id === l_id);
          if (!compInfo) return null;
          return {
            id: liaison.id,
            id_personnage: liaison.id_personnage,
            id_competence: l_id,
            is_active: liaison.is_active,
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
    chargerCompetencesAcquises();
  }, [chargerCompetencesAcquises]);

  useRealtimeQuery({
    tables: [
      { table: 'personnage_competences', filtered: false },
      { table: 'competences', filtered: false },
    ],
    sessionId: sessionActive?.id,
    onReload: () => chargerCompetencesAcquises(true, true),
    enabled: !!personnage
  });

  const apprendre = async (idCompetence: string) => {
    if (!personnage) return false;
    const success = await competenceService.apprendreCompetence(personnage.id, idCompetence);
    if (success) {
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

  const toggleActive = useCallback(async (liaisonId: string, is_active: boolean) => {
    const memoire = [...competencesAcquises];
    lastUpdateRef.current = Date.now();

    // Optimistic
    setCompetencesAcquises(prev => prev.map(c => 
      c.id === liaisonId ? { ...c, is_active } : c
    ));

    try {
      const { error } = await supabase
        .from('personnage_competences')
        .update({ is_active })
        .eq('id', liaisonId);
      
      if (error) throw error;
    } catch (e) {
      setCompetencesAcquises(memoire);
      console.error(e);
      return false;
    }
    return true;
  }, [competencesAcquises]);

  return {
    competencesAcquises,
    chargement,
    apprendre,
    oublier,
    toggleActive,
    chargerCompetencesAcquises
  };
}
