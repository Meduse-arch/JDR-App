import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { setupIPC } from './ipc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
const popouts = new Map<string, BrowserWindow>()

function createPopoutWindow(pageId: string) {
  if (popouts.has(pageId)) {
    popouts.get(pageId)?.focus()
    return
  }

  const preloadPath = path.join(__dirname, 'preload.mjs')

  const popout = new BrowserWindow({
    title: `Sigil : ${pageId.toUpperCase()}`,
    icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    width: 1000,
    height: 800,
    autoHideMenuBar: true,
    backgroundColor: '#050505', // Fond sombre par défaut pour éviter le flash blanc
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  popouts.set(pageId, popout)

  popout.on('closed', () => {
    popouts.delete(pageId)
  })

  if (VITE_DEV_SERVER_URL) {
    popout.loadURL(`${VITE_DEV_SERVER_URL}#/popout/${pageId}`)
  } else {
    // En prod, on charge le fichier et on ajoute le hash après
    popout.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: `/popout/${pageId}` })
  }
}

ipcMain.on('popout-window', (_event, pageId: string) => {
  createPopoutWindow(pageId)
})

function createWindow() {
  win = new BrowserWindow({
    title: 'Sigil : Codex & Oracle', // 👈 Titre de la fenêtre mis à jour
    icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    autoHideMenuBar: true, // 👈 C'est CETTE LIGNE qui cache le menu Windows !
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  setupIPC();
  createWindow();
})