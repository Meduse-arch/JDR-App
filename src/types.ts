export { type Personnage, type PersonnageType, type Session, type Compte } from './store/useStore';

export type CategorieItem = 'Arme' | 'Armure' | 'Bijou' | 'Consommable' | 'Artéfact' | 'Divers';

export interface Tag {
  id: string;
  id_session: string;
  nom: string;
  description: string;
}

export interface EffetActif {
  id: string;
  id_item?: string | null;
  id_competence?: string | null;
  cible_jauge: 'hp' | 'mana' | 'stam' | 'dice' | 'hp_max' | 'mana_max' | 'stam_max';
  valeur: number;
  des_nb?: number | null;
  des_faces?: number | null;
  des_stat_id?: string | null;
  est_cout?: boolean;
  est_jet_de?: boolean;
  stats?: Stat;
}

export interface Item {
  id: string;
  id_session: string;
  nom: string;
  description: string;
  categorie: CategorieItem;
  cree_par?: string;
  modificateurs?: Modificateur[];
  effets_actifs?: EffetActif[];
  tags?: { id: string; nom: string }[];
}

export interface Stat {
  id: string;
  nom: string;
  description: string;
}

export interface Modificateur {
  id: string;
  id_stat: string;
  valeur: number;
  type_calcul: 'fixe' | 'pourcentage' | 'roll_stat' | 'roll_dice';
  id_item?: string | null;
  id_competence?: string | null;
  id_personnage?: string | null;
  id_tag?: string | null;
  des_stat_id?: string | null;
  des_nb?: number | null;
  des_faces?: number | null;
  nom_affiche?: string | null;
  stats?: Stat; // Pour récupérer le nom de la stat via une jointure Supabase
  tags?: Tag;
}

export type TypeCompetence = 'active' | 'passive_auto' | 'passive_toggle';

export interface Competence {
  id: string;
  id_session: string;
  nom: string;
  description: string;
  type: TypeCompetence;
  modificateurs?: Modificateur[];
  effets_actifs?: EffetActif[];
  tags?: { id: string; nom: string }[];
  condition_tags?: { id: string; nom: string }[];
  condition_type?: 'item' | 'skill' | 'les_deux' | null;
}

export interface PersonnageCompetence {
  id: string;
  id_personnage: string;
  id_competence: string;
  niveau?: number;
  is_active?: boolean;
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

export interface LogActivite {
  id: string
  id_session: string
  id_personnage: string
  nom_personnage: string
  type: 'des' | 'competence' | 'item' | 'ressource' | 'inventaire'
  action: string
  details?: Record<string, any>
  created_at: string
}

export interface MapChannel {
  id: string
  id_session: string
  nom: string
  image_url?: string | null
  grille_taille: number
  largeur: number
  hauteur: number
  ordre: number
  active: boolean
  created_at?: string
}

export interface MapToken {
  id: string
  id_channel: string
  id_personnage?: string | null
  nom: string
  image_url?: string | null
  x: number
  y: number
  taille: number
  couleur: string
  visible: boolean
}

export interface ImageGalerie {
  id: string
  id_session?: string | null
  url: string
  type: 'personnage' | 'item' | 'map' | 'token' | 'autre'
  nom?: string | null
  created_at?: string
}