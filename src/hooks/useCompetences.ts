import { useState, useEffect, useCallback, useRef } from 'react';
import { competenceService } from '../services/competenceService';
import { Competence } from '../types';
import { useStore } from '../store/useStore';
import { useRealtimeQuery } from './useRealtimeQuery';
import { peerService } from '../services/peerService';

export function useCompetences(personnageId?: string) {
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
      if (!isRealtime) setChargement(true);
      // Determine character ID from store if not explicitly passed, wait useCompetences doesn't take an ID!
      // I should update useCompetences to accept characterId
      peerService.requestResync(personnageId, 'competences');
      return;
    }

    if (!isRealtime) setChargement(true);
    try {
      const data = await competenceService.getCompetences(sessionActive.id);
      setLibCompetences(data);
      setCompetences(data);
    } catch (e) {
      console.error(e);
    } finally {
      if (!isRealtime) setChargement(false);
    }
  }, [sessionActive?.id, personnageId, setLibCompetences]);

  useEffect(() => {
    chargerCompetences();
  }, [chargerCompetences]);

  // FIX Compétences chargement : Sync store -> local state séparé
  useEffect(() => {
    setCompetences(libCompetences);
  }, [libCompetences]);

  // Synchronisation pour les joueurs
  useEffect(() => {
    if (peerService.isHost) return;

    const unsubResponse = peerService.onResyncResponse((msg) => {
      if (msg.dataType === 'competences') {
        const { lib, persoComps } = msg.payload;
        setLibCompetences(lib);
        setCompetences(lib);
        setChargement(false);
      }
    });

    const unsubUpdate = peerService.onStateUpdate((msg) => {
      if (msg.entity === 'session' && msg.payload.type === 'library_update_competences') {
        setLibCompetences(msg.payload.competences);
        setCompetences(msg.payload.competences);
      }
    });

    return () => {
      unsubResponse();
      unsubUpdate();
    };
  }, [setLibCompetences]);

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
    if (success) {
      await chargerCompetences();
      if (peerService.isHost) {
        const newData = await competenceService.getCompetences(sessionActive!.id);
        peerService.broadcastToAll({
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'library_update_competences', competences: newData }
        });
      }
    }
    return success;
  };

  const creerCompetence = async (
    data: { nom: string; description: string; type: string; id_session: string; image_url?: string | null; condition_type?: string | null },
    modificateurs: any[] = [],
    effetsActifs: any[] = [],
    tagIds: string[] = []
  ) => {
    const newComp = await competenceService.createCompetence(data, modificateurs, effetsActifs, tagIds);
    if (newComp) {
      await chargerCompetences();
      if (peerService.isHost) {
        const newData = await competenceService.getCompetences(sessionActive!.id);
        peerService.broadcastToAll({
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'library_update_competences', competences: newData }
        });
      }
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
    const success = await competenceService.updateCompetence(id, data, modificateurs, effetsActifs, tagIds);
    if (success) {
      await chargerCompetences();
      if (peerService.isHost) {
        const newData = await competenceService.getCompetences(sessionActive!.id);
        peerService.broadcastToAll({
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'library_update_competences', competences: newData }
        });
      }
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
