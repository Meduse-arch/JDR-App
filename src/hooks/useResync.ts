import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { peerService } from '../services/peerService';

export function useResync() {
  useEffect(() => {
    const unsub = peerService.onResyncResponse((msg) => {
      // Hydrater le store Zustand avec les données reçues du MJ
      if (msg.payload?.personnage) {
        useStore.getState().setPersonnageJoueur(msg.payload.personnage);
        // Note : Si on veut mettre à jour le personnage en cours, il faut aussi recharger les hooks
        // Mais modifier le store principal force le re-render.
      }
      // On peut ajouter d'autres setters si inventaire et stats sont exposés dans le store global
    });
    return unsub;
  }, []);

  return {
    requestResync: (characterId: string) => peerService.requestResync(characterId)
  };
}
