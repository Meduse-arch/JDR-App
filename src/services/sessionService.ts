import { supabase } from '../supabase'
const db = (window as any).db;

export function generateMJPeerId(sessionCode: string): string {
  // Format lisible et unique : "sigil-{sessionCode}"
  // sessionCode vient de la DB SQLite (généré à la création de session)
  return `sigil-${sessionCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

export const sessionService = {
  creerSession: async (nom: string, description: string, idCompte: string, roleGlobale: string) => {
    // MIGRATION SQLite Multi-DB
    const newSessionId = crypto.randomUUID();
    const folderPath = `${nom.replace(/[^a-zA-Z0-9_-]/g, '_')}_${newSessionId.substring(0, 8)}`;
    
    // Initialize the new session DB in the backend
    await db.system.initSession(folderPath);

    const res = await db.sessions.create({
      id: newSessionId,
      nom,
      description,
      cree_par: idCompte,
      folder_path: folderPath,
      created_at: new Date().toISOString()
    });

    if (res.success && roleGlobale === 'mj') {
      await db.session_mj.create({ id_session: newSessionId, id_compte: idCompte })
    }
    return res.success
  },

  loadSession: async (folderPath: string) => {
    // Tells Electron to load the correct SQLite file for this session
    await db.system.loadSession(folderPath);
  },

  supprimerSession: async (id: string) => {
    // MIGRATION SQLite
    await db.sessions.delete(id)
  },

  getRoleDansSession: async (idSession: string, idCompte: string, roleGlobal: string) => {
    // MIGRATION SQLite
    if (roleGlobal === 'admin') return 'admin'
    const res = await db.session_mj.getAll();
    if (res.success) {
      const isMJ = res.data.some((m: any) => m.id_session === idSession && m.id_compte === idCompte);
      return isMJ ? 'mj' : 'joueur';
    }
    return 'joueur'
  },

  /**
   * Récupère les personnages d'une session par leur type
   */
  getSessionCharacters: async (sessionId: string) => {
    // MIGRATION SQLite
    const res = await db.personnages.getAll();
    if (!res.success) return { joueurs: [], pnjs: [], monstres: [] };
    const persos = res.data.filter((p: any) => p.id_session === sessionId);
    
    return {
      joueurs:  persos.filter((p: any) => p.type === 'Joueur'),
      pnjs:     persos.filter((p: any) => p.type === 'PNJ'),
      monstres: persos.filter((p: any) => p.type === 'Monstre')
    }
  },

  getSessionMJs: async (sessionId: string) => {
    // MIGRATION SQLite
    const res = await db.session_mj.getAll();
    if (!res.success) return [];
    const mjIds = res.data.filter((m: any) => m.id_session === sessionId).map((m: any) => m.id_compte);
    if (mjIds.length === 0) return [];
    
    const { data, error } = await supabase.from('comptes').select('*').in('id', mjIds);
    if (error) return []
    return data
  },

  ajouterMJ: async (sessionId: string, idCompte: string) => {
    // MIGRATION SQLite
    const res = await db.session_mj.create({ id_session: sessionId, id_compte: idCompte })
    return res.success
  },

  retirerMJ: async (sessionId: string, idCompte: string) => {
    // MIGRATION SQLite
    const res = await db.session_mj.deleteByFields({ id_session: sessionId, id_compte: idCompte })
    return res.success
  },

  getComptesDisponiblesMJ: async (sessionId: string) => {
    // MIGRATION SQLite
    const res = await db.session_mj.getAll();
    const idsDeja = res.success ? res.data.filter((m: any) => m.id_session === sessionId).map((m: any) => m.id_compte) : [];
    const { data: comptesData } = await supabase.from('comptes').select('*').in('role', ['joueur', 'mj'])
    if (comptesData) {
      return comptesData.filter((c: any) => !idsDeja.includes(c.id))
    }
    return []
  }
}
