/* Kanvaz Mini: main process. One small frameless always-on-top window. */
var electron = require('electron');
var path = require('path');
var fs = require('fs');
var files = require('./files.js');

var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var ipcMain = electron.ipcMain;
var dialog = electron.dialog;
var screen = electron.screen;

var MIN_W = 200, MIN_H = 140;
var win = null;
var pendingOpen = [];

if (!app.requestSingleInstanceLock()) { app.quit(); }

function boundsFile() { return path.join(app.getPath('userData'), 'window.json'); }

/* a remembered window rectangle is only used if it is still visible on a connected display */
function sanitizeBounds(b) {
  if (!b || ['x', 'y', 'width', 'height'].some(function(k) { return typeof b[k] !== 'number' || !isFinite(b[k]); })) return null;
  var w = Math.max(MIN_W, Math.round(b.width)), h = Math.max(MIN_H, Math.round(b.height));
  var ok = screen.getAllDisplays().some(function(d) {
    var a = d.workArea;
    var vw = Math.min(b.x + w, a.x + a.width) - Math.max(b.x, a.x);
    var vh = Math.min(b.y + h, a.y + a.height) - Math.max(b.y, a.y);
    return vw >= 120 && vh >= 60;
  });
  return ok ? { x: Math.round(b.x), y: Math.round(b.y), width: w, height: h } : null;
}

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(boundsFile(), 'utf8')); } catch (e) { return {}; }
}
function saveSettings() {
  if (!win || win.isDestroyed()) return;
  try {
    var s = loadSettings();
    s.bounds = win.getBounds();
    s.opacity = win.getOpacity();
    s.alwaysOnTop = win.isAlwaysOnTop();
    fs.writeFileSync(boundsFile(), JSON.stringify(s));
  } catch (e) { /* best effort */ }
}

function argvFiles(argv) {
  return argv.slice(1).filter(function(a) { return typeof a === 'string' && a && a.charAt(0) !== '-' && files.isSafeLocalPath(a) && (files.isImagePath(a) || files.isBoardPath(a)); });
}

function createWindow() {
  var s = loadSettings();
  var saved = sanitizeBounds(s.bounds);
  var wa = screen.getPrimaryDisplay().workArea;
  var def = { width: 480, height: 340, x: wa.x + wa.width - 480 - 24, y: wa.y + wa.height - 340 - 24 };
  var b = saved || def;
  win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height,
    minWidth: MIN_W, minHeight: MIN_H,
    frame: false,
    show: false,
    backgroundColor: '#14121f',
    alwaysOnTop: s.alwaysOnTop !== false,
    title: 'Kanvaz Mini',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false
    }
  });
  if (typeof s.opacity === 'number' && s.opacity >= 0.2 && s.opacity <= 1) win.setOpacity(s.opacity);
  if (win.isAlwaysOnTop()) win.setAlwaysOnTop(true, process.platform === 'darwin' ? 'screen-saver' : 'floating');

  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', function() { win.show(); });
  win.webContents.setWindowOpenHandler(function() { return { action: 'deny' }; });
  win.webContents.on('will-navigate', function(e) { e.preventDefault(); });
  win.webContents.on('did-finish-load', function() {
    if (pendingOpen.length) { win.webContents.send('open-files', pendingOpen); pendingOpen = []; }
  });
  win.on('close', saveSettings);
  win.on('closed', function() { win = null; });
}

app.on('second-instance', function(event, argv) {
  var f = argvFiles(argv);
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
    if (f.length) win.webContents.send('open-files', f);
  }
});

app.whenReady().then(function() {
  pendingOpen = argvFiles(process.argv);
  createWindow();
});

app.on('window-all-closed', function() { app.quit(); });

/* ---------- IPC ---------- */
ipcMain.on('win-close', function() { if (win) win.close(); });
ipcMain.on('win-set-on-top', function(e, flag) { if (win) win.setAlwaysOnTop(!!flag, process.platform === 'darwin' ? 'screen-saver' : 'floating'); });
ipcMain.handle('win-on-top', function() { return win ? win.isAlwaysOnTop() : true; });
ipcMain.on('win-set-opacity', function(e, v) {
  if (!win || typeof v !== 'number' || !isFinite(v)) return;
  win.setOpacity(Math.max(0.2, Math.min(1, v)));
});
ipcMain.handle('win-opacity', function() { return win ? win.getOpacity() : 1; });

/* read one image the user dropped or opened: only image types, only real local paths, size capped */
ipcMain.handle('read-image', function(e, p) {
  if (!files.isSafeLocalPath(p) || !files.isImagePath(p)) return { ok: false, reason: 'not-image' };
  try {
    var st = fs.statSync(p);
    if (!st.isFile()) return { ok: false, reason: 'not-file' };
    if (st.size > files.MAX_IMAGE_BYTES) return { ok: false, reason: 'too-big' };
    var buf = fs.readFileSync(p);
    return { ok: true, name: path.basename(p), src: 'data:' + files.mimeFor(p) + ';base64,' + buf.toString('base64') };
  } catch (err) { return { ok: false, reason: 'unreadable' }; }
});

ipcMain.handle('read-board', function(e, p) {
  if (!files.isSafeLocalPath(p) || !files.isBoardPath(p)) return { ok: false, reason: 'not-board' };
  try {
    var st = fs.statSync(p);
    if (!st.isFile() || st.size > 1024 * 1024 * 1024) return { ok: false, reason: 'too-big' };
    var parsed = files.parseBoard(fs.readFileSync(p, 'utf8'));
    return parsed ? { ok: true, board: parsed, path: p } : { ok: false, reason: 'invalid' };
  } catch (err) { return { ok: false, reason: 'unreadable' }; }
});

ipcMain.handle('open-dialog', function() {
  return dialog.showOpenDialog(win, {
    title: 'Open images or a Kanvaz Mini board',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images and boards', extensions: files.IMAGE_EXTS.concat([files.BOARD_EXT]) }]
  }).then(function(r) { return r.canceled ? [] : r.filePaths; });
});

ipcMain.handle('save-board', function(e, text, suggested) {
  if (typeof text !== 'string' || text.length > 1.5 * 1024 * 1024 * 1024) return { ok: false };
  return dialog.showSaveDialog(win, {
    title: 'Save board',
    defaultPath: typeof suggested === 'string' && suggested ? suggested : 'board.' + files.BOARD_EXT,
    filters: [{ name: 'Kanvaz Mini board', extensions: [files.BOARD_EXT] }]
  }).then(function(r) {
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    var p = /\.kmini$/i.test(r.filePath) ? r.filePath : r.filePath + '.' + files.BOARD_EXT;
    try { fs.writeFileSync(p, text, 'utf8'); return { ok: true, path: p }; } catch (err) { return { ok: false }; }
  });
});
