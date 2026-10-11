/**
 * JCDURANCASADO · Módulo de Plantillas de Documentos
 * v1 — Certificado, Documentación técnica, Certificado de capacitación
 *      Cada documento con su propio código VC + QR
 */
'use strict';

window.JCDC_Plantillas = {

  TIPOS: [
    {
      id: 'certificado',
      label: 'Certificado de servicio',
      icon: 'fa-award',
      extraKey: 'certificate',
      sufijo: 'CERT',
      descripcion: 'Documento formal que certifica el servicio prestado.'
    },
    {
      id: 'documentacion',
      label: 'Documentación técnica',
      icon: 'fa-file-lines',
      extraKey: 'docs',
      sufijo: 'DOC',
      descripcion: 'Detalle técnico completo del servicio y equipos.'
    },
    {
      id: 'capacitacion',
      label: 'Certificado de capacitación',
      icon: 'fa-graduation-cap',
      extraKey: 'training',
      sufijo: 'CAP',
      descripcion: 'Certificado de formación impartida al equipo.'
    }
  ],

  // ============================================
  // API pública
  // ============================================
  disponibles(extras) {
    if (!extras) return [];
    return this.TIPOS.filter(function (t) { return extras[t.extraKey]; });
  },

  // Compute: devuelve array de {tipo, def, vc, numero} SIN abrir nada
  compute(data, tiposSeleccionados) {
    if (!tiposSeleccionados || !tiposSeleccionados.length) return [];

    const self = this;
    const docs = [];
    tiposSeleccionados.forEach(function (id) {
      const def = self.TIPOS.find(function (t) { return t.id === id; });
      if (!def) return;
      const numero = self._numeroDerivado(data.numero, def.sufijo);
      const vc = data.codigoVCpadre || '';
      docs.push({ tipo: id, def: def, numero: numero, vc: vc });
    });
    return docs;
  },

  // Open: abre la pestaña con los docs ya computados
  open(data, docs, modo) {
    modo = modo || 'view';
    if (!docs || !docs.length) return null;

    const html = this._wrapHTML(docs, data, modo);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');

    if (!win) {
      if (typeof Toast !== 'undefined') Toast.show('Permite las ventanas emergentes', 'error', 2500);
      URL.revokeObjectURL(url);
      return null;
    }
    setTimeout(function () { URL.revokeObjectURL(url); }, 90000);
    return win;
  },

  // Retrocompatibilidad
  print(data, tiposSeleccionados) {
    const docs = this.compute(data, tiposSeleccionados);
    if (!docs.length) return [];
    this.open(data, docs);
    return docs.map(function (d) { return { tipo: d.tipo, vc: d.vc, numero: d.numero }; });
  },

  // ============================================
  // Helpers
  // ============================================
  _numeroDerivado(numBase, sufijo) {
    if (!numBase) return sufijo + '-' + Date.now().toString(36).toUpperCase();
    return sufijo + '-' + numBase;
  },

  // _vcParaDocumento eliminado — los adicionales usan el VC del padre

  _escapeHTML(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  _formatearFecha(fechaISO) {
    if (!fechaISO) return '—';
    try {
      const d = new Date(fechaISO + 'T12:00:00');
      if (isNaN(d.getTime())) return fechaISO;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = d.getFullYear();
      return dd + '/' + mm + '/' + yy;
    } catch (e) {
      return fechaISO;
    }
  },

  _formatMoney(val, moneda) {
    if (moneda === 'DOP') return 'RD$' + Number(val || 0).toLocaleString('es-DO');
    return '$' + Number(val || 0).toLocaleString('en-US') + ' USD';
  },

  // ============================================
  // CSS común a todos los documentos
  // ============================================
  _cssComun() {
    return `
      @page { size: Letter; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important; }
      html, body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; background: #eef2f7; color: #111; }

      .toolbar {
        position: sticky; top: 0; z-index: 10;
        background: #0a0a0f; color: #ffffff;
        padding: 12px 20px;
        display: flex; justify-content: space-between; align-items: center;
        gap: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      }
      .toolbar__info { display: flex; flex-direction: column; gap: 2px; }
      .toolbar__title { font-size: 14px; font-weight: 700; letter-spacing: 0.02em; color: #b829dd; }
      .toolbar__sub { font-size: 11px; color: #94a3b8; }
      .toolbar__btns { display: flex; gap: 8px; }
      .toolbar__btn {
        padding: 9px 18px;
        font-size: 12px; font-weight: 700;
        letter-spacing: 0.05em; text-transform: uppercase;
        border-radius: 6px; border: 1.5px solid #b829dd;
        background: rgba(184,41,221,0.1); color: #b829dd;
        cursor: pointer; transition: all 0.2s ease;
      }
      .toolbar__btn:hover { background: #b829dd; color: #ffffff; }
      .toolbar__btn--ghost {
        border-color: rgba(255,255,255,0.2);
        background: transparent; color: #cbd5e1;
      }
      .toolbar__btn--ghost:hover { border-color: #ffffff; background: #ffffff; color: #0a0a0f; }

      .doc {
        width: 216mm;
        min-height: 279mm;
        padding: 20mm 18mm;
        margin: 20px auto;
        background: #ffffff;
        box-shadow: 0 8px 40px rgba(0,0,0,0.15);
        position: relative;
        display: flex;
        flex-direction: column;
        page-break-after: always;
      }
      .doc:last-child { page-break-after: auto; }

      .doc__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10mm;
        padding-bottom: 5mm;
        border-bottom: 3px solid #0369a1;
        margin-bottom: 8mm;
      }
      .doc__brand { display: flex; align-items: center; gap: 3mm; }
      .doc__brand-text strong {
        display: block;
        font-size: 15pt;
        font-weight: 800;
        color: #0369a1;
        letter-spacing: -0.02em;
        line-height: 1.05;
      }
      .doc__brand-text span {
        display: block;
        font-size: 8pt;
        color: #64748b;
        letter-spacing: 0.05em;
        margin-top: 1mm;
      }
      .doc__meta { text-align: right; font-size: 9pt; color: #64748b; }
      .doc__meta strong {
        display: block;
        font-size: 11pt;
        color: #0a0a0f;
        letter-spacing: 0.02em;
        font-family: 'Courier New', monospace;
        font-weight: 700;
      }

      .doc__title { text-align: center; margin: 8mm 0 6mm; }
      .doc__title h1 {
        font-size: 22pt;
        font-weight: 900;
        letter-spacing: 0.12em;
        color: #0a0a0f;
        text-transform: uppercase;
        line-height: 1.15;
      }
      .doc__title p {
        font-size: 9pt;
        color: #64748b;
        margin-top: 2mm;
        letter-spacing: 0.08em;
      }

      .doc__body { font-size: 10pt; line-height: 1.6; color: #111; flex: 1; }

      .doc__section { margin-bottom: 6mm; }
      .doc__section-title {
        font-size: 9pt;
        font-weight: 700;
        letter-spacing: 0.2em;
        color: #0369a1;
        text-transform: uppercase;
        padding-bottom: 2mm;
        border-bottom: 1px solid #cbd5e1;
        margin-bottom: 3.5mm;
      }
      .doc__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; }
      .doc__field--full { grid-column: 1 / -1; }
      .doc__field-label {
        display: block;
        font-size: 7pt;
        color: #94a3b8;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 0.6mm;
        font-weight: 700;
      }
      .doc__field-value {
        font-size: 10.5pt;
        color: #0a0a0f;
        font-weight: 600;
        word-break: break-word;
        line-height: 1.35;
      }

      .doc__paragraph {
        font-size: 10.5pt;
        line-height: 1.8;
        text-align: justify;
        margin-bottom: 5mm;
        color: #111;
      }
      .doc__paragraph strong { color: #0369a1; }

      .doc__table { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 9.5pt; }
      .doc__table th {
        background: #f1f5f9;
        padding: 3mm;
        text-align: left;
        font-size: 8pt;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #0369a1;
        text-transform: uppercase;
        border-bottom: 2px solid #0369a1;
      }
      .doc__table th:last-child { text-align: right; }
      .doc__table td {
        padding: 2.5mm 3mm;
        border-bottom: 1px solid #e5e7eb;
        font-size: 10pt;
      }
      .doc__table td:last-child {
        text-align: right;
        font-weight: 700;
        white-space: nowrap;
      }
      .doc__table tr:last-child td { border-bottom: none; }

      .doc__total {
        background: #f0f9ff;
        padding: 5mm;
        border: 1.5px solid #0369a1;
        border-radius: 2mm;
        text-align: center;
        margin: 5mm 0;
      }
      .doc__total-label {
        font-size: 8pt;
        color: #64748b;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        margin-bottom: 1.5mm;
        font-weight: 700;
      }
      .doc__total-value {
        font-size: 22pt;
        font-weight: 900;
        color: #0a0a0f;
        letter-spacing: -0.01em;
        line-height: 1;
      }

      .doc__firma-wrap {
        position: relative;
        margin-top: 18mm;
        padding-bottom: 2mm;
        page-break-inside: avoid;
      }
      .doc__firma {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20mm;
        page-break-inside: avoid;
      }
      .doc__firma-item { text-align: center; }

      /* Sello VERIFICADO — mismo tamaño que los sellos de cotización/factura */
      .doc__sello {
        position: absolute;
        top: 55%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-14deg);
        width: 175px;
        height: 175px;
        pointer-events: none;
        z-index: 5;
        opacity: 0.78;
      }
      .doc__sello .sello-svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      .doc__firma-line {
        border-bottom: 1.3px solid #111;
        height: 15mm;
        width: 78%;
        margin: 0 auto 3mm;
        position: relative;
      }
      .doc__firma-line img {
        position: absolute;
        bottom: -4mm;
        left: 50%;
        transform: translateX(-50%);
        max-width: 220px;
        max-height: 60px;
        object-fit: contain;
        pointer-events: none;
        mix-blend-mode: multiply;
      }
      .doc__firma-name { font-size: 10pt; font-weight: 700; color: #0a0a0f; }
      .doc__firma-role { font-size: 8.5pt; color: #64748b; margin-top: 0.8mm; line-height: 1.3; }

      .doc__verif {
        margin-top: 8mm;
        padding: 5mm;
        background: #f8fafc;
        border: 1.5px dashed #0369a1;
        border-radius: 2mm;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6mm;
        page-break-inside: avoid;
      }
      .doc__verif-info { flex: 1; min-width: 0; }
      .doc__verif-label {
        font-size: 7pt;
        color: #64748b;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        font-weight: 700;
        margin-bottom: 1.5mm;
      }
      .doc__verif-code {
        font-family: 'Courier New', monospace;
        font-size: 13pt;
        font-weight: 700;
        color: #0369a1;
        letter-spacing: 0.05em;
        line-height: 1;
      }
      .doc__verif-url {
        font-size: 8pt;
        color: #64748b;
        margin-top: 2mm;
        font-family: 'Courier New', monospace;
        word-break: break-all;
      }
      .doc__verif-qr {
        width: 24mm;
        height: 24mm;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        border-radius: 1mm;
      }
      .doc__verif-qr canvas,
      .doc__verif-qr img {
        width: 100% !important;
        height: 100% !important;
        display: block;
      }

      .doc__footer {
        margin-top: auto;
        padding-top: 6mm;
        border-top: 1px solid #e5e7eb;
        font-size: 8pt;
        color: #94a3b8;
        text-align: center;
        line-height: 1.6;
        page-break-inside: avoid;
      }
      .doc__footer strong { color: #0a0a0f; }

      @media print {
        body { background: #ffffff; padding: 0; }
        .toolbar { display: none !important; }
        .doc {
          box-shadow: none;
          margin: 0;
          width: auto;
          min-height: auto;
          padding: 18mm 16mm;
          page-break-after: always;
        }
        .doc:last-child { page-break-after: auto; }
        .doc__sello {
          opacity: 0.78;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;
  },

  // ============================================
  // Bloques reutilizables
  // ============================================
  _logoHTML() {
    return `
      <svg viewBox="0 0 100 100" width="34" height="34" style="display:block;">
        <path d="M50 4 L88 26 L88 62 Q88 88 50 96 Q12 88 12 62 L12 26 Z"
              fill="none" stroke="#0369a1" stroke-width="4" stroke-linejoin="round"/>
        <circle cx="50" cy="50" r="34" fill="none" stroke="#0369a1"
                stroke-width="1.6" opacity="0.55" stroke-dasharray="3 4"/>
        <circle cx="50" cy="50" r="24" fill="none" stroke="#0369a1"
                stroke-width="1.6" opacity="0.65" stroke-dasharray="2 3"/>
        <path d="M50 38 L60 44 L60 56 L50 62 L40 56 L40 44 Z"
              fill="#0369a120" stroke="#0369a1" stroke-width="2.6" stroke-linejoin="round"/>
        <circle cx="50" cy="50" r="4" fill="#0369a1"/>
      </svg>
    `;
  },

  _headerHTML(doc, data) {
    const esc = this._escapeHTML.bind(this);
    const prov = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.proveedor) || {};
    return `
      <div class="doc__header">
        <div class="doc__brand">
          ${this._logoHTML()}
          <div class="doc__brand-text">
            <strong>${esc(prov.nombre || 'Julio C. Durán Casado')}</strong>
            <span>REDES · CIBERSEGURIDAD · SOPORTE TÉCNICO</span>
          </div>
        </div>
        <div class="doc__meta">
          <strong>${esc(doc.numero)}</strong>
          <div>${esc(this._formatearFecha(data.fechaEmision))}</div>
        </div>
      </div>
    `;
  },

  _tablaLines(data) {
    const esc = this._escapeHTML.bind(this);
    const lines = data.lines || [];
    if (!lines.length) return '<p style="font-size:9.5pt;color:#94a3b8;font-style:italic;">Sin detalles registrados</p>';

    let rows = '';
    lines.forEach(function (l) {
      const sub = l.sub ? ' <span style="color:#94a3b8;font-size:8.5pt;">(' + esc(l.sub) + ')</span>' : '';
      const price = window.JCDC_Plantillas._formatMoney(l.value, data.moneda);
      rows += '<tr><td>' + esc(l.label) + sub + '</td><td>' + price + '</td></tr>';
    });
    return `
      <table class="doc__table">
        <thead><tr><th>Descripción</th><th>Monto</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  },

  _verifBlock(doc) {
    const esc = this._escapeHTML.bind(this);
    return `
      <div class="doc__verif">
        <div class="doc__verif-info">
          <div class="doc__verif-label">🔒 Código de verificación</div>
          <div class="doc__verif-code">${esc(doc.vc)}</div>
          <div class="doc__verif-url">Verifica en: jcdurancasado.github.io/inf/verificar.html</div>
        </div>
        <div class="doc__verif-qr" data-vc="${esc(doc.vc)}"></div>
      </div>
    `;
  },

  _firmaBlock(data, doc) {
    const esc = this._escapeHTML.bind(this);
    const prov = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.proveedor) || {};
    const firmaHTML = (window.JCDC_FIRMA && window.JCDC_FIRMA.length > 50)
      ? '<img src="' + window.JCDC_FIRMA + '" alt="Firma">'
      : '';
    const selloHTML = '<div class="doc__sello">' + this._selloVerificado(doc, data) + '</div>';
    return `
      <div class="doc__firma-wrap">
        ${selloHTML}
        <div class="doc__firma">
        <div class="doc__firma-item">
          <div class="doc__firma-line">${firmaHTML}</div>
          <div class="doc__firma-name">${esc(prov.nombre || 'Julio C. Durán Casado')}</div>
          <div class="doc__firma-role">${esc(prov.profesion || 'Ingeniero en Redes y Telecomunicaciones')}</div>
          <div class="doc__firma-role">Cédula: ${esc(prov.cedula || '—')}</div>
        </div>
        <div class="doc__firma-item">
          <div class="doc__firma-line"></div>
          <div class="doc__firma-name">${esc((data.cliente && data.cliente.nombre) || 'Cliente')}</div>
          <div class="doc__firma-role">${data.cliente && data.cliente.cedula ? 'Cédula: ' + esc(data.cliente.cedula) : 'Recibido conforme'}</div>
          <div class="doc__firma-role">Fecha: ___/___/______</div>
        </div>
        </div>
      </div>
    `;
  },

  // ============================================
  // Sello circular "VERIFICADO" (estampado)
  // ============================================
  _selloVerificado(doc, data) {
    const esc = this._escapeHTML.bind(this);
    const prov = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.proveedor) || {};
    const cfg = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.documentos) || {};

    // Mismo color verde "pagado" para dar sensación de verificado
    const color = cfg.colorSelloPagado || '#0a7f2e';

    // Usar el VC (código de verificación) — es lo que realmente "verifica"
    const vc = (doc && doc.vc) || '';
    const numDoc = (doc && doc.numero) || (data && data.numero) || 'DOC';
    const fecha = this._formatearFecha((data && data.fechaEmision) || new Date().toISOString().slice(0, 10));

    // IDs únicos por instancia (evita colisiones si hay varios docs)
    const sufijo = numDoc.replace(/[^A-Za-z0-9]/g, '') + Math.floor(Math.random() * 10000);
    const nombre = (prov.nombre || 'JCDURÁN CASADO').toUpperCase();
    const texto = 'VERIFICADO';
    const fontBig = 20;
    const letterSpacing = 1.8;

    return `
<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" class="sello-svg">
  <defs>
    <path id="arcT-${sufijo}" d="M 23,110 A 87,87 0 0 1 197,110" fill="none"/>
    <path id="arcB-${sufijo}" d="M 15,110 A 95,95 0 0 0 205,110" fill="none"/>
    <filter id="rough-${sufijo}">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="0.5" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <g filter="url(#rough-${sufijo})" fill="none" stroke="${color}">
    <circle cx="110" cy="110" r="104" stroke-width="3.5"/>
    <circle cx="110" cy="110" r="80" stroke-width="1.2"/>

    <text font-family="Arial Black, sans-serif" font-size="13" font-weight="900" fill="${color}" stroke="none" letter-spacing="2">
      <textPath href="#arcT-${sufijo}" startOffset="50%" text-anchor="middle">${esc(nombre)}</textPath>
    </text>

    <text font-family="Arial, sans-serif" font-size="8.5" fill="${color}" stroke="none" letter-spacing="1.2">
      <textPath href="#arcB-${sufijo}" startOffset="50%" text-anchor="middle">REDES · CIBERSEGURIDAD · SOPORTE TÉCNICO</textPath>
    </text>

    <line x1="30" y1="100" x2="190" y2="100" stroke-width="1.2"/>
    <text x="110" y="122" font-family="Arial Black, sans-serif" font-size="${fontBig}" font-weight="900" fill="${color}" stroke="none" text-anchor="middle" letter-spacing="${letterSpacing}">${texto}</text>
    <line x1="30" y1="136" x2="190" y2="136" stroke-width="1.2"/>

    <text x="110" y="151" font-family="Arial, sans-serif" font-size="7.5" fill="${color}" stroke="none" text-anchor="middle" letter-spacing="2">FECHA</text>
    <text x="110" y="162" font-family="Arial Black, sans-serif" font-size="9" fill="${color}" stroke="none" text-anchor="middle">${esc(fecha)}</text>
    <text x="110" y="175" font-family="Arial, sans-serif" font-size="7" fill="${color}" stroke="none" text-anchor="middle" letter-spacing="0.8">${esc(vc || numDoc)}</text>
  </g>
</svg>
    `;
  },

  _footerHTML() {
    const esc = this._escapeHTML.bind(this);
    const prov = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.proveedor) || {};
    return `
      <div class="doc__footer">
        <strong>${esc(prov.nombre || 'Julio C. Durán Casado')}</strong> · Redes · Ciberseguridad · Soporte Técnico<br>
        ${esc(prov.email || '')} · ${esc(prov.telefono || '')} · ${esc(prov.web || '')}
      </div>
    `;
  },

  // ============================================
  // Plantillas específicas
  // ============================================
  _docCertificado(doc, data) {
    const esc = this._escapeHTML.bind(this);
    const cli = data.cliente || {};
    return `
      <section class="doc">
        ${this._headerHTML(doc, data)}
        <div class="doc__title">
          <h1>Certificado de Servicio</h1>
          <p>Documento oficial de servicio técnico profesional</p>
        </div>
        <div class="doc__body">
          <p class="doc__paragraph">
            Por medio de la presente, <strong>Julio C. Durán Casado</strong>, Ingeniero en Redes y Telecomunicaciones,
            hace constar que se ha prestado el servicio profesional descrito a continuación, cumpliendo con los
            estándares técnicos y de calidad establecidos.
          </p>

          <div class="doc__section">
            <div class="doc__section-title">Datos del cliente</div>
            <div class="doc__grid">
              <div class="doc__field doc__field--full">
                <span class="doc__field-label">Cliente</span>
                <span class="doc__field-value">${esc(cli.nombre || '(Por completar)')}</span>
              </div>
              <div class="doc__field">
                <span class="doc__field-label">Cédula / RNC</span>
                <span class="doc__field-value">${esc(cli.cedula || '(Por completar)')}</span>
              </div>
              <div class="doc__field">
                <span class="doc__field-label">Teléfono</span>
                <span class="doc__field-value">${esc(cli.telefono || '—')}</span>
              </div>
              <div class="doc__field doc__field--full">
                <span class="doc__field-label">Email</span>
                <span class="doc__field-value">${esc(cli.email || '—')}</span>
              </div>
              ${cli.direccion ? `
              <div class="doc__field doc__field--full">
                <span class="doc__field-label">Dirección</span>
                <span class="doc__field-value">${esc(cli.direccion)}</span>
              </div>` : ''}
            </div>
          </div>

          <div class="doc__section">
            <div class="doc__section-title">Detalles del servicio</div>
            <div class="doc__grid">
              <div class="doc__field">
                <span class="doc__field-label">Servicio</span>
                <span class="doc__field-value">${esc(data.servicioLabel || '—')}</span>
              </div>
              <div class="doc__field">
                <span class="doc__field-label">Fecha</span>
                <span class="doc__field-value">${esc(this._formatearFecha(data.fechaEmision))}</span>
              </div>
              ${data.equipo ? `
              <div class="doc__field doc__field--full">
                <span class="doc__field-label">Equipo intervenido</span>
                <span class="doc__field-value">${esc(data.equipo)}${data.marca ? ' · ' + esc(data.marca) : ''}${data.modelo ? ' ' + esc(data.modelo) : ''}</span>
              </div>` : ''}
              <div class="doc__field">
                <span class="doc__field-label">Garantía</span>
                <span class="doc__field-value">${data.garantiaDias ? data.garantiaDias + ' días' : 'Sin garantía'}</span>
              </div>
              <div class="doc__field">
                <span class="doc__field-label">Factura asociada</span>
                <span class="doc__field-value">${esc(data.numero || '—')}</span>
              </div>
            </div>
          </div>

          ${data.descripcion ? `
          <div class="doc__section">
            <div class="doc__section-title">Descripción de los trabajos</div>
            <p class="doc__paragraph">${esc(data.descripcion)}</p>
          </div>` : ''}

          <div class="doc__section">
            <div class="doc__section-title">Detalle económico</div>
            ${this._tablaLines(data)}
            <div class="doc__total">
              <div class="doc__total-label">Total</div>
              <div class="doc__total-value">${this._formatMoney(data.total, data.moneda)}</div>
            </div>
          </div>

          ${this._verifBlock(doc)}
        </div>
        ${this._firmaBlock(data, doc)}
        ${this._footerHTML()}
      </section>
    `;
  },

  _docDocumentacion(doc, data) {
    const esc = this._escapeHTML.bind(this);
    const cli = data.cliente || {};
    return `
      <section class="doc">
        ${this._headerHTML(doc, data)}
        <div class="doc__title">
          <h1>Documentación Técnica</h1>
          <p>Registro técnico completo del servicio prestado</p>
        </div>
        <div class="doc__body">
          <div class="doc__section">
            <div class="doc__section-title">1. Información del cliente</div>
            <div class="doc__grid">
              <div class="doc__field doc__field--full">
                <span class="doc__field-label">Cliente</span>
                <span class="doc__field-value">${esc(cli.nombre || '(Por completar)')}</span>
              </div>
              <div class="doc__field">
                <span class="doc__field-label">Cédula / RNC</span>
                <span class="doc__field-value">${esc(cli.cedula || '(Por completar)')}</span>
              </div>
              <div class="doc__field">
                <span class="doc__field-label">Teléfono</span>
                <span class="doc__field-value">${esc(cli.telefono || '—')}</span>
              </div>
              <div class="doc__field doc__field--full">
                <span class="doc__field-label">Email</span>
                <span class="doc__field-value">${esc(cli.email || '—')}</span>
              </div>
              ${cli.direccion ? `
              <div class="doc__field doc__field--full">
                <span class="doc__field-label">Dirección</span>
                <span class="doc__field-value">${esc(cli.direccion)}</span>
              </div>` : ''}
            </div>
          </div>

          <div class="doc__section">
            <div class="doc__section-title">2. Datos del servicio</div>
            <div class="doc__grid">
              <div class="doc__field">
                <span class="doc__field-label">Servicio realizado</span>
                <span class="doc__field-value">${esc(data.servicioLabel || '—')}</span>
              </div>
              <div class="doc__field">
                <span class="doc__field-label">Fecha de emisión</span>
                <span class="doc__field-value">${esc(this._formatearFecha(data.fechaEmision))}</span>
              </div>
              ${data.equipo ? `
              <div class="doc__field doc__field--full">
                <span class="doc__field-label">Equipo / Infraestructura</span>
                <span class="doc__field-value">${esc(data.equipo)}${data.marca ? ' · ' + esc(data.marca) : ''}${data.modelo ? ' ' + esc(data.modelo) : ''}</span>
              </div>` : ''}
              <div class="doc__field">
                <span class="doc__field-label">Garantía aplicable</span>
                <span class="doc__field-value">${data.garantiaDias ? data.garantiaDias + ' días desde la emisión' : 'Sin garantía'}</span>
              </div>
              <div class="doc__field">
                <span class="doc__field-label">Documento padre</span>
                <span class="doc__field-value">${esc(data.numero || '—')}</span>
              </div>
            </div>
          </div>

          <div class="doc__section">
            <div class="doc__section-title">3. Descripción técnica</div>
            <p class="doc__paragraph">${data.descripcion ? esc(data.descripcion) : 'Se realizaron los trabajos técnicos descritos en el detalle económico. Los procedimientos aplicados cumplen con las buenas prácticas profesionales en redes, telecomunicaciones y soporte técnico.'}</p>
          </div>

          <div class="doc__section">
            <div class="doc__section-title">4. Detalle de trabajos y montos</div>
            ${this._tablaLines(data)}
            <div class="doc__total">
              <div class="doc__total-label">Total facturado</div>
              <div class="doc__total-value">${this._formatMoney(data.total, data.moneda)}</div>
            </div>
          </div>

          <div class="doc__section">
            <div class="doc__section-title">5. Conclusiones y recomendaciones</div>
            <p class="doc__paragraph">
              El servicio fue ejecutado en su totalidad según lo acordado. Se recomienda al cliente
              mantener las buenas prácticas de uso del equipo/sistema y contactar al proveedor en caso
              de presentarse alguna novedad durante el período de garantía.
            </p>
          </div>

          ${this._verifBlock(doc)}
        </div>
        ${this._firmaBlock(data, doc)}
        ${this._footerHTML()}
      </section>
    `;
  },

  _docCapacitacion(doc, data) {
    const esc = this._escapeHTML.bind(this);
    const cli = data.cliente || {};
    return `
      <section class="doc">
        ${this._headerHTML(doc, data)}
        <div class="doc__title">
          <h1>Certificado de Capacitación</h1>
          <p>Formación técnica profesional impartida</p>
        </div>
        <div class="doc__body">
          <p class="doc__paragraph">
            Se certifica que el equipo de <strong>${esc(cli.nombre || '(Por completar)')}</strong>
            ha recibido capacitación técnica profesional impartida por <strong>Julio C. Durán Casado</strong>,
            Ingeniero en Redes y Telecomunicaciones, dentro del marco del servicio contratado.
          </p>

          <div class="doc__section">
            <div class="doc__section-title">Datos de la capacitación</div>
            <div class="doc__grid">
              <div class="doc__field doc__field--full">
                <span class="doc__field-label">Organización / Cliente</span>
                <span class="doc__field-value">${esc(cli.nombre || '(Por completar)')}</span>
              </div>
              <div class="doc__field">
                <span class="doc__field-label">Fecha</span>
                <span class="doc__field-value">${esc(this._formatearFecha(data.fechaEmision))}</span>
              </div>
              <div class="doc__field">
                <span class="doc__field-label">Duración estimada</span>
                <span class="doc__field-value">4 horas</span>
              </div>
              <div class="doc__field doc__field--full">
                <span class="doc__field-label">Temario</span>
                <span class="doc__field-value">${esc(data.servicioLabel || 'Capacitación técnica en el área contratada')}</span>
              </div>
              ${data.descripcion ? `
              <div class="doc__field doc__field--full">
                <span class="doc__field-label">Descripción</span>
                <span class="doc__field-value">${esc(data.descripcion)}</span>
              </div>` : ''}
            </div>
          </div>

          <div class="doc__section">
            <div class="doc__section-title">Instructor</div>
            <div class="doc__grid">
              <div class="doc__field">
                <span class="doc__field-label">Nombre</span>
                <span class="doc__field-value">Julio C. Durán Casado</span>
              </div>
              <div class="doc__field">
                <span class="doc__field-label">Cédula</span>
                <span class="doc__field-value">016-0017787-5</span>
              </div>
              <div class="doc__field doc__field--full">
                <span class="doc__field-label">Credenciales</span>
                <span class="doc__field-value">Ingeniero en Redes y Telecomunicaciones · Instructor Cisco Networking Academy · Facilitador CTC</span>
              </div>
            </div>
          </div>

          <div class="doc__section">
            <div class="doc__section-title">Factura asociada</div>
            <div class="doc__grid">
              <div class="doc__field">
                <span class="doc__field-label">Documento</span>
                <span class="doc__field-value">${esc(data.numero || '—')}</span>
              </div>
              <div class="doc__field">
                <span class="doc__field-label">Monto</span>
                <span class="doc__field-value">${this._formatMoney(data.total, data.moneda)}</span>
              </div>
            </div>
          </div>

          ${this._verifBlock(doc)}
        </div>
        ${this._firmaBlock(data, doc)}
        ${this._footerHTML()}
      </section>
    `;
  },

  // ============================================
  // Wrapper HTML final
  // ============================================
  _wrapHTML(docs, data, modo) {
    modo = modo || 'view';
    const self = this;
    let secciones = '';
    docs.forEach(function (d) {
      if (d.tipo === 'certificado')   secciones += self._docCertificado(d, data);
      if (d.tipo === 'documentacion') secciones += self._docDocumentacion(d, data);
      if (d.tipo === 'capacitacion')  secciones += self._docCapacitacion(d, data);
    });

    const countLabel = docs.length + ' documento' + (docs.length === 1 ? '' : 's');

    // Preparar datos para el script de QR
    const vcs = docs.map(function (d) { return d.vc; });

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Documentos · ${this._escapeHTML(data.numero || '')}</title>
  <style>${this._cssComun()}</style>
</head>
<body>

  <div class="toolbar">
    <div class="toolbar__info">
      <span class="toolbar__title">DOCUMENTOS ADICIONALES · ${this._escapeHTML(data.numero || '')}</span>
      <span class="toolbar__sub">${countLabel} · ${this._escapeHTML((data.cliente && data.cliente.nombre) || 'Sin cliente')}</span>
    </div>
    <div class="toolbar__btns">
      <button type="button" class="toolbar__btn" onclick="window.print()">🖨 Imprimir</button>
      <button type="button" class="toolbar__btn toolbar__btn--ghost" onclick="window.close()">Cerrar</button>
    </div>
  </div>

  ${secciones}

  <script src="https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js"><\/script>
  <script>
    (function () {
      'use strict';
      var VCS = ${JSON.stringify(vcs)};

      function generarQRs() {
        if (typeof QRCode === 'undefined') return false;
        var conts = document.querySelectorAll('.doc__verif-qr');
        conts.forEach(function (cont) {
          var vc = cont.getAttribute('data-vc') || '';
          if (!vc) return;
          var url = 'https://jcdurancasado.github.io/inf/verificar.html?code=' + encodeURIComponent(vc);
          cont.innerHTML = '';
          try {
            new QRCode(cont, {
              text: url,
              width: 120,
              height: 120,
              colorDark: '#0a0a0f',
              colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.M
            });
          } catch (e) {}
        });
        return true;
      }

      var MODO = '${modo}';
      window.addEventListener('load', function () {
        if (!generarQRs()) setTimeout(generarQRs, 400);
        if (MODO === 'print') {
          setTimeout(function () { try { window.print(); } catch (e) {} }, 1500);
        }
      });
    })();
  <\/script>

</body>
</html>`;
  }
};