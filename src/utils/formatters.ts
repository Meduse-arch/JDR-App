import { Stat } from '../types';

export const formatLabelModif = (m: any, stats: Stat[]) => {
  const stat = stats.find(s => s.id === m.id_stat);
  if (!stat) return `${m.valeur > 0 ? '+' : ''}${m.valeur} Stat Inconnue`;

  let emoji = '';
  const nom = stat.nom.toLowerCase();
  if (nom.includes('pv') || nom.includes('vie')) emoji = '❤️ ';
  if (nom.includes('mana')) emoji = '💧 ';
  if (nom.includes('stam')) emoji = '⚡ ';

  const labels: Record<string, string> = {
    hp: 'Soin PV',
    mana: 'Restaur. Mana',
    stam: 'Restaur. Endurance',
    hp_max: 'PV Maximum',
    mana_max: 'Mana Maximum',
    stam_max: 'Endurance Max'
  };

  const label = labels[m.type] || stat?.nom || m.type || 'Stat Inconnue';
  return `${emoji}${m.valeur > 0 ? '+' : ''}${m.valeur} ${label}`;
};
