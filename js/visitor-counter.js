/**
 * Contador de visitas · GoatCounter
 * Muestra: visitas totales, del mes, del mes anterior y países.
 */
(function () {
  'use strict';

  var cfg = window.STATS_CONFIG || {};
  var SUBDOMAIN = cfg.subdomain;
  var TOKEN = cfg.token;
  if (!SUBDOMAIN || !TOKEN) return;

  var elTotal = document.getElementById('visitsTotal');
  var elMonth = document.getElementById('visitsMonth');
  var elLastMonth = document.getElementById('visitsLastMonth');
  var elCountries = document.getElementById('visitsCountries');
  if (!elTotal) return;

  var BASE = 'https://' + SUBDOMAIN + '.goatcounter.com/api/v0/stats/';
  var HEADERS = { Authorization: 'Bearer ' + TOKEN };

  function fmt(n) { return Number(n || 0).toLocaleString('es-DO'); }

  function dateStr(d) {
    return d.getUTCFullYear() + '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(d.getUTCDate()).padStart(2, '0');
  }

  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function fetchTotal(start, end) {
    try {
      var url = BASE + 'total';
      if (start && end) url += '?start=' + start + '&end=' + end;
      var res = await fetch(url, { headers: HEADERS });
      if (!res.ok) return null;
      var data = await res.json();
      return Number(data.total || 0);
    } catch (e) {
      return null;
    }
  }

  async function fetchCountriesCount() {
    try {
      var res = await fetch(BASE + 'locations?limit=200', { headers: HEADERS });
      if (!res.ok) return null;
      var data = await res.json();
      if (!data.stats) return 0;
      return data.stats.length;
    } catch (e) {
      return null;
    }
  }

  async function load() {
    var now = new Date();
    var startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    var endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
    var startOfLastMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
    var endOfLastMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0));

    var monthTotal = await fetchTotal(dateStr(startOfMonth), dateStr(endOfMonth));
    await delay(180);
    var lastMonthTotal = await fetchTotal(dateStr(startOfLastMonth), dateStr(endOfLastMonth));
    await delay(180);
    var allTotal = await fetchTotal();
    await delay(180);
    var countriesCount = await fetchCountriesCount();

    if (elTotal)     elTotal.textContent     = allTotal !== null       ? fmt(allTotal)       : '—';
    if (elMonth)     elMonth.textContent     = monthTotal !== null     ? fmt(monthTotal)     : '—';
    if (elLastMonth) elLastMonth.textContent = lastMonthTotal !== null ? fmt(lastMonthTotal) : '—';
    if (elCountries) elCountries.textContent = countriesCount !== null ? fmt(countriesCount) : '—';
  }

  var section = document.querySelector('.visitor-counter');
  if (section && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        load();
        obs.disconnect();
      }
    }, { threshold: 0.2 });
    obs.observe(section);
  } else {
    load();
  }
})();