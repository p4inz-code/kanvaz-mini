/* Kanvaz Mini: palette.js and image-sniffing tests. Usage: node test/palette-test.js */
var assert = require('assert');
var P = require('../src/palette.js');
var F = require('../src/files.js');

function fill(rgba, n) { var a = []; for (var i = 0; i < n; i++) a.push(rgba[0], rgba[1], rgba[2], rgba[3]); return a; }
var data = fill([255, 0, 0, 255], 600).concat(fill([0, 0, 255, 255], 300), fill([250, 4, 4, 255], 100), fill([0, 255, 0, 0], 500));
var out = P.extract(data, 5);
assert.strictEqual(out[0].hex, '#fe0101', 'the biggest group is red (its near-duplicate shares the bucket)');
assert.ok(out.some(function(c) { return c.hex === '#0000ff'; }), 'blue is found');
assert.ok(!out.some(function(c) { return c.hex === '#00ff00'; }), 'transparent pixels are ignored');
assert.strictEqual(out.length, 2, 'near-identical colors are merged');
assert.ok(out[0].share > out[1].share, 'ranked by how much of the picture they cover');
console.log('  ✓ palette: ranked, merged, transparency ignored');
assert.strictEqual(P.toHex(0, 128, 255), '#0080ff');
console.log('  ✓ palette: hex formatting');

var png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
var jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
var gif = Buffer.from('GIF89a\0\0\0\0\0\0');
var webp = Buffer.from('RIFF\0\0\0\0WEBP');
var bmp = Buffer.from('BM\0\0\0\0\0\0\0\0\0\0');
assert.strictEqual(F.sniffImage(png), 'png'); assert.strictEqual(F.sniffImage(jpg), 'jpeg'); assert.strictEqual(F.sniffImage(gif), 'gif');
assert.strictEqual(F.sniffImage(webp), 'webp'); assert.strictEqual(F.sniffImage(bmp), 'bmp');
assert.strictEqual(F.sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
assert.strictEqual(F.sniffImage(Buffer.from('MZ\x90\x00 not an image at all')), null);
assert.strictEqual(F.sniffImage(Buffer.alloc(3)), null);
console.log('  ✓ files: image type is decided by the file contents, not just the name');
assert.ok(F.isHexColor('#a1B2c3') && !F.isHexColor('#12345') && !F.isHexColor('red') && !F.isHexColor('#12345g'));
assert.ok(F.isPngDataUrl('data:image/png;base64,AAAA') && !F.isPngDataUrl('data:image/svg+xml;base64,AAAA') && !F.isPngDataUrl('javascript:alert(1)'));
console.log('  ✓ files: hex colors and PNG data URLs are validated');
console.log('\n  ALL PALETTE/SNIFF TESTS PASSED');
