/* Kanvaz Mini: files.js tests. Usage: node test/files-test.js */
var assert = require('assert');
var F = require('../src/files.js');

['a.png', 'a.JPG', 'a.jpeg', 'a.gif', 'a.webp', 'a.bmp', 'C:\\x\\y.PNG', '/tmp/a.webp'].forEach(function(p) {
  assert.ok(F.isImagePath(p), p + ' is an image Mini shows');
});
['a.mp4', 'a.mov', 'a.mp3', 'a.glb', 'a.fbx', 'a.pdf', 'a.psd', 'a.ai', 'a.exr', 'a.kra', 'a.blend', 'a', '', null, undefined, 'png', 'C:\\dir.png\\file'].forEach(function(p) {
  assert.ok(!F.isImagePath(p), String(p) + ' is not an image');
});
console.log('  ✓ only images and GIFs count as images');

['a.mp4', 'a.glb', 'a.pdf', 'a.psd', 'a.exr', 'a.zip'].forEach(function(p) { assert.ok(F.isRefused(p), p + ' is refused'); });
['a.png', 'a.kmini', 'folder', ''].forEach(function(p) { assert.ok(!F.isRefused(p), p + ' is not refused'); });
console.log('  ✓ video, audio, 3D, PDF and Adobe files are refused; folders and boards are not');

assert.ok(F.isBoardPath('x.kmini') && !F.isBoardPath('x.kanvaz'));
console.log('  ✓ boards use the .kmini extension');

['C:\\Users\\a\\b.png', 'D:/pics/b.png', '/home/a/b.png'].forEach(function(p) { assert.ok(F.isSafeLocalPath(p), p + ' is a normal local path'); });
['\\\\server\\share\\a.png', '//server/a.png', '\\\\?\\C:\\a.png', 'file:///C:/a.png', 'https://x/a.png', 'C:\\a.png:stream', 'relative/a.png', 'a.png', '', null, 'C:\\a\0.png'].forEach(function(p) {
  assert.ok(!F.isSafeLocalPath(p), String(p) + ' must not be read');
});
console.log('  ✓ network, device, URL, stream and relative paths are never read');

var PX = 'data:image/png;base64,iVBORw0KGgo=';
var good = F.serializeBoard([{ id: 'a', src: PX, x: 1, y: 2, w: 30, h: 40 }], { x: 5, y: 6, z: 2 });
var parsed = F.parseBoard(good);
assert.ok(parsed && parsed.items.length === 1 && parsed.view.z === 2, 'a saved board loads back');
assert.strictEqual(F.parseBoard('not json'), null);
assert.strictEqual(F.parseBoard('{}'), null);
assert.strictEqual(F.parseBoard(JSON.stringify({ format: 'other', items: [] })), null);
assert.strictEqual(F.parseBoard(JSON.stringify({ format: 'kanvaz-mini', items: [{ src: 'javascript:alert(1)', x: 0, y: 0, w: 1, h: 1 }] })), null, 'non-image sources are rejected');
assert.strictEqual(F.parseBoard(JSON.stringify({ format: 'kanvaz-mini', items: [{ src: PX, x: 0, y: 0, w: -1, h: 1 }] })), null, 'bad sizes are rejected');
assert.strictEqual(F.parseBoard(JSON.stringify({ format: 'kanvaz-mini', items: [{ src: 'data:image/svg+xml;base64,AAAA', x: 0, y: 0, w: 1, h: 1 }] })), null, 'SVG data is rejected');
var many = []; for (var i = 0; i < F.MAX_ITEMS + 1; i++) many.push({ src: PX, x: 0, y: 0, w: 1, h: 1 });
assert.strictEqual(F.parseBoard(JSON.stringify({ format: 'kanvaz-mini', items: many })), null, 'too many items are rejected');
console.log('  ✓ boards round-trip, and malformed or hostile boards are rejected');

console.log('\n  ALL FILES TESTS PASSED');
