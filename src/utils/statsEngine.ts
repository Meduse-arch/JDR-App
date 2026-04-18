/**
 * Moteur de calcul des statistiques (Stats Engine).
 * Contient des fonctions pures pour calculer les modificateurs et totaux.
 */

export interface StatBonus {
  fixes: Record<string, number>;
  pourcentages: Record<string, number>;
}

export const statsEngine = {
  /**
   * Calcule la valeur finale d'une statistique.
   * Formule : (Base + Bonus Fixes) * (1 + Bonus Pourcentage / 100)
   * @param base Valeur de base de la stat (table personnage_stats)
   * @param fixe Somme de tous les bonus fixes pour cette stat
   * @param pct Somme de tous les bonus en % pour cette stat
   * @returns La valeur finale arrondie
   */
  calculerValeurFinale: (base: number, fixe: number, pct: number): number => {
    const basePlusFixe = base + fixe;
    return Math.round(basePlusFixe * (1 + pct / 100));
  },

  /**
   * Trie une liste de stats pour un affichage homogène dans l'UI.
   * L'ordre standard est : Force, Agilité, Constitution, Intelligence, Sagesse, Perception, Charisme.
   * @param stats La liste de stats à trier
   * @param ordreStandard L'ordre désiré (tableau de noms)
   */
  trierStats: <T extends { nom: string }>(
    stats: T[], 
    ordreStandard = ['Force', 'Agilité', 'Constitution', 'Intelligence', 'Sagesse', 'Perception', 'Charisme']
  ): T[] => {
    return [...stats].sort((a, b) => {
      const idxA = ordreStandard.indexOf(a.nom);
      const idxB = ordreStandard.indexOf(b.nom);
      
      // Si aucune n'est dans l'ordre standard, on trie alphabétiquement
      if (idxA === -1 && idxB === -1) return a.nom.localeCompare(b.nom);
      // Les stats standard d'abord
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      
      return idxA - idxB;
    });
  }
};
