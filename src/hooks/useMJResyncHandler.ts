import { useEffect } from 'react';
import { peerService } from '../services/peerService';

export function useMJResyncHandler() {
  useEffect(() => {
    if (!peerService.isHost) return;

    const unsub = peerService.onResyncRequest(async (fromPeerId) => {
      // Pour l'instant, on suppose que fromPeerId nous permet de trouver le characterId
      // ou bien que characterId est transporté par un hack temporaire si on ne peut pas modifier la signature.
      // D'après types/webrtc.ts, ResyncRequestMessage a un characterId.
      // Le handler onResyncRequest actuel ne passe que fromPeerId, il faut corriger peerService.ts
      console.log('Resync demandée par', fromPeerId);
    });
    return unsub;
  }, []);
}
