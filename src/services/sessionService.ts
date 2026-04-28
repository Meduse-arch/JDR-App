import { supabase } from '../supabase'

export function generateMJPeerId(sessionCode: string): string {
  // Format lisible et unique : "sigil-{sessionCode}"
  // sessionCode vient de la DB (généré à la création de session)
  return `sigil-${sessionCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

export const sessionService = {
  creerSession: async (nom: string, description: string, idCompte: string, roleGlobale: string) => {
    // MIGRATION Supabase -> SQLite : la session elle-même reste sur Supabase
    // pour permettre la découverte en ligne. Par contre, le MJ crée un fichier SQLite.
    
    const { error, data: newSession } = await supabase
      .from('sessions').insert({ nom, description, cree_par: idCompte }).select('id').single()
    
    if (error || !newSession) {
      console.error(error)
      return false
    }

    if (roleGlobale === 'mj') {
      await supabase.from('session_mj').insert({ id_session: newSession.id, id_compte: idCompte })
      
      // Initialize the new session DB in the backend locally
      const db = (window as any).db;
      try {
        await db.system.initSession(newSession.id);
      } catch (err) {
        console.error("Erreur initSession local SQLite:", err);
      }
    }
    return true
  },

  loadSession: async (folderPath: string) => {
    // Tells Electron to load the correct SQLite file for this session
    const db = (window as any).db;
    await db.system.loadSession(folderPath);
  },

  supprimerSession: async (id: string) => {
    await supabase.from('session_mj').delete().eq('id_session', id)
    await supabase.from('sessions').delete().eq('id', id)
  },

  getRoleDansSession: async (idSession: string, idCompte: string, roleGlobal: string) => {
    if (roleGlobal === 'admin') return 'admin'
    const { data } = await supabase.from('session_mj').select('id_compte').eq('id_session', idSession).eq('id_compte', idCompte).single();
    if (data) return 'mj';
    return 'joueur'
  },

  /**
   * Récupère les personnages d'une session par leur type (RESTÉ SUR SQLITE LOCAL)
   */
  getSessionCharacters: async (sessionId: string) => {
    const db = (window as any).db;
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
    const { data: mjData } = await supabase.from('session_mj').select('id_compte').eq('id_session', sessionId);
    if (!mjData || mjData.length === 0) return [];
    
    const mjIds = mjData.map((m: any) => m.id_compte);
    const { data, error } = await supabase.from('comptes').select('*').in('id', mjIds);
    if (error) return []
    return data
  },

  ajouterMJ: async (sessionId: string, idCompte: string) => {
    const { error } = await supabase.from('session_mj').insert({ id_session: sessionId, id_compte: idCompte })
    return !error
  },

  retirerMJ: async (sessionId: string, idCompte: string) => {
    const { error } = await supabase.from('session_mj').delete().eq('id_session', sessionId).eq('id_compte', idCompte)
    return !error
  },

  getComptesDisponiblesMJ: async (sessionId: string) => {
    const { data: mjData } = await supabase.from('session_mj').select('id_compte').eq('id_session', sessionId);
    const idsDeja = mjData ? mjData.map((m: any) => m.id_compte) : [];
    const { data: comptesData } = await supabase.from('comptes').select('*').in('role', ['joueur', 'mj'])
    if (comptesData) {
      return comptesData.filter((c: any) => !idsDeja.includes(c.id))
    }
    return []
  }
}
