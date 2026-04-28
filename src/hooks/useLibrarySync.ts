import { useEffect } from 'react';
import { peerService } from '../services/peerService';
import { useStore } from '../store/useStore';

export function useLibrarySync() {
  const setLibItems = useStore(s => s.setLibItems);
  const setLibCompetences = useStore(s => s.setLibCompetences);
  const setAllStats = useStore(s => s.setAllStats);
  const isHost = peerService.isHost;

  useEffect(() => {
    // Les hôtes n'ont pas besoin d'écouter les mises à jour (ils les envoient)
    if (isHost) return;

    const unsub = peerService.onStateUpdate((msg) => {
      if (msg.entity !== 'session') return;
      
      const { payload } = msg;
      if (payload.type === 'library_update') {
        if (payload.items) setLibItems(payload.items);
        if (payload.stats) {
          console.log(`[Joueur] 📚 Bibliothèque de ${payload.stats.length} statistiques reçue.`);
          setAllStats(payload.stats);
        }
      }
 else if (payload.type === 'library_update_competences') {
        if (payload.competences) setLibCompetences(payload.competences);
      } else if (payload.type === 'character_created') {
        // Déclencher une actualisation de la liste des personnages pour le joueur
        const compte = useStore.getState().compte;
        if (compte) {
          peerService.requestListCharacters(compte.id);
        }
      }
    });

    // Demander une resync initiale des bibliothèques au MJ lors de la connexion
    // On peut utiliser RESYNC_REQUEST sans characterId pour dire "tout"
    peerService.requestResync();

    return unsub;
  }, [isHost, setLibItems, setLibCompetences, setAllStats]);
}
