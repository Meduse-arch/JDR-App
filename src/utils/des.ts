/**
 * Lance un nombre défini de dés et y ajoute un modificateur.
 * @param nbDes Le nombre de dés à lancer
 * @param faces Le nombre de faces du dé (ex: 20 pour un d20)
 * @param modificateur Le bonus/malus à ajouter au total final (par défaut 0)
 * @returns Un objet contenant les dés individuels, le modificateur et le total
 */
export function lancerDes(nbDes: number, faces: number, modificateur: number = 0) {
  // Génère un tableau avec les résultats de chaque dé
  const des = Array.from({ length: nbDes }, () => Math.floor(Math.random() * faces) + 1)
  
  // Fait la somme de tous les dés
  const sommeDes = des.reduce((total, valeurDe) => total + valeurDe, 0)
  
  // Calcule le total final avec le modificateur
  const total = sommeDes + modificateur

  return { 
    des, 
    modificateur, 
    total 
  }
}