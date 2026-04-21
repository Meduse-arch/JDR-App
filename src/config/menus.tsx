import { ReactNode } from 'react';
import { RUNES_PAGES } from './runes';

const RuneIcon = ({ rune }: { rune: string }) => (
  <span className="font-cinzel text-xl">{rune}</span>
);

export interface MenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  rune?: string;
}

export const menuMJ: MenuItem[] = [
  { id: 'dashboard',   label: 'Tableau de bord', icon: <RuneIcon rune={RUNES_PAGES['dashboard']} />,   rune: RUNES_PAGES['dashboard'] },
  { id: 'selection-personnage', label: 'Sélection Personnage', icon: <RuneIcon rune={RUNES_PAGES['selection-personnage']} />, rune: RUNES_PAGES['selection-personnage'] },
  { id: 'lancer-des',  label: 'Lancer de dé',    icon: <RuneIcon rune={RUNES_PAGES['lancer-des']} />,  rune: RUNES_PAGES['lancer-des'] },
  { id: 'map',         label: 'Carte du Monde',  icon: <RuneIcon rune={RUNES_PAGES['map']} />,         rune: RUNES_PAGES['map'] },
  { id: 'items',       label: 'Objets',          icon: <RuneIcon rune={RUNES_PAGES['items']} />,       rune: RUNES_PAGES['items'] },
  { id: 'competences', label: 'Compétences',     icon: <RuneIcon rune={RUNES_PAGES['competences']} />, rune: RUNES_PAGES['competences'] },
  { id: 'quetes',      label: 'Quêtes',          icon: <RuneIcon rune={RUNES_PAGES['quetes']} />,      rune: RUNES_PAGES['quetes'] },
  { id: 'tags',        label: 'Tags',            icon: <RuneIcon rune={RUNES_PAGES['tags']} />,        rune: RUNES_PAGES['tags'] },
  { id: 'logs',        label: 'Annales',         icon: <RuneIcon rune={RUNES_PAGES['logs']} />,        rune: RUNES_PAGES['logs'] },
  { id: 'chat',        label: 'Chat',            icon: <RuneIcon rune={RUNES_PAGES['chat']} />,        rune: RUNES_PAGES['chat'] },

];

export const menuJoueur: MenuItem[] = [
  { id: 'dashboard',       label: 'Tableau de bord', icon: <RuneIcon rune={RUNES_PAGES['dashboard']} />,       rune: RUNES_PAGES['dashboard'] },
  { id: 'selection-personnage', label: 'Sélection Personnage', icon: <RuneIcon rune={RUNES_PAGES['selection-personnage']} />, rune: RUNES_PAGES['selection-personnage'] },
  { id: 'mon-personnage',  label: 'Ma Fiche',         icon: <RuneIcon rune={RUNES_PAGES['mon-personnage']} />,  rune: RUNES_PAGES['mon-personnage'] },
  { id: 'lancer-des',      label: 'Lancer de dé',     icon: <RuneIcon rune={RUNES_PAGES['lancer-des']} />,      rune: RUNES_PAGES['lancer-des'] },
  { id: 'map',             label: 'Carte du Monde',   icon: <RuneIcon rune={RUNES_PAGES['map']} />,             rune: RUNES_PAGES['map'] },
  { id: 'mon-inventaire',  label: 'Mon Inventaire',   icon: <RuneIcon rune={RUNES_PAGES['mon-inventaire']} />,  rune: RUNES_PAGES['mon-inventaire'] },
  { id: 'mes-competences', label: 'Mes Compétences',  icon: <RuneIcon rune={RUNES_PAGES['mes-competences']} />, rune: RUNES_PAGES['mes-competences'] },
  { id: 'mes-quetes',      label: 'Mes Quêtes',       icon: <RuneIcon rune={RUNES_PAGES['mes-quetes']} />,      rune: RUNES_PAGES['mes-quetes'] },
  { id: 'chat',            label: 'Chat',             icon: <RuneIcon rune={RUNES_PAGES['chat']} />,             rune: RUNES_PAGES['chat'] },
];

const allMenus = [...menuMJ, ...menuJoueur];

export function getPageLabel(id: string): string {
  const item = allMenus.find(m => m.id === id);
  return item ? item.label.toUpperCase() : "CHARGEMENT...";
}
