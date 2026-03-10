/**
 * Calcule un pourcentage strict (entre 0 et 100).
 * Parfait pour l'affichage des barres de PV, Mana, Stamina.
 * @param actuel La valeur courante (ex: PV actuels)
 * @param max La valeur maximum (ex: PV max)
 * @returns Le pourcentage calculé (ex: 50 pour 50%)
 */
export function calculPourcentage(actuel: number, max: number): number {
  // Sécurité pour éviter la division par zéro si un perso est mal configuré
  if (max === 0) return 0
  
  const pourcentage = (actuel / max) * 100
  
  // On s'assure que la barre ne dépasse jamais 100% ou ne descende pas sous 0%
  return Math.max(0, Math.min(100, pourcentage))
}
