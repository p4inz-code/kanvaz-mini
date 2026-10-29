/* Live checks for Kanvaz Mini. Run through cdp.js while the app is up (see README). */
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var ROOT = path.join(__dirname, '..', '..');
var FIX = path.join(ROOT, 'test', 'fixtures');
var OUT = path.join(ROOT, 'test', 'live', 'out');

module.exports = async function(cdp) {
  var r = {};
  function ok(name, cond, extra) { r[name] = cond ? 'PASS' : ('FAIL ' + JSON.stringify(extra)); }
  fs.mkdirSync(OUT, { recursive: true });
  await cdp.sleep(1500);

  var st = await cdp.eval('JSON.stringify({w: window.outerWidth, h: window.outerHeight, hint: !document.getElementById("hint").hidden, top: null})');
  st = JSON.parse(st);
  ok('01 opens small with the drop hint', st.w <= 520 && st.h <= 400 && st.hint, st);
  ok('02 always on top by default', (await cdp.eval('KMBridge.isOnTop()')) === true);
  await cdp.shot(path.join(OUT, '1-empty.png'));

  /* drop three images through the real DOM drop path (synthetic Files have no disk path, so this is the "dragged from a browser" route) */
  function b64(f) { return fs.readFileSync(path.join(FIX, f)).toString('base64'); }
  var dropJs = function(name, type, data) {
    return '(function(){var b=atob("' + data + '");var u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);var f=new File([u],"' + name + '",{type:"' + type + '"});var dt=new DataTransfer();dt.items.add(f);var e=new DragEvent("drop",{dataTransfer:dt,bubbles:true,cancelable:true,clientX:240,clientY:170});document.dispatchEvent(e);})()';
  };
  await cdp.eval(dropJs('violet.png', 'image/png', b64('violet.png')));
  await cdp.sleep(700);
  ok('03 a dropped image becomes a card and the hint goes', (await cdp.eval('__km.items().length')) === 1 && (await cdp.eval('document.getElementById("hint").hidden')) === true);
  await cdp.eval(dropJs('teal.png', 'image/png', b64('teal.png')));
  await cdp.sleep(500);
  await cdp.eval(dropJs('amber.png', 'image/png', b64('amber.png')));
  await cdp.sleep(500);
  ok('04 three images placed', (await cdp.eval('__km.items().length')) === 3, await cdp.eval('__km.items().length'));

  /* a video dropped is refused with a message and no card */
  var before = await cdp.eval('__km.items().length');
  await cdp.eval(dropJs('clip.mp4', 'video/mp4', b64('clip.mp4')));
  await cdp.sleep(400);
  var toast = await cdp.eval('document.getElementById("toast").textContent');
  ok('05 video is refused with a message', (await cdp.eval('__km.items().length')) === before && /images only/i.test(toast), { toast: toast });

  /* paste */
  await cdp.eval('(function(){var b=atob("' + b64('violet.png') + '");var u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);var f=new File([u],"p.png",{type:"image/png"});var dt=new DataTransfer();dt.items.add(f);document.dispatchEvent(new ClipboardEvent("paste",{clipboardData:dt,bubbles:true,cancelable:true}));})()');
  await cdp.sleep(600);
  ok('06 paste adds an image', (await cdp.eval('__km.items().length')) === before + 1, await cdp.eval('__km.items().length'));

  /* fit then drag the topmost card */
  await cdp.key('f', 'KeyF', 70, 0, 'f');
  await cdp.sleep(300);
  var info = JSON.parse(await cdp.eval('(function(){var its=__km.items();var it=its[its.length-1];var el=document.querySelector("[data-id=\\"" + it.id + "\\"]");var b=el.getBoundingClientRect();return JSON.stringify({id:it.id,x:b.left+b.width/2,y:b.top+b.height/2,ix:it.x,iy:it.y,w:it.w,h:it.h})})()'));
  await cdp.mouse('mouseMoved', info.x, info.y);
  await cdp.mouse('mousePressed', info.x, info.y, { button: 'left', buttons: 1, clickCount: 1 });
  for (var i = 1; i <= 10; i++) { await cdp.mouse('mouseMoved', info.x + i * 5, info.y + i * 3, { button: 'left', buttons: 1 }); await cdp.sleep(15); }
  await cdp.mouse('mouseReleased', info.x + 50, info.y + 30, { button: 'left', buttons: 0, clickCount: 1 });
  await cdp.sleep(250);
  var moved = JSON.parse(await cdp.eval('(function(){var it=__km.items().filter(function(x){return x.id==="' + info.id + '"})[0];return JSON.stringify({x:it.x,y:it.y})})()'));
  ok('07 a card can be dragged', moved.x !== info.ix || moved.y !== info.iy, { before: [info.ix, info.iy], after: moved });

  /* undo puts it back, redo moves it again */
  await cdp.key('z', 'KeyZ', 90, 2, 'z');
  await cdp.sleep(250);
  var undone = JSON.parse(await cdp.eval('(function(){var it=__km.items().filter(function(x){return x.id==="' + info.id + '"})[0];return JSON.stringify({x:it.x,y:it.y})})()'));
  ok('08 Ctrl+Z undoes the move', undone.x === info.ix && undone.y === info.iy, { undone: undone, orig: [info.ix, info.iy] });
  await cdp.key('y', 'KeyY', 89, 2, 'y');
  await cdp.sleep(250);
  var redone = JSON.parse(await cdp.eval('(function(){var it=__km.items().filter(function(x){return x.id==="' + info.id + '"})[0];return JSON.stringify({x:it.x,y:it.y})})()'));
  ok('09 Ctrl+Y redoes it', redone.x === moved.x && redone.y === moved.y, redone);

  /* scale from the bottom-right handle of the selected card */
  var h = JSON.parse(await cdp.eval('(function(){var el=document.querySelector("[data-id=\\"' + info.id + '\\"] .handle[data-c=br]");var b=el.getBoundingClientRect();var it=__km.items().filter(function(x){return x.id==="' + info.id + '"})[0];return JSON.stringify({x:b.left+b.width/2,y:b.top+b.height/2,w:it.w,h:it.h,sel:__km.selected().length})})()'));
  await cdp.mouse('mouseMoved', h.x, h.y);
  await cdp.mouse('mousePressed', h.x, h.y, { button: 'left', buttons: 1, clickCount: 1 });
  for (var j = 1; j <= 8; j++) { await cdp.mouse('mouseMoved', h.x + j * 4, h.y + j * 4, { button: 'left', buttons: 1 }); await cdp.sleep(15); }
  await cdp.mouse('mouseReleased', h.x + 32, h.y + 32, { button: 'left', buttons: 0, clickCount: 1 });
  await cdp.sleep(250);
  var sc = JSON.parse(await cdp.eval('(function(){var it=__km.items().filter(function(x){return x.id==="' + info.id + '"})[0];return JSON.stringify({w:it.w,h:it.h})})()'));
  ok('10 a corner handle scales it', sc.w > h.w && Math.abs(sc.w / sc.h - h.w / h.h) < 0.02, { before: [h.w, h.h], after: sc });

  /* delete and undo */
  var n0 = await cdp.eval('__km.items().length');
  await cdp.key('Delete', 'Delete', 46);
  await cdp.sleep(250);
  ok('11 Delete removes the selected card', (await cdp.eval('__km.items().length')) === n0 - 1);
  await cdp.key('z', 'KeyZ', 90, 2, 'z');
  await cdp.sleep(250);
  ok('12 Ctrl+Z brings it back', (await cdp.eval('__km.items().length')) === n0);

  /* wheel zoom keeps the point under the cursor */
  var z0 = await cdp.eval('__km.view().z');
  await cdp.mouse('mouseWheel', 240, 170, { deltaX: 0, deltaY: -300 });
  await cdp.sleep(200);
  var z1 = await cdp.eval('__km.view().z');
  ok('13 wheel zooms in', z1 > z0, { z0: z0, z1: z1 });
  await cdp.key('0', 'Digit0', 48, 0, '0');
  await cdp.sleep(200);
  ok('14 key 0 resets zoom to 100%', Math.abs((await cdp.eval('__km.view().z')) - 1) < 0.001);
  await cdp.key('f', 'KeyF', 70, 0, 'f');
  await cdp.sleep(200);
  ok('15 F fits everything', (await cdp.eval('__km.view().z')) !== 1);

  /* arrow keys with nothing selected step through references */
  await cdp.eval('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))');
  await cdp.key('ArrowRight', 'ArrowRight', 39);
  await cdp.sleep(300);
  ok('16 Right arrow steps through references', /^\d+ \/ \d+$/.test(await cdp.eval('document.getElementById("pos").textContent')), await cdp.eval('document.getElementById("pos").textContent'));

  /* window opacity and pin */
  var op0 = await cdp.eval('KMBridge.getOpacity()');
  await cdp.key(']', 'BracketRight', 221, 2);
  await cdp.key('[', 'BracketLeft', 219, 2);
  await cdp.key('[', 'BracketLeft', 219, 2);
  await cdp.sleep(300);
  var op1 = await cdp.eval('KMBridge.getOpacity()');
  ok('17 Ctrl+[ makes the window more see-through', op1 < op0 || op0 < 0.3, { op0: op0, op1: op1 });
  await cdp.key('p', 'KeyP', 80, 0, 'p');
  await cdp.sleep(300);
  ok('18 P toggles keep-on-top', (await cdp.eval('KMBridge.isOnTop()')) === false);
  await cdp.key('p', 'KeyP', 80, 0, 'p');
  await cdp.sleep(300);
  ok('19 and back on', (await cdp.eval('KMBridge.isOnTop()')) === true);
  await cdp.shot(path.join(OUT, '2-with-images.png'));

  await cdp.eval('window.confirm = function() { return true; }');   /* the real app asks before replacing unsaved work; the test says yes */
  /* open a saved board through a second launch (the OS "open with" path) */
  var packaged = process.env.KM_EXE;   /* set to test the built app instead of the source tree */
  var exe = packaged || path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe');
  var prof = process.env.TEMP + '\\kanvaz-mini-test-profile';
  cp.spawn(exe, (packaged ? [] : [ROOT]).concat(['--user-data-dir=' + prof, path.join(FIX, 'sample.kmini')]), { stdio: 'ignore', detached: true }).unref();
  await cdp.sleep(2500);
  var loaded = JSON.parse(await cdp.eval('JSON.stringify({n: __km.items().length, z: __km.view().z})'));
  ok('20 a .kmini board opens through a second launch', loaded.n === 2 && Math.abs(loaded.z - 0.5) < 0.001, loaded);
  await cdp.shot(path.join(OUT, '3-opened-board.png'));

  /* a PureRef .pur board: two PNGs at known positions, half scale */
  var before2 = await cdp.eval('__km.items().length');
  cp.spawn(exe, (packaged ? [] : [ROOT]).concat(['--user-data-dir=' + prof, path.join(FIX, 'sample.pur')]), { stdio: 'ignore', detached: true }).unref();
  await cdp.sleep(3000);
  var purItems = JSON.parse(await cdp.eval('JSON.stringify(__km.items().slice(-2).map(function(i){return {x:i.x,y:i.y,w:i.w,h:i.h}}))'));
  ok('21 a PureRef .pur board imports with positions and scale', (await cdp.eval('__km.items().length')) === before2 + 2 && purItems[0].w === 300 && purItems[0].h === 200 && purItems[1].x === 700 && purItems[1].w === 150, purItems);
  await cdp.shot(path.join(OUT, '4-pur-import.png'));

  /* ---- the PureRef-style extras: rotate, flip, grayscale, arrange, help, click-through ---- */
  await cdp.eval('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))');
  var firstId = await cdp.eval('__km.items()[0].id');
  await cdp.eval('(function(){var el=document.querySelector("[data-id=\\"' + firstId + '\\"]");var b=el.getBoundingClientRect();window.__pt={x:b.left+b.width/2,y:b.top+b.height/2};})()');
  await cdp.key('f', 'KeyF', 70, 0, 'f');
  await cdp.sleep(300);
  var pt = JSON.parse(await cdp.eval('(function(){var el=document.querySelector("[data-id=\\"' + firstId + '\\"]");var b=el.getBoundingClientRect();return JSON.stringify({x:b.left+b.width/2,y:b.top+b.height/2})})()'));
  await cdp.mouse('mouseMoved', pt.x, pt.y);
  await cdp.mouse('mousePressed', pt.x, pt.y, { button: 'left', buttons: 1, clickCount: 1 });
  await cdp.mouse('mouseReleased', pt.x, pt.y, { button: 'left', buttons: 0, clickCount: 1 });
  await cdp.sleep(200);
  firstId = await cdp.eval('__km.selected()[0]');   /* whichever card the click landed on (the topmost there) */
  var before3 = JSON.parse(await cdp.eval('(function(){var it=__km.items().filter(function(x){return x.id==="' + firstId + '"})[0];return JSON.stringify({w:it.w,h:it.h,rot:it.rot||0,x:it.x,y:it.y})})()'));
  await cdp.key('r', 'KeyR', 82, 0, 'r');
  await cdp.sleep(250);
  var after3 = JSON.parse(await cdp.eval('(function(){var it=__km.items().filter(function(x){return x.id==="' + firstId + '"})[0];var pic=document.querySelector("[data-id=\\"' + firstId + '\\"] .pic");return JSON.stringify({w:it.w,h:it.h,rot:it.rot,x:it.x,y:it.y,tf:pic.style.transform})})()'));
  ok('22 R rotates a quarter turn (box swaps, centre stays)', after3.rot === 1 && after3.w === before3.h && after3.h === before3.w && Math.abs((after3.x + after3.w / 2) - (before3.x + before3.w / 2)) <= 1 && /rotate\(90deg\)/.test(after3.tf), { before3: before3, after3: after3 });
  await cdp.key('z', 'KeyZ', 90, 2, 'z');
  await cdp.sleep(250);
  ok('23 Ctrl+Z undoes the rotation', (await cdp.eval('__km.items().filter(function(x){return x.id==="' + firstId + '"})[0].rot || 0')) === 0);
  await cdp.key('h', 'KeyH', 72, 0, 'h');
  await cdp.sleep(200);
  var fl = JSON.parse(await cdp.eval('(function(){var it=__km.items().filter(function(x){return x.id==="' + firstId + '"})[0];var pic=document.querySelector("[data-id=\\"' + firstId + '\\"] .pic");return JSON.stringify({fx:it.fx,tf:pic.style.transform})})()'));
  ok('24 H flips left-right', fl.fx === true && /scale\(-1,\s*1\)/.test(fl.tf), fl);
  await cdp.key('g', 'KeyG', 71, 0, 'g');
  await cdp.sleep(200);
  var gOn = await cdp.eval('document.querySelector("[data-id=\\"' + firstId + '\\"] .pic").style.filter');
  await cdp.key('g', 'KeyG', 71, 0, 'g');
  await cdp.sleep(200);
  var gOff = await cdp.eval('document.querySelector("[data-id=\\"' + firstId + '\\"] .pic").style.filter');
  ok('25 G toggles grayscale on and off', /grayscale\(1\)/.test(gOn) && gOff === '', { gOn: gOn, gOff: gOff });

  /* arrange everything */
  await cdp.key('a', 'KeyA', 65, 2, 'a');
  await cdp.sleep(200);
  await cdp.key('a', 'KeyA', 65, 0, 'a');
  await cdp.sleep(500);
  var arr = JSON.parse(await cdp.eval('JSON.stringify(__km.items().map(function(i){return {x:i.x,y:i.y,w:i.w,h:i.h}}))'));
  var overlap = false;
  for (var a = 0; a < arr.length; a++) for (var b = a + 1; b < arr.length; b++) {
    var A = arr[a], Bq = arr[b];
    if (!(A.x + A.w <= Bq.x + 1 || Bq.x + Bq.w <= A.x + 1 || A.y + A.h <= Bq.y + 1 || Bq.y + Bq.h <= A.y + 1)) overlap = true;
  }
  ok('26 A arranges everything into rows with no overlaps', arr.length >= 3 && !overlap, arr);
  await cdp.shot(path.join(OUT, '5-arranged.png'));

  /* help card */
  await cdp.key('?', 'Slash', 191, 8, '?');
  await cdp.sleep(200);
  var helpOn = await cdp.eval('!document.getElementById("help").hidden');
  await cdp.eval('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))');
  await cdp.sleep(150);
  var helpOff = await cdp.eval('document.getElementById("help").hidden');
  ok('27 ? opens the key list and Esc closes it', helpOn === true && helpOff === true, { helpOn: helpOn, helpOff: helpOff });
  await cdp.shot(path.join(OUT, '6-help-check.png'));

  /* click-through tracing mode */
  var t1 = await cdp.eval('KMBridge.toggleClickThrough()');
  var t1b = await cdp.eval('KMBridge.isClickThrough()');
  await cdp.sleep(300);
  var cls = await cdp.eval('document.body.classList.contains("tracing")');
  var t2 = await cdp.eval('KMBridge.toggleClickThrough()');
  await cdp.sleep(200);
  ok('28 click-through tracing mode turns on and off', t1 === true && t1b === true && cls === true && t2 === false, { t1: t1, t1b: t1b, cls: cls, t2: t2 });

  /* ---- production checks ---- */
  var net = await cdp.eval('fetch("https://example.com/").then(function(){return "reached"},function(){return "blocked"})');
  ok('29 the network is blocked (no request leaves the app)', net === 'blocked', net);

  /* a real path through the OS "open with" route (a PNG on disk) */
  var nBeforePng = await cdp.eval('__km.items().length');
  cp.spawn(exe, (packaged ? [] : [ROOT]).concat(['--user-data-dir=' + prof, path.join(FIX, 'amber.png')]), { stdio: 'ignore', detached: true }).unref();
  await cdp.sleep(2500);
  ok('30 an image opened by its real path is added', (await cdp.eval('__km.items().length')) === nBeforePng + 1, await cdp.eval('__km.items().length'));

  /* recovery copy */
  await cdp.sleep(3500);
  var recFile = path.join(prof, 'recovery.kmini');
  var recOk = false, recN = -1;
  try { var rj = JSON.parse(fs.readFileSync(recFile, 'utf8')); recOk = rj.format === 'kanvaz-mini'; recN = rj.items.length; } catch (e) { /* not written */ }
  ok('31 a recovery copy of the board is written automatically', recOk && recN === (await cdp.eval('__km.items().length')), { recOk: recOk, recN: recN });

  /* new board, then leave exactly one image for the restart test */
  await cdp.eval('window.confirm = function() { return true; }');
  await cdp.key('n', 'KeyN', 78, 2, 'n');
  await cdp.sleep(300);
  ok('32 Ctrl+N starts an empty board', (await cdp.eval('__km.items().length')) === 0);
  await cdp.eval(dropJs('violet.png', 'image/png', b64('violet.png')));
  await cdp.sleep(900);
  ok('33 and one image can be added to it', (await cdp.eval('__km.items().length')) === 1);
  await cdp.sleep(3500);
  return r;
};
