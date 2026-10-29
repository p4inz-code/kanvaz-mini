/* usage: node test/live/cdp.js <script.js>   (script: module.exports = async function(cdp) { return results })
   Connects to the Kanvaz Mini test instance on port 9444. */
var http = require('http');
var fs = require('fs');
var path = require('path');
var WebSocket = require(path.join(__dirname, '..', '..', 'node_modules', 'ws'));

http.get('http://127.0.0.1:9444/json', function(r) {
  var d = '';
  r.on('data', function(c) { d += c; });
  r.on('end', function() {
    var t = JSON.parse(d).filter(function(x) { return x.type === 'page'; })[0];
    var ws = new WebSocket(t.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
    var id = 0, pending = {};
    ws.on('message', function(m) { var o = JSON.parse(m.toString()); if (o.id && pending[o.id]) { pending[o.id](o); delete pending[o.id]; } });
    function send(method, params) {
      return new Promise(function(res, rej) {
        var i = ++id;
        pending[i] = function(o) { o.error ? rej(new Error(JSON.stringify(o.error))) : res(o.result); };
        ws.send(JSON.stringify({ id: i, method: method, params: params || {} }));
      });
    }
    var cdp = {
      send: send,
      eval: function(expr) {
        return send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }).then(function(r) {
          if (r.exceptionDetails) throw new Error('JS exception: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description));
          return r.result.value;
        });
      },
      sleep: function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); },
      shot: function(file) { return send('Page.captureScreenshot', { format: 'png' }).then(function(r) { fs.writeFileSync(file, Buffer.from(r.data, 'base64')); }); },
      mouse: function(type, x, y, extra) { return send('Input.dispatchMouseEvent', Object.assign({ type: type, x: x, y: y }, extra || {})); },
      key: function(key, code, vk, mods, text) {
        var p = { key: key, code: code, windowsVirtualKeyCode: vk, modifiers: mods || 0 };
        if (text) p.text = text;
        return send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, p)).then(function() { return send('Input.dispatchKeyEvent', { type: 'keyUp', key: key, code: code, windowsVirtualKeyCode: vk, modifiers: mods || 0 }); });
      }
    };
    ws.on('open', function() {
      Promise.resolve(require(path.resolve(process.argv[2]))(cdp)).then(function(out) { console.log(JSON.stringify(out, null, 1)); ws.close(); process.exit(0); })
        .catch(function(e) { console.log('SCRIPT ERROR', e.message); ws.close(); process.exit(1); });
    });
  });
}).on('error', function(e) { console.log('no debug port: ' + e.message); process.exit(2); });
