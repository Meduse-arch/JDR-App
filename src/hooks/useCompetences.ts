import { useState, useEffect, useCallback, useRef } from 'react';
import { competenceService } from '../services/competenceService';
import { Competence } from '../types';
import { useStore } from '../store/useStore';
import { useRealtimeQuery } from './useRealtimeQuery';

export function useCompetences() {
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [chargement, setChargement] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  const sessionActive = useStore(s => s.sessionActive);

  const chargerCompetences = useCallback(async (isRealtime = false) => {
    if (!sessionActive?.id) {
      setCompetences([]);
      return;
    }

    if (isRealtime && Date.now() - lastUpdateRef.current < 1000) return;

    if (!isRealtime) setChargement(true);
    const data = await competenceService.getCompetences(sessionActive.id);
    setCompetences(data);
    if (!isRealtime) setChargement(false);
  }, [sessionActive?.id]);

  useEffect(() => {
    chargerCompetences();
  }, [chargerCompetences]);

  useRealtimeQuery({
    tables: [
      { table: 'competences', filtered: false },
      { table: 'modificateurs', filtered: false },
      { table: 'effets_actifs', filtered: false },
      { table: 'personnage_competences', filtered: false },
    ],
    sessionId: sessionActive?.id,
    onReload: () => chargerCompetences(true),
    enabled: !!sessionActive
  });

  const supprimerCompetence = async (id: string) => {
    const memoire = [...competences];
    lastUpdateRef.current = Date.now();
    setCompetences(prev => prev.filter(c => c.id !== id)); // Optimistic update
    const success = await competenceService.deleteCompetence(id);
    if (!success) {
      setCompetences(memoire); // Rollback in case of error
    }
    return success;
  };

  const creerCompetence = async (
    data: { nom: string; description: string; type: string; id_session: string; image_url?: string | null; condition_type?: string | null },
    modificateurs: any[] = [],
    effetsActifs: any[] = [],
    tagIds: string[] = []
  ) => {
    lastUpdateRef.current = Date.now();
    const newComp = await competenceService.createCompetence(data, modificateurs, effetsActifs, tagIds);
    if (newComp) {
      setCompetences(prev => [...prev, newComp].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
    }
    return newComp;
  };

  const modifierCompetence = async (
    id: string,
    data: { nom: string; description: string; type: string; image_url?: string | null; condition_type?: string | null },
    modificateurs: any[] = [],
    effetsActifs: any[] = [],
    tagIds: string[] = []
  ) => {
    lastUpdateRef.current = Date.now();
    const success = await competenceService.updateCompetence(id, data, modificateurs, effetsActifs, tagIds);
    if (success) {
      await chargerCompetences();
    }
    return success;
  };

  return {
    competences,
    chargement,
    chargerCompetences,
    supprimerCompetence,
    creerCompetence,
    modifierCompetence
  };
}
