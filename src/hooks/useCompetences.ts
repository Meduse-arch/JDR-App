import { useState, useEffect, useCallback, useRef } from 'react';
import { competenceService } from '../services/competenceService';
import { Competence } from '../types';
import { useStore } from '../store/useStore';
import { useRealtimeQuery } from './useRealtimeQuery';
import { peerService } from '../services/peerService';

export function useCompetences() {
  const sessionActive = useStore(s => s.sessionActive);
  const libCompetences = useStore(s => s.libCompetences);
  const setLibCompetences = useStore(s => s.setLibCompetences);
  
  const [competences, setCompetences] = useState<Competence[]>(libCompetences);
  const [chargement, setChargement] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  // FIX Compétences boucle infinie : Retrait de libCompetences des dépendances
  const chargerCompetences = useCallback(async (isRealtime = false) => {
    // FIX Compétences chargement : Ne pas bloquer si pas host (pour le MJ local)
    if (!sessionActive?.id) return;

    if (!peerService.isHost && (window as any).db === undefined) {
      setCompetences(libCompetences);
      return;
    }

    if (isRealtime && Date.now() - lastUpdateRef.current < 1000) return;
    lastUpdateRef.current = Date.now();

    if (!isRealtime) setChargement(true);
    try {
      const data = await competenceService.getCompetences(sessionActive.id);
      setLibCompetences(data);
      setCompetences(data);

      // Diffusion aux joueurs
      if (peerService.isHost) {
        peerService.broadcastToAll({
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'library_update_competences', competences: data }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!isRealtime) setChargement(false);
    }
  }, [sessionActive?.id, setLibCompetences]);

  useEffect(() => {
    chargerCompetences();
  }, [chargerCompetences]);

  // FIX Compétences chargement : Sync store -> local state séparé
  useEffect(() => {
    setCompetences(libCompetences);
  }, [libCompetences]);

  useRealtimeQuery({
    tables: [
      { table: 'competences', filtered: false },
      { table: 'modificateurs', filtered: false },
      { table: 'effets_actifs', filtered: false },
    ],
    sessionId: sessionActive?.id,
    onReload: () => chargerCompetences(true),
    enabled: !!sessionActive && (peerService.isHost || (window as any).db !== undefined)
  });

  const supprimerCompetence = async (id: string) => {
    const success = await competenceService.deleteCompetence(id);
    if (success) await chargerCompetences();
    return success;
  };

  const creerCompetence = async (
    data: { nom: string; description: string; type: string; id_session: string; image_url?: string | null; condition_type?: string | null },
    modificateurs: any[] = [],
    effetsActifs: any[] = [],
    tagIds: string[] = []
  ) => {
    const newComp = await competenceService.createCompetence(data, modificateurs, effetsActifs, tagIds);
    if (newComp) await chargerCompetences();
    return newComp;
  };

  const modifierCompetence = async (
    id: string,
    data: { nom: string; description: string; type: string; image_url?: string | null; condition_type?: string | null },
    modificateurs: any[] = [],
    effetsActifs: any[] = [],
    tagIds: string[] = []
  ) => {
    const success = await competenceService.updateCompetence(id, data, modificateurs, effetsActifs, tagIds);
    if (success) await chargerCompetences();
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
