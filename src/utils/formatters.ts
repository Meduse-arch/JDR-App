import { Modificateur, Stat } from '../types';
import { CONFIG_RESSOURCES } from './constants';

export const formatLabelModif = (m: any, stats: Stat[]) => {
  // Si on a un id_stat, c'est une statistique de base (Force, etc.)
  if (m.id_stat) {
    const stat = stats.find(s => s.id === m.id_stat);
    return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${stat?.nom ?? 'Stat Inconnue'}`;
  }
  
  // Sinon c'est une ressource (hp, mana, stam...)
  const resKey = m.type as keyof typeof CONFIG_RESSOURCES;
  const config = CONFIG_RESSOURCES[resKey];
  
  if (config) {
    return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${config.label}`;
  }

  // Fallback
  return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${m.type || 'Inconnu'}`;
};
