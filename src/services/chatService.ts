import { supabase } from '../supabase'
import { peerService } from './peerService';
const db = (window as any).db;

export type ChatCanal = {
  id: string
  id_session: string
  nom: string | null
  type: 'general' | 'groupe' | 'prive'
  created_at: string
  participants?: ChatParticipant[]
  dernierMessage?: ChatMessage | null
}

export type ChatParticipant = {
  id_canal: string
  id_compte: string
  pseudo?: string
}

export type ChatMessage = {
  id: string
  id_canal: string
  id_session: string
  id_compte: string
  nom_affiche: string
  contenu: string | null
  image_url: string | null
  created_at: string
}

export const chatService = {

  // ── Canaux ──────────────────────────────────────────────────────────────────

  async getCanaux(sessionId: string, compteId: string, isMJ: boolean): Promise<ChatCanal[]> {
    // MIGRATION SQLite
    const resCanaux = await db.chat_canaux.getAll();
    if (!resCanaux.success) return [];
    let canaux = resCanaux.data.filter((c: any) => c.id_session === sessionId).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const resParticipants = await db.chat_participants.getAll();
    const participations = resParticipants.success ? resParticipants.data.filter((p: any) => canaux.some((c: any) => c.id === p.id_canal)) : [];

    const compteIds = Array.from(new Set(participations.map((p: any) => p.id_compte)));
    const { data: comptesData } = await supabase.from('comptes').select('id, pseudo').in('id', compteIds);

    const visibles = canaux.filter((canal: any) => {
      if (canal.type === 'general') return true;
      if (isMJ) return true;
      return participations.some((p: any) => p.id_canal === canal.id && p.id_compte === compteId);
    });

    return visibles.map((canal: any) => ({
      ...canal,
      participants: participations.filter((p: any) => p.id_canal === canal.id).map((p: any) => ({
        id_canal: p.id_canal,
        id_compte: p.id_compte,
        pseudo: comptesData?.find((c: any) => c.id === p.id_compte)?.pseudo,
      }))
    })) as ChatCanal[];
  },

  async creerCanalGeneral(sessionId: string): Promise<ChatCanal | null> {
    // MIGRATION SQLite
    const resCanaux = await db.chat_canaux.getAll();
    if (resCanaux.success) {
      const existing = resCanaux.data.find((c: any) => c.id_session === sessionId && c.type === 'general');
      if (existing) return existing;
    }

    const newCanal: ChatCanal = {
      id: crypto.randomUUID(),
      id_session: sessionId,
      nom: 'Général',
      type: 'general',
      created_at: new Date().toISOString()
    };
    
    const res = await db.chat_canaux.create(newCanal);
    return res.success ? newCanal : null;
  },

  async creerCanalPrive(sessionId: string, compteIds: string[], nom?: string): Promise<ChatCanal | null> {
    // MIGRATION SQLite
    const type = compteIds.length === 2 && !nom ? 'prive' : 'groupe';
    const newCanal = {
      id: crypto.randomUUID(),
      id_session: sessionId,
      nom: nom || null,
      type,
      created_at: new Date().toISOString()
    };

    const res = await db.chat_canaux.create(newCanal);
    if (!res.success) return null;

    for (const id of compteIds) {
      await db.chat_participants.create({ id_canal: newCanal.id, id_compte: id });
    }
    return newCanal as ChatCanal;
  },

  async majParticipants(canalId: string, compteIds: string[]): Promise<boolean> {
    // MIGRATION SQLite
    await db.chat_participants.deleteByFields({ id_canal: canalId });
    for (const id of compteIds) {
      await db.chat_participants.create({ id_canal: canalId, id_compte: id });
    }
    return true;
  },

  async renommerCanal(canalId: string, nouveauNom: string): Promise<boolean> {
    // MIGRATION SQLite
    const res = await db.chat_canaux.update(canalId, { nom: nouveauNom.trim() || null });
    return res.success;
  },

  async supprimerCanal(canalId: string): Promise<boolean> {
    // MIGRATION SQLite
    const msgRes = await db.messages.getAll();
    if (msgRes.success) {
      const msgs = msgRes.data.filter((m: any) => m.id_canal === canalId);
      for (const m of msgs) await db.messages.delete(m.id);
    }

    await db.chat_participants.deleteByFields({ id_canal: canalId });
    const res = await db.chat_canaux.delete(canalId);
    return res.success;
  },

  // ── Messages ────────────────────────────────────────────────────────────────

  async getMessages(canalId: string, limit = 50): Promise<ChatMessage[]> {
    // MIGRATION SQLite
    const res = await db.messages.getAll();
    if (!res.success) return [];
    const msgs = res.data.filter((m: any) => m.id_canal === canalId).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return msgs.slice(0, limit).reverse();
  },

  async envoyerMessage(msg: {
    id_canal: string
    id_session: string
    id_compte: string
    nom_affiche: string
    contenu?: string
    image_url?: string
  }): Promise<ChatMessage | null> {
    // MIGRATION SQLite
    const newMsg = {
      ...msg,
      id: crypto.randomUUID(),
      contenu: msg.contenu || null,
      image_url: msg.image_url || null,
      created_at: new Date().toISOString()
    };
    
    if (!peerService.isHost) {
      // Les joueurs ne sauvegardent pas en DB, l'ACTION est déjà envoyée via le hook
      return newMsg as ChatMessage;
    }

    const res = await db.messages.create(newMsg);
    return res.success ? (newMsg as ChatMessage) : null;
  },

  // ── Participants ─────────────────────────────────────────────────────────────

  async mettreAJourParticipants(canalId: string, ancienIds: string[], nouveauxIds: string[]): Promise<boolean> {
    // MIGRATION SQLite
    const aAjouter = nouveauxIds.filter(id => !ancienIds.includes(id));
    const aRetirer = ancienIds.filter(id => !nouveauxIds.includes(id));

    for (const id of aRetirer) {
      await db.chat_participants.deleteByFields({ id_canal: canalId, id_compte: id });
    }
    for (const id of aAjouter) {
      await db.chat_participants.create({ id_canal: canalId, id_compte: id });
    }
    return true;
  },

  // ── Membres disponibles ──────────────────────────────────────────────────────

  async getMembresSession(sessionId: string): Promise<{ id: string; pseudo: string; role: string }[]> {
    // MIGRATION SQLite
    const resMj = await db.session_mj.getAll();
    const mjIds = resMj.success ? resMj.data.filter((m: any) => m.id_session === sessionId).map((m: any) => m.id_compte) : [];

    const resPerso = await db.personnages.getAll();
    const persosLieIds = resPerso.success ? resPerso.data
      .filter((p: any) => p.id_session === sessionId && p.type === 'Joueur' && p.is_template === 0 && p.lie_au_compte)
      .map((p: any) => p.lie_au_compte) : [];

    const allIds = Array.from(new Set([...mjIds, ...persosLieIds]));
    if (allIds.length === 0) return [];

    const { data: comptesData } = await supabase.from('comptes').select('id, pseudo, role').in('id', allIds);
    return comptesData || [];
  }
}
