import { Quete, Recompense } from '../types'

const db = (window as any).db;

export const queteService = {
  /**
   * Récupère toutes les quêtes d'une session (Admin/MJ)
   */
  getQuetes: async (sessionId: string): Promise<Quete[]> => {
    // MIGRATION: jointure SQL en JS
    const resQuetes = await db.quetes.getAll();
    if (!resQuetes.success) return [];
    const quetes = resQuetes.data.filter((q: any) => q.id_session === sessionId).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const resRecompenses = await db.quete_recompenses.getAll();
    const resItems = await db.items.getAll();
    const resPersoQuetes = await db.personnage_quetes.getAll();
    const resPersos = await db.personnages.getAll();

    return quetes.map((q: any) => {
      const recompenses = resRecompenses.data?.filter((r: any) => r.id_quete === q.id).map((r: any) => ({
        ...r,
        items: resItems.data?.find((i: any) => i.id === r.id_item) || null
      })) || [];

      const personnageQuetes = resPersoQuetes.data?.filter((pq: any) => pq.id_quete === q.id).map((pq: any) => ({
        ...pq,
        personnages: resPersos.data?.find((p: any) => p.id === pq.id_personnage) || null,
        suivie: pq.suivie === 1
      })) || [];

      return {
        ...q,
        quete_recompenses: recompenses,
        personnage_quetes: personnageQuetes
      };
    });
  },

  /**
   * Récupère les quêtes assignées à un personnage (Joueur)
   */
  getQuetesPersonnage: async (personnageId: string): Promise<Quete[]> => {
    // MIGRATION: jointure SQL en JS
    const resPersoQuetes = await db.personnage_quetes.getAll();
    if (!resPersoQuetes.success) return [];
    const persoQuetes = resPersoQuetes.data.filter((pq: any) => pq.id_personnage === personnageId);

    const resQuetes = await db.quetes.getAll();
    const resRecompenses = await db.quete_recompenses.getAll();
    const resItems = await db.items.getAll();

    return persoQuetes.map((pq: any) => {
      const quete = resQuetes.data?.find((q: any) => q.id === pq.id_quete);
      if (!quete) return null;

      const recompenses = resRecompenses.data?.filter((r: any) => r.id_quete === quete.id).map((r: any) => ({
        ...r,
        items: resItems.data?.find((i: any) => i.id === r.id_item) || null
      })) || [];

      return {
        ...quete,
        quete_recompenses: recompenses,
        suivie: pq.suivie === 1
      };
    }).filter(Boolean);
  },

  /**
   * Crée ou modifie une quête (Logique unifiée)
   */
  upsertQuete: async (
    sessionId: string, 
    quete: Partial<Quete>, 
    participantsIds: string[], 
    recompenses: Partial<Recompense>[]
  ): Promise<boolean> => {
    const isUpdate = !!quete.id;
    
    const queteData = { 
      titre: quete.titre, 
      description: quete.description, 
      statut: quete.statut || 'En cours',
      image_url: quete.image_url || null,
      id_session: sessionId 
    };

    let queteId = quete.id;
    if (isUpdate) {
      const res = await db.quetes.update(quete.id, queteData);
      if (!res.success) return false;
    } else {
      queteId = crypto.randomUUID();
      const res = await db.quetes.create({ ...queteData, id: queteId, created_at: new Date().toISOString() });
      if (!res.success) return false;
    }

    const resRec = await db.quete_recompenses.getAll();
    if (resRec.success) {
      const toDelete = resRec.data.filter((r: any) => r.id_quete === queteId);
      for (const r of toDelete) await db.quete_recompenses.delete(r.id);
    }

    if (recompenses.length > 0) {
      for (const r of recompenses) {
        await db.quete_recompenses.create({
          id: crypto.randomUUID(),
          id_quete: queteId,
          type: r.type,
          id_item: r.id_item || null,
          valeur: r.valeur || 0,
          description: r.description || null
        });
      }
    }

    const resPQ = await db.personnage_quetes.getAll();
    const current = resPQ.data?.filter((pq: any) => pq.id_quete === queteId) || [];
    const currentIds = current.map((p: any) => p.id_personnage);
    
    const toDeletePQ = currentIds.filter((id: string) => !participantsIds.includes(id));
    const toAddPQ    = participantsIds.filter((id: string) => !currentIds.includes(id));

    for (const pid of toDeletePQ) {
      await db.personnage_quetes.deleteByFields({ id_quete: queteId, id_personnage: pid });
    }
    for (const pid of toAddPQ) {
      await db.personnage_quetes.create({ id_personnage: pid, id_quete: queteId, suivie: 0 });
    }

    return true;
  },

  modifierStatut: async (queteId: string, statut: string) => {
    const res = await db.quetes.update(queteId, { statut });
    return res.success;
  },

  supprimerQuete: async (queteId: string) => {
    const res = await db.quetes.delete(queteId);
    return res.success;
  },

  toggleSuivreQuete: async (personnageId: string, queteId: string, suivie: boolean) => {
    await db.personnage_quetes.deleteByFields({ id_personnage: personnageId, id_quete: queteId });
    const res = await db.personnage_quetes.create({
      id_personnage: personnageId,
      id_quete: queteId,
      suivie: suivie ? 1 : 0
    });
    return res.success;
  },

  assignerQuete: async (personnageId: string, queteId: string): Promise<boolean> => {
    const resAll = await db.personnage_quetes.getAll();
    if (resAll.success && resAll.data.some((pq: any) => pq.id_personnage === personnageId && pq.id_quete === queteId)) {
      return true;
    }
    const res = await db.personnage_quetes.create({ id_personnage: personnageId, id_quete: queteId, suivie: 0 });
    return res.success;
  },

  desassignerQuete: async (personnageId: string, queteId: string): Promise<boolean> => {
    const res = await db.personnage_quetes.deleteByFields({ id_personnage: personnageId, id_quete: queteId });
    return res.success;
  },
}