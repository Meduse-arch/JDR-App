export interface RollResult {
  rolls: number[];
  total: number;
  bonus: number;
  diceString: string;
}

/**
 * Lance des dés et retourne le détail du résultat
 * @param nb Nombre de dés
 * @param faces Nombre de faces
 * @param bonus Bonus fixe à ajouter
 */
export function rollDice(nb: number, faces: number, bonus: number = 0): RollResult {
  const rolls = Array.from({ length: nb }, () => Math.floor(Math.random() * faces) + 1);
  const totalDices = rolls.reduce((a, b) => a + b, 0);
  
  return {
    rolls,
    total: totalDices + bonus,
    bonus,
    diceString: `${nb}d${faces}${bonus !== 0 ? (bonus > 0 ? `+${bonus}` : bonus) : ''}`
  };
}

/**
 * Lance un dé basé sur une statistique
 * @param statValue Valeur de la statistique (utilisée comme nombre de faces)
 * @param bonus Bonus fixe à ajouter
 * @param statNom Nom de la statistique pour l'affichage
 */
export function rollStatDice(statValue: number, bonus: number = 0, statNom: string = 'Stat'): RollResult {
  const faces = Math.max(1, statValue);
  const rolls = [Math.floor(Math.random() * faces) + 1];
  const total = rolls[0] + bonus;
  
  return {
    rolls,
    total,
    bonus,
    diceString: `1d(${statNom}=${faces})${bonus !== 0 ? (bonus > 0 ? `+${bonus}` : bonus) : ''}`
  };
}
