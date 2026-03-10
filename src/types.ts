import { Personnage } from './Store/useStore';

export type CategorieItem = 'Arme' | 'Armure' | 'Bijou' | 'Consommable' | 'Artéfact' | 'Divers';

export interface Item {
  id: string;
  id_session: string;
  nom: string;
  description: string;
  categorie: CategorieItem;
  cree_par?: string;
}

export interface Stat {
  id: string;
  nom: string;
  description: string;
}

export interface Modificateur {
  id: string;
  id_item: string;
  type: string;
  id_stat?: string | null;
  valeur: number;
}

export interface Competence {
  id: string;
  id_session: string;
  nom: string;
  description: string;
  type: string;
}

export interface PersonnageCompetence {
  id: string;
  id_personnage: string;
  id_competence: string;
  niveau?: number;
  competence: Competence;
}

export interface InventaireEntry {
  id: string;
  id_personnage: string;
  id_item: string;
  quantite: number;
  equipe: boolean;
  items: Item;
}
