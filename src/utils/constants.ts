export const CATEGORIES = ['Arme', 'Armure', 'Bijou', 'Consommable', 'Artéfact', 'Divers'] as const;

export const CATEGORIE_EMOJI: Record<string, string> = {
  'Arme': '⚔️',
  'Armure': '🛡️',
  'Bijou': '💍',
  'Consommable': '🧪',
  'Artéfact': '✨',
  'Divers': '📦'
};

export const TYPES_RESSOURCES = [
  { id: 'hp', label: 'Vie', icon: '❤️', color: '#ef4444' },
  { id: 'mana', label: 'Mana', icon: '💧', color: '#3b82f6' },
  { id: 'stam', label: 'Stamina', icon: '⚡', color: '#eab308' }
];

export const CONFIG_RESSOURCES = {
  hp: { label: 'Points de Vie', color: '#ef4444', icon: '❤️', emoji: '❤️', glow: 'rgba(239, 68, 68, 0.3)', gradient: 'linear-gradient(90deg, #ef4444, #f87171)' },
  mana: { label: 'Points de Mana', color: '#3b82f6', icon: '💧', emoji: '💧', glow: 'rgba(59, 130, 246, 0.3)', gradient: 'linear-gradient(90deg, #3b82f6, #60a5fa)' },
  stam: { label: 'Stamina', color: '#eab308', icon: '⚡', emoji: '⚡', glow: 'rgba(234, 179, 8, 0.3)', gradient: 'linear-gradient(90deg, #eab308, #fbbf24)' }
} as const;

export const ORDRE_STATS = ['Force', 'Agilité', 'Constitution', 'Intelligence', 'Sagesse', 'Perception', 'Charisme'];
