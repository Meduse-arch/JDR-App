import { PersonnageType } from '../store/useStore'
import { personnageService } from './personnageService'

const db = (window as any).db;

export const bestiaireService = {
  /**
   * Récupère les modèles
   */
  getTemplates: async (sessionId: string, type: PersonnageType) => {
    const res = await db.personnages.getAll();
    if (!res.success) return [];
    const raw = res.data.filter((p: any) => p.id_session === sessionId && p.is_template === 1 && p.type === type);
    return await personnageService.hydraterPersonnages(raw);
  },

  /**
   * Récupère les instances actives
   */
  getInstances: async (sessionId: string, type: PersonnageType | PersonnageType[]) => {
    const res = await db.personnages.getAll();
    if (!res.success) return [];
    const raw = res.data.filter((p: any) => {
      if (p.id_session !== sessionId || p.is_template === 1) return false;
      if (Array.isArray(type)) return type.includes(p.type);
      return p.type === type;
    });
    return await personnageService.hydraterPersonnages(raw);
  },

  /**
   * Invoque (copie) un modèle vers une instance
   */
  instancier: async (template: any, sessionId: string, count: number, options?: { nom?: string, type?: PersonnageType }) => {
    try {
      for (let i = 0; i < count; i++) {
        const nomFinal = count > 1 ? `${options?.nom || template.nom} ${i + 1}` : (options?.nom || template.nom)
        const typeFinal = options?.type || template.type

        const newPersoId = crypto.randomUUID();
        // 1. Copie du personnage
        const resPerso = await db.personnages.create({
          id: newPersoId,
          id_session: sessionId,
          nom: nomFinal,
          type: typeFinal,
          is_template: 0,
          template_id: template.id,
          hp: template.hp_max || 0,
          mana: template.mana_max || 0,
          stam: template.stam_max || 0,
          created_at: new Date().toISOString()
        });

        if (!resPerso.success) {
          console.error("Erreur instanciation perso:", resPerso.error);
          continue;
        }

        // 2. Copie des stats
        const resStats = await db.personnage_stats.getAll();
        if (resStats.success) {
          const stats = resStats.data.filter((s: any) => s.id_personnage === template.id);
          for (const s of stats) {
            await db.personnage_stats.create({
              id: crypto.randomUUID(),
              id_personnage: newPersoId,
              id_stat: s.id_stat,
              valeur: s.valeur
            });
          }
        }

        // 3. Copie de l'inventaire
        const resInv = await db.inventaire.getAll();
        if (resInv.success) {
          const inv = resInv.data.filter((item: any) => item.id_personnage === template.id);
          for (const item of inv) {
            await db.inventaire.create({
              id: crypto.randomUUID(),
              id_personnage: newPersoId,
              id_item: item.id_item,
              quantite: item.quantite,
              equipe: item.equipe
            });
          }
        }

        // 4. Copie des compétences
        const resComp = await db.personnage_competences.getAll();
        if (resComp.success) {
          const comp = resComp.data.filter((c: any) => c.id_personnage === template.id);
          for (const c of comp) {
            await db.personnage_competences.create({
              id: crypto.randomUUID(),
              id_personnage: newPersoId,
              id_competence: c.id_competence,
              niveau: c.niveau,
              is_active: c.is_active || 0
            });
          }
        }

        // 5. Lien Session
        await db.session_joueurs.create({
          id_session: sessionId,
          id_personnage: newPersoId
        });
      }
      return true
    } catch (e) { 
      console.error("Erreur instancier:", e)
      return false 
    }
  },

  /**
   * Supprimer
   */
  supprimerTemplate: async (id: string) => {
    const res = await db.personnages.delete(id);
    return res.success;
  },

  supprimerInstance: async (id: string) => {
    const res = await db.personnages.delete(id);
    return res.success;
  }
}