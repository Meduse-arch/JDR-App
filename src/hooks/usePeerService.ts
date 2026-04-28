import { useEffect, useState } from 'react';
import { peerService } from '../services/peerService';
import { ActionMessage, StateUpdateMessage } from '../types/webrtc';

export function usePeerService() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedJoueurs, setConnectedJoueurs] = useState<string[]>([]);

  useEffect(() => {
    // Initialisation avec l'état actuel du service
    setIsConnected(peerService.peer !== null && !peerService.peer.disconnected);
    setConnectedJoueurs(Array.from(peerService.connections.keys()));

    const unsubConnected = peerService.onJoueurConnected((peerId) => {
      setConnectedJoueurs(prev => [...prev, peerId]);
    });

    const unsubDisconnected = peerService.onJoueurDisconnected((peerId) => {
      setConnectedJoueurs(prev => prev.filter(id => id !== peerId));
    });

    // Check périodique optionnel si le peer est connecté
    const interval = setInterval(() => {
      setIsConnected(peerService.peer !== null && !peerService.peer.disconnected);
    }, 1000);

    // Après initAsJoueur réussi, écouter les déconnexions
    if (peerService.peer) {
      peerService.peer.on('disconnected', () => {
        console.log('[PeerJS] Déconnecté du MJ, tentative de reconnexion...');
        setTimeout(() => {
          peerService.peer?.reconnect();
        }, 2000); // attendre 2s avant retry
      });
    }

    return () => {
      unsubConnected();
      unsubDisconnected();
      clearInterval(interval);
    };
  }, []);

  return {
    isConnected,
    connectedJoueurs,
    sendAction: (msg: ActionMessage) => peerService.sendToMJ(msg),
    onStateUpdate: (handler: (msg: StateUpdateMessage) => void) => peerService.onStateUpdate(handler),
  };
}
