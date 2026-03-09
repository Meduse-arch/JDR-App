import { CategorieItem } from '../types';

export const CATEGORIES: CategorieItem[] = [
  'Arme',
  'Armure',
  'Bijou',
  'Consommable',
  'Artéfact',
  'Divers',
];

export const CATEGORIE_EMOJI: Record<CategorieItem, string> = {
  Arme: '⚔️',
  Armure: '🛡️',
  Bijou: '💍',
  Consommable: '🧪',
  Artéfact: '✨',
  Divers: '📦',
};

export const TYPES_RESSOURCES = [
  { id: 'hp',       label: '❤️ PV actuel'   },
  { id: 'mana',     label: '💧 Mana actuel'  },
  { id: 'stam',     label: '⚡ Stamina actuel'},
  { id: 'hp_max',   label: '❤️ PV max'       },
  { id: 'mana_max', label: '💧 Mana max'     },
  { id: 'stam_max', label: '⚡ Stamina max'  },
];
