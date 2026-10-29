/* Kanvaz Mini: the whole renderer. Plain DOM, no framework. Logic that can be tested lives in board.js. */
(function() {
  var B = KMBoard;
  var stage = document.getElementById('stage');
  var world = document.getElementById('world');
  var marqueeEl = document.getElementById('marquee');
  var hint = document.getElementById('hint');
  var posEl = document.getElementById('pos');
  var toastEl = document.getElementById('toast');

  var items = [];
  var selected = {};          /* id -> true */
  var view = { x: 0, y: 0, z: 1 };
  var hist = new B.History(50);
  var seq = 0;
  var boardPath = null;
  var dirty = false;
  var stepIdx = -1;
  var spaceDown = false;
  var els = {};               /* id -> element */
  var drag = null;            /* the pointer interaction in progress */
  var onTop = true;

  function newId() { seq++; return 'i' + Date.now().toString(36) + seq; }
  function selIds() { return Object.keys(selected); }
  function selItems() { return items.filter(function(it) { return selected[it.id]; }); }

  /* ---------- toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { toastEl.classList.remove('on'); }, 2600);
  }

  /* ---------- drawing ---------- */
  function applyView() {
    world.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.z + ')';
    world.style.setProperty('--z', String(view.z));
    var g = 22 * view.z;
    stage.style.backgroundSize = Math.max(8, g) + 'px ' + Math.max(8, g) + 'px';
    stage.style.backgroundPosition = view.x + 'px ' + view.y + 'px';
  }

  function render() {
    var ids = {};
    var single = selIds().length === 1;
    items.forEach(function(it, i) {
      ids[it.id] = true;
      var el = els[it.id];
      if (!el) {
        el = document.createElement('div');
        el.className = 'item';
        el.dataset.id = it.id;
        var pic = document.createElement('div');
        pic.className = 'pic';
        var img = document.createElement('img');
        img.src = it.src;
        img.alt = '';
        img.draggable = false;
        pic.appendChild(img);
        el.appendChild(pic);
        ['tl', 'tr', 'bl', 'br'].forEach(function(c) {
          var h = document.createElement('div');
          h.className = 'handle';
          h.dataset.c = c;
          el.appendChild(h);
        });
        world.appendChild(el);
        els[it.id] = el;
      }
      el.style.left = it.x + 'px';
      el.style.top = it.y + 'px';
      el.style.width = it.w + 'px';
      el.style.height = it.h + 'px';
      el.style.zIndex = String(i);
      var pic2 = el.firstChild;
      var odd = (it.rot || 0) % 2 === 1;
      pic2.style.width = (odd ? it.h : it.w) + 'px';
      pic2.style.height = (odd ? it.w : it.h) + 'px';
      pic2.style.transform = 'translate(-50%,-50%) scale(' + (it.fx ? -1 : 1) + ',' + (it.fy ? -1 : 1) + ') rotate(' + ((it.rot || 0) * 90) + 'deg)';
      pic2.style.filter = it.gray ? 'grayscale(1)' : '';
      el.classList.toggle('sel', !!selected[it.id]);
      el.classList.toggle('single', !!selected[it.id] && single);
    });
    Object.keys(els).forEach(function(id) {
      if (!ids[id]) { els[id].remove(); delete els[id]; }
    });
    hint.hidden = items.length > 0;
  }

  function changed() { dirty = true; render(); }
  function pushHistory() { hist.push(items); }

  /* ---------- adding images ---------- */
  function loadImage(src) {
    return new Promise(function(res, rej) {
      var img = new Image();
      img.onload = function() { res({ w: img.naturalWidth || 200, h: img.naturalHeight || 150 }); };
      img.onerror = function() { rej(new Error('decode')); };
      img.src = src;
    });
  }

  /* srcList: [{ src, name }] placed around a world point (the middle of the window by default) */
  function addImages(srcList, at) {
    if (!srcList.length) return Promise.resolve();
    var cx = at ? at.x : (stage.clientWidth / 2 - view.x) / view.z;
    var cy = at ? at.y : (stage.clientHeight / 2 - view.y) / view.z;
    return Promise.all(srcList.map(function(s) {
      return loadImage(s.src).then(function(sz) { return { src: s.src, w: sz.w, h: sz.h }; }, function() { return null; });
    })).then(function(sized) {
      sized = sized.filter(Boolean);
      var failed = srcList.length - sized.length;
      if (failed) toast(failed + (failed === 1 ? ' image' : ' images') + ' could not be read');
      if (!sized.length) return;
      pushHistory();
      var placed = sized.map(function(s) { return B.placeNatural(s.w, s.h, 0, 0, 480); });
      var gp = B.gridPositions(placed, cx - 0, cy - 0, 16, 1400);
      selected = {};
      sized.forEach(function(s, i) {
        var p = placed[i];
        var it = { id: newId(), rot: 0, fx: false, fy: false, gray: false, src: s.src, x: sized.length === 1 ? Math.round(cx - p.w / 2) : gp[i].x, y: sized.length === 1 ? Math.round(cy - p.h / 2) : gp[i].y, w: p.w, h: p.h };
        items.push(it);
        selected[it.id] = true;
      });
      changed();
      if (items.length === sized.length) fit();
    });
  }

  function addPaths(paths, at) {
    var imgs = [], boards = [], purs = [], refused = 0;
    paths.forEach(function(p) {
      if (/\.pur$/i.test(p)) purs.push(p);
      else if (/\.kmini$/i.test(p)) boards.push(p);
      else if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(p)) imgs.push(p);
      else refused++;
    });
    if (refused) toast('Mini shows images only. Open video, 3D, PDF and PSD files in Kanvaz');
    var chain = Promise.resolve();
    if (boards.length) chain = chain.then(function() { return openBoard(boards[0]); });
    purs.forEach(function(p) { chain = chain.then(function() { return importPur(p); }); });
    if (imgs.length) {
      chain = chain.then(function() {
        return Promise.all(imgs.map(function(p) { return window.KMBridge.readImage(p); })).then(function(rs) {
          var ok = rs.filter(function(r) { return r && r.ok; });
          var bad = rs.length - ok.length;
          if (bad) toast(bad + (bad === 1 ? ' file' : ' files') + ' could not be opened (too big, not an image, or not readable)');
          return addImages(ok, at);
        });
      });
    }
    return chain;
  }

  /* files from a drop or paste: use the real path when there is one, else read the bytes (images dragged from a browser) */
  function filesToImages(fileList) {
    var out = [], pathList = [], refused = 0;
    var jobs = [];
    Array.prototype.forEach.call(fileList, function(f) {
      var p = window.KMBridge.pathForFile(f);
      if (p) { pathList.push(p); return; }
      if (f.type && /^image\/(png|jpeg|gif|webp|bmp)$/.test(f.type)) {
        jobs.push(new Promise(function(res) {
          var fr = new FileReader();
          fr.onload = function() { res({ src: String(fr.result), name: f.name }); };
          fr.onerror = function() { res(null); };
          fr.readAsDataURL(f);
        }));
      } else refused++;
    });
    return Promise.all(jobs).then(function(got) {
      out = got.filter(Boolean);
      return { images: out, paths: pathList, refused: refused };
    });
  }

  function handleFiles(fileList, at) {
    return filesToImages(fileList).then(function(r) {
      if (r.refused) toast('Mini shows images only. Open video, 3D, PDF and PSD files in Kanvaz');
      var p = r.paths.length ? addPaths(r.paths, at) : Promise.resolve();
      return p.then(function() { return addImages(r.images, at); });
    });
  }

  /* ---------- view ---------- */
  function fit() {
    var list = selIds().length > 1 ? selItems() : items;
    view = B.fitView(list, stage.clientWidth, stage.clientHeight, 24);
    applyView();
  }
  function resetZoom() {
    var cx = stage.clientWidth / 2, cy = stage.clientHeight / 2;
    var f = 1 / view.z;
    view = B.zoomAt(view, cx, cy, f);
    applyView();
  }
  function zoomBy(f, sx, sy) {
    view = B.zoomAt(view, sx === undefined ? stage.clientWidth / 2 : sx, sy === undefined ? stage.clientHeight / 2 : sy, f);
    applyView();
  }

  /* ---------- editing ---------- */
  function deleteSelected() {
    var ids = selIds();
    if (!ids.length) return;
    pushHistory();
    items = items.filter(function(it) { return !selected[it.id]; });
    selected = {};
    changed();
  }
  function duplicateSelected() {
    var sel = selItems();
    if (!sel.length) return;
    pushHistory();
    var next = {};
    sel.forEach(function(it) {
      var c = { id: newId(), src: it.src, x: it.x + 24, y: it.y + 24, w: it.w, h: it.h, rot: it.rot || 0, fx: !!it.fx, fy: !!it.fy, gray: !!it.gray };
      items.push(c);
      next[c.id] = true;
    });
    selected = next;
    changed();
  }
  function restore(snap) {
    items = snap.map(function(it) { return { id: it.id, src: it.src, x: it.x, y: it.y, w: it.w, h: it.h, rot: it.rot || 0, fx: !!it.fx, fy: !!it.fy, gray: !!it.gray }; });
    var keep = {};
    items.forEach(function(it) { if (selected[it.id]) keep[it.id] = true; });
    selected = keep;
    changed();
  }
  function undo() { var s = hist.undo(items); if (s) restore(s); }
  function redo() { var s = hist.redo(items); if (s) restore(s); }
  /* the targets of a one-key action: the selection, or everything when nothing is selected */
  function targets() { var sel = selItems(); return sel.length ? sel : items; }

  function rotateSel(dir) {
    var list = targets();
    if (!list.length) return;
    pushHistory();
    list.forEach(function(it) { var n = B.rotateBox(it, dir); it.x = n.x; it.y = n.y; it.w = n.w; it.h = n.h; it.rot = n.rot; });
    changed();
  }
  function flipSel(axis) {
    var list = targets();
    if (!list.length) return;
    pushHistory();
    list.forEach(function(it) { if (axis === 'x') it.fx = !it.fx; else it.fy = !it.fy; });
    changed();
  }
  /* grayscale: a value check. On the selection, or on everything when nothing is selected */
  function grayscaleSel() {
    var list = targets();
    if (!list.length) return;
    var turnOn = list.some(function(it) { return !it.gray; });
    pushHistory();
    list.forEach(function(it) { it.gray = turnOn; });
    changed();
    toast(turnOn ? 'Grayscale on' : 'Grayscale off');
  }
  /* one key to tidy: justified rows, anchored where the group's top-left is */
  function arrangeSel() {
    var list = targets();
    if (list.length < 2) { toast('Select two or more images to arrange'); return; }
    var b = B.bounds(list);
    var rowW = Math.max(600, Math.min(2400, Math.round(stage.clientWidth / view.z * 0.92)));
    var pos = B.arrangeRows(list.map(function(it) { return { w: it.w, h: it.h }; }), rowW, 12, 220);
    pushHistory();
    list.forEach(function(it, i) { it.x = Math.round(b.x + pos[i].x); it.y = Math.round(b.y + pos[i].y); it.w = pos[i].w; it.h = pos[i].h; });
    changed();
    var keep = selected; selected = {}; list.forEach(function(it) { selected[it.id] = true; });
    fit(); selected = keep; render();
  }
  function toggleHelp() { var h = document.getElementById('help'); h.hidden = !h.hidden; }

  function selectAll() { selected = {}; items.forEach(function(it) { selected[it.id] = true; }); render(); }

  function step(dir) {
    var order = B.readingOrder(items);
    if (!order.length) return;
    stepIdx = stepIdx < 0 ? (dir > 0 ? 0 : order.length - 1) : (stepIdx + dir + order.length) % order.length;
    var it = order[stepIdx];
    view = B.fitView([it], stage.clientWidth, stage.clientHeight, 24);
    applyView();
    selected = {};
    render();
    posEl.textContent = (stepIdx + 1) + ' / ' + order.length;
  }

  /* ---------- PureRef boards ---------- */
  function importPur(p) {
    toast('Importing PureRef board...');
    return window.KMBridge.readPur(p).then(function(r) {
      if (!r || !r.ok || !r.images.length) { toast('Could not read images from that PureRef file'); return; }
      return Promise.all(r.images.map(function(i) {
        return loadImage(i.src).then(function(sz) { return { src: i.src, x: i.x, y: i.y, w: Math.max(B.MIN_SIZE, Math.round(sz.w * i.sx)), h: Math.max(B.MIN_SIZE, Math.round(sz.h * i.sy)) }; }, function() { return null; });
      })).then(function(list) {
        list = list.filter(Boolean);
        if (!list.length) { toast('Could not read images from that PureRef file'); return; }
        pushHistory();
        selected = {};
        list.forEach(function(s) { items.push({ id: newId(), rot: 0, fx: false, fy: false, gray: false, src: s.src, x: s.x, y: s.y, w: s.w, h: s.h }); });
        changed();
        fit();
        toast('Imported ' + list.length + (list.length === 1 ? ' image' : ' images') + ' from PureRef');
      });
    });
  }

  /* ---------- save and open ---------- */
  function saveBoard() {
    if (!items.length) { toast('Nothing to save yet'); return Promise.resolve(); }
    var text = JSON.stringify({ format: 'kanvaz-mini', version: 1, view: view, items: items.map(function(it) { return { id: it.id, src: it.src, x: it.x, y: it.y, w: it.w, h: it.h, rot: it.rot || 0, fx: !!it.fx, fy: !!it.fy, gray: !!it.gray }; }) });
    return window.KMBridge.saveBoard(text, boardPath || 'board.kmini').then(function(r) {
      if (r && r.ok) { boardPath = r.path; dirty = false; toast('Saved'); }
      else if (!(r && r.canceled)) toast('Could not save the board');
    });
  }
  function openBoard(p) {
    if (dirty && items.length && !window.confirm('Replace the current board? Unsaved changes will be lost.')) return Promise.resolve();
    return window.KMBridge.readBoard(p).then(function(r) {
      if (!r || !r.ok) { toast('That is not a Kanvaz Mini board'); return; }
      items = r.board.items; selected = {}; view = r.board.view; boardPath = r.path; dirty = false; hist = new B.History(50);
      applyView(); render();
    });
  }
  function openDialog() {
    return window.KMBridge.openDialog().then(function(paths) { if (paths && paths.length) return addPaths(paths); });
  }

  /* ---------- pointer ---------- */
  function worldPt(e) {
    var r = stage.getBoundingClientRect();
    return B.toWorld(view, e.clientX - r.left, e.clientY - r.top);
  }

  stage.addEventListener('pointerdown', function(e) {
    stage.focus();
    var panning = e.button === 1 || e.button === 2 || (e.button === 0 && spaceDown);
    if (panning) {
      drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
      stage.classList.add('panning');
      stage.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    var w = worldPt(e);
    var handle = e.target && e.target.classList && e.target.classList.contains('handle') ? e.target : null;
    if (handle) {
      var it = items.filter(function(x) { return x.id === handle.parentNode.dataset.id; })[0];
      if (it) {
        drag = { mode: 'scale', item: it, corner: handle.dataset.c, orig: { x: it.x, y: it.y, w: it.w, h: it.h }, pushed: false };
        stage.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
    }
    var hit = B.hitTest(items, w.x, w.y);
    if (hit) {
      if (e.shiftKey) { if (selected[hit.id]) delete selected[hit.id]; else selected[hit.id] = true; }
      else if (!selected[hit.id]) { selected = {}; selected[hit.id] = true; }
      /* a click raises the item to the top of the stack */
      var idx = items.indexOf(hit);
      if (idx !== items.length - 1 && !e.shiftKey) { items.splice(idx, 1); items.push(hit); }
      render();
      drag = { mode: 'move', start: w, origs: selItems().map(function(it) { return { it: it, x: it.x, y: it.y }; }), pushed: false };
      stage.setPointerCapture(e.pointerId);
    } else {
      if (!e.shiftKey) selected = {};
      render();
      var r = stage.getBoundingClientRect();
      drag = { mode: 'marquee', x0: e.clientX, y0: e.clientY, w0: w, base: Object.assign({}, selected), r: r };
      stage.setPointerCapture(e.pointerId);
    }
  });

  stage.addEventListener('pointermove', function(e) {
    if (!drag) return;
    if (drag.mode === 'pan') {
      view = { x: drag.vx + (e.clientX - drag.sx), y: drag.vy + (e.clientY - drag.sy), z: view.z };
      applyView();
    } else if (drag.mode === 'move') {
      var w = worldPt(e);
      var dx = w.x - drag.start.x, dy = w.y - drag.start.y;
      if (!drag.pushed && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
        /* the undo snapshot is the state before this drag started */
        var snap = hist.snapshot(items);
        drag.origs.forEach(function(o) { var s = snap.filter(function(x) { return x.id === o.it.id; })[0]; if (s) { s.x = o.x; s.y = o.y; } });
        hist.past.push(snap); if (hist.past.length > hist.limit) hist.past.shift(); hist.future = [];
        drag.pushed = true;
      }
      drag.origs.forEach(function(o) { o.it.x = Math.round(o.x + dx); o.it.y = Math.round(o.y + dy); });
      dirty = true; render();
    } else if (drag.mode === 'scale') {
      var wp = worldPt(e);
      if (!drag.pushed) {
        var snap2 = hist.snapshot(items);
        var s2 = snap2.filter(function(x) { return x.id === drag.item.id; })[0];
        if (s2) { s2.x = drag.orig.x; s2.y = drag.orig.y; s2.w = drag.orig.w; s2.h = drag.orig.h; }
        hist.past.push(snap2); if (hist.past.length > hist.limit) hist.past.shift(); hist.future = [];
        drag.pushed = true;
      }
      var n = B.scaleFromCorner(drag.orig, drag.corner, wp.x, wp.y);
      drag.item.x = Math.round(n.x); drag.item.y = Math.round(n.y); drag.item.w = Math.round(n.w); drag.item.h = Math.round(n.h);
      dirty = true; render();
    } else if (drag.mode === 'marquee') {
      var x0 = Math.min(drag.x0, e.clientX), y0 = Math.min(drag.y0, e.clientY), x1 = Math.max(drag.x0, e.clientX), y1 = Math.max(drag.y0, e.clientY);
      marqueeEl.hidden = false;
      marqueeEl.style.left = x0 + 'px'; marqueeEl.style.top = y0 + 'px';
      marqueeEl.style.width = (x1 - x0) + 'px'; marqueeEl.style.height = (y1 - y0) + 'px';
      var w1 = worldPt(e);
      var hit = B.inRect(items, { x0: drag.w0.x, y0: drag.w0.y, x1: w1.x, y1: w1.y });
      selected = Object.assign({}, drag.base);
      hit.forEach(function(it) { selected[it.id] = true; });
      render();
    }
  });

  function endDrag(e) {
    if (!drag) return;
    marqueeEl.hidden = true;
    stage.classList.remove('panning');
    drag = null;
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  stage.addEventListener('dblclick', function(e) {
    var w = worldPt(e);
    if (!B.hitTest(items, w.x, w.y)) fit();
  });

  stage.addEventListener('wheel', function(e) {
    e.preventDefault();
    var r = stage.getBoundingClientRect();
    var f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    zoomBy(f, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', function(e) {
    var k = e.key, kl = k.toLowerCase();
    var ctrl = e.ctrlKey || e.metaKey;
    if (k === ' ') { spaceDown = true; e.preventDefault(); return; }
    if (ctrl && kl === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (ctrl && kl === 'y') { e.preventDefault(); redo(); return; }
    if (ctrl && kl === 'a') { e.preventDefault(); selectAll(); return; }
    if (ctrl && kl === 'd') { e.preventDefault(); duplicateSelected(); return; }
    if (ctrl && kl === 's') { e.preventDefault(); saveBoard(); return; }
    if (ctrl && kl === 'o') { e.preventDefault(); openDialog(); return; }
    if (ctrl && k === '[') { e.preventDefault(); changeOpacity(-0.1); return; }
    if (ctrl && k === ']') { e.preventDefault(); changeOpacity(0.1); return; }
    if (ctrl || e.altKey) return;
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); deleteSelected(); return; }
    if (kl === 'f') { fit(); return; }
    if (k === '0') { resetZoom(); return; }
    if (k === '+' || k === '=') { zoomBy(1.2); return; }
    if (k === '-') { zoomBy(1 / 1.2); return; }
    if (kl === 'p') { togglePin(); return; }
    if (kl === 'r') { e.preventDefault(); rotateSel(e.shiftKey ? -1 : 1); return; }
    if (kl === 'h') { flipSel('x'); return; }
    if (kl === 'v') { flipSel('y'); return; }
    if (kl === 'g') { grayscaleSel(); return; }
    if (kl === 'a') { arrangeSel(); return; }
    if (k === '?' || k === '/') { toggleHelp(); return; }
    if (k === 'Escape') { var hp = document.getElementById('help'); if (!hp.hidden) { hp.hidden = true; return; } selected = {}; render(); return; }
    if (k.indexOf('Arrow') === 0) {
      e.preventDefault();
      var sel = selItems();
      if (sel.length) {
        var d = e.shiftKey ? 10 : 1;
        pushHistory();
        sel.forEach(function(it) {
          if (k === 'ArrowLeft') it.x -= d; if (k === 'ArrowRight') it.x += d;
          if (k === 'ArrowUp') it.y -= d; if (k === 'ArrowDown') it.y += d;
        });
        changed();
      } else if (k === 'ArrowLeft' || k === 'ArrowRight') step(k === 'ArrowRight' ? 1 : -1);
    }
  });
  document.addEventListener('keyup', function(e) { if (e.key === ' ') spaceDown = false; });
  window.addEventListener('blur', function() { spaceDown = false; });

  /* ---------- paste and drop ---------- */
  document.addEventListener('paste', function(e) {
    var dt = e.clipboardData;
    if (!dt) return;
    var imgFiles = [];
    for (var i = 0; i < dt.items.length; i++) {
      if (dt.items[i].kind === 'file' && /^image\//.test(dt.items[i].type)) { var f = dt.items[i].getAsFile(); if (f) imgFiles.push(f); }
    }
    if (imgFiles.length) { e.preventDefault(); handleFiles(imgFiles); }
  });
  document.addEventListener('dragover', function(e) { e.preventDefault(); document.body.classList.add('dragover'); });
  document.addEventListener('dragleave', function(e) { if (!e.relatedTarget) document.body.classList.remove('dragover'); });
  document.addEventListener('drop', function(e) {
    e.preventDefault();
    document.body.classList.remove('dragover');
    var at = worldPt(e);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files, at);
  });

  /* ---------- window controls ---------- */
  var pinBtn = document.getElementById('pin');
  function togglePin() {
    onTop = !onTop;
    window.KMBridge.setOnTop(onTop);
    pinBtn.classList.toggle('on', onTop);
    toast(onTop ? 'Kept on top' : 'Not on top');
  }
  var opacity = 1;
  function changeOpacity(d) {
    opacity = Math.max(0.2, Math.min(1, Math.round((opacity + d) * 10) / 10));
    window.KMBridge.setOpacity(opacity);
    toast('Window opacity ' + Math.round(opacity * 100) + '%');
  }
  var traceBtn = document.getElementById('trace');
  function showTrace(on) {
    document.body.classList.toggle('tracing', !!on);
    traceBtn.classList.toggle('on', !!on);
    toast(on ? 'Click-through on: clicks pass to the app below. Ctrl+Alt+T or the bar turns it off' : 'Click-through off');
  }
  traceBtn.addEventListener('click', function() { window.KMBridge.toggleClickThrough().then(showTrace); });
  window.KMBridge.onClickThrough(showTrace);
  /* while click-through is on the window ignores the mouse, except over the top bar so it can be turned off again */
  var barEl = document.getElementById('bar');
  barEl.addEventListener('mouseenter', function() { window.KMBridge.setIgnoreMouse(false); });
  barEl.addEventListener('mouseleave', function() { if (document.body.classList.contains('tracing')) window.KMBridge.setIgnoreMouse(true); });
  document.getElementById('help-close').addEventListener('click', toggleHelp);
  pinBtn.addEventListener('click', togglePin);
  document.getElementById('op-').addEventListener('click', function() { changeOpacity(-0.1); });
  document.getElementById('op+').addEventListener('click', function() { changeOpacity(0.1); });
  document.getElementById('close').addEventListener('click', function() { window.KMBridge.close(); });
  window.addEventListener('beforeunload', function(e) { /* nothing blocks closing: a reference window should never nag */ });

  window.KMBridge.isOnTop().then(function(v) { onTop = !!v; pinBtn.classList.toggle('on', onTop); });
  window.KMBridge.getOpacity().then(function(v) { if (typeof v === 'number') opacity = v; });
  window.KMBridge.onOpenFiles(function(list) { addPaths(list); });
  window.addEventListener('resize', function() { applyView(); });

  /* a tiny hook for the live test (read-only view of the state) */
  window.__km = { rotate: rotateSel, flip: flipSel, gray: grayscaleSel, arrange: arrangeSel, items: function() { return items; }, selected: function() { return selIds(); }, view: function() { return view; }, add: addImages, fit: fit };

  applyView();
  render();
})();
