import { ipcMain } from 'electron';
import { masterDb, getSessionDB, loadSessionDB } from './database';

export function setupIPC() {
  const masterEntities = ['sessions', 'comptes'];
  
  const masterCompositeEntities = ['session_mj'];

  const sessionSingleEntities = [
    'personnages', 'stats', 'personnage_stats',
    'items', 'inventaire', 'competences', 'personnage_competences',
    'tags', 'map_channels', 'map_tokens', 'chat_canaux', 'messages',
    'quetes', 'quete_recompenses', 'effets_actifs', 'modificateurs',
    'logs_activite', 'personnage_buff_rolls'
  ];

  const sessionCompositeEntities = [
    'session_joueurs', 'personnage_quetes',
    'item_tags', 'competence_tags', 'chat_participants', 'session_comptes'
  ];

  // Helper function to resolve the correct database
  const getDbForEntity = (entity: string) => {
    if (masterEntities.includes(entity) || masterCompositeEntities.includes(entity)) {
      return masterDb;
    }
    return getSessionDB();
  };

  const setupHandlers = () => {
    // Single Entities (standard CRUD)
    sessionSingleEntities.concat(masterEntities).forEach((entity) => {
      ipcMain.handle(`db:${entity}:getAll`, async () => {
        try {
          const db = getDbForEntity(entity);
          const data = db.prepare(`SELECT * FROM ${entity}`).all();
          // ADAPTATION Supabase→SQLite : Parser les JSON stockés en TEXT
          if (entity === 'logs_activite') {
            return { success: true, data: data.map((d: any) => ({ ...d, details: d.details ? JSON.parse(d.details) : null })) };
          }
          return { success: true, data };
        } catch (error: any) { return { success: false, error: error.message }; }
      });

      ipcMain.handle(`db:${entity}:getById`, async (_, id: string) => {
        try {
          const db = getDbForEntity(entity);
          const data = db.prepare(`SELECT * FROM ${entity} WHERE id = ?`).get(id);
          if (entity === 'logs_activite' && data) {
            data.details = data.details ? JSON.parse(data.details) : null;
          }
          return { success: true, data };
        } catch (error: any) { return { success: false, error: error.message }; }
      });

      ipcMain.handle(`db:${entity}:create`, async (_, item: any) => {
        try {
          const db = getDbForEntity(entity);
          // ADAPTATION Supabase→SQLite : Stringifier les JSON pour SQLite
          if (entity === 'logs_activite' && item.details) {
            item.details = JSON.stringify(item.details);
          }
          const keys = Object.keys(item);
          const stmt = db.prepare(`INSERT INTO ${entity} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`);
          stmt.run(...Object.values(item));
          return { success: true, data: item };
        } catch (error: any) { return { success: false, error: error.message }; }
      });

      ipcMain.handle(`db:${entity}:update`, async (_, id: string, item: any) => {
        try {
          const db = getDbForEntity(entity);
          if (entity === 'logs_activite' && item.details) {
            item.details = JSON.stringify(item.details);
          }
          const keys = Object.keys(item);
          const setClause = keys.map((key) => `${key} = ?`).join(', ');
          const stmt = db.prepare(`UPDATE ${entity} SET ${setClause} WHERE id = ?`);
          stmt.run(...Object.values(item), id);
          return { success: true, data: { ...item, id } };
        } catch (error: any) { return { success: false, error: error.message }; }
      });

      ipcMain.handle(`db:${entity}:delete`, async (_, id: string) => {
        try {
          const db = getDbForEntity(entity);
          db.prepare(`DELETE FROM ${entity} WHERE id = ?`).run(id);
          return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
      });

      // Ajout systématique de deleteByFields pour toutes les tables (crucial pour forges)
      ipcMain.handle(`db:${entity}:deleteByFields`, async (_, conditions: Record<string, any>) => {
        try {
          const db = getDbForEntity(entity);
          const keys = Object.keys(conditions);
          const whereClause = keys.map((key) => `${key} = ?`).join(' AND ');
          const stmt = db.prepare(`DELETE FROM ${entity} WHERE ${whereClause}`);
          stmt.run(...Object.values(conditions));
          return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
      });
    });

    // Composite Entities
    sessionCompositeEntities.concat(masterCompositeEntities).forEach((entity) => {
      ipcMain.handle(`db:${entity}:getAll`, async () => {
        try {
          const db = getDbForEntity(entity);
          return { success: true, data: db.prepare(`SELECT * FROM ${entity}`).all() };
        } catch (error: any) { return { success: false, error: error.message }; }
      });

      ipcMain.handle(`db:${entity}:create`, async (_, item: any) => {
        try {
          const db = getDbForEntity(entity);
          const keys = Object.keys(item);
          const stmt = db.prepare(`INSERT INTO ${entity} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`);
          stmt.run(...Object.values(item));
          return { success: true, data: item };
        } catch (error: any) { return { success: false, error: error.message }; }
      });

      ipcMain.handle(`db:${entity}:deleteByFields`, async (_, conditions: Record<string, any>) => {
        try {
          const db = getDbForEntity(entity);
          const keys = Object.keys(conditions);
          const whereClause = keys.map((key) => `${key} = ?`).join(' AND ');
          const stmt = db.prepare(`DELETE FROM ${entity} WHERE ${whereClause}`);
          stmt.run(...Object.values(conditions));
          return { success: true };
        } catch (error: any) { return { success: false, error: error.message }; }
      });
    });
  };

  setupHandlers();

  ipcMain.handle('db:system:initSession', async (_, folderPath: string) => {
    try { loadSessionDB(folderPath); return { success: true }; }
    catch (error: any) { return { success: false, error: error.message }; }
  });

  ipcMain.handle('db:system:loadSession', async (_, folderPath: string) => {
    try { loadSessionDB(folderPath); return { success: true }; }
    catch (error: any) { return { success: false, error: error.message }; }
  });
}
