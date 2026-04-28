import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { PersonnageCompetence, Personnage } from '../types';
import { usePersonnage } from './usePersonnage';
import { competenceService } from '../services/competenceService';
import { useRealtimeQuery } from './useRealtimeQuery';
import { useStore } from '../store/useStore';
import { peerService } from '../services/peerService';

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
    
    // LOGIQUE JOUEUR : via Store WebRTC
    if (!peerService.isHost) {
      if (personnage.competences) {
        setCompetencesAcquises(personnage.competences as PersonnageCompetence[]);
      }
      setChargement(false);
      return;
    }

    // LOGIQUE MJ : via SQLite
    if (!silencieux) setChargement(true);
    const db = (window as any).db;
    
    const resLiaisons = await db.personnage_competences.getAll();

    if (!resLiaisons.success || !resLiaisons.data) {
      if (!silencieux) setChargement(false);
      return;
    }

    const mesLiaisons = resLiaisons.data.filter((l: any) => l.id_personnage === personnage.id);

    if (mesLiaisons.length > 0) {
      const competencesData = await competenceService.getCompetences(sessionActive?.id || '');
      
      const formated = mesLiaisons.map((liaison: any) => {
        const compInfo = competencesData.find(c => c.id === liaison.id_competence);
        if (!compInfo) return null;
        return {
          id: liaison.id,
          id_personnage: liaison.id_personnage,
          id_competence: liaison.id_competence,
          is_active: liaison.is_active === 1,
          competence: compInfo
        };
      }).filter((item: any) => item !== null);
      
      setCompetencesAcquises(formated as PersonnageCompetence[]);
    } else {
      setCompetencesAcquises([]);
    }
    
    if (!silencieux) setChargement(false);
  }, [personnage, sessionActive?.id]);

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
      if (peerService.isHost) {
        const db = (window as any).db;
        await db.personnage_competences.update(liaisonId, { is_active: is_active ? 1 : 0 });
      } else {
        peerService.sendToMJ({
          type: 'ACTION',
          kind: 'toggle_competence',
          payload: { liaisonId, is_active }
        });
      }
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
