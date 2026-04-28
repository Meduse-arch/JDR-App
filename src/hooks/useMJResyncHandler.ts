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
      console.log(`Requête LIST_CHARACTERS reçue de ${fromPeerId} pour le compte ${compteId}`);
      try {
        const sessionActive = useStore.getState().sessionActive;
        const res = await db.personnages.getAll();
        
        if (res.success && sessionActive) {
          // Filtrer par compte ET par session active
          const raw = res.data.filter((p: any) => 
            p.lie_au_compte === compteId && 
            p.id_session === sessionActive.id && 
            p.is_template === 0
          );
          
          const hydrated = await personnageService.hydraterPersonnages(raw);
          console.log(`Envoi de ${hydrated.length} personnages à ${fromPeerId}`);
          
          peerService.sendToJoueur(fromPeerId, {
            type: 'LIST_CHARACTERS_RESPONSE',
            personnages: hydrated
          });
        } else {
          // Répondre vide plutôt que de ne pas répondre
          peerService.sendToJoueur(fromPeerId, {
            type: 'LIST_CHARACTERS_RESPONSE',
            personnages: []
          });
        }
      } catch (e) {
        console.error("Erreur ListCharactersRequest:", e);
        // Toujours envoyer une réponse pour débloquer le joueur
        peerService.sendToJoueur(fromPeerId, {
          type: 'LIST_CHARACTERS_RESPONSE',
          personnages: []
        });
      }
    });

    return () => {
      unsubResync();
      unsubList();
    };
  }, []);
}
