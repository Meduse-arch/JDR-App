import { ipcRenderer, contextBridge } from 'electron'

/**
 * SECURITY: Instead of exposing the entire ipcRenderer, we expose only specific,
 * restricted methods via contextBridge. This adheres to the Principle of Least Privilege.
 */

// Lists of entities defined in the system
const singleIdEntities = [
  'sessions', 'comptes', 'personnages', 'stats', 'personnage_stats',
  'items', 'inventaire', 'competences', 'personnage_competences',
  'tags', 'map_channels', 'map_tokens', 'chat_canaux', 'messages',
  'quetes', 'quete_recompenses', 'effets_actifs', 'modificateurs',
  'logs_activite', 'personnage_buff_rolls', 'images'
];

const compositeKeyEntities = [
  'session_mj', 'session_joueurs', 'personnage_quetes',
  'item_tags', 'competence_tags', 'chat_participants', 'session_comptes'
];

// Helper to create a restricted API for a single entity
const createEntityAPI = (entity: string) => ({
  getAll: () => ipcRenderer.invoke(`db:${entity}:getAll`),
  getById: (id: string) => ipcRenderer.invoke(`db:${entity}:getById`, id),
  create: (item: any) => ipcRenderer.invoke(`db:${entity}:create`, item),
  update: (id: string, item: any) => ipcRenderer.invoke(`db:${entity}:update`, id, item),
  delete: (id: string) => ipcRenderer.invoke(`db:${entity}:delete`, id),
  deleteByFields: (conditions: Record<string, any>) => ipcRenderer.invoke(`db:${entity}:deleteByFields`, conditions),
});

// Helper to create a restricted API for a composite entity
const createCompositeEntityAPI = (entity: string) => ({
  getAll: () => ipcRenderer.invoke(`db:${entity}:getAll`),
  create: (item: any) => ipcRenderer.invoke(`db:${entity}:create`, item),
  deleteByFields: (conditions: Record<string, any>) => ipcRenderer.invoke(`db:${entity}:deleteByFields`, conditions),
});

// Build the final db API object
const dbAPI: any = {
  system: {
    initSession: (folderPath: string) => ipcRenderer.invoke('db:system:initSession', folderPath),
    loadSession: (folderPath: string) => ipcRenderer.invoke('db:system:loadSession', folderPath)
  }
};

singleIdEntities.forEach((entity) => {
  dbAPI[entity] = createEntityAPI(entity);
});

compositeKeyEntities.forEach((entity) => {
  dbAPI[entity] = createCompositeEntityAPI(entity);
});

// Expose the restricted database API
contextBridge.exposeInMainWorld('db', dbAPI);

// SECURITY: Expose only necessary non-DB IPC methods
contextBridge.exposeInMainWorld('ipcRenderer', {
  // Listeners
  onMainProcessMessage: (callback: (message: string) => void) => {
    const subscription = (_event: any, message: string) => callback(message);
    ipcRenderer.on('main-process-message', subscription);
    return () => ipcRenderer.removeListener('main-process-message', subscription);
  },
  
  // Window management
  openPopout: (pageId: string) => ipcRenderer.send('popout-window', pageId),
});
