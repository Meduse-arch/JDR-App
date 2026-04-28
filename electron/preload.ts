import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

// --------- Expose window.db API ---------
const singleIdEntities = [
  'sessions', 'comptes', 'personnages', 'stats', 'personnage_stats',
  'items', 'inventaire', 'competences', 'personnage_competences',
  'tags', 'map_channels', 'map_tokens', 'chat_canaux', 'messages',
  'quetes', 'quete_recompenses', 'effets_actifs', 'modificateurs',
  'logs_activite', 'personnage_buff_rolls'
];

const compositeKeyEntities = [
  'session_mj', 'session_joueurs', 'personnage_quetes',
  'item_tags', 'competence_tags', 'chat_participants', 'session_comptes'
];

const dbAPI: any = {
  system: {
    initSession: (folderPath: string) => ipcRenderer.invoke('db:system:initSession', folderPath),
    loadSession: (folderPath: string) => ipcRenderer.invoke('db:system:loadSession', folderPath)
  }
};

singleIdEntities.forEach((entity) => {
  dbAPI[entity] = {
    getAll: () => ipcRenderer.invoke(`db:${entity}:getAll`),
    getById: (id: string) => ipcRenderer.invoke(`db:${entity}:getById`, id),
    create: (item: any) => ipcRenderer.invoke(`db:${entity}:create`, item),
    update: (id: string, item: any) => ipcRenderer.invoke(`db:${entity}:update`, id, item),
    delete: (id: string) => ipcRenderer.invoke(`db:${entity}:delete`, id),
  };
});

compositeKeyEntities.forEach((entity) => {
  dbAPI[entity] = {
    getAll: () => ipcRenderer.invoke(`db:${entity}:getAll`),
    create: (item: any) => ipcRenderer.invoke(`db:${entity}:create`, item),
    deleteByFields: (conditions: Record<string, any>) => ipcRenderer.invoke(`db:${entity}:deleteByFields`, conditions),
  };
});

contextBridge.exposeInMainWorld('db', dbAPI);
