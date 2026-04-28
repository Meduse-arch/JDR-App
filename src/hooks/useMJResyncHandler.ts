import { useEffect } from 'react';
import { peerService } from '../services/peerService';
import { personnageService } from '../services/personnageService';
import { itemsService } from '../services/itemsService';
import { competenceService } from '../services/competenceService';
import { useStore } from '../store/useStore';

export function useMJResyncHandler() {
  const db = (window as any).db;

  useEffect(() => {
    if (!peerService.isHost) return;

    // Gestion de la resync d'un personnage spécifique ou globale
    const unsubResync = peerService.onResyncRequest(async (characterId, fromPeerId) => {
      if (characterId) {
        const fullPerso = await personnageService.recalculerStats(characterId);
        if (fullPerso) {
          peerService.sendToJoueur(fromPeerId, {
            type: 'RESYNC_RESPONSE',
            payload: fullPerso
          });
        }
      } else {
        // RESYNC GLOBALE (Bibliothèques)
        const sessionActive = useStore.getState().sessionActive;
        if (!sessionActive) return;
        
        const [items, stats, competences] = await Promise.all([
          itemsService.getItems(sessionActive.id),
          itemsService.getStats(),
          competenceService.getCompetences(sessionActive.id)
        ]);

        peerService.sendToJoueur(fromPeerId, {
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'library_update', items, stats }
        });
        peerService.sendToJoueur(fromPeerId, {
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'library_update_competences', competences }
        });
      }
    });

    // Gestion de la demande de liste de personnages d'un compte
    const unsubList = peerService.onListCharactersRequest(async (compteId, fromPeerId) => {
      try {
        const res = await db.personnages.getAll();
        if (res.success) {
          // On suppose que la session active est celle du MJ
          // On pourrait aussi filtrer par session si besoin
          const raw = res.data.filter((p: any) => p.lie_au_compte === compteId && p.is_template === 0);
          const hydrated = await personnageService.hydraterPersonnages(raw);
          
          peerService.sendToJoueur(fromPeerId, {
            type: 'LIST_CHARACTERS_RESPONSE',
            personnages: hydrated
          });
        }
      } catch (e) {
        console.error("Erreur ListCharactersRequest:", e);
      }
    });

    return () => {
      unsubResync();
      unsubList();
    };
  }, []);
}
