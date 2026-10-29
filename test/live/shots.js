/* Captures the README screenshots from the running app: node test/live/cdp.js test/live/shots.js */
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..', '..');
var DEMO = path.join(ROOT, 'test', 'fixtures', 'demo');
var OUT = path.join(ROOT, 'docs-shots');

module.exports = async function(cdp) {
  fs.mkdirSync(OUT, { recursive: true });
  var names = ['neon-alley', 'sunset-dunes', 'teal-study', 'ember-ridge', 'city-dusk', 'fog-ridges', 'night-harbor', 'lilac-haze'];
  var srcs = names.map(function(n) { return { src: 'data:image/png;base64,' + fs.readFileSync(path.join(DEMO, n + '.png')).toString('base64'), name: n }; });
  async function size(w, h) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await cdp.sleep(500);
  }
  async function reset() {
    await cdp.eval('window.confirm = function() { return true; }; __km.newBoard();');
    await cdp.sleep(300);
  }
  var shots = {};
  /* 1. the empty state at the real default size */
  await reset();
  await size(480, 340);
  await cdp.shot(path.join(OUT, 'mini-empty.png'));

  /* 2. a board arranged into tidy rows, wide */
  await size(1000, 640);
  await cdp.eval('(function(){__km.add(' + JSON.stringify(srcs) + ');})()');
  await cdp.sleep(2500);
  await cdp.eval('document.dispatchEvent(new KeyboardEvent("keydown",{key:"a",ctrlKey:true}))');
  await cdp.key('a', 'KeyA', 65, 0, 'a');
  await cdp.sleep(900);
  await cdp.eval('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))');
  await cdp.key('f', 'KeyF', 70, 0, 'f');
  await cdp.sleep(800);
  await cdp.shot(path.join(OUT, 'mini-board.png'));

  /* 3. the value check */
  await cdp.key('g', 'KeyG', 71, 0, 'g');
  await cdp.sleep(900);
  await cdp.shot(path.join(OUT, 'mini-grayscale.png'));
  await cdp.key('g', 'KeyG', 71, 0, 'g');
  await cdp.sleep(500);

  /* 4. small window, as it sits beside another app */
  await size(480, 340);
  await cdp.eval('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))');
  await cdp.key('f', 'KeyF', 70, 0, 'f');
  await cdp.sleep(800);
  await cdp.shot(path.join(OUT, 'mini-small.png'));

  /* 5. the key list */
  await size(700, 560);
  await cdp.key('?', 'Slash', 191, 8, '?');
  await cdp.sleep(500);
  await cdp.shot(path.join(OUT, 'mini-keys.png'));
  await cdp.eval('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))');
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  return fs.readdirSync(OUT);
};
