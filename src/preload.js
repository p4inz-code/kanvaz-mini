var contextBridge = require('electron').contextBridge;
var ipcRenderer = require('electron').ipcRenderer;
var webUtils = require('electron').webUtils;

contextBridge.exposeInMainWorld('KMBridge', {
  close: function() { ipcRenderer.send('win-close'); },
  setOnTop: function(flag) { ipcRenderer.send('win-set-on-top', !!flag); },
  isOnTop: function() { return ipcRenderer.invoke('win-on-top'); },
  setOpacity: function(v) { ipcRenderer.send('win-set-opacity', Number(v)); },
  getOpacity: function() { return ipcRenderer.invoke('win-opacity'); },
  readImage: function(p) { return ipcRenderer.invoke('read-image', String(p)); },
  readBoard: function(p) { return ipcRenderer.invoke('read-board', String(p)); },
  readPur: function(p) { return ipcRenderer.invoke('read-pur', String(p)); },
  toggleClickThrough: function() { return ipcRenderer.invoke('toggle-click-through'); },
  setIgnoreMouse: function(flag) { ipcRenderer.send('set-ignore-mouse', !!flag); },
  isClickThrough: function() { return ipcRenderer.invoke('is-click-through'); },
  onClickThrough: function(fn) { ipcRenderer.on('click-through', function(e, on) { fn(!!on); }); },
  saveRecovery: function(text) { return ipcRenderer.invoke('recovery-save', String(text)); },
  loadRecovery: function() { return ipcRenderer.invoke('recovery-load'); },
  version: function() { return ipcRenderer.invoke('app-version'); },
  openDialog: function() { return ipcRenderer.invoke('open-dialog'); },
  saveBoard: function(text, suggested) { return ipcRenderer.invoke('save-board', String(text), suggested); },
  pathForFile: function(file) { try { return webUtils.getPathForFile(file); } catch (e) { return ''; } },
  onOpenFiles: function(fn) { ipcRenderer.on('open-files', function(e, list) { fn(Array.isArray(list) ? list : []); }); }
});
