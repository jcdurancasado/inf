/**
 * JCDURANCASADO · Módulo de Targeticas de Garantía
 * v2 — Rediseño, cantidad configurable, logo correcto
 */
'use strict';

window.JCDC_Targetica = {

  // ============================================
  // API pública
  // ============================================
  print(data) {
    data = data || {};

    const prov = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.proveedor) || {};
    const numero = data.numero || 'SIN-NUMERO';
    const fechaEmision = data.fechaEmision || new Date().toISOString().slice(0, 10);
    const garantiaDias = parseInt(data.garantiaDias, 10) || 0;

    const cliente = (data.cliente && data.cliente.nombre) ? data.cliente.nombre : 'Cliente';
    const equipo = data.equipo || 'Equipo';
    const marca = data.marca || '';
    const modelo = data.modelo || '';
    const codigoVC = data.codigoVC || '';

    // Cantidad (1, 2, 4, 8, 12)
    const count = this._normalizarCount(data.cantidad || 12);

    // Fechas
    const fechaVenc = this._sumarDias(fechaEmision, garantiaDias);
    const fechaVencTxt = this._formatearFecha(fechaVenc);
    const fechaEmisionTxt = this._formatearFecha(fechaEmision);

    const garantiaTexto = garantiaDias === 0 ? 'SIN GARANTÍA' : garantiaDias + ' días';

    const html = this._generarHTML({
      prov: prov,
      numero: numero,
      fechaEmisionTxt: fechaEmisionTxt,
      garantiaTexto: garantiaTexto,
      fechaVencTxt: fechaVencTxt,
      cliente: cliente,
      equipo: equipo,
      marca: marca,
      modelo: modelo,
      codigoVC: codigoVC,
      count: count
    });

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');

    if (!win) {
      if (typeof Toast !== 'undefined') Toast.show('Permite las ventanas emergentes', 'error', 2500);
      URL.revokeObjectURL(url);
      return;
    }

    setTimeout(function () { URL.revokeObjectURL(url); }, 90000);

    if (typeof Toast !== 'undefined') {
      Toast.show(count + ' targetica' + (count === 1 ? '' : 's') + ' generada' + (count === 1 ? '' : 's'), 'success', 2400);
    }
  },

  // ============================================
  // Helpers
  // ============================================
  _normalizarCount(n) {
    const validos = [1, 2, 4, 8, 12];
    n = parseInt(n, 10);
    return validos.indexOf(n) !== -1 ? n : 12;
  },

  _sumarDias(fechaISO, dias) {
    try {
      const d = new Date(fechaISO + 'T12:00:00');
      d.setDate(d.getDate() + dias);
      return d;
    } catch (e) {
      return new Date();
    }
  },

  _formatearFecha(date) {
    if (!date) return '—';
    let d;
    if (date instanceof Date) {
      d = date;
    } else {
      try {
        d = new Date(String(date) + 'T12:00:00');
        if (isNaN(d.getTime())) d = new Date(date);
      } catch (e) { return '—'; }
    }
    if (!(d instanceof Date) || isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return dd + '/' + mm + '/' + yy;
  },

  _escapeHTML(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // ============================================
  // Generador de HTML
  // ============================================
  _generarHTML(d) {
    const colorDoc = '#0369a1';
    const colorGreen = '#0a7f2e';
    const esc = this._escapeHTML.bind(this);

    // ---- SVG LOGO (replica del de facturas) ----
    const logoSVG = `
      <svg viewBox="0 0 100 100" width="26" height="26" class="sticker__logo">
        <path d="M50 4 L88 26 L88 62 Q88 88 50 96 Q12 88 12 62 L12 26 Z"
              fill="none" stroke="${colorDoc}" stroke-width="4.5" stroke-linejoin="round"/>
        <circle cx="50" cy="50" r="34" fill="none" stroke="${colorDoc}"
                stroke-width="1.8" opacity="0.55" stroke-dasharray="3 4"/>
        <circle cx="50" cy="50" r="24" fill="none" stroke="${colorDoc}"
                stroke-width="1.8" opacity="0.65" stroke-dasharray="2 3"/>
        <path d="M50 38 L60 44 L60 56 L50 62 L40 56 L40 44 Z"
              fill="${colorDoc}20" stroke="${colorDoc}" stroke-width="2.8" stroke-linejoin="round"/>
        <circle cx="50" cy="50" r="4" fill="${colorDoc}"/>
      </svg>
    `;

    // ---- HTML de UN sticker ----
    const stickerHTML = `
      <div class="sticker">
        <div class="sticker__head">
          <div class="sticker__brand">
            ${logoSVG}
            <div class="sticker__brandtext">
              <strong>JCDurán</strong>
              <span>Redes · Ciberseguridad</span>
            </div>
          </div>
          <div class="sticker__garantia-badge">
            <span class="sticker__garantia-num">${esc(d.garantiaTexto)}</span>
            <span class="sticker__garantia-label">GARANTÍA</span>
          </div>
        </div>

        <div class="sticker__number">
          <span class="sticker__label">FACTURA</span>
          <strong class="sticker__value sticker__value--big">${esc(d.numero)}</strong>
        </div>

        <div class="sticker__info">
          <div class="sticker__row">
            <span class="sticker__label">Cliente</span>
            <strong class="sticker__value">${esc(d.cliente)}</strong>
          </div>
          <div class="sticker__row">
            <span class="sticker__label">Equipo</span>
            <strong class="sticker__value">${esc(d.equipo)}${d.marca ? ' · ' + esc(d.marca) : ''}${d.modelo ? ' ' + esc(d.modelo) : ''}</strong>
          </div>
        </div>

        <div class="sticker__dates">
          <div class="sticker__date">
            <span class="sticker__label">Emitido</span>
            <strong class="sticker__value sticker__value--mono">${esc(d.fechaEmisionTxt)}</strong>
          </div>
          <div class="sticker__date sticker__date--right">
            <span class="sticker__label">Vence garantía</span>
            <strong class="sticker__value sticker__value--mono sticker__value--green">${esc(d.fechaVencTxt)}</strong>
          </div>
        </div>

        <div class="sticker__foot">
          <div class="sticker__qr"></div>
          <div class="sticker__foot-info">
            <span class="sticker__phone">${esc(d.prov.telefono || '')}</span>
            <span class="sticker__url">${esc(d.prov.web || 'jcdurancasado.github.io/inf')}</span>
            ${d.codigoVC ? '<span class="sticker__vc">' + esc(d.codigoVC) + '</span>' : ''}
          </div>
        </div>
      </div>
    `;

    // ---- Repetir N veces ----
    const stickers = new Array(d.count).fill(stickerHTML).join('');

    // ---- Etiqueta dinámica del título ----
    const countLabel = d.count + ' etiqueta' + (d.count === 1 ? '' : 's');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Targeticas · ${esc(d.numero)}</title>
  <style>
        @page { size: Letter portrait; margin: 0; }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    html, body {
      font-family: 'Segoe UI', Roboto, Arial, sans-serif;
      background: #eef2f7;
      color: #111;
      min-height: 100vh;
    }

    /* Toolbar */
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #0a0a0f;
      color: #ffffff;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }
    .toolbar__info { display: flex; flex-direction: column; gap: 2px; }
    .toolbar__title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #00f0ff;
    }
    .toolbar__sub { font-size: 11px; color: #94a3b8; }
    .toolbar__btns { display: flex; gap: 8px; }
    .toolbar__btn {
      padding: 9px 18px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border-radius: 6px;
      border: 1.5px solid #00f0ff;
      background: rgba(0,240,255,0.1);
      color: #00f0ff;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .toolbar__btn:hover { background: #00f0ff; color: #0a0a0f; }
    .toolbar__btn--ghost {
      border-color: rgba(255,255,255,0.2);
      background: transparent;
      color: #cbd5e1;
    }
    .toolbar__btn--ghost:hover {
      border-color: #ffffff;
      background: #ffffff;
      color: #0a0a0f;
    }

    /* Hoja — 3 columnas SIEMPRE. El tamaño del sticker nunca cambia. */
    .sheet {
      width: 216mm;
      min-height: 279mm;
      margin: 20px auto;
      padding: 8mm;
      background: #ffffff;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3.5mm;
      box-shadow: 0 8px 40px rgba(0,0,0,0.15);
      align-content: start;
    }

    /* Sticker — tamaño FIJO siempre */
    .sticker {
      width: 100%;
      height: 58mm;
      padding: 3mm 4mm 4mm;
      background: #ffffff;
      border: 1.2px dashed #cbd5e1;
      border-radius: 3mm;
      display: flex;
      flex-direction: column;
      gap: 1.4mm;
      position: relative;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sticker::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, ${colorDoc}, ${colorGreen}, ${colorDoc});
      opacity: 0.9;
    }

    /* Head */
    .sticker__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 3mm;
      padding-bottom: 1.5mm;
      border-bottom: 1px solid #e5e7eb;
    }
    .sticker__brand {
      display: flex;
      align-items: center;
      gap: 2.2mm;
      min-width: 0;
    }
    .sticker__logo { flex-shrink: 0; display: block; }
    .sticker__brandtext {
      display: flex;
      flex-direction: column;
      gap: 0.5mm;
      min-width: 0;
    }
    .sticker__brandtext strong {
      font-size: 10pt;
      font-weight: 800;
      color: ${colorDoc};
      letter-spacing: -0.02em;
      line-height: 1;
    }
    .sticker__brandtext span {
      font-size: 6pt;
      color: #64748b;
      letter-spacing: 0.03em;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sticker__garantia-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3mm;
      flex-shrink: 0;
      padding: 1.5mm 2.5mm;
      background: rgba(10,127,46,0.08);
      border: 1.2px solid rgba(10,127,46,0.4);
      border-radius: 2mm;
    }
    .sticker__garantia-num {
      font-family: 'Courier New', monospace;
      font-size: 9.5pt;
      font-weight: 900;
      color: ${colorGreen};
      line-height: 1;
      white-space: nowrap;
    }
    .sticker__garantia-label {
      font-size: 5pt;
      font-weight: 700;
      color: ${colorGreen};
      letter-spacing: 0.18em;
      line-height: 1;
    }

    /* Número */
    .sticker__number {
      display: flex;
      flex-direction: column;
      gap: 0.4mm;
    }
    .sticker__value--big {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      font-weight: 800;
      color: #0a0a0f;
      line-height: 1.1;
      letter-spacing: 0.02em;
      word-break: break-all;
    }

    /* Info */
    .sticker__info {
      display: flex;
      flex-direction: column;
      gap: 1.4mm;
      flex: 1;
    }
    .sticker__row {
      display: flex;
      flex-direction: column;
      gap: 0.3mm;
    }
    .sticker__label {
      font-size: 5.5pt;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      line-height: 1;
    }
    .sticker__value {
      font-size: 8pt;
      font-weight: 600;
      color: #0a0a0f;
      line-height: 1.15;
      word-break: break-word;
    }
    .sticker__value--mono {
      font-family: 'Courier New', monospace;
      letter-spacing: 0.02em;
    }
    .sticker__value--green { color: ${colorGreen}; font-weight: 800; }

    /* Fechas */
    .sticker__dates {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2mm;
      padding: 1.5mm 0;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }
    .sticker__date {
      display: flex;
      flex-direction: column;
      gap: 0.3mm;
    }
    .sticker__date--right {
      align-items: flex-end;
      text-align: right;
    }

    /* Foot */
    .sticker__foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 3mm;
      padding-top: 0.5mm;
      padding-bottom: 0.5mm;
    }
    .sticker__qr {
      width: 10.5mm;
      height: 10.5mm;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border-radius: 1mm;
    }
    .sticker__qr canvas,
    .sticker__qr img {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
    .sticker__foot-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.4mm;
      font-family: 'Courier New', monospace;
      font-size: 6pt;
      color: #475569;
      text-align: right;
      min-width: 0;
      flex: 1;
    }
    .sticker__phone {
      color: #0a0a0f;
      font-weight: 700;
    }
    .sticker__url {
      color: ${colorDoc};
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
      display: block;
    }
    .sticker__vc {
      display: inline-block;
      margin-top: 0;
      padding: 0.2mm 1mm;
      background: #f1f5f9;
      border-radius: 1mm;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 0.05em;
      font-size: 5pt;
      line-height: 1.1;
    }

    @media print {
      body { background: #ffffff; }
      .toolbar { display: none !important; }
      .sheet {
        margin: 0;
        padding: 0;
        box-shadow: none;
        width: auto;
        min-height: auto;
        justify-content: flex-start;
      }
      .sticker { border-color: #e5e7eb; }
    }
  </style>
</head>
<body>

  <div class="toolbar">
    <div class="toolbar__info">
      <span class="toolbar__title">TARGETICAS DE GARANTÍA · ${esc(d.numero)}</span>
      <span class="toolbar__sub">${esc(countLabel)} · ${esc(d.cliente)} · Vence ${esc(d.fechaVencTxt)}</span>
    </div>
    <div class="toolbar__btns">
      <button type="button" class="toolbar__btn" onclick="window.print()">🖨 Imprimir</button>
      <button type="button" class="toolbar__btn toolbar__btn--ghost" onclick="window.close()">Cerrar</button>
    </div>
  </div>

  <div class="sheet" data-count="${d.count}">
    ${stickers}
  </div>

  <script src="https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js"><\/script>
  <script>
    (function () {
      'use strict';

      function generarQRs() {
        if (typeof QRCode === 'undefined') return false;
        var conts = document.querySelectorAll('.sticker__qr');
        var url = 'https://jcdurancasado.github.io/inf/verificar.html';
        var vc = ${JSON.stringify(d.codigoVC || '')};
        var targetUrl = vc ? (url + '?code=' + encodeURIComponent(vc)) : url;

        conts.forEach(function (cont) {
          cont.innerHTML = '';
          try {
            new QRCode(cont, {
              text: targetUrl,
              width: 80,
              height: 80,
              colorDark: '#0a0a0f',
              colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.M
            });
          } catch (e) {}
        });
        return true;
      }

      window.addEventListener('load', function () {
        if (!generarQRs()) setTimeout(generarQRs, 400);
      });
    })();
  <\/script>

</body>
</html>`;
  }
};