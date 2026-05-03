const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const userData = path.join(os.homedir(), 'AppData', 'Roaming', 'sigil');
const masterDbPath = path.join(userData, 'sigil-master.db');

if (!fs.existsSync(masterDbPath)) {
  process.exit(1);
}

const masterDb = new Database(masterDbPath, { readonly: true });
const comptes = masterDb.prepare('SELECT * FROM comptes').all();

const out = {
  comptes: comptes,
  sessions: []
};

const sessionsDir = path.join(userData, 'Sessions');
if (fs.existsSync(sessionsDir)) {
  const sessionFolders = fs.readdirSync(sessionsDir);
  for (const folder of sessionFolders) {
    const sessionDbPath = path.join(sessionsDir, folder, 'campagne.db');
    if (fs.existsSync(sessionDbPath)) {
      const sessionDb = new Database(sessionDbPath, { readonly: true });
      const persos = sessionDb.prepare("SELECT id, id_session, nom, type, is_template, lie_au_compte FROM personnages WHERE type='Joueur' AND is_template=0").all();
      const sessComptes = sessionDb.prepare('SELECT * FROM session_comptes').all();
      const sessJoueurs = sessionDb.prepare('SELECT * FROM session_joueurs').all();
      
      out.sessions.push({
        folder,
        persos,
        sessComptes,
        sessJoueurs
      });
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'db_dump.json'), JSON.stringify(out, null, 2));

