import { app, BrowserWindow, Menu, nativeTheme, session, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { registerIpc } from './ipc'
import { pruneCache } from './figmaCache'
import { flushFigmaCache, getSettings } from './store'

process.env.APP_ROOT = path.join(__dirname, '..')

/*
 * Каталог данных прибит к постоянному имени. По умолчанию Electron берёт его
 * из productName, поэтому переименование приложения уводило бы токен, команды
 * и кэш в новый пустой каталог — со стороны это выглядит как «после пересборки
 * всё сбросилось». Имя ниже менять нельзя, даже если поменяется название
 * приложения.
 */
const DATA_DIR_NAME = 'Figma Analytics'
/** Каталоги прежних имён приложения — переносим данные один раз. */
const LEGACY_DATA_DIR_NAMES = ['Box UI']
/** Переносим только свои файлы; кэши Chromium восстановятся сами. */
const OWN_DATA_FILES = [
  'settings.json',
  'credentials.json',
  'session.bin',
  'secret.key',
  'figma-token.json',
  'figma-token.bin',
  'figma-user.json',
  'figma-settings.json',
  'figma-cache.json',
]

function adoptLegacyData(dataDir: string) {
  for (const legacyName of LEGACY_DATA_DIR_NAMES) {
    const legacyDir = path.join(app.getPath('appData'), legacyName)
    if (legacyDir === dataDir || !fs.existsSync(legacyDir)) continue
    for (const file of OWN_DATA_FILES) {
      const from = path.join(legacyDir, file)
      const to = path.join(dataDir, file)
      // Ничего не перетираем: если файл уже есть в новом каталоге, он новее.
      if (!fs.existsSync(from) || fs.existsSync(to)) continue
      try {
        fs.copyFileSync(from, to)
      } catch {
        /* файл занят или недоступен — не повод падать на старте */
      }
    }
  }
}

const dataDir = path.join(app.getPath('appData'), DATA_DIR_NAME)
fs.mkdirSync(dataDir, { recursive: true })
app.setPath('userData', dataDir)
adoptLegacyData(dataDir)

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

let win: BrowserWindow | null = null

function createWindow() {
  const dark = nativeTheme.shouldUseDarkColors

  win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1060,
    minHeight: 660,
    show: false,
    backgroundColor: dark ? '#0b0b0c' : '#f0f0ee',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.once('ready-to-show', () => win?.show())

  // Внешние ссылки — только в системном браузере.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (VITE_DEV_SERVER_URL && url.startsWith(VITE_DEV_SERVER_URL)) return
    event.preventDefault()
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function buildMenu() {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: 'Figma Analytics',
            submenu: [
              { role: 'about', label: 'О Figma Analytics' },
              { type: 'separator' },
              { role: 'hide', label: 'Скрыть Figma Analytics' },
              { role: 'hideOthers', label: 'Скрыть остальные' },
              { role: 'unhide', label: 'Показать все' },
              { type: 'separator' },
              { role: 'quit', label: 'Выйти из Figma Analytics' },
            ],
          },
        ] as Electron.MenuItemConstructorOptions[])
      : []),
    {
      label: 'Правка',
      submenu: [
        { role: 'undo', label: 'Отменить' },
        { role: 'redo', label: 'Повторить' },
        { type: 'separator' },
        { role: 'cut', label: 'Вырезать' },
        { role: 'copy', label: 'Копировать' },
        { role: 'paste', label: 'Вставить' },
        { role: 'selectAll', label: 'Выделить всё' },
      ],
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload', label: 'Перезагрузить' },
        { role: 'toggleDevTools', label: 'Инструменты разработчика' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Обычный масштаб' },
        { role: 'zoomIn', label: 'Увеличить' },
        { role: 'zoomOut', label: 'Уменьшить' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Полный экран' },
      ],
    },
    {
      label: 'Окно',
      submenu: [
        { role: 'minimize', label: 'Свернуть' },
        { role: 'zoom', label: 'Масштабировать' },
        { role: 'close', label: 'Закрыть' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// Один экземпляр приложения.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    if (!VITE_DEV_SERVER_URL) {
      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
              "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'; connect-src 'self'",
            ],
          },
        })
      })
    }
    nativeTheme.themeSource = getSettings().theme
    // Кэш мог пережить отключение команды в прошлом запуске — подчищаем до окна.
    pruneCache()
    registerIpc(() => win)
    buildMenu()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

// Кэш пишется на диск отложенно — перед выходом дожимаем последний снимок,
// иначе результат синхронизации мог бы не доехать.
app.on('before-quit', () => flushFigmaCache())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
  win = null
})
