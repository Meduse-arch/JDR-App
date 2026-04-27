import { EffetActif } from '../types'

/**
 * Vérifie si un personnage a assez de ressources pour payer les coûts d'une compétence ou d'un item.
 * Ne vérifie que les coûts fixes (les coûts basés sur des dés sont imprévisibles).
 * 
 * @returns { string | null } Un message d'erreur si les ressources sont insuffisantes, sinon null.
 */
export const verifierCoutsFixes = (
  effets: Partial<EffetActif>[], 
  personnage: any, 
  labels: Record<string, string>,
  sourceNom: string
): string | null => {
  for (const e of effets) {
    if (!e.est_cout) continue;
    const jauge = e.cible_jauge?.toLowerCase();
    if (!jauge || !labels[jauge]) continue;

    const coutValue = Math.abs(e.valeur || 0);
    
    // On ne vérifie que les coûts fixes (pas de dés)
    if (!e.des_nb && !e.des_stat_id) {
      const actuel = (personnage as any)[jauge] ?? 0;
      if (actuel < coutValue) {
        return `Pas assez de ${labels[jauge]} pour utiliser ${sourceNom} ! (${actuel}/${coutValue})`;
      }
    }
  }
  return null;
}

/**
 * Filtre les compétences selon les filtres principal et secondaire.
 */
export const filtrerCompetences = (
  competences: any[], 
  recherche: string, 
  filtrePrincipal: string, 
  filtreSecondaire: string
) => {
  return competences
    .filter(c => {
      // Pour les liaisons personnage_competences (c.competence) ou compétences directes (c)
      const comp = c.competence || c;
      const type = comp.type;
      
      if (filtrePrincipal === 'Tous') return true;
      if (filtrePrincipal === 'Actif') return type === 'active';
      if (filtrePrincipal === 'Passif') {
        if (filtreSecondaire === 'Tous') return type === 'passive_auto' || type === 'passive_toggle';
        if (filtreSecondaire === 'Auto') return type === 'passive_auto';
        if (filtreSecondaire === 'Toggle') return type === 'passive_toggle';
      }
      return true;
    })
    .filter(c => {
      const comp = c.competence || c;
      return (comp.nom || '').toLowerCase().includes(recherche.toLowerCase());
    });
}
