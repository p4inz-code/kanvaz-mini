/* board.js: the pure logic of Kanvaz Mini (no DOM, no Electron), so test/board-test.js can run it.
   A board is a list of image items { id, src, x, y, w, h } in world units plus a view { x, y, z }
   (x, y = screen offset of the world origin, z = zoom). */

var KMBoard = (function() {

  var MIN_ZOOM = 0.02;
  var MAX_ZOOM = 32;
  var MIN_SIZE = 8;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* screen <-> world */
  function toWorld(view, sx, sy) { return { x: (sx - view.x) / view.z, y: (sy - view.y) / view.z }; }
  function toScreen(view, wx, wy) { return { x: wx * view.z + view.x, y: wy * view.z + view.y }; }

  /* zoom around a screen point so the world point under the cursor stays put */
  function zoomAt(view, sx, sy, factor) {
    var z = clamp(view.z * factor, MIN_ZOOM, MAX_ZOOM);
    var w = toWorld(view, sx, sy);
    return { z: z, x: sx - w.x * z, y: sy - w.y * z };
  }

  function bounds(items) {
    if (!items.length) return null;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    items.forEach(function(it) {
      x0 = Math.min(x0, it.x); y0 = Math.min(y0, it.y);
      x1 = Math.max(x1, it.x + it.w); y1 = Math.max(y1, it.y + it.h);
    });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /* a view that shows the given items with some padding; empty list gives the default view */
  function fitView(items, vw, vh, pad) {
    var b = bounds(items);
    if (!b || b.w <= 0 || b.h <= 0) return { x: 0, y: 0, z: 1 };
    pad = pad === undefined ? 24 : pad;
    var z = clamp(Math.min((vw - pad * 2) / b.w, (vh - pad * 2) / b.h), MIN_ZOOM, MAX_ZOOM);
    return { z: z, x: (vw - b.w * z) / 2 - b.x * z, y: (vh - b.h * z) / 2 - b.y * z };
  }

  /* the topmost item under a world point (items later in the list are on top), or null */
  function hitTest(items, wx, wy) {
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (wx >= it.x && wx <= it.x + it.w && wy >= it.y && wy <= it.y + it.h) return it;
    }
    return null;
  }

  /* items touched by a world rectangle (marquee) */
  function inRect(items, r) {
    var x0 = Math.min(r.x0, r.x1), x1 = Math.max(r.x0, r.x1), y0 = Math.min(r.y0, r.y1), y1 = Math.max(r.y0, r.y1);
    return items.filter(function(it) { return it.x < x1 && it.x + it.w > x0 && it.y < y1 && it.y + it.h > y0; });
  }

  /* scale an item from a corner, keeping its aspect ratio; the opposite corner stays where it is */
  function scaleFromCorner(orig, corner, wx, wy) {
    var ar = orig.w / orig.h;
    var ax = corner.indexOf('l') !== -1 ? orig.x + orig.w : orig.x;   /* the anchor is the opposite corner */
    var ay = corner.indexOf('t') !== -1 ? orig.y + orig.h : orig.y;
    var nw = Math.abs(wx - ax);
    var nh = Math.abs(wy - ay);
    /* follow whichever axis the pointer moved further along, so the corner tracks the cursor */
    if (nw / ar > nh) nh = nw / ar; else nw = nh * ar;
    nw = Math.max(MIN_SIZE, nw);
    nh = nw / ar;
    return {
      x: corner.indexOf('l') !== -1 ? ax - nw : ax,
      y: corner.indexOf('t') !== -1 ? ay - nh : ay,
      w: nw,
      h: nh
    };
  }

  /* an image dropped at a world point: scaled down so it is not huge, centred on the point */
  function placeNatural(nw, nh, wx, wy, maxSide) {
    maxSide = maxSide || 480;
    var k = Math.min(1, maxSide / Math.max(nw, nh));
    var w = Math.max(MIN_SIZE, Math.round(nw * k)), h = Math.max(MIN_SIZE, Math.round(nh * k));
    return { x: Math.round(wx - w / 2), y: Math.round(wy - h / 2), w: w, h: h };
  }

  /* several images dropped together go in a tidy row-wrapped grid starting at a point */
  function gridPositions(sizes, wx, wy, gap, rowWidth) {
    gap = gap === undefined ? 16 : gap;
    rowWidth = rowWidth || 1400;
    var out = [], x = 0, y = 0, rowH = 0;
    sizes.forEach(function(s) {
      if (x > 0 && x + s.w > rowWidth) { x = 0; y += rowH + gap; rowH = 0; }
      out.push({ x: Math.round(wx + x), y: Math.round(wy + y) });
      x += s.w + gap;
      rowH = Math.max(rowH, s.h);
    });
    return out;
  }

  /* undo/redo over snapshots of the items list (a snapshot is a copy of the array of item copies) */
  function History(limit) {
    this.limit = limit || 50;
    this.past = [];
    this.future = [];
  }
  History.prototype.snapshot = function(items) {
    return items.map(function(it) { return { id: it.id, src: it.src, x: it.x, y: it.y, w: it.w, h: it.h }; });
  };
  History.prototype.push = function(items) {
    this.past.push(this.snapshot(items));
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  };
  History.prototype.canUndo = function() { return this.past.length > 0; };
  History.prototype.canRedo = function() { return this.future.length > 0; };
  History.prototype.undo = function(current) {
    if (!this.past.length) return null;
    this.future.push(this.snapshot(current));
    return this.past.pop();
  };
  History.prototype.redo = function(current) {
    if (!this.future.length) return null;
    this.past.push(this.snapshot(current));
    return this.future.pop();
  };

  /* reading order (top to bottom, then left to right), used by the arrow-key stepping */
  function readingOrder(items) {
    return items.slice().sort(function(a, b) {
      var rowA = Math.round(a.y / 120), rowB = Math.round(b.y / 120);
      return rowA !== rowB ? rowA - rowB : a.x - b.x;
    });
  }

  return {
    MIN_ZOOM: MIN_ZOOM, MAX_ZOOM: MAX_ZOOM, MIN_SIZE: MIN_SIZE,
    clamp: clamp, toWorld: toWorld, toScreen: toScreen, zoomAt: zoomAt,
    bounds: bounds, fitView: fitView, hitTest: hitTest, inRect: inRect,
    scaleFromCorner: scaleFromCorner, placeNatural: placeNatural, gridPositions: gridPositions,
    History: History, readingOrder: readingOrder
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = KMBoard;
