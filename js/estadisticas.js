/**
 * Página de estadísticas detalladas · GoatCounter API
 * Consulta secuencial con manejo de errores individual.
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

  async function apiCall(endpoint, params) {
    try {
      var qs = params ? '?' + new URLSearchParams(params).toString() : '';
      var res = await fetch(BASE + endpoint + qs, { headers: HEADERS });
      if (!res.ok) {
        console.warn('[Stats] HTTP ' + res.status + ' en ' + endpoint);
        return null;
      }
      return await res.json();
    } catch (e) {
      console.warn('[Stats] Error en ' + endpoint + ':', e.message);
      return null;
    }
  }

  async function getTotal(start, end) {
    var data = await apiCall('total', { start: start, end: end });
    return data ? Number(data.total || 0) : 0;
  }

  function getLast6Months() {
    var now = new Date();
    var months = [];
    var labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    for (var i = 5; i >= 0; i--) {
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

  function renderBarList(title, icon, items) {
    if (!items || !items.length) {
      return '<div class="stats-list">' +
        '<h3 class="stats-list__title"><i class="fa-solid ' + icon + '"></i> ' + title + '</h3>' +
        '<p class="stats-list__empty">Sin datos todavía</p>' +
        '</div>';
    }
    var lis = items.slice(0, 8).map(function (item) {
      return '<li class="stats-list__item">' +
        '<span class="stats-list__name">' + (item.name || '—') + '</span>' +
        '<span class="stats-list__count">' + fmt(item.count) + '</span>' +
        '</li>';
    }).join('');
    return '<div class="stats-list">' +
      '<h3 class="stats-list__title"><i class="fa-solid ' + icon + '"></i> ' + title + '</h3>' +
      '<ul class="stats-list__items">' + lis + '</ul>' +
      '</div>';
  }

  // Pequeña pausa entre requests para evitar rate limit
  function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  async function load() {
    try {
      var now = new Date();
      var today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      var todayStr = dateStr(today);
      var startOfMonth = dateStr(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)));
      var endOfMonth = dateStr(new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)));

      // ==== 1. Resumen (secuencial) ====
      var monthTotal = await getTotal(startOfMonth, endOfMonth);
      await delay(150);

      var allTotal = await getTotal('1970-01-01', todayStr);
      await delay(150);

      // ==== 2. Últimos 6 meses (secuencial) ====
      var months = getLast6Months();
      for (var i = 0; i < months.length; i++) {
        months[i].value = await getTotal(months[i].start, months[i].end);
        await delay(150);
      }

      var sum6 = months.reduce(function (a, m) { return a + m.value; }, 0);
      var maxValue = Math.max.apply(null, months.map(function (m) { return m.value; }).concat([1]));

      // ==== 3. Países, navegadores, sistemas, páginas ====
      var locationsData = await apiCall('location', { start: '1970-01-01', end: todayStr });
      await delay(150);
      var browsersData = await apiCall('browser', { start: '1970-01-01', end: todayStr });
      await delay(150);
      var systemsData = await apiCall('system', { start: '1970-01-01', end: todayStr });
      await delay(150);
      var hitsData = await apiCall('hits', { start: '1970-01-01', end: todayStr, limit: 10 });

      function normalize(list) {
        if (!list) return [];
        // GoatCounter devuelve { stats: [{ name, count }] } para tipos agregados
        // y { hits: [{ path, count }] } para hits
        if (list.stats) return list.stats.map(function (x) {
          return { name: x.name || x.id || '—', count: x.count || 0 };
        });
        if (list.hits) return list.hits.map(function (x) {
          return { name: x.path || x.title || '—', count: x.count || 0 };
        });
        return [];
      }

      var countries = normalize(locationsData);
      var browserList = normalize(browsersData);
      var systemList = normalize(systemsData);
      var pagesList = normalize(hitsData);

      // ==== 4. Render ====
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
      html += '    <div class="stats-summary__value">' + fmt(sum6) + '</div>';
      html += '    <div class="stats-summary__label">Últimos 6 meses</div>';
      html += '  </div>';
      html += '  <div class="stats-summary__card">';
      html += '    <div class="stats-summary__icon"><i class="fa-solid fa-infinity"></i></div>';
      html += '    <div class="stats-summary__value">' + fmt(allTotal) + '</div>';
      html += '    <div class="stats-summary__label">Total histórico</div>';
      html += '  </div>';
      html += '</div>';

      // Gráfico de barras
      html += '<div class="stats-chart">';
      html += '  <h3 class="stats-chart__title"><i class="fa-solid fa-chart-column"></i> Evolución mensual (últimos 6 meses)</h3>';
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
      html += renderBarList('Países', 'fa-globe', countries);
      html += renderBarList('Navegadores', 'fa-compass', browserList);
      html += renderBarList('Sistemas operativos', 'fa-laptop', systemList);
      html += renderBarList('Páginas más vistas', 'fa-file-lines', pagesList);
      html += '</div>';

      container.innerHTML = html;

      // Animar barras
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
