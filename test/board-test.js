/* Kanvaz Mini: board.js tests. Usage: node test/board-test.js */
var assert = require('assert');
var B = require('../src/board.js');

function near(a, b, msg) { assert.ok(Math.abs(a - b) < 1e-6, msg + ' (' + a + ' vs ' + b + ')'); }

/* screen <-> world round trip */
var v = { x: 40, y: -20, z: 2.5 };
var w = B.toWorld(v, 300, 200);
var s = B.toScreen(v, w.x, w.y);
near(s.x, 300, 'x round trip'); near(s.y, 200, 'y round trip');
console.log('  ✓ screen and world coordinates round-trip');

/* zooming keeps the point under the cursor fixed, and respects the limits */
var z1 = B.zoomAt({ x: 0, y: 0, z: 1 }, 400, 300, 2);
var before = B.toWorld({ x: 0, y: 0, z: 1 }, 400, 300), after = B.toWorld(z1, 400, 300);
near(before.x, after.x, 'zoom anchor x'); near(before.y, after.y, 'zoom anchor y');
assert.strictEqual(B.zoomAt({ x: 0, y: 0, z: B.MAX_ZOOM }, 0, 0, 10).z, B.MAX_ZOOM, 'zoom capped at the maximum');
assert.strictEqual(B.zoomAt({ x: 0, y: 0, z: B.MIN_ZOOM }, 0, 0, 0.1).z, B.MIN_ZOOM, 'zoom capped at the minimum');
console.log('  ✓ zoom anchors on the cursor and is limited');

/* fit */
var items = [{ id: 'a', x: 0, y: 0, w: 200, h: 100 }, { id: 'b', x: 300, y: 200, w: 100, h: 100 }];
var f = B.fitView(items, 800, 600, 20);
var tl = B.toScreen(f, 0, 0), br = B.toScreen(f, 400, 300);
assert.ok(tl.x >= 19.9 && tl.y >= 19.9 && br.x <= 780.1 && br.y <= 580.1, 'everything is inside the padded window');
assert.deepStrictEqual(B.fitView([], 800, 600), { x: 0, y: 0, z: 1 }, 'an empty board fits to the default view');
console.log('  ✓ fit shows every item with padding; empty board is the default view');

/* hit test: the topmost item wins */
var stack = [{ id: 'low', x: 0, y: 0, w: 100, h: 100 }, { id: 'top', x: 50, y: 50, w: 100, h: 100 }];
assert.strictEqual(B.hitTest(stack, 60, 60).id, 'top');
assert.strictEqual(B.hitTest(stack, 10, 10).id, 'low');
assert.strictEqual(B.hitTest(stack, 500, 500), null);
console.log('  ✓ hit test returns the topmost item');

/* marquee */
assert.deepStrictEqual(B.inRect(stack, { x0: 120, y0: 120, x1: 300, y1: 300 }).map(function(i) { return i.id; }), ['top']);
assert.strictEqual(B.inRect(stack, { x0: 300, y0: 300, x1: 120, y1: 120 }).length, 1, 'a rectangle drawn backwards works');
console.log('  ✓ marquee selects what it touches, drawn in any direction');

/* scaling from a corner keeps the aspect ratio and the opposite corner fixed */
var orig = { x: 100, y: 100, w: 200, h: 100 };
var r = B.scaleFromCorner(orig, 'br', 500, 400);
near(r.x, 100, 'anchor x kept'); near(r.y, 100, 'anchor y kept'); near(r.w / r.h, 2, 'aspect kept');
var r2 = B.scaleFromCorner(orig, 'tl', 0, 0);
near(r2.x + r2.w, 300, 'bottom-right x kept'); near(r2.y + r2.h, 200, 'bottom-right y kept'); near(r2.w / r2.h, 2, 'aspect kept from the top-left too');
assert.ok(B.scaleFromCorner(orig, 'br', 100, 100).w >= B.MIN_SIZE, 'never collapses to nothing');
console.log('  ✓ corner scaling keeps aspect ratio and the opposite corner');

/* placing */
var p = B.placeNatural(4000, 2000, 0, 0, 480);
assert.strictEqual(p.w, 480); assert.strictEqual(p.h, 240); assert.strictEqual(p.x, -240); assert.strictEqual(p.y, -120);
var small = B.placeNatural(100, 50, 0, 0, 480);
assert.strictEqual(small.w, 100, 'small images are not enlarged');
var g = B.gridPositions([{ w: 600, h: 100 }, { w: 600, h: 100 }, { w: 600, h: 100 }], 0, 0, 10, 1300);
assert.strictEqual(g[0].y, 0); assert.strictEqual(g[1].y, 0); assert.strictEqual(g[2].y, 110, 'the third image wraps to a new row');
console.log('  ✓ dropped images are scaled down, centred, and batches wrap into a grid');

/* history */
var h = new B.History(3);
var list = [{ id: 'a', src: 's', x: 0, y: 0, w: 10, h: 10 }];
h.push(list);
list = list.concat([{ id: 'b', src: 's', x: 5, y: 5, w: 10, h: 10 }]);
assert.ok(h.canUndo() && !h.canRedo());
var undone = h.undo(list);
assert.strictEqual(undone.length, 1);
assert.ok(h.canRedo());
var redone = h.redo(undone);
assert.strictEqual(redone.length, 2);
h.push(list); h.push(list); h.push(list); h.push(list);
assert.strictEqual(h.past.length, 3, 'history is limited');
h.push(list);
assert.ok(!h.canRedo(), 'a new action clears redo');
console.log('  ✓ undo and redo work, are limited, and a new action clears redo');

/* reading order */
var order = B.readingOrder([{ id: 'c', x: 0, y: 300 }, { id: 'b', x: 200, y: 10 }, { id: 'a', x: 0, y: 0 }]).map(function(i) { return i.id; });
assert.deepStrictEqual(order, ['a', 'b', 'c']);
console.log('  ✓ reading order is top to bottom, left to right');

console.log('\n  ALL BOARD TESTS PASSED');
