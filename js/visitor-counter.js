/**
 * Contador de visitas · GoatCounter
 * Muestra visitas del mes actual + total histórico.
 */
(function () {
  'use strict';

  var cfg = window.STATS_CONFIG || {};
  var SUBDOMAIN = cfg.subdomain;
  var TOKEN = cfg.token;
  if (!SUBDOMAIN || !TOKEN) return;

  var elMonth = document.getElementById('visitsMonth');
  var elTotal = document.getElementById('visitsTotal');
  if (!elMonth && !elTotal) return;

  var API = 'https://' + SUBDOMAIN + '.goatcounter.com/api/v0/stats/total';

  function fmt(n) { return Number(n || 0).toLocaleString('es-DO'); }

  function dateStr(d) {
    return d.getUTCFullYear() + '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(d.getUTCDate()).padStart(2, '0');
  }

  async function fetchTotal(start, end) {
    var url = API + '?start=' + start + '&end=' + end;
    var res = await fetch(url, {
      headers: { Authorization: 'Bearer ' + TOKEN }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    return Number(data.total || 0);
  }

  function load() {
    var now = new Date();
    var startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    var endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
    var today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    Promise.all([
      fetchTotal(dateStr(startOfMonth), dateStr(endOfMonth)),
      fetchTotal('1970-01-01', dateStr(today))
    ])
      .then(function (values) {
        if (elMonth) elMonth.textContent = fmt(values[0]);
        if (elTotal) elTotal.textContent = fmt(values[1]);
      })
      .catch(function (err) {
        console.warn('[Contador] Error:', err.message);
        if (elMonth) elMonth.textContent = '—';
        if (elTotal) elTotal.textContent = '—';
      });
  }

  // Carga lazy cuando el card esté visible
  var card = document.querySelector('.visitor-counter__card');
  if (card && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        load();
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(card);
  } else {
    load();
  }
})();
