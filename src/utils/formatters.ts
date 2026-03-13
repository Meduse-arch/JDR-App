import { Stat, EffetActif, Modificateur } from '../types';

export const formatLabelModif = (m: Modificateur, stats: Stat[]) => {
  const stat = stats.find(s => s.id === m.id_stat);
  const nomStat = stat?.nom || 'Stat Inconnue';
  
  let prefix = '';
  const nomLower = nomStat.toLowerCase();
  if (nomLower.includes('pv') || nomLower.includes('vie')) prefix = '❤️ ';
  if (nomLower.includes('mana')) prefix = '💧 ';
  if (nomLower.includes('stam')) prefix = '⚡ ';

  let diceStr = '';
  if (m.type_calcul === 'roll_stat' && m.des_stat_id) {
    const s = stats.find(st => st.id === m.des_stat_id);
    diceStr = `1d(${s?.nom || '?'})`;
  } else if (m.type_calcul === 'roll_dice' && m.des_nb && m.des_faces) {
    diceStr = `${m.des_nb}d${m.des_faces}`;
  }

  const valStr = m.valeur !== 0 ? (m.valeur > 0 ? `+${m.valeur}` : m.valeur) : '';
  const unit = m.type_calcul === 'pourcentage' ? '%' : '';
  
  const finalVal = diceStr ? `${diceStr}${valStr}` : `${valStr}${unit}`;
  const elementStr = m.elements ? ` (${m.elements.emoji})` : '';

  return `${prefix}${finalVal} ${nomStat}${elementStr}`;
};

export const formatLabelEffet = (e: EffetActif, stats: Stat[]) => {
  if (!e) return 'Effet inconnu';
  const labels: Record<string, string> = {
    hp: 'HP',
    mana: 'Mana',
    stam: 'Stam'
  }
  const cible = labels[e.cible_jauge] ?? '?'
  
  let diceStr = '';
  if (e.des_stat_id) {
    const stat = stats.find(s => s.id === e.des_stat_id);
    diceStr = `🎲 1d(${stat?.nom || '?'})`;
  } else if (e.des_nb && e.des_faces) {
    diceStr = `🎲 ${e.des_nb}d${e.des_faces}`;
  }

  const bonusStr = e.valeur !== 0 ? (e.valeur > 0 ? `+${e.valeur}` : e.valeur) : '';
  const finalVal = diceStr ? `${diceStr}${bonusStr}` : (e.valeur > 0 ? `+${e.valeur}` : e.valeur);

  if (e.est_jet_de) return diceStr || `${e.valeur}`
  return `${finalVal} ${cible}`
};
