/* files.js: which files Kanvaz Mini will read, and how a saved board is validated.
   Pure Node/JS, no Electron, so test/files-test.js can run it. */

var IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
var BOARD_EXT = 'kmini';
var PUR_EXT = 'pur';
var MAX_IMAGE_BYTES = 60 * 1024 * 1024;
var MAX_ITEMS = 500;

var MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };

function extOf(p) {
  var s = String(p || '');
  var slash = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
  var dot = s.lastIndexOf('.');
  if (dot === -1 || dot < slash) return '';
  return s.slice(dot + 1).toLowerCase();
}

function isImagePath(p) { return IMAGE_EXTS.indexOf(extOf(p)) !== -1; }
function isBoardPath(p) { return extOf(p) === BOARD_EXT; }
function isPurPath(p) { return extOf(p) === PUR_EXT; }
function mimeFor(p) { return MIME[extOf(p)] || null; }

/* a file name has an extension but is not something Mini shows: video, audio, 3D, PDF, Adobe... */
function isRefused(p) {
  var e = extOf(p);
  return e !== '' && IMAGE_EXTS.indexOf(e) === -1 && e !== BOARD_EXT && e !== PUR_EXT;
}

/* an absolute local path only (no UNC or device paths, no URLs), as handed over by the OS or a drop */
function isSafeLocalPath(p) {
  if (typeof p !== 'string' || !p || p.indexOf('\0') !== -1) return false;
  if (/^[\\/]{2}/.test(p)) return false;                 /* UNC and \\?\ device paths */
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(p)) return false;  /* file:// and other URLs */
  if (/:[^\\/]/.test(p.replace(/^[A-Za-z]:/, ''))) return false;  /* NTFS alternate data stream */
  return /^[A-Za-z]:[\\/]/.test(p) || p.charAt(0) === '/';
}

function isNum(n) { return typeof n === 'number' && isFinite(n); }

/* validate a board read from disk; returns { items, view } or null if it is not a Kanvaz Mini board */
function parseBoard(text) {
  var data;
  try { data = JSON.parse(text); } catch (e) { return null; }
  if (!data || data.format !== 'kanvaz-mini' || !Array.isArray(data.items)) return null;
  if (data.items.length > MAX_ITEMS) return null;
  var items = [];
  for (var i = 0; i < data.items.length; i++) {
    var it = data.items[i];
    if (!it || typeof it.src !== 'string' || !/^data:image\/(png|jpeg|gif|webp|bmp);base64,/.test(it.src)) return null;
    if (!isNum(it.x) || !isNum(it.y) || !isNum(it.w) || !isNum(it.h) || it.w <= 0 || it.h <= 0) return null;
    items.push({ id: typeof it.id === 'string' ? it.id : 'i' + i, src: it.src, x: it.x, y: it.y, w: it.w, h: it.h, rot: (it.rot === 1 || it.rot === 2 || it.rot === 3) ? it.rot : 0, fx: it.fx === true, fy: it.fy === true, gray: it.gray === true });
  }
  var v = data.view || {};
  var view = { x: isNum(v.x) ? v.x : 0, y: isNum(v.y) ? v.y : 0, z: isNum(v.z) && v.z > 0 ? v.z : 1 };
  return { items: items, view: view };
}

function serializeBoard(items, view) {
  return JSON.stringify({ format: 'kanvaz-mini', version: 1, view: view, items: items }, null, 0);
}

module.exports = {
  IMAGE_EXTS: IMAGE_EXTS, BOARD_EXT: BOARD_EXT, PUR_EXT: PUR_EXT, MAX_IMAGE_BYTES: MAX_IMAGE_BYTES, MAX_ITEMS: MAX_ITEMS,
  extOf: extOf, isImagePath: isImagePath, isBoardPath: isBoardPath, isPurPath: isPurPath, isRefused: isRefused, mimeFor: mimeFor,
  isSafeLocalPath: isSafeLocalPath, parseBoard: parseBoard, serializeBoard: serializeBoard
};
