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

  const setupSingleEntities = (entities: string[]) => {
    entities.forEach((entity) => {
      ipcMain.handle(`db:${entity}:getAll`, async () => {
        try {
          const db = getDbForEntity(entity);
          const stmt = db.prepare(`SELECT * FROM ${entity}`);
          const data = stmt.all();
          return { success: true, data };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      });

      ipcMain.handle(`db:${entity}:getById`, async (_, id: string) => {
        try {
          const db = getDbForEntity(entity);
          const stmt = db.prepare(`SELECT * FROM ${entity} WHERE id = ?`);
          const data = stmt.get(id);
          return { success: true, data };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      });

      ipcMain.handle(`db:${entity}:create`, async (_, item: any) => {
        try {
          const db = getDbForEntity(entity);
          const keys = Object.keys(item);
          const columns = keys.join(', ');
          const placeholders = keys.map(() => '?').join(', ');
          const values = Object.values(item);
          
          const stmt = db.prepare(`INSERT INTO ${entity} (${columns}) VALUES (${placeholders})`);
          stmt.run(...values);
          return { success: true, data: item };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      });

      ipcMain.handle(`db:${entity}:update`, async (_, id: string, item: any) => {
        try {
          const db = getDbForEntity(entity);
          const keys = Object.keys(item);
          const setClause = keys.map((key) => `${key} = ?`).join(', ');
          const values = [...Object.values(item), id];
          
          const stmt = db.prepare(`UPDATE ${entity} SET ${setClause} WHERE id = ?`);
          stmt.run(...values);
          return { success: true, data: { ...item, id } };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      });

      ipcMain.handle(`db:${entity}:delete`, async (_, id: string) => {
        try {
          const db = getDbForEntity(entity);
          const stmt = db.prepare(`DELETE FROM ${entity} WHERE id = ?`);
          stmt.run(id);
          return { success: true, data: id };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      });
    });
  };

  const setupCompositeEntities = (entities: string[]) => {
    entities.forEach((entity) => {
      ipcMain.handle(`db:${entity}:getAll`, async () => {
        try {
          const db = getDbForEntity(entity);
          const stmt = db.prepare(`SELECT * FROM ${entity}`);
          const data = stmt.all();
          return { success: true, data };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      });

      ipcMain.handle(`db:${entity}:create`, async (_, item: any) => {
        try {
          const db = getDbForEntity(entity);
          const keys = Object.keys(item);
          const columns = keys.join(', ');
          const placeholders = keys.map(() => '?').join(', ');
          const values = Object.values(item);
          
          const stmt = db.prepare(`INSERT INTO ${entity} (${columns}) VALUES (${placeholders})`);
          stmt.run(...values);
          return { success: true, data: item };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      });

      ipcMain.handle(`db:${entity}:deleteByFields`, async (_, conditions: Record<string, any>) => {
        try {
          const db = getDbForEntity(entity);
          const keys = Object.keys(conditions);
          const whereClause = keys.map((key) => `${key} = ?`).join(' AND ');
          const values = Object.values(conditions);
          
          const stmt = db.prepare(`DELETE FROM ${entity} WHERE ${whereClause}`);
          stmt.run(...values);
          return { success: true, data: conditions };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      });
    });
  };

  setupSingleEntities([...masterEntities, ...sessionSingleEntities]);
  setupCompositeEntities([...masterCompositeEntities, ...sessionCompositeEntities]);

  // System IPC for DB initialization
  ipcMain.handle('db:system:initSession', async (_, folderPath: string) => {
    try {
      loadSessionDB(folderPath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:system:loadSession', async (_, folderPath: string) => {
    try {
      loadSessionDB(folderPath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
