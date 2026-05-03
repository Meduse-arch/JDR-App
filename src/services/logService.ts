import { LogActivite } from '../types'
import { peerService } from './peerService'

const getDB = () => (window as any).db;

export const logService = {
  async logAction(entry: Omit<LogActivite, 'id' | 'created_at'>) {
    const db = getDB();
    
    if (db) {
      // LOGIQUE MJ : Sauvegarde locale
      await db.logs_activite.create({
        ...entry,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      });
      // Notifie tous les joueurs (et le MJ via le listener local) de la mise à jour
      peerService.broadcastToAll({
        type: 'STATE_UPDATE',
        entity: 'logs',
        payload: {}
      });
    } else {
      // LOGIQUE JOUEUR : Envoi WebRTC
      peerService.sendToMJ({
        type: 'ACTION',
        kind: 'log_action' as any,
        payload: entry
      });
    }
  },
  
  async getLogs(sessionId: string, personnageId?: string) {
    const db = getDB();
    if (!db) return [];
    const res = await db.logs_activite.getAll();
    if (!res.success) return [];
    
    let logs = res.data.filter((l: any) => l.id_session === sessionId);
    if (personnageId) {
      logs = logs.filter((l: any) => l.id_personnage === personnageId);
    }
    
    return logs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 200);
  }
}
