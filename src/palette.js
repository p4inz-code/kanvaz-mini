/* palette.js: pull the main colors out of pixel data. Pure JS so test/palette-test.js can run it.
   Pixels are bucketed into a coarse color grid, the busiest buckets are ranked, and near-duplicate
   colors are merged so the swatches look different from each other. */
(function(root) {
  function hex2(n) { var s = Math.max(0, Math.min(255, Math.round(n))).toString(16); return s.length === 1 ? '0' + s : s; }
  function toHex(r, g, b) { return '#' + hex2(r) + hex2(g) + hex2(b); }
  function dist(a, b) { var dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]; return Math.sqrt(dr * dr + dg * dg + db * db); }

  /* data: RGBA bytes (Uint8ClampedArray or array). Returns up to `count` colors, most common first. */
  function extract(data, count) {
    count = count || 6;
    var buckets = {};
    for (var i = 0; i + 3 < data.length; i += 4) {
      if (data[i + 3] < 128) continue;                         /* skip transparent pixels */
      var key = (data[i] >> 4) * 256 + (data[i + 1] >> 4) * 16 + (data[i + 2] >> 4);
      var b = buckets[key];
      if (!b) { b = buckets[key] = { n: 0, r: 0, g: 0, b: 0 }; }
      b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2];
    }
    var list = Object.keys(buckets).map(function(k) { var b = buckets[k]; return { n: b.n, c: [b.r / b.n, b.g / b.n, b.b / b.n] }; });
    list.sort(function(a, b) { return b.n - a.n; });
    var out = [];
    for (var j = 0; j < list.length && out.length < count; j++) {
      var distinct = out.every(function(o) { return dist(o.c, list[j].c) > 36; });
      if (distinct) out.push(list[j]);
    }
    var total = out.reduce(function(s, o) { return s + o.n; }, 0) || 1;
    return out.map(function(o) { return { hex: toHex(o.c[0], o.c[1], o.c[2]), share: o.n / total }; });
  }

  var api = { extract: extract, toHex: toHex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KMPalette = api;
})(typeof window !== 'undefined' ? window : this);
