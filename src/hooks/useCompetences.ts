import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { competenceService } from '../services/competenceService';
import { Competence } from '../types';
import { useStore } from '../store/useStore';

export function useCompetences() {
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [chargement, setChargement] = useState(false);

  const sessionActive = useStore(s => s.sessionActive);

  const chargerCompetences = useCallback(async () => {
    if (!sessionActive?.id) {
      setCompetences([]);
      return;
    }
    setChargement(true);
    const data = await competenceService.getCompetences(sessionActive.id);
    setCompetences(data);
    setChargement(false);
  }, [sessionActive?.id]);

  useEffect(() => {
    chargerCompetences();
  }, [chargerCompetences]);

  useEffect(() => {
    if (!sessionActive?.id) return;

    // Synchro Realtime
    const channel = supabase
      .channel('competences-lib-' + sessionActive.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competences', filter: `id_session=eq.${sessionActive.id}` }, () => {
        console.log('Realtime change: competences');
        chargerCompetences();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'modificateurs' }, () => {
        console.log('Realtime change: modificateurs');
        chargerCompetences();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'effets_actifs' }, () => {
        console.log('Realtime change: effets_actifs');
        chargerCompetences();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionActive?.id, chargerCompetences]);

  const supprimerCompetence = async (id: string) => {
    setCompetences(prev => prev.filter(c => c.id !== id)); // Optimistic update
    const success = await competenceService.deleteCompetence(id);
    if (!success) {
      chargerCompetences(); // Rollback in case of error
    }
    return success;
  };

  const creerCompetence = async (
    data: { nom: string; description: string; type: string, id_session: string },
    modificateurs: any[] = [],
    effetsActifs: any[] = []
  ) => {
    const newComp = await competenceService.createCompetence(data, modificateurs, effetsActifs);
    if (newComp) {
      setCompetences(prev => [...prev, newComp].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
    }
    return newComp;
  };

  const modifierCompetence = async (
    id: string,
    data: { nom: string; description: string; type: string },
    modificateurs: any[] = [],
    effetsActifs: any[] = []
  ) => {
    const success = await competenceService.updateCompetence(id, data, modificateurs, effetsActifs);
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
