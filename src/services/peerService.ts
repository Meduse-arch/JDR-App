import Peer, { DataConnection } from 'peerjs';
import { 
  ActionMessage, 
  StateUpdateMessage, 
  ResyncRequestMessage, 
  ResyncResponseMessage, 
  ListCharactersRequestMessage,
  ListCharactersResponseMessage,
  WebRTCMessage 
} from '../types/webrtc';

class PeerService {
  public peer: Peer | null = null;
  public isHost: boolean = false;
  public connections: Map<string, DataConnection> = new Map();

  // Handlers for specific event types
  private actionHandlers: Array<(msg: ActionMessage, fromPeerId: string) => void> = [];
  private stateUpdateHandlers: Array<(msg: StateUpdateMessage) => void> = [];
  private joueurConnectedHandlers: Array<(peerId: string) => void> = [];
  private joueurDisconnectedHandlers: Array<(peerId: string) => void> = [];
  private resyncRequestHandlers: Array<(characterId: string | undefined, fromPeerId: string) => void> = [];
  private resyncResponseHandlers: Array<(msg: ResyncResponseMessage) => void> = [];
  private listCharactersRequestHandlers: Array<(compteId: string, fromPeerId: string) => void> = [];
  private listCharactersResponseHandlers: Array<(msg: ListCharactersResponseMessage) => void> = [];

  private hostConnection: DataConnection | null = null;

  async initAsMJ(mjPeerId: string): Promise<void> {
    this.destroy(); // Nettoyage préalable
    this.isHost = true;
    
    return new Promise((resolve, reject) => {
      this.peer = new Peer(mjPeerId, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        }
      });
      
      this.peer.on('open', () => resolve());
      this.peer.on('error', (err) => reject(err));
      
      this.peer.on('connection', (conn) => {
        this.connections.set(conn.peer, conn);
        
        conn.on('open', () => {
          this.joueurConnectedHandlers.forEach(cb => cb(conn.peer));
        });
        
        conn.on('close', () => {
          this.connections.delete(conn.peer);
          this.joueurDisconnectedHandlers.forEach(cb => cb(conn.peer));
        });
        
        conn.on('data', (data: unknown) => {
          this.handleIncomingData(data as WebRTCMessage, conn.peer);
        });
      });
    });
  }

  async initAsJoueur(mjPeerId: string, joueurPeerId: string): Promise<void> {
    this.destroy(); // Nettoyage préalable
    this.isHost = false;
    
    return new Promise((resolve, reject) => {
      this.peer = new Peer(joueurPeerId, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        }
      });
      
      this.peer.on('open', () => {
        const conn = this.peer!.connect(mjPeerId);
        this.hostConnection = conn;
        
        conn.on('open', () => resolve());
        
        conn.on('close', () => {
          console.log('Connexion au MJ perdue');
          this.hostConnection = null;
        });
        
        conn.on('error', (err) => reject(err));
        
        conn.on('data', (data: unknown) => {
          this.handleIncomingData(data as WebRTCMessage, mjPeerId);
        });
      });
      
      this.peer.on('error', (err) => reject(err));
    });
  }

  destroy(): void {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections.clear();
    this.hostConnection = null;
    this.isHost = false;
  }

  private handleIncomingData(data: WebRTCMessage, fromPeerId: string) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'ACTION':
        this.actionHandlers.forEach(cb => cb(data as ActionMessage, fromPeerId));
        break;
      case 'STATE_UPDATE':
        this.stateUpdateHandlers.forEach(cb => cb(data as StateUpdateMessage));
        break;
      case 'RESYNC_REQUEST':
        this.resyncRequestHandlers.forEach(cb => cb((data as ResyncRequestMessage).characterId, fromPeerId));
        break;
      case 'RESYNC_RESPONSE':
        this.resyncResponseHandlers.forEach(cb => cb(data as ResyncResponseMessage));
        break;
      case 'LIST_CHARACTERS_REQUEST':
        this.listCharactersRequestHandlers.forEach(cb => cb((data as ListCharactersRequestMessage).compteId, fromPeerId));
        break;
      case 'LIST_CHARACTERS_RESPONSE':
        this.listCharactersResponseHandlers.forEach(cb => cb(data as ListCharactersResponseMessage));
        break;
    }
  }

  // --- Méthodes d'Envoi ---

  sendToMJ(message: ActionMessage | ResyncRequestMessage | ListCharactersRequestMessage): void {
    if (!this.isHost && this.hostConnection) {
      this.hostConnection.send(message);
    }
  }

  broadcastToAll(message: StateUpdateMessage): void {
    if (this.isHost) {
      this.connections.forEach(conn => conn.send(message));
    }
  }

  sendToJoueur(joueurPeerId: string, message: StateUpdateMessage | ResyncResponseMessage | ListCharactersResponseMessage): void {
    if (this.isHost) {
      this.connections.get(joueurPeerId)?.send(message);
    }
  }

  // --- Resync ---

  requestResync(characterId?: string): void {
    if (!this.isHost && this.hostConnection) {
      const msg: ResyncRequestMessage = { type: 'RESYNC_REQUEST', characterId };
      this.hostConnection.send(msg);
    }
  }

  requestListCharacters(compteId: string): void {
    if (!this.isHost && this.hostConnection) {
      const msg: ListCharactersRequestMessage = { type: 'LIST_CHARACTERS_REQUEST', compteId };
      this.hostConnection.send(msg);
    }
  }

  // --- Abonnements (retournent une fonction de désabonnement pour useEffect) ---

  onAction(handler: (msg: ActionMessage, fromPeerId: string) => void): () => void {
    this.actionHandlers.push(handler);
    return () => { this.actionHandlers = this.actionHandlers.filter(h => h !== handler); };
  }

  onStateUpdate(handler: (msg: StateUpdateMessage) => void): () => void {
    this.stateUpdateHandlers.push(handler);
    return () => { this.stateUpdateHandlers = this.stateUpdateHandlers.filter(h => h !== handler); };
  }

  onJoueurConnected(handler: (peerId: string) => void): () => void {
    this.joueurConnectedHandlers.push(handler);
    return () => { this.joueurConnectedHandlers = this.joueurConnectedHandlers.filter(h => h !== handler); };
  }

  onJoueurDisconnected(handler: (peerId: string) => void): () => void {
    this.joueurDisconnectedHandlers.push(handler);
    return () => { this.joueurDisconnectedHandlers = this.joueurDisconnectedHandlers.filter(h => h !== handler); };
  }

  onResyncRequest(handler: (characterId: string | undefined, fromPeerId: string) => void): () => void {
    this.resyncRequestHandlers.push(handler);
    return () => { this.resyncRequestHandlers = this.resyncRequestHandlers.filter(h => h !== handler); };
  }

  onResyncResponse(handler: (msg: ResyncResponseMessage) => void): () => void {
    this.resyncResponseHandlers.push(handler);
    return () => { this.resyncResponseHandlers = this.resyncResponseHandlers.filter(h => h !== handler); };
  }

  onListCharactersRequest(handler: (compteId: string, fromPeerId: string) => void): () => void {
    this.listCharactersRequestHandlers.push(handler);
    return () => { this.listCharactersRequestHandlers = this.listCharactersRequestHandlers.filter(h => h !== handler); };
  }

  onListCharactersResponse(handler: (msg: ListCharactersResponseMessage) => void): () => void {
    this.listCharactersResponseHandlers.push(handler);
    return () => { this.listCharactersResponseHandlers = this.listCharactersResponseHandlers.filter(h => h !== handler); };
  }
}

export const peerService = new PeerService();
