/**
 * Página de estadísticas detalladas · GoatCounter API
 * + Mapa interactivo con Leaflet
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

  // Diccionario de coordenadas y códigos ISO de países
  var COUNTRY_DATA = {
    'Dominican Republic': { lat: 18.7357, lng: -70.1627, iso: 'do', flag: '🇩🇴' },
    'United States': { lat: 37.0902, lng: -95.7129, iso: 'us', flag: '🇺🇸' },
    'United States of America': { lat: 37.0902, lng: -95.7129, iso: 'us', flag: '🇺🇸' },
    'Spain': { lat: 40.4637, lng: -3.7492, iso: 'es', flag: '🇪🇸' },
    'Mexico': { lat: 23.6345, lng: -102.5528, iso: 'mx', flag: '🇲🇽' },
    'Colombia': { lat: 4.5709, lng: -74.2973, iso: 'co', flag: '🇨🇴' },
    'Venezuela': { lat: 6.4238, lng: -66.5897, iso: 've', flag: '🇻🇪' },
    'Argentina': { lat: -38.4161, lng: -63.6167, iso: 'ar', flag: '🇦🇷' },
    'Chile': { lat: -35.6751, lng: -71.5430, iso: 'cl', flag: '🇨🇱' },
    'Peru': { lat: -9.19, lng: -75.0152, iso: 'pe', flag: '🇵🇪' },
    'Ecuador': { lat: -1.8312, lng: -78.1834, iso: 'ec', flag: '🇪🇨' },
    'Brazil': { lat: -14.2350, lng: -51.9253, iso: 'br', flag: '🇧🇷' },
    'Canada': { lat: 56.1304, lng: -106.3468, iso: 'ca', flag: '🇨🇦' },
    'France': { lat: 46.2276, lng: 2.2137, iso: 'fr', flag: '🇫🇷' },
    'Germany': { lat: 51.1657, lng: 10.4515, iso: 'de', flag: '🇩🇪' },
    'United Kingdom': { lat: 55.3781, lng: -3.4360, iso: 'gb', flag: '🇬🇧' },
    'Italy': { lat: 41.8719, lng: 12.5674, iso: 'it', flag: '🇮🇹' },
    'Portugal': { lat: 39.3999, lng: -8.2245, iso: 'pt', flag: '🇵🇹' },
    'Netherlands': { lat: 52.1326, lng: 5.2913, iso: 'nl', flag: '🇳🇱' },
    'Belgium': { lat: 50.5039, lng: 4.4699, iso: 'be', flag: '🇧🇪' },
    'Switzerland': { lat: 46.8182, lng: 8.2275, iso: 'ch', flag: '🇨🇭' },
    'Sweden': { lat: 60.1282, lng: 18.6435, iso: 'se', flag: '🇸🇪' },
    'Norway': { lat: 60.4720, lng: 8.4689, iso: 'no', flag: '🇳🇴' },
    'Russia': { lat: 61.5240, lng: 105.3188, iso: 'ru', flag: '🇷🇺' },
    'China': { lat: 35.8617, lng: 104.1954, iso: 'cn', flag: '🇨🇳' },
    'Japan': { lat: 36.2048, lng: 138.2529, iso: 'jp', flag: '🇯🇵' },
    'India': { lat: 20.5937, lng: 78.9629, iso: 'in', flag: '🇮🇳' },
    'Australia': { lat: -25.2744, lng: 133.7751, iso: 'au', flag: '🇦🇺' },
    'Costa Rica': { lat: 9.7489, lng: -83.7534, iso: 'cr', flag: '🇨🇷' },
    'Panama': { lat: 8.5380, lng: -80.7821, iso: 'pa', flag: '🇵🇦' },
    'Puerto Rico': { lat: 18.2208, lng: -66.5901, iso: 'pr', flag: '🇵🇷' },
    'Cuba': { lat: 21.5218, lng: -77.7812, iso: 'cu', flag: '🇨🇺' },
    'Guatemala': { lat: 15.7835, lng: -90.2308, iso: 'gt', flag: '🇬🇹' },
    'Honduras': { lat: 15.2000, lng: -86.2419, iso: 'hn', flag: '🇭🇳' },
    'El Salvador': { lat: 13.7942, lng: -88.8965, iso: 'sv', flag: '🇸🇻' },
    'Nicaragua': { lat: 12.8654, lng: -85.2072, iso: 'ni', flag: '🇳🇮' },
    'Bolivia': { lat: -16.2902, lng: -63.5887, iso: 'bo', flag: '🇧🇴' },
    'Paraguay': { lat: -23.4425, lng: -58.4438, iso: 'py', flag: '🇵🇾' },
    'Uruguay': { lat: -32.5228, lng: -55.7658, iso: 'uy', flag: '🇺🇾' },
    'Ireland': { lat: 53.4129, lng: -8.2439, iso: 'ie', flag: '🇮🇪' },
    'Poland': { lat: 51.9194, lng: 19.1451, iso: 'pl', flag: '🇵🇱' },
    'Romania': { lat: 45.9432, lng: 24.9668, iso: 'ro', flag: '🇷🇴' },
    'Turkey': { lat: 38.9637, lng: 35.2433, iso: 'tr', flag: '🇹🇷' },
    'Israel': { lat: 31.0461, lng: 34.8516, iso: 'il', flag: '🇮🇱' },
    'United Arab Emirates': { lat: 23.4241, lng: 53.8478, iso: 'ae', flag: '🇦🇪' },
    'South Africa': { lat: -30.5595, lng: 22.9375, iso: 'za', flag: '🇿🇦' },
    'Morocco': { lat: 31.7917, lng: -7.0926, iso: 'ma', flag: '🇲🇦' },
    'Nigeria': { lat: 9.0820, lng: 8.6753, iso: 'ng', flag: '🇳🇬' },
    'Egypt': { lat: 26.8206, lng: 30.8025, iso: 'eg', flag: '🇪🇬' },
    'Indonesia': { lat: -0.7893, lng: 113.9213, iso: 'id', flag: '🇮🇩' },
    'Philippines': { lat: 12.8797, lng: 121.7740, iso: 'ph', flag: '🇵🇭' },
    'South Korea': { lat: 35.9078, lng: 127.7669, iso: 'kr', flag: '🇰🇷' },
    'Thailand': { lat: 15.8700, lng: 100.9925, iso: 'th', flag: '🇹🇭' },
    'Singapore': { lat: 1.3521, lng: 103.8198, iso: 'sg', flag: '🇸🇬' }
  };

  function fmt(n) { return Number(n || 0).toLocaleString('es-DO'); }

  function dateStr(d) {
    return d.getUTCFullYear() + '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(d.getUTCDate()).padStart(2, '0');
  }

  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function apiCall(endpoint, params) {
    try {
      var url = BASE + endpoint;
      if (params && Object.keys(params).length > 0) {
        url += '?' + new URLSearchParams(params).toString();
      }
      var res = await fetch(url, { headers: HEADERS });
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
    var params = (start && end) ? { start: start, end: end } : {};
    var data = await apiCall('total', params);
    return data ? Number(data.total || 0) : null;
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
      var emptyMsg = {
        'Referentes': 'Sin referentes registrados',
        'Campañas': 'Sin campañas activas',
        'Idiomas': 'Sin idiomas detectados',
        'Resoluciones': 'Sin datos de pantalla'
      }[title] || 'Sin datos todavía';
      return '<div class="stats-list">' +
        '<h3 class="stats-list__title"><i class="fa-solid ' + icon + '"></i> ' + title + '</h3>' +
        '<p class="stats-list__empty">' + emptyMsg + '</p>' +
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

  function normalizeStats(data) {
    if (!data) return [];
    if (data.stats && Array.isArray(data.stats)) {
      return data.stats.map(function (x) {
        var name = x.name || x.id || '—';
        // Acortar URLs largas
        if (name.length > 40 && (name.indexOf('http') === 0 || name.indexOf('www.') === 0)) {
          try {
            var u = new URL(name.indexOf('http') === 0 ? name : 'https://' + name);
            name = u.hostname + (u.pathname !== '/' ? u.pathname.slice(0, 20) + '…' : '');
          } catch (e) { /* no-op */ }
        }
        return { name: name, count: x.count || 0 };
      });
    }
    if (data.hits && Array.isArray(data.hits)) {
      return data.hits.map(function (x) {
        return { name: x.path || x.title || '—', count: x.count || 0 };
      });
    }
    return [];
  }

  // ==== MAPA INTERACTIVO ====
  function initMap(countries) {
    var mapEl = document.getElementById('statsMap');
    if (!mapEl || typeof L === 'undefined') return;

    var map = L.map('statsMap', {
      zoomControl: true,          // controles + / −
      scrollWheelZoom: true,      // ✅ zoom con la rueda del mouse
      doubleClickZoom: true,      // ✅ doble clic para ampliar
      touchZoom: true,            // ✅ pinch zoom en móvil
      dragging: true,             // ✅ arrastrar el mapa
      keyboard: true,             // ✅ flechas del teclado
      boxZoom: true,              // ✅ Shift + arrastrar = seleccionar área
      attributionControl: true
    }).setView([20, 0], 2);

    // Tiles de OpenStreetMap estándar (sin API key)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // ==== Botón RESET (vuelve a la vista inicial) ====
    var ResetControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function () {
        var btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control map-reset-btn');
        btn.innerHTML = '<i class="fa-solid fa-house"></i>';
        btn.title = 'Volver a la vista inicial';
        btn.setAttribute('aria-label', 'Volver a la vista inicial');
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, 'click', function (e) {
          L.DomEvent.preventDefault(e);
          if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 4 });
          } else if (bounds.length === 1) {
            map.setView(bounds[0], 3);
          } else {
            map.setView([20, 0], 2);
          }
        });
        return btn;
      }
    });

    var maxCount = Math.max.apply(null, countries.map(function (c) { return c.count; }).concat([1]));
    var bounds = [];

    countries.forEach(function (c) {
      var info = COUNTRY_DATA[c.name];
      if (!info) return;

      var radius = 6 + (c.count / maxCount) * 22;
      var marker = L.circleMarker([info.lat, info.lng], {
        radius: radius,
        fillColor: '#00f0ff',
        color: '#00f0ff',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.25
      }).addTo(map);

      marker.bindPopup(
        '<div style="font-family:monospace;color:#0a0a0f;">' +
        '<strong style="font-size:1.1em;">' + (info.flag || '🌐') + ' ' + c.name + '</strong><br>' +
        '<span style="color:#0088cc;font-weight:700;">' + c.count + ' visita' + (c.count !== 1 ? 's' : '') + '</span>' +
        '</div>'
      );

      bounds.push([info.lat, info.lng]);
    });

    // Vista inicial
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 4 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 3);
    }

    // Añadir el botón reset DESPUÉS de calcular bounds
    new ResetControl().addTo(map);
  }

  async function load() {
    try {
      var now = new Date();
      var startOfMonth = dateStr(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)));
      var endOfMonth = dateStr(new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)));

      var monthTotal = await getTotal(startOfMonth, endOfMonth);
      await delay(180);
      var allTotal = await getTotal();
      await delay(180);

      var months = getLast6Months();
      for (var i = 0; i < months.length; i++) {
        var v = await getTotal(months[i].start, months[i].end);
        months[i].value = v !== null ? v : 0;
        await delay(150);
      }

      var sum6 = months.reduce(function (a, m) { return a + m.value; }, 0);
      var maxValue = Math.max.apply(null, months.map(function (m) { return m.value; }).concat([1]));

      var locationsData = await apiCall('locations', { limit: 10 });
      await delay(200);
      var browsersData = await apiCall('browsers', { limit: 10 });
      await delay(200);
      var systemsData = await apiCall('systems', { limit: 10 });
      await delay(200);
      var hitsData = await apiCall('hits', { limit: 10 });
      await delay(200);
      var refsData = await apiCall('refs', { limit: 10 });
      await delay(200);
      var campaignsData = await apiCall('campaigns', { limit: 10 });
      await delay(200);
      var languagesData = await apiCall('languages', { limit: 10 });
      await delay(200);
      var sizesData = await apiCall('sizes', { limit: 10 });

      var countries = normalizeStats(locationsData);
      var browserList = normalizeStats(browsersData);
      var systemList = normalizeStats(systemsData);
      var pagesList = normalizeStats(hitsData);
      var refsList = normalizeStats(refsData);
      var campaignsList = normalizeStats(campaignsData);
      var languagesList = normalizeStats(languagesData);
      var sizesList = normalizeStats(sizesData);

      var html = '';

      // Resumen
      html += '<div class="stats-summary">';
      html += '  <div class="stats-summary__card">';
      html += '    <div class="stats-summary__icon"><i class="fa-solid fa-calendar-day"></i></div>';
      html += '    <div class="stats-summary__value">' + (monthTotal !== null ? fmt(monthTotal) : '—') + '</div>';
      html += '    <div class="stats-summary__label">Este mes</div>';
      html += '  </div>';
      html += '  <div class="stats-summary__card">';
      html += '    <div class="stats-summary__icon"><i class="fa-solid fa-calendar"></i></div>';
      html += '    <div class="stats-summary__value">' + fmt(sum6) + '</div>';
      html += '    <div class="stats-summary__label">Últimos 6 meses</div>';
      html += '  </div>';
      html += '  <div class="stats-summary__card">';
      html += '    <div class="stats-summary__icon"><i class="fa-solid fa-infinity"></i></div>';
      html += '    <div class="stats-summary__value">' + (allTotal !== null ? fmt(allTotal) : '—') + '</div>';
      html += '    <div class="stats-summary__label">Total histórico</div>';
      html += '  </div>';
      html += '</div>';

      // Gráfico
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

      // MAPA
      if (countries.length > 0) {
        html += '<div class="stats-map-wrap">';
        html += '  <h3 class="stats-map-wrap__title"><i class="fa-solid fa-earth-americas"></i> Mapa de visitantes</h3>';
        html += '  <div id="statsMap" class="stats-map"></div>';
        html += '  <p class="stats-map-wrap__hint"><i class="fa-solid fa-hand-pointer"></i> Arrastra para mover · Rueda para hacer zoom · Clic en un punto para ver detalles</p>';
        html += '</div>';
      }

      // Listas
      html += '<div class="stats-lists">';
      html += renderBarList('Países', 'fa-globe', countries);
      html += renderBarList('Navegadores', 'fa-compass', browserList);
      html += renderBarList('Sistemas operativos', 'fa-laptop', systemList);
      html += renderBarList('Páginas más vistas', 'fa-file-lines', pagesList);
      html += renderBarList('Referentes', 'fa-link', refsList);
      html += renderBarList('Campañas', 'fa-bullhorn', campaignsList);
      html += renderBarList('Idiomas', 'fa-language', languagesList);
      html += renderBarList('Resoluciones', 'fa-display', sizesList);
      html += '</div>';

      container.innerHTML = html;

      requestAnimationFrame(function () {
        container.querySelectorAll('.stats-chart__bar-fill').forEach(function (bar) {
          var h = bar.dataset.h;
          bar.style.height = h + '%';
        });
      });

      // Inicializar mapa después de insertar el HTML
      if (countries.length > 0) {
        setTimeout(function () { initMap(countries); }, 100);
      }

    } catch (err) {
      console.error('[Estadísticas]', err);
      container.innerHTML = '<div class="stats-loading">No se pudieron cargar las estadísticas. Intenta más tarde.</div>';
    }
  }

  load();
})();
