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
    'logs_activite', 'personnage_buff_rolls', 'images'
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
            return { success: true, data: data.map((d: any) => {
              let details = null;
              if (d.details) {
                try { details = JSON.parse(d.details); } catch(e) { console.error("Err parse logs_activite", e); }
              }
              return { ...d, details };
            }) };
          }
          return { success: true, data };
        } catch (error: any) { return { success: false, error: error.message }; }
      });

      ipcMain.handle(`db:${entity}:getById`, async (_, id: string) => {
        try {
          const db = getDbForEntity(entity);
          const data = db.prepare(`SELECT * FROM ${entity} WHERE id = ?`).get(id);
          if (entity === 'logs_activite' && data) {
            let details = null;
            if (data.details) {
              try { details = JSON.parse(data.details); } catch(e) { console.error("Err parse logs_activite byId", e); }
            }
            data.details = details;
          }
          return { success: true, data };
        } catch (error: any) { return { success: false, error: error.message }; }
      });

      ipcMain.handle(`db:${entity}:create`, async (_, item: any) => {
        try {
          const db = getDbForEntity(entity);
          
          // Nettoyage et conversion pour SQLite
          const cleanedItem: any = {};
          const ignoredKeys = ['stats', 'items', 'competences', 'inventaire', 'hp_max', 'mana_max', 'stam_max', 'participants', 'quete_recompenses', 'personnage_quetes'];
          
          Object.keys(item).forEach(key => {
            if (ignoredKeys.includes(key)) return; // Ignorer les champs virtuels/liés

            let val = item[key];
            if (val === undefined) val = null;
            if (typeof val === 'boolean') val = val ? 1 : 0;
            cleanedItem[key] = val;
          });

          if (entity === 'logs_activite' && cleanedItem.details) {
            cleanedItem.details = JSON.stringify(cleanedItem.details);
          }
          
          const keys = Object.keys(cleanedItem);
          const stmt = db.prepare(`INSERT INTO ${entity} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`);
          stmt.run(...Object.values(cleanedItem));
          return { success: true, data: cleanedItem };
        } catch (error: any) { 
          console.error(`Error creating ${entity}:`, error);
          return { success: false, error: error.message }; 
        }
      });

      ipcMain.handle(`db:${entity}:update`, async (_, id: string, item: any) => {
        try {
          const db = getDbForEntity(entity);
          
          const cleanedItem: any = {};
          const ignoredKeys = ['stats', 'items', 'competences', 'inventaire', 'hp_max', 'mana_max', 'stam_max', 'participants', 'quete_recompenses', 'personnage_quetes'];

          Object.keys(item).forEach(key => {
            if (ignoredKeys.includes(key)) return;

            let val = item[key];
            if (val === undefined) val = null;
            if (typeof val === 'boolean') val = val ? 1 : 0;
            cleanedItem[key] = val;
          });

          if (entity === 'logs_activite' && cleanedItem.details) {
            cleanedItem.details = JSON.stringify(cleanedItem.details);
          }
          
          const keys = Object.keys(cleanedItem);
          const setClause = keys.map((key) => `${key} = ?`).join(', ');
          const stmt = db.prepare(`UPDATE ${entity} SET ${setClause} WHERE id = ?`);
          stmt.run(...Object.values(cleanedItem), id);
          return { success: true, data: { ...cleanedItem, id } };
        } catch (error: any) { 
          console.error(`Error updating ${entity}:`, error);
          return { success: false, error: error.message }; 
        }
      });

      ipcMain.handle(`db:${entity}:delete`, async (_, id: string) => {
        try {
          console.log(`[IPC] 🗑️ Deleting from ${entity} where id =`, id);
          const db = getDbForEntity(entity);
          const info = db.prepare(`DELETE FROM ${entity} WHERE id = ?`).run(id);
          console.log(`[IPC] ✅ Delete result:`, info);
          return { success: true, changes: info.changes };
        } catch (error: any) { 
          console.error(`[IPC] ❌ Error deleting from ${entity}:`, error);
          return { success: false, error: error.message }; 
        }
      });

      // Ajout systématique de deleteByFields pour toutes les tables (crucial pour forges)
      ipcMain.handle(`db:${entity}:deleteByFields`, async (_, conditions: Record<string, any>) => {
        try {
          console.log(`[IPC] 🗑️ DeletingByFields from ${entity}:`, conditions);
          const db = getDbForEntity(entity);
          const keys = Object.keys(conditions);
          if (keys.length === 0) return { success: false, error: "No conditions provided" };
          
          const whereClause = keys.map((key) => `${key} = ?`).join(' AND ');
          const stmt = db.prepare(`DELETE FROM ${entity} WHERE ${whereClause}`);
          const info = stmt.run(...Object.values(conditions));
          console.log(`[IPC] ✅ DeleteByFields result:`, info);
          return { success: true, changes: info.changes };
        } catch (error: any) { 
          console.error(`[IPC] ❌ Error deletingByFields from ${entity}:`, error);
          return { success: false, error: error.message }; 
        }
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
          
          const cleanedItem: any = {};
          Object.keys(item).forEach(key => {
            let val = item[key];
            if (val === undefined) val = null;
            if (typeof val === 'boolean') val = val ? 1 : 0;
            cleanedItem[key] = val;
          });

          const keys = Object.keys(cleanedItem);
          const stmt = db.prepare(`INSERT INTO ${entity} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`);
          stmt.run(...Object.values(cleanedItem));
          return { success: true, data: cleanedItem };
        } catch (error: any) { 
          console.error(`Error creating composite ${entity}:`, error);
          return { success: false, error: error.message }; 
        }
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
