export type CategorieItem = 'Arme' | 'Armure' | 'Bijou' | 'Consommable' | 'Artéfact' | 'Divers';

export interface Item {
  id: string;
  nom: string;
  description: string;
  categorie: CategorieItem;
  cree_par?: string | null;
}

export interface Stat {
  id: string;
  nom: string;
}

export interface Modificateur {
  type: 'stat' | 'ressource';
  id_stat: string | null;
  valeur: number;
}

export interface Personnage {
  id: string;
  nom: string;
  est_pnj: boolean;
  hp_actuel: number;
  hp_max: number;
  mana_actuel: number;
  mana_max: number;
  stam_actuel: number;
  stam_max: number;
  // Ajoute d'autres propriétés si nécessaire
}

export interface InventaireEntry {
  id: string;
  quantite: number;
  equipe: boolean;
  items: Item;
}

export interface Competence {
  id: string;
  nom: string;
  description: string;
  type: string;
}

export interface PersonnageCompetence {
  id: string;
  id_personnage: string;
  id_competence: string;
  niveau?: number; // Facultatif comme demandé
  competence: Competence; // Données jointes
}
