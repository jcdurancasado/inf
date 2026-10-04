/**
 * Página de estadísticas detalladas · GoatCounter API
 */
(function () {
  'use strict';

  var cfg = window.STATS_CONFIG || {};
  var SUBDOMAIN = cfg.subdomain;
  var TOKEN = cfg.token;
  if (!SUBDOMAIN || !TOKEN) return;

  var container = document.getElementById('statsContent');
  if (!container) return;

  var BASE = 'https://' + SUBDOMAIN + '.goatcounter.com/api/v0/stats/';
  var HEADERS = { Authorization: 'Bearer ' + TOKEN };

  function fmt(n) { return Number(n || 0).toLocaleString('es-DO'); }
  function dateStr(d) {
    return d.getUTCFullYear() + '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(d.getUTCDate()).padStart(2, '0');
  }

  async function api(endpoint, params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    var res = await fetch(BASE + endpoint + qs, { headers: HEADERS });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' en ' + endpoint);
    return res.json();
  }

  async function fetchTotal(start, end) {
    var data = await api('total', { start: start, end: end });
    return Number(data.total || 0);
  }

  function getLast12Months() {
    var now = new Date();
    var months = [];
    var labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var s = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
      var e = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0));
      months.push({
        label: labels[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2),
        start: dateStr(s),
        end: dateStr(e)
      });
    }
    return months;
  }

  function renderBarList(title, icon, items, keyName, valName) {
    if (!items || !items.length) {
      return '<div class="stats-list">' +
        '<h3 class="stats-list__title"><i class="fa-solid ' + icon + '"></i> ' + title + '</h3>' +
        '<p class="stats-list__empty">Sin datos todavía</p>' +
        '</div>';
    }
    var lis = items.slice(0, 8).map(function (item) {
      return '<li class="stats-list__item">' +
        '<span class="stats-list__name">' + (item[keyName] || '—') + '</span>' +
        '<span class="stats-list__count">' + fmt(item[valName]) + '</span>' +
        '</li>';
    }).join('');
    return '<div class="stats-list">' +
      '<h3 class="stats-list__title"><i class="fa-solid ' + icon + '"></i> ' + title + '</h3>' +
      '<ul class="stats-list__items">' + lis + '</ul>' +
      '</div>';
  }

  async function load() {
    try {
      var now = new Date();
      var today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      var todayStr = dateStr(today);
      var startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      var endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));

      var months = getLast12Months();

      var monthTotals = await Promise.all([
        fetchTotal(dateStr(startOfMonth), dateStr(endOfMonth)),
        fetchTotal('1970-01-01', todayStr)
      ]);
      var monthTotal = monthTotals[0];
      var allTotal = monthTotals[1];

      var monthValues = await Promise.all(
        months.map(function (m) { return fetchTotal(m.start, m.end); })
      );
      months.forEach(function (m, i) { m.value = monthValues[i]; });

      var sum12 = monthValues.reduce(function (a, b) { return a + b; }, 0);
      var maxValue = Math.max.apply(null, monthValues.concat([1]));

      var [locations, browsers, systems, hits] = await Promise.all([
        api('locations', { start: '1970-01-01', end: todayStr }).catch(function () { return { stats: [] }; }),
        api('browsers', { start: '1970-01-01', end: todayStr }).catch(function () { return { stats: [] }; }),
        api('systems', { start: '1970-01-01', end: todayStr }).catch(function () { return { stats: [] }; }),
        api('hits', { start: '1970-01-01', end: todayStr, limit: 10 }).catch(function () { return { hits: [] }; })
      ]);

      var countries = (locations.stats || []).map(function (x) {
        return { name: x.name || x.id || '—', count: x.count };
      });
      var browserList = (browsers.stats || []).map(function (x) {
        return { name: x.name || x.id || '—', count: x.count };
      });
      var systemList = (systems.stats || []).map(function (x) {
        return { name: x.name || x.id || '—', count: x.count };
      });
      var pagesList = (hits.hits || []).map(function (x) {
        return { name: x.path || x.title || '—', count: x.count };
      });

      var html = '';

      // Resumen
      html += '<div class="stats-summary">';
      html += '  <div class="stats-summary__card">';
      html += '    <div class="stats-summary__icon"><i class="fa-solid fa-calendar-day"></i></div>';
      html += '    <div class="stats-summary__value">' + fmt(monthTotal) + '</div>';
      html += '    <div class="stats-summary__label">Este mes</div>';
      html += '  </div>';
      html += '  <div class="stats-summary__card">';
      html += '    <div class="stats-summary__icon"><i class="fa-solid fa-calendar"></i></div>';
      html += '    <div class="stats-summary__value">' + fmt(sum12) + '</div>';
      html += '    <div class="stats-summary__label">Últimos 12 meses</div>';
      html += '  </div>';
      html += '  <div class="stats-summary__card">';
      html += '    <div class="stats-summary__icon"><i class="fa-solid fa-infinity"></i></div>';
      html += '    <div class="stats-summary__value">' + fmt(allTotal) + '</div>';
      html += '    <div class="stats-summary__label">Total histórico</div>';
      html += '  </div>';
      html += '</div>';

      // Gráfico de barras
      html += '<div class="stats-chart">';
      html += '  <h3 class="stats-chart__title"><i class="fa-solid fa-chart-column"></i> Evolución mensual (últimos 12 meses)</h3>';
      html += '  <div class="stats-chart__bars">';
      months.forEach(function (m) {
        var pct = maxValue > 0 ? (m.value / maxValue) * 100 : 0;
        html += '<div class="stats-chart__bar" title="' + m.label + ': ' + m.value + ' visitas">';
        html += '  <span class="stats-chart__bar-value">' + m.value + '</span>';
        html += '  <div class="stats-chart__bar-fill" data-h="' + pct + '" style="height: 0%;"></div>';
        html += '</div>';
      });
      html += '  </div>';
      html += '  <div class="stats-chart__labels">';
      months.forEach(function (m) {
        html += '<span class="stats-chart__bar-label">' + m.label + '</span>';
      });
      html += '  </div>';
      html += '</div>';

      // Listas
      html += '<div class="stats-lists">';
      html += renderBarList('Países', 'fa-globe', countries, 'name', 'count');
      html += renderBarList('Navegadores', 'fa-compass', browserList, 'name', 'count');
      html += renderBarList('Sistemas operativos', 'fa-laptop', systemList, 'name', 'count');
      html += renderBarList('Páginas más vistas', 'fa-file-lines', pagesList, 'name', 'count');
      html += '</div>';

      container.innerHTML = html;

      requestAnimationFrame(function () {
        container.querySelectorAll('.stats-chart__bar-fill').forEach(function (bar) {
          var h = bar.dataset.h;
          bar.style.height = h + '%';
        });
      });

    } catch (err) {
      console.error('[Estadísticas]', err);
      container.innerHTML = '<div class="stats-loading">No se pudieron cargar las estadísticas. Intenta más tarde.</div>';
    }
  }

  load();
})();
