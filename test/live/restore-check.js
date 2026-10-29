/* Run after the app was closed and started again: the last session (one image) must be back. */
module.exports = async function(cdp) {
  await cdp.sleep(2000);
  var n = await cdp.eval('__km.items().length');
  var toast = await cdp.eval('document.getElementById("toast").textContent');
  return { '34 the last session is restored after a restart': n === 1 ? 'PASS' : 'FAIL ' + JSON.stringify({ n: n, toast: toast }) };
};
