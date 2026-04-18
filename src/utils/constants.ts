export const CATEGORIES = ['Arme', 'Armure', 'Bijou', 'Consommable', 'Artéfact', 'Divers'] as const;

export const DECODE_DURATION = 800; // ms pour le décryptage runique par défaut

export const CATEGORIE_EMOJI: Record<string, string> = {
  'Arme': '',
  'Armure': '',
  'Bijou': '',
  'Consommable': '',
  'Artéfact': '',
  'Divers': ''
};

export const TYPES_RESSOURCES = [
  { id: 'hp', label: 'Points de Vie', icon: '', color: '#ef4444' },
  { id: 'mana', label: 'Points de Mana', icon: '', color: '#3b82f6' },
  { id: 'stam', label: 'Points de Stamina', icon: '', color: '#f59e0b' }
];

export const CONFIG_RESSOURCES = {
  hp: { label: 'Points de Vie', color: '#ef4444', icon: '', emoji: '🩸', glow: 'rgba(239, 68, 68, 0.3)', gradient: 'linear-gradient(90deg, #ef4444, #f87171)' },
  mana: { label: 'Points de Mana', color: '#3b82f6', icon: '', emoji: '💧', glow: 'rgba(59, 130, 246, 0.3)', gradient: 'linear-gradient(90deg, #3b82f6, #60a5fa)' },
  stam: { label: 'Points de Stamina', color: '#f59e0b', icon: '', emoji: '⚡', glow: 'rgba(245, 158, 11, 0.3)', gradient: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }
} as const;

export const ORDRE_STATS = ['Force', 'Agilité', 'Constitution', 'Intelligence', 'Sagesse', 'Perception', 'Charisme'];
