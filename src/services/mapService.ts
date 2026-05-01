import { MapChannel, MapToken } from '../types';
import { peerService } from './peerService';

const getDB = () => (window as any).db;

export const mapService = {
  // ── Channels ────────────────────────────────────────────────────────────────
  
  async getChannels(sessionId: string): Promise<MapChannel[]> {
    if (!peerService.isHost) return [];
    const db = getDB();
    if (!db) return [];
    const res = await db.map_channels.getAll();
    if (!res.success) return [];
    return res.data
      .filter((c: any) => c.id_session === sessionId)
      .map((c: any) => ({
        ...c,
        active: c.active === 1
      }))
      .sort((a: any, b: any) => a.ordre - b.ordre);
  },

  async createChannel(sessionId: string, data: Partial<MapChannel>): Promise<MapChannel | null> {
    if (!peerService.isHost) return null;
    const db = getDB();
    if (!db) return null;
    const newId = crypto.randomUUID();
    const newChannel = {
      ...data,
      id: newId,
      id_session: sessionId,
      active: data.active ? 1 : 0, // SQLite: boolean -> 0/1
      created_at: new Date().toISOString()
    };
    const res = await db.map_channels.create(newChannel);
    return res.success ? (newChannel as unknown as MapChannel) : null;
  },

  async updateChannel(id: string, updates: Partial<MapChannel>): Promise<boolean> {
    if (!peerService.isHost) return false;
    const db = getDB();
    if (!db) return false;
    
    const data: any = { ...updates };
    if (updates.active !== undefined) data.active = updates.active ? 1 : 0;
    
    const res = await db.map_channels.update(id, data);
    return res.success;
  },

  async deleteChannel(id: string): Promise<boolean> {
    if (!peerService.isHost) return false;
    const db = getDB();
    if (!db) return false;
    // Supprimer aussi les tokens
    const resTokens = await db.map_tokens.getAll();
    if (resTokens.success) {
      const toDelete = resTokens.data.filter((t: any) => t.id_channel === id);
      for (const t of toDelete) await db.map_tokens.delete(t.id);
    }
    const res = await db.map_channels.delete(id);
    return res.success;
  },

  // ── Tokens ──────────────────────────────────────────────────────────────────

  async getTokens(channelId: string): Promise<MapToken[]> {
    if (!peerService.isHost) return [];
    const db = getDB();
    if (!db) return [];
    const res = await db.map_tokens.getAll();
    if (!res.success) return [];
    return res.data
      .filter((t: any) => t.id_channel === channelId)
      .map((t: any) => ({
        ...t,
        visible: t.visible === 1
      }));
  },

  async addToken(token: Partial<MapToken>): Promise<MapToken | null> {
    if (!peerService.isHost) return null;
    const db = getDB();
    if (!db) return null;
    const newId = crypto.randomUUID();
    const newToken = {
      ...token,
      id: newId,
      visible: token.visible === false ? 0 : 1, // Par défaut visible
      created_at: new Date().toISOString()
    };
    const res = await db.map_tokens.create(newToken);
    return res.success ? (newToken as unknown as MapToken) : null;
  },

  async updateToken(id: string, updates: Partial<MapToken>): Promise<boolean> {
    if (!peerService.isHost) return false;
    const db = getDB();
    if (!db) return false;
    
    const data: any = { ...updates };
    if (updates.visible !== undefined) data.visible = updates.visible ? 1 : 0;
    
    const res = await db.map_tokens.update(id, data);
    return res.success;
  },

  async deleteToken(id: string): Promise<boolean> {
    if (!peerService.isHost) return false;
    const db = getDB();
    if (!db) return false;
    const res = await db.map_tokens.delete(id);
    return res.success;
  }
};
