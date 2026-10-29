/* Builds test/fixtures/sample.pur: a minimal PureRef-format board holding two real PNGs with known positions and scales.
   The record layout mirrors what pur-import.js reads (same layout the Kanvaz parser tests use). Usage: node test/make-pur-fixture.js */
var fs = require('fs');
var path = require('path');

var FIX = path.join(__dirname, 'fixtures');
var HEADER_SIZE = 224, ITEM_SIZE = 180, GRAPHICS_IMAGE_ITEM = 34;

function buildItem(absStart, id, x, y, zLayer, scaleX, scaleY) {
  var b = Buffer.alloc(ITEM_SIZE);
  var transformEnd = absStart + ITEM_SIZE;
  b.writeUInt32BE(Math.floor(transformEnd / 0x100000000), 0);
  b.writeUInt32BE(transformEnd >>> 0, 4);
  b.writeUInt32BE(GRAPHICS_IMAGE_ITEM, 8);
  b.writeUInt32BE(0xFFFFFFFF, 20);
  b.writeUInt32BE(0xFFFFFFFF, 24);
  b.writeDoubleBE(scaleX, 36);
  b.writeDoubleBE(0, 44);
  b.writeDoubleBE(0, 60);
  b.writeDoubleBE(scaleY, 68);
  b.writeDoubleBE(x, 76);
  b.writeDoubleBE(y, 84);
  b.writeUInt32BE(id, 100);
  b.writeDoubleBE(zLayer, 104);
  b.writeDoubleBE(0, 152); b.writeDoubleBE(0, 160); b.writeDoubleBE(0, 168);
  b.writeUInt32BE(0, 176);
  return b;
}

var pngs = [fs.readFileSync(path.join(FIX, 'violet.png')), fs.readFileSync(path.join(FIX, 'teal.png'))];
var chunks = [Buffer.alloc(HEADER_SIZE)];
var pos = HEADER_SIZE;
var starts = [], ends = [];
pngs.forEach(function(p) { starts.push(pos); chunks.push(p); pos += p.length; ends.push(pos); });
pngs.forEach(function(p, j) { chunks.push(buildItem(pos, j + 1, j * 700, j * 40, j, 0.5, 0.5)); pos += ITEM_SIZE; });
chunks.push(Buffer.alloc(4));
pngs.forEach(function(p, k) {
  var ref = Buffer.alloc(20);
  ref.writeUInt32BE(k + 1, 0);
  ref.writeUInt32BE(Math.floor(starts[k] / 0x100000000), 4); ref.writeUInt32BE(starts[k] >>> 0, 8);
  ref.writeUInt32BE(Math.floor(ends[k] / 0x100000000), 12); ref.writeUInt32BE(ends[k] >>> 0, 16);
  chunks.push(ref);
});
fs.writeFileSync(path.join(FIX, 'sample.pur'), Buffer.concat(chunks));
console.log('wrote test/fixtures/sample.pur');
