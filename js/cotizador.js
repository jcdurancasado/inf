/**
 * JCDURANCASADO · Cotizador de Servicios
 * Wizard de 4 pasos con cálculo en vivo
 */
'use strict';

const QuoteWizard = {
  currentStep: 1,
  maxStep: 4,
  service: null,
  values: {},
  extras: {},
  RATE_DOP: 60,

  // Definición de servicios
  services: {
    red: {
      label: 'Red Empresarial',
      base: 500,
      fields: [
        { id: 'users',    label: 'Usuarios / dispositivos', min: 1,   max: 500,  step: 5,    default: 20,  unit: 8,   unitLabel: '$8 por usuario' },
        { id: 'branches', label: 'Sucursales',              min: 1,   max: 30,   step: 1,    default: 1,   unit: 150, unitLabel: '$150 por sucursal' }
      ]
    },
    audit: {
      label: 'Auditoría de Seguridad',
      base: 800,
      fields: [
        { id: 'servers',  label: 'Servidores a auditar',    min: 1,   max: 100,  step: 1,    default: 3,   unit: 100, unitLabel: '$100 por servidor' },
        { id: 'branches', label: 'Sucursales',              min: 1,   max: 30,   step: 1,    default: 1,   unit: 200, unitLabel: '$200 por sucursal' }
      ]
    },
    training: {
      label: 'Capacitación Técnica',
      base: 300,
      fields: [
        { id: 'students', label: 'Estudiantes',             min: 5,   max: 200,  step: 5,    default: 15,  unit: 25,  unitLabel: '$25 por estudiante' },
        { id: 'hours',    label: 'Horas totales',           min: 4,   max: 200,  step: 4,    default: 24,  unit: 15,  unitLabel: '$15 por hora' }
      ]
    },
    support: {
      label: 'Soporte Mensual',
      base: 200,
      fields: [
        { id: 'users',    label: 'Usuarios',                min: 1,   max: 500,  step: 5,    default: 20,  unit: 3,   unitLabel: '$3 por usuario/mes' }
      ]
    }
  },

  // Extras
  extrasDef: {
    docs:        { label: 'Documentación técnica',         price: 150 },
    certificate: { label: 'Certificado por escrito',       price: 50  },
    onsite:      { label: 'Visita presencial',             price: 100 },
    training:    { label: 'Capacitación al equipo (4h)',   price: 200 },
    urgent:      { label: 'Entrega urgente (< 1 semana)',  price: 0, percentage: 0.30 }
  },

  // Referencias DOM
  els: {},

  init() {
    const wizard = document.getElementById('quoteWizard');
    if (!wizard) return;

    this.els = {
      wizard,
      steps: document.querySelectorAll('.quote-step'),
      progressBar: document.getElementById('quoteProgressBar'),
      panels: document.querySelectorAll('.quote-panel'),
      fields: document.getElementById('quoteFields'),
      scopeTitle: document.getElementById('quoteScopeTitle'),
      summary: document.getElementById('quoteSummary'),
      back: document.getElementById('quoteBack'),
      next: document.getElementById('quoteNext'),
      restart: document.getElementById('quoteRestart')
    };

    // Opciones servicio
    document.querySelectorAll('[data-service]').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('[data-service]').forEach(o => o.classList.remove('checked'));
        opt.classList.add('checked');
        opt.querySelector('input').checked = true;
        this.service = opt.dataset.service;
        this.loadDefaults();
        this.updateNextBtn();
      });
    });

    // Extras
    document.querySelectorAll('[data-extra]').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.preventDefault();
        const input = opt.querySelector('input');
        input.checked = !input.checked;
        opt.classList.toggle('checked', input.checked);
        this.extras[opt.dataset.extra] = input.checked;
      });
    });

    this.els.back.addEventListener('click', () => this.prev());
    this.els.next.addEventListener('click', () => this.next());
    this.els.restart.addEventListener('click', () => this.restart());

    // Botones de acción
    const waBtn = document.getElementById('quoteWhatsApp');
    const dlBtn = document.getElementById('quoteDownload');
    const emBtn = document.getElementById('quoteEmail');
    if (waBtn) waBtn.addEventListener('click', () => this.sendWhatsApp());
    if (dlBtn) dlBtn.addEventListener('click', () => this.downloadPDF());
    if (emBtn) emBtn.addEventListener('click', () => this.sendEmail());

    this.renderStepIndicator();
  },

  loadDefaults() {
    this.values = {};
    const cfg = this.services[this.service];
    cfg.fields.forEach(f => { this.values[f.id] = f.default; });
  },

  renderStepIndicator() {
    this.els.steps.forEach(step => {
      const n = parseInt(step.dataset.step, 10);
      step.classList.toggle('active', n === this.currentStep);
      step.classList.toggle('done', n < this.currentStep);
    });
    this.els.progressBar.style.width = ((this.currentStep / this.maxStep) * 100) + '%';
    this.els.panels.forEach(p => {
      p.classList.toggle('active', parseInt(p.dataset.panel, 10) === this.currentStep);
    });
  },

  renderFields() {
    const cfg = this.services[this.service];
    if (!cfg) return;

    this.els.scopeTitle.textContent = 'Alcance · ' + cfg.label;

    let html = '';
    cfg.fields.forEach(f => {
      const val = this.values[f.id];
      html += `
        <div class="quote-field" data-field="${f.id}">
          <div class="quote-field__head">
            <span class="quote-field__label">${f.label}</span>
            <span class="quote-field__rate">${f.unitLabel}</span>
          </div>
          <div class="quote-field__row">
            <input type="range" class="quote-range" min="${f.min}" max="${f.max}" step="${f.step}" value="${val}" data-field-slider="${f.id}">
            <span class="quote-field__val" data-field-val="${f.id}">${val}</span>
          </div>
        </div>
      `;
    });
    this.els.fields.innerHTML = html;

    // Wire sliders
    this.els.fields.querySelectorAll('[data-field-slider]').forEach(slider => {
      const id = slider.dataset.fieldSlider;
      const valEl = this.els.fields.querySelector(`[data-field-val="${id}"]`);
      slider.addEventListener('input', () => {
        this.values[id] = parseInt(slider.value, 10);
        valEl.textContent = slider.value;
      });
    });
  },

  updateNextBtn() {
    if (this.currentStep === 1 && !this.service) {
      this.els.next.disabled = true;
    } else {
      this.els.next.disabled = false;
    }

    // Último paso: ocultar botón "siguiente"
    if (this.currentStep === this.maxStep) {
      this.els.next.classList.add('hidden');
    } else {
      this.els.next.classList.remove('hidden');
    }
  },

  next() {
    if (this.currentStep >= this.maxStep) return;

    if (this.currentStep === 1 && !this.service) {
      if (typeof Toast !== 'undefined') Toast.show('Selecciona un servicio', 'info', 1800);
      return;
    }

    if (this.currentStep === 1 && this.service) {
      this.renderFields();
    }

    if (this.currentStep === 2) {
      // nothing
    }

    this.currentStep++;
    if (this.currentStep === 4) this.renderSummary();

    this.renderStepIndicator();
    this.updateNextBtn();
    this.scrollTop();
  },

  prev() {
    if (this.currentStep <= 1) return;
    this.currentStep--;
    this.renderStepIndicator();
    this.updateNextBtn();
    this.scrollTop();
  },

  scrollTop() {
    const wizard = this.els.wizard;
    const offset = 90;
    const top = wizard.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  },

  calculate() {
    const cfg = this.services[this.service];
    const lines = [];
    let subtotal = cfg.base;
    lines.push({ label: cfg.label + ' · base', value: cfg.base });

    cfg.fields.forEach(f => {
      const qty = this.values[f.id] || 0;
      const cost = qty * f.unit;
      subtotal += cost;
      lines.push({
        label: f.label,
        sub: `${qty} × $${f.unit}`,
        value: cost
      });
    });

    // Extras
    let extrasTotal = 0;
    let urgentPct = 0;
    Object.keys(this.extrasDef).forEach(key => {
      if (!this.extras[key]) return;
      const ex = this.extrasDef[key];
      if (ex.percentage) {
        urgentPct = ex.percentage;
      } else {
        extrasTotal += ex.price;
        lines.push({ label: ex.label, value: ex.price });
      }
    });

    let total = subtotal + extrasTotal;

    if (urgentPct > 0) {
      const urgAmount = Math.round(total * urgentPct);
      lines.push({
        label: 'Entrega urgente',
        sub: `+${urgentPct * 100}%`,
        value: urgAmount
      });
      total += urgAmount;
    }

    return { lines, total };
  },

  renderSummary() {
    const { lines, total } = this.calculate();
    const dop = total * this.RATE_DOP;

    let html = '';
    lines.forEach(l => {
      const sub = l.sub ? `<small>${l.sub}</small>` : '';
      html += `
        <div class="quote-summary__row">
          <span class="quote-summary__label">${l.label}${sub}</span>
          <span class="quote-summary__value">$${l.value.toLocaleString('en-US')}</span>
        </div>
      `;
    });

    html += `
      <div class="quote-summary__totals">
        <div class="quote-summary__totals-label">TOTAL ESTIMADO</div>
        <div class="quote-summary__total-usd">$${total.toLocaleString('en-US')} USD</div>
        <div class="quote-summary__total-dop">≈ RD$${Math.round(dop).toLocaleString('es-DO')} DOP</div>
      </div>
    `;

    this.els.summary.innerHTML = html;
  },

  restart() {
    this.currentStep = 1;
    this.service = null;
    this.values = {};
    this.extras = {};

    document.querySelectorAll('[data-service]').forEach(o => {
      o.classList.remove('checked');
      o.querySelector('input').checked = false;
    });
    document.querySelectorAll('[data-extra]').forEach(o => {
      o.classList.remove('checked');
      o.querySelector('input').checked = false;
    });

    this.renderStepIndicator();
    this.updateNextBtn();
    this.scrollTop();

    if (typeof Toast !== 'undefined') Toast.show('Cotizador reiniciado', 'info', 1600);
  },

  /* --- Genera un texto plano con el resumen --- */
  buildPlainText() {
    const cfg = this.services[this.service];
    const { lines, total } = this.calculate();
    const dop = Math.round(total * this.RATE_DOP);
    const date = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });

    let txt = '';
    txt += '═══════════════════════════════════════\n';
    txt += '  COTIZACIÓN DE SERVICIOS\n';
    txt += '  JCDurán — Redes · Ciberseguridad\n';
    txt += '═══════════════════════════════════════\n\n';
    txt += `Fecha: ${date}\n`;
    txt += `Servicio: ${cfg.label}\n\n`;
    txt += '── DETALLE ────────────────────────────\n';
    lines.forEach(l => {
      const sub = l.sub ? ` (${l.sub})` : '';
      txt += `• ${l.label}${sub}\n`;
      txt += `  $${l.value.toLocaleString('en-US')}\n`;
    });
    txt += '\n── TOTALES ────────────────────────────\n';
    txt += `Total USD:  $${total.toLocaleString('en-US')}\n`;
    txt += `Total DOP:  RD$${dop.toLocaleString('es-DO')}\n`;
    txt += `Tasa ref.:  1 USD = ${this.RATE_DOP} DOP\n\n`;
    txt += '── NOTA ───────────────────────────────\n';
    txt += 'Estimación orientativa. El precio final se confirma\n';
    txt += 'tras una consulta detallada del alcance.\n\n';
    txt += 'Contacto:\n';
    txt += '  WhatsApp: +1 809 000 0000\n';
    txt += '  Email:    jcdurancasado@gmail.com\n';
    txt += '  Web:      https://jcdurancasado.github.io/inf/\n';
    return txt;
  },

  /* --- Enviar por WhatsApp con mensaje pre-cargado --- */
  sendWhatsApp() {
    if (!this.service) {
      if (typeof Toast !== 'undefined') Toast.show('Completa el cotizador primero', 'info', 2000);
      return;
    }
    const txt = this.buildPlainText();
    const url = 'https://wa.me/18090000000?text=' + encodeURIComponent(txt);
    window.open(url, '_blank', 'noopener');
    if (typeof Toast !== 'undefined') Toast.show('Abriendo WhatsApp…', 'success', 1800);
  },

  /* --- Descargar como PDF (abre ventana de impresión) --- */
  downloadPDF() {
    if (!this.service) {
      if (typeof Toast !== 'undefined') Toast.show('Completa el cotizador primero', 'info', 2000);
      return;
    }
    const cfg = this.services[this.service];
    const { lines, total } = this.calculate();
    const dop = Math.round(total * this.RATE_DOP);
    const date = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
    const quoteId = 'JCDC-' + Date.now().toString(36).toUpperCase();

    let rows = '';
    lines.forEach(l => {
      const sub = l.sub ? `<div style="font-size:11px;color:#666;margin-top:2px;">${l.sub}</div>` : '';
      rows += `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
            ${l.label}${sub}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">
            $${l.value.toLocaleString('en-US')}
          </td>
        </tr>
      `;
    });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotización ${quoteId}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Roboto, sans-serif;
      color: #111;
      padding: 30px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header { border-bottom: 3px solid #00bcd4; padding-bottom: 15px; margin-bottom: 25px; display:flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: 1px; color: #0a0a0f; }
    .brand small { display:block; font-size: 11px; font-weight: 400; color: #666; letter-spacing: 2px; margin-top: 4px; }
    .meta { text-align: right; font-size: 12px; color: #666; }
    .meta strong { color: #111; }
    h1 { font-size: 20px; margin-bottom: 6px; }
    .subtitle { color: #666; font-size: 13px; margin-bottom: 25px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px; font-size: 13px; }
    .info-grid div { padding: 10px 12px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #00bcd4; }
    .info-grid span { display: block; font-size: 10px; letter-spacing: 1px; color: #888; text-transform: uppercase; margin-bottom: 2px; }
    .info-grid strong { font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    thead th { background: #0a0a0f; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
    thead th:last-child { text-align: right; }
    .totals { background: linear-gradient(135deg, #e0f7fa, #ede9fe); padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center; border: 2px solid #00bcd4; }
    .totals .label { font-size: 11px; letter-spacing: 2px; color: #666; margin-bottom: 8px; }
    .totals .usd { font-size: 32px; font-weight: 800; color: #0a0a0f; letter-spacing: -1px; }
    .totals .dop { font-size: 14px; color: #444; margin-top: 4px; }
    .note { padding: 12px 15px; background: #fff9e6; border-left: 3px solid #fbbf24; border-radius: 4px; font-size: 12px; color: #555; line-height: 1.6; margin-bottom: 20px; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #888; text-align: center; line-height: 1.7; }
    .footer strong { color: #111; }
    @media print {
      body { padding: 0; }
      .totals { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">JCDURANCASADO<small>REDES · CIBERSEGURIDAD</small></div>
    </div>
    <div class="meta">
      <div>Cotización <strong>#${quoteId}</strong></div>
      <div>${date}</div>
    </div>
  </div>

  <h1>Cotización de Servicios Profesionales</h1>
  <p class="subtitle">Documento estimado. No representa una factura ni compromiso contractual.</p>

  <div class="info-grid">
    <div><span>Servicio solicitado</span><strong>${cfg.label}</strong></div>
    <div><span>Proveedor</span><strong>Julio C. Durán Casado</strong></div>
    <div><span>Ubicación</span><strong>República Dominicana</strong></div>
    <div><span>Válida por</span><strong>30 días desde la fecha</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Monto (USD)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="totals">
    <div class="label">TOTAL ESTIMADO</div>
    <div class="usd">$${total.toLocaleString('en-US')} USD</div>
    <div class="dop">≈ RD$${dop.toLocaleString('es-DO')} DOP · Tasa 1 USD = ${this.RATE_DOP} DOP</div>
  </div>

  <div class="note">
    <strong>Nota:</strong> Esta cotización es una estimación orientativa basada en los parámetros seleccionados en el cotizador web. El precio final se confirma tras una consulta detallada del alcance, alcance de red, requerimientos específicos y visita técnica (si aplica).
  </div>

  <div class="footer">
    <strong>JCDURANCASADO</strong> · Ingeniero en Redes y Telecomunicaciones<br>
    jcdurancasado@gmail.com · +1 809 000 0000 · jcdurancasado.github.io/inf
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 300);
    });
  <\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      if (typeof Toast !== 'undefined') Toast.show('Permite las ventanas emergentes', 'error', 2500);
      return;
    }
    win.document.write(html);
    win.document.close();

    if (typeof Toast !== 'undefined') Toast.show('Preparando PDF…', 'success', 1800);
  },

  /* --- Enviar por email con resumen --- */
  sendEmail() {
    if (!this.service) {
      if (typeof Toast !== 'undefined') Toast.show('Completa el cotizador primero', 'info', 2000);
      return;
    }
    const cfg = this.services[this.service];
    const subject = 'Solicitud de cotización — ' + cfg.label;
    const body = this.buildPlainText();
    const url = 'mailto:jcdurancasado@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    window.location.href = url;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  QuoteWizard.init();
});
