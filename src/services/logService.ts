import { LogActivite } from '../types'

const db = (window as any).db;

export const logService = {
  async logAction(entry: Omit<LogActivite, 'id' | 'created_at'>) {
    await db.logs_activite.create({
      ...entry,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    });
  },
  
  async getLogs(sessionId: string, personnageId?: string) {
    const res = await db.logs_activite.getAll();
    if (!res.success) return [];
    
    let logs = res.data.filter((l: any) => l.id_session === sessionId);
    if (personnageId) {
      logs = logs.filter((l: any) => l.id_personnage === personnageId);
    }
    
    return logs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 200);
  }
}