import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// ADAPTATION Supabase→SQLite : UUIDs fixes constants pour les stats de base
export const STATS_IDS = {
  FORCE:        'a1000000-0000-0000-0000-000000000001',
  AGILITE:      'a1000000-0000-0000-0000-000000000002',
  CONSTITUTION: 'a1000000-0000-0000-0000-000000000003',
  INTELLIGENCE: 'a1000000-0000-0000-0000-000000000004',
  SAGESSE:      'a1000000-0000-0000-0000-000000000005',
  CHARISME:     'a1000000-0000-0000-0000-000000000006',
  PERCEPTION:   'a1000000-0000-0000-0000-000000000007',
  PV_MAX:       'a1000000-0000-0000-0000-000000000101',
  MANA_MAX:     'a1000000-0000-0000-0000-000000000102',
  STAM_MAX:     'a1000000-0000-0000-0000-000000000103',
} as const;

export type StatId = typeof STATS_IDS[keyof typeof STATS_IDS];

// Construct the master database path in the user data directory
const masterDbPath = path.join(app.getPath('userData'), 'sigil-master.db');

// Initialize the master database
export const masterDb = new Database(masterDbPath, { verbose: console.log });
masterDb.pragma('journal_mode = WAL');

const masterInitScript = `
  CREATE TABLE IF NOT EXISTS comptes (
    id TEXT PRIMARY KEY,
    pseudo TEXT NOT NULL UNIQUE,
    mot_de_passe TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'joueur'
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    description TEXT,
    cree_par TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    folder_path TEXT,
    FOREIGN KEY (cree_par) REFERENCES comptes(id)
  );

  CREATE TABLE IF NOT EXISTS session_mj (
    id_session TEXT NOT NULL,
    id_compte TEXT NOT NULL,
    PRIMARY KEY (id_session, id_compte),
    FOREIGN KEY (id_session) REFERENCES sessions(id),
    FOREIGN KEY (id_compte) REFERENCES comptes(id)
  );
`;

masterDb.exec(masterInitScript);

let sessionDb: Database.Database | null = null;

export function loadSessionDB(folderPath: string) {
  if (sessionDb) {
    sessionDb.close();
    sessionDb = null;
  }
  
  const fullFolderPath = path.join(app.getPath('userData'), 'Sessions', folderPath);
  if (!fs.existsSync(fullFolderPath)) {
    fs.mkdirSync(fullFolderPath, { recursive: true });
  }

  const sessionDbPath = path.join(fullFolderPath, 'campagne.db');
  console.log(`[DB] Loading session database: ${sessionDbPath}`);
  sessionDb = new Database(sessionDbPath, { verbose: console.log });
  sessionDb.pragma('journal_mode = WAL');

  // 1. Création des tables (Schéma cible définitif)
  const sessionCreateTablesScript = `
  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    id_session TEXT,
    nom TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stats (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL UNIQUE,
    description TEXT,
    id_session TEXT DEFAULT NULL,
    is_systeme INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS personnages (
    id TEXT PRIMARY KEY,
    id_session TEXT,
    nom TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Joueur', 'PNJ', 'Monstre', 'Boss')),
    is_template INTEGER DEFAULT 0,
    template_id TEXT,
    lie_au_compte TEXT,
    hp INTEGER DEFAULT 0,
    mana INTEGER DEFAULT 0,
    stam INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS personnage_stats (
    id TEXT PRIMARY KEY,
    id_personnage TEXT,
    id_stat TEXT,
    valeur INTEGER DEFAULT 10,
    FOREIGN KEY (id_personnage) REFERENCES personnages(id),
    FOREIGN KEY (id_stat) REFERENCES stats(id)
  );

  CREATE TABLE IF NOT EXISTS competences (
    id TEXT PRIMARY KEY,
    id_session TEXT,
    nom TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    condition_type TEXT,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    id_session TEXT,
    nom TEXT NOT NULL,
    description TEXT,
    categorie TEXT,
    cree_par TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS chat_canaux (
    id TEXT PRIMARY KEY,
    id_session TEXT NOT NULL,
    nom TEXT,
    type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'groupe', 'prive')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_participants (
    id_canal TEXT NOT NULL,
    id_compte TEXT NOT NULL,
    PRIMARY KEY (id_canal, id_compte),
    FOREIGN KEY (id_canal) REFERENCES chat_canaux(id)
  );

  CREATE TABLE IF NOT EXISTS competence_tags (
    id_competence TEXT NOT NULL,
    id_tag TEXT NOT NULL,
    PRIMARY KEY (id_competence, id_tag),
    FOREIGN KEY (id_competence) REFERENCES competences(id),
    FOREIGN KEY (id_tag) REFERENCES tags(id)
  );

  CREATE TABLE IF NOT EXISTS effets_actifs (
    id TEXT PRIMARY KEY,
    id_item TEXT,
    id_competence TEXT,
    cible_jauge TEXT NOT NULL CHECK (cible_jauge IN ('hp', 'mana', 'stam', 'dice', 'hp_max', 'mana_max', 'stam_max')),
    valeur INTEGER NOT NULL,
    id_stat_de TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    des_nb INTEGER,
    des_faces INTEGER,
    des_stat_id TEXT,
    est_cout INTEGER DEFAULT 0,
    est_jet_de INTEGER DEFAULT 0,
    FOREIGN KEY (id_item) REFERENCES items(id),
    FOREIGN KEY (id_competence) REFERENCES competences(id),
    FOREIGN KEY (id_stat_de) REFERENCES stats(id),
    FOREIGN KEY (des_stat_id) REFERENCES stats(id)
  );

  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    id_session TEXT,
    url TEXT NOT NULL,
    type TEXT CHECK (type IN ('personnage', 'item', 'map', 'token', 'autre')),
    nom TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventaire (
    id TEXT PRIMARY KEY,
    id_personnage TEXT,
    id_item TEXT,
    quantite INTEGER DEFAULT 1,
    equipe INTEGER DEFAULT 0,
    FOREIGN KEY (id_personnage) REFERENCES personnages(id),
    FOREIGN KEY (id_item) REFERENCES items(id)
  );

  CREATE TABLE IF NOT EXISTS item_tags (
    id_item TEXT NOT NULL,
    id_tag TEXT NOT NULL,
    PRIMARY KEY (id_item, id_tag),
    FOREIGN KEY (id_item) REFERENCES items(id),
    FOREIGN KEY (id_tag) REFERENCES tags(id)
  );

  CREATE TABLE IF NOT EXISTS logs_activite (
    id TEXT PRIMARY KEY,
    id_session TEXT NOT NULL,
    id_personnage TEXT NOT NULL,
    nom_personnage TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('des', 'competence', 'item', 'ressource', 'inventaire')),
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_personnage) REFERENCES personnages(id)
  );

  CREATE TABLE IF NOT EXISTS map_channels (
    id TEXT PRIMARY KEY,
    id_session TEXT NOT NULL,
    nom TEXT NOT NULL,
    image_url TEXT,
    grille_taille INTEGER DEFAULT 50,
    largeur INTEGER DEFAULT 20,
    hauteur INTEGER DEFAULT 15,
    ordre INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    active INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS map_tokens (
    id TEXT PRIMARY KEY,
    id_channel TEXT NOT NULL,
    id_personnage TEXT,
    nom TEXT NOT NULL,
    image_url TEXT,
    x INTEGER NOT NULL DEFAULT 0,
    y INTEGER NOT NULL DEFAULT 0,
    taille INTEGER DEFAULT 1,
    couleur TEXT DEFAULT '#6366f1',
    visible INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_channel) REFERENCES map_channels(id),
    FOREIGN KEY (id_personnage) REFERENCES personnages(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    id_canal TEXT NOT NULL,
    id_session TEXT NOT NULL,
    id_compte TEXT NOT NULL,
    nom_affiche TEXT NOT NULL,
    contenu TEXT,
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_canal) REFERENCES chat_canaux(id)
  );

  CREATE TABLE IF NOT EXISTS modificateurs (
    id TEXT PRIMARY KEY,
    id_stat TEXT NOT NULL,
    valeur INTEGER NOT NULL,
    type_calcul TEXT NOT NULL DEFAULT 'fixe',
    id_item TEXT,
    id_competence TEXT,
    id_personnage TEXT,
    nom_affiche TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    id_tag TEXT,
    des_stat_id TEXT,
    des_nb INTEGER,
    des_faces INTEGER,
    FOREIGN KEY (des_stat_id) REFERENCES stats(id),
    FOREIGN KEY (id_tag) REFERENCES tags(id),
    FOREIGN KEY (id_stat) REFERENCES stats(id),
    FOREIGN KEY (id_item) REFERENCES items(id),
    FOREIGN KEY (id_competence) REFERENCES competences(id),
    FOREIGN KEY (id_personnage) REFERENCES personnages(id)
  );

  CREATE TABLE IF NOT EXISTS personnage_buff_rolls (
    id TEXT PRIMARY KEY,
    id_personnage TEXT NOT NULL,
    cache_key TEXT NOT NULL,
    valeur INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_personnage) REFERENCES personnages(id)
  );

  CREATE TABLE IF NOT EXISTS personnage_competences (
    id TEXT PRIMARY KEY,
    id_personnage TEXT,
    id_competence TEXT,
    niveau INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 0,
    FOREIGN KEY (id_personnage) REFERENCES personnages(id),
    FOREIGN KEY (id_competence) REFERENCES competences(id)
  );

  CREATE TABLE IF NOT EXISTS quetes (
    id TEXT PRIMARY KEY,
    id_session TEXT,
    titre TEXT NOT NULL,
    description TEXT,
    statut TEXT NOT NULL DEFAULT 'En cours' CHECK (statut IN ('En cours', 'Terminée', 'Échouée')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS personnage_quetes (
    id_personnage TEXT NOT NULL,
    id_quete TEXT NOT NULL,
    suivie INTEGER DEFAULT 0,
    PRIMARY KEY (id_personnage, id_quete),
    FOREIGN KEY (id_quete) REFERENCES quetes(id),
    FOREIGN KEY (id_personnage) REFERENCES personnages(id)
  );

  CREATE TABLE IF NOT EXISTS quete_recompenses (
    id TEXT PRIMARY KEY,
    id_quete TEXT,
    type TEXT NOT NULL CHECK (type IN ('Item', 'Autre')),
    id_item TEXT,
    valeur INTEGER DEFAULT 0,
    description TEXT,
    FOREIGN KEY (id_quete) REFERENCES quetes(id),
    FOREIGN KEY (id_item) REFERENCES items(id)
  );

  CREATE TABLE IF NOT EXISTS session_joueurs (
    id_session TEXT NOT NULL,
    id_personnage TEXT NOT NULL,
    PRIMARY KEY (id_session, id_personnage),
    FOREIGN KEY (id_personnage) REFERENCES personnages(id)
  );

  CREATE TABLE IF NOT EXISTS session_comptes (
    id_session TEXT NOT NULL,
    id_compte TEXT NOT NULL,
    PRIMARY KEY (id_session, id_compte)
  );
  `;
  sessionDb.exec(sessionCreateTablesScript);

  // 2. Insertion des statistiques de base (Seed) avec échappement correct des apostrophes
  const sessionSeedScript = `
  INSERT OR IGNORE INTO stats (id, nom, description, id_session, is_systeme) VALUES
  ('a1000000-0000-0000-0000-000000000001','Force','Puissance physique et force brute',NULL,0),
  ('a1000000-0000-0000-0000-000000000002','Agilité','Souplesse, réflexes et équilibre',NULL,0),
  ('a1000000-0000-0000-0000-000000000003','Constitution','Santé, endurance et résistance',NULL,0),
  ('a1000000-0000-0000-0000-000000000004','Intelligence','Capacité de raisonnement et mémoire',NULL,0),
  ('a1000000-0000-0000-0000-000000000005','Sagesse','Perception, intuition et volonté',NULL,0),
  ('a1000000-0000-0000-0000-000000000006','Charisme','Force de personnalité et magnétisme',NULL,0),
  ('a1000000-0000-0000-0000-000000000007','Perception','Acuité des sens et attention aux détails',NULL,0),
  ('a1000000-0000-0000-0000-000000000101','PV Max','Points de vie maximum',NULL,1),
  ('a1000000-0000-0000-0000-000000000102','Mana Max','Points de magie maximum',NULL,1),
  ('a1000000-0000-0000-0000-000000000103','Stamina Max','Points d''endurance maximum',NULL,1);
  `;
  sessionDb.exec(sessionSeedScript);

  // 3. Migration (Ajout de colonnes pour les anciennes DB)
  const migrations = [
    "ALTER TABLE stats ADD COLUMN id_session TEXT DEFAULT NULL",
    "ALTER TABLE stats ADD COLUMN is_systeme INTEGER DEFAULT 0",
    "ALTER TABLE modificateurs ADD COLUMN nom_affiche TEXT",
    "ALTER TABLE modificateurs ADD COLUMN id_tag TEXT",
    "ALTER TABLE modificateurs ADD COLUMN des_stat_id TEXT",
    "ALTER TABLE modificateurs ADD COLUMN des_nb INTEGER",
    "ALTER TABLE modificateurs ADD COLUMN des_faces INTEGER",
    "ALTER TABLE modificateurs ADD COLUMN id_competence TEXT",
    "ALTER TABLE modificateurs ADD COLUMN id_personnage TEXT",
    "ALTER TABLE effets_actifs ADD COLUMN id_stat_de TEXT",
    "ALTER TABLE effets_actifs ADD COLUMN des_nb INTEGER",
    "ALTER TABLE effets_actifs ADD COLUMN des_faces INTEGER",
    "ALTER TABLE effets_actifs ADD COLUMN des_stat_id TEXT",
    "ALTER TABLE effets_actifs ADD COLUMN est_cout INTEGER DEFAULT 0",
    "ALTER TABLE effets_actifs ADD COLUMN est_jet_de INTEGER DEFAULT 0",
    "ALTER TABLE effets_actifs ADD COLUMN id_competence TEXT",
    `UPDATE stats SET id='a1000000-0000-0000-0000-000000000001',is_systeme=0 WHERE nom='Force'`,
    `UPDATE stats SET id='a1000000-0000-0000-0000-000000000002',is_systeme=0 WHERE nom='Agilité'`,
    `UPDATE stats SET id='a1000000-0000-0000-0000-000000000003',is_systeme=0 WHERE nom='Constitution'`,
    `UPDATE stats SET id='a1000000-0000-0000-0000-000000000004',is_systeme=0 WHERE nom='Intelligence'`,
    `UPDATE stats SET id='a1000000-0000-0000-0000-000000000005',is_systeme=0 WHERE nom='Sagesse'`,
    `UPDATE stats SET id='a1000000-0000-0000-0000-000000000006',is_systeme=0 WHERE nom='Charisme'`,
    `UPDATE stats SET id='a1000000-0000-0000-0000-000000000007',is_systeme=0 WHERE nom='Perception'`,
    `UPDATE stats SET id='a1000000-0000-0000-0000-000000000101',is_systeme=1 WHERE nom='PV Max'`,
    `UPDATE stats SET id='a1000000-0000-0000-0000-000000000102',is_systeme=1 WHERE nom='Mana Max'`,
    `UPDATE stats SET id='a1000000-0000-0000-0000-000000000103',is_systeme=1 WHERE nom='Stamina Max'`,
    `UPDATE modificateurs SET id_stat='a1000000-0000-0000-0000-000000000001' WHERE id_stat='1'`,
    `UPDATE modificateurs SET id_stat='a1000000-0000-0000-0000-000000000002' WHERE id_stat='2'`,
    `UPDATE modificateurs SET id_stat='a1000000-0000-0000-0000-000000000003' WHERE id_stat='3'`,
    `UPDATE modificateurs SET id_stat='a1000000-0000-0000-0000-000000000004' WHERE id_stat='4'`,
    `UPDATE modificateurs SET id_stat='a1000000-0000-0000-0000-000000000005' WHERE id_stat='5'`,
    `UPDATE modificateurs SET id_stat='a1000000-0000-0000-0000-000000000006' WHERE id_stat='6'`,
    `UPDATE modificateurs SET id_stat='a1000000-0000-0000-0000-000000000007' WHERE id_stat='7'`,
    `UPDATE modificateurs SET id_stat='a1000000-0000-0000-0000-000000000101' WHERE id_stat='101'`,
    `UPDATE modificateurs SET id_stat='a1000000-0000-0000-0000-000000000102' WHERE id_stat='102'`,
    `UPDATE modificateurs SET id_stat='a1000000-0000-0000-0000-000000000103' WHERE id_stat='103'`,
    `UPDATE personnage_stats SET id_stat='a1000000-0000-0000-0000-000000000001' WHERE id_stat='1'`,
    `UPDATE personnage_stats SET id_stat='a1000000-0000-0000-0000-000000000002' WHERE id_stat='2'`,
    `UPDATE personnage_stats SET id_stat='a1000000-0000-0000-0000-000000000003' WHERE id_stat='3'`,
    `UPDATE personnage_stats SET id_stat='a1000000-0000-0000-0000-000000000004' WHERE id_stat='4'`,
    `UPDATE personnage_stats SET id_stat='a1000000-0000-0000-0000-000000000005' WHERE id_stat='5'`,
    `UPDATE personnage_stats SET id_stat='a1000000-0000-0000-0000-000000000006' WHERE id_stat='6'`,
    `UPDATE personnage_stats SET id_stat='a1000000-0000-0000-0000-000000000007' WHERE id_stat='7'`,
    `UPDATE personnage_stats SET id_stat='a1000000-0000-0000-0000-000000000101' WHERE id_stat='101'`,
    `UPDATE personnage_stats SET id_stat='a1000000-0000-0000-0000-000000000102' WHERE id_stat='102'`,
    `UPDATE personnage_stats SET id_stat='a1000000-0000-0000-0000-000000000103' WHERE id_stat='103'`,
  ];

  for (const query of migrations) {
    try {
      sessionDb.exec(query);
    } catch (e) {
      // Ignoré
    }
  }

  return sessionDb;
}

export function getSessionDB() {
  if (!sessionDb) throw new Error("No session DB loaded");
  return sessionDb;
}
