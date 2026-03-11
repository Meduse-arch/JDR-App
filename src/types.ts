export { type Personnage, type PersonnageType, type Session, type Compte } from './Store/useStore';

export type CategorieItem = 'Arme' | 'Armure' | 'Bijou' | 'Consommable' | 'Artéfact' | 'Divers';

export interface Item {
  id: string;
  id_session: string;
  nom: string;
  description: string;
  categorie: CategorieItem;
  cree_par?: string;
  item_modificateurs?: Modificateur[];
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

export interface Recompense {
  id: string;
  id_quete: string;
  type: 'Item' | 'Autre';
  id_item?: string | null;
  valeur: number;
  description?: string | null;
  items?: { nom: string };
}

export interface Quete {
  id: string;
  id_session: string;
  titre: string;
  description: string;
  statut: 'En cours' | 'Terminée' | 'Échouée';
  created_at?: string;
  quete_recompenses?: Recompense[];
  personnage_quetes?: { id_personnage: string; suivie: boolean; personnages?: { nom: string } }[];
}
