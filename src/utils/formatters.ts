import { Modificateur, Stat } from '../types';
import { TYPES_RESSOURCES } from './constants';

export const formatLabelModif = (m: Modificateur, stats: Stat[]) => {
  if (m.type === 'stat') {
    const stat = stats.find(s => s.id === m.id_stat);
    return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${stat?.nom ?? '?'}`;
  }
  const res = TYPES_RESSOURCES.find(r => r.id === m.type);
  return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${res?.label ?? m.type}`;
};
