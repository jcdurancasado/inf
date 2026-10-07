/**
 * JCDURANCASADO · Cotizador de Servicios
 * v3 — Factura protegida + sello PAGADO + código verificación
 */
'use strict';

const QuoteWizard = {
  currentStep: 1,
  maxStep: 4,
  service: null,
  values: {},
  extras: {},
  reparacion: null,
  RATE_DOP: 60,
  facturaUnlocked: false,

  services: {
    red: {
      label: 'Red Empresarial',
      base: 500,
      fields: [
        { id: 'users',    label: 'Usuarios / dispositivos', min: 1, max: 500, step: 5, default: 20, unit: 8,   unitLabel: '$8 por usuario' },
        { id: 'branches', label: 'Sucursales',              min: 1, max: 30,  step: 1, default: 1,  unit: 150, unitLabel: '$150 por sucursal' }
      ]
    },
    audit: {
      label: 'Auditoría de Seguridad',
      base: 800,
      fields: [
        { id: 'servers',  label: 'Servidores a auditar', min: 1, max: 100, step: 1, default: 3, unit: 100, unitLabel: '$100 por servidor' },
        { id: 'branches', label: 'Sucursales',           min: 1, max: 30,  step: 1, default: 1, unit: 200, unitLabel: '$200 por sucursal' }
      ]
    },
    training: {
      label: 'Capacitación Técnica',
      base: 300,
      fields: [
        { id: 'students', label: 'Estudiantes',  min: 5, max: 200, step: 5, default: 15, unit: 25, unitLabel: '$25 por estudiante' },
        { id: 'hours',    label: 'Horas totales', min: 4, max: 200, step: 4, default: 24, unit: 15, unitLabel: '$15 por hora' }
      ]
    },
    support: {
      label: 'Soporte Mensual',
      base: 200,
      fields: [
        { id: 'users', label: 'Usuarios', min: 1, max: 500, step: 5, default: 20, unit: 3, unitLabel: '$3 por usuario/mes' }
      ]
    },
    reparacion: {
      label: 'Reparación Técnica',
      base: 0,
      custom: true
    }
  },

  extrasDef: {
    docs:        { label: 'Documentación técnica',        price: 150 },
    certificate: { label: 'Certificado por escrito',      price: 50  },
    onsite:      { label: 'Visita presencial',            price: 100 },
    training:    { label: 'Capacitación al equipo (4h)',  price: 200 },
    urgent:      { label: 'Entrega urgente (< 1 semana)', price: 0, percentage: 0.30 }
  },

  els: {},

  /* ============================================
     INIT
  ============================================ */
  init() {
    const wizard = document.getElementById('quoteWizard');
    if (!wizard) return;

    this.els = {
      wizard: wizard,
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

    const self = this;

    document.querySelectorAll('[data-service]').forEach(function (opt) {
      opt.addEventListener('click', function () {
        document.querySelectorAll('[data-service]').forEach(function (o) { o.classList.remove('checked'); });
        opt.classList.add('checked');
        const input = opt.querySelector('input');
        if (input) input.checked = true;
        self.service = opt.dataset.service;
        self.loadDefaults();
        self.updateNextBtn();
      });
    });

    document.querySelectorAll('[data-extra]').forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.preventDefault();
        const input = opt.querySelector('input');
        if (!input) return;
        input.checked = !input.checked;
        opt.classList.toggle('checked', input.checked);
        self.extras[opt.dataset.extra] = input.checked;
      });
    });

    this.els.back.addEventListener('click', function () { self.prev(); });
    this.els.next.addEventListener('click', function () { self.next(); });
    this.els.restart.addEventListener('click', function () { self.restart(); });

    const waBtn = document.getElementById('quoteWhatsApp');
    const dlBtn = document.getElementById('quoteDownload');
    const emBtn = document.getElementById('quoteEmail');
    if (waBtn) waBtn.addEventListener('click', function () { self.sendWhatsApp(); });
    if (dlBtn) dlBtn.addEventListener('click', function () { self.downloadPDF(); });
    if (emBtn) emBtn.addEventListener('click', function () { self.sendEmail(); });

    this.renderStepIndicator();
    this.updateNextBtn();
  },

  /* ============================================
     SEGURIDAD · Verificación de contraseña
  ============================================ */
  async sha256Hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
  },

  async verificarPassword(input) {
    const sec = window.SOPORTE_CONFIG.security || {};
    if (sec.facturaPasswordHash) {
      const hash = await this.sha256Hex(input + (sec.facturaSalt || ''));
      return hash === sec.facturaPasswordHash;
    }
    return input === (sec.facturaPassword || '');
  },

  /* ============================================
     SEGURIDAD · Inyectar estilos del modal
     (auto-contenido, no depende de style.css)
  ============================================ */
  _inyectarEstilosModal() {
    if (document.getElementById('jcdc-pwd-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'jcdc-pwd-modal-styles';
    style.textContent = `
      .pwd-overlay {
        position: fixed !important;
        inset: 0 !important;
        z-index: 100001 !important;
        background: rgba(0, 0, 0, 0.78) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 16px !important;
        margin: 0 !important;
        animation: jcdcPwdFadeIn 0.25s ease;
      }
      .pwd-overlay--closing { animation: jcdcPwdFadeOut 0.22s ease forwards; }
      @keyframes jcdcPwdFadeIn  { from { opacity: 0; } to { opacity: 1; } }
      @keyframes jcdcPwdFadeOut { from { opacity: 1; } to { opacity: 0; } }

      .pwd-modal {
        position: relative !important;
        width: 100% !important;
        max-width: 420px !important;
        padding: 40px 28px 28px !important;
        background: #13131a !important;
        border: 1.5px solid #ff3333 !important;
        border-radius: 12px !important;
        box-shadow: 0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255,51,51,0.25) !important;
        text-align: center !important;
        color: #f0f0ff !important;
        font-family: 'Rajdhani', system-ui, sans-serif !important;
        animation: jcdcPwdPopIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes jcdcPwdPopIn {
        from { opacity: 0; transform: scale(0.9) translateY(20px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      .pwd-modal::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, #ff3333, transparent);
        border-radius: 12px 12px 0 0;
      }

      .pwd-modal__icon {
        width: 64px; height: 64px;
        margin: 0 auto 16px;
        display: flex !important;
        align-items: center;
        justify-content: center;
        background: rgba(255, 51, 51, 0.08);
        border: 1.5px solid rgba(255, 51, 51, 0.4);
        border-radius: 50%;
        color: #ff3333;
        font-size: 1.5rem;
        box-shadow: 0 0 25px rgba(255, 51, 51, 0.3);
      }
      .pwd-modal__title {
        font-family: 'Orbitron', system-ui, sans-serif !important;
        font-size: 1.05rem !important;
        font-weight: 800;
        letter-spacing: 0.15em;
        color: #ff3333 !important;
        margin: 0 0 12px !important;
        text-shadow: 0 0 12px rgba(255, 51, 51, 0.5);
      }
      .pwd-modal__desc {
        font-size: 0.88rem;
        color: #a0a8b8 !important;
        line-height: 1.6;
        margin: 0 0 20px !important;
      }
      .pwd-modal__desc strong { color: #ff3333 !important; }

      .pwd-modal__field {
        position: relative;
        display: flex !important;
        align-items: center;
        margin: 0 0 10px !important;
      }
      .pwd-modal__field > i {
        position: absolute;
        left: 16px;
        color: #6a7080;
        pointer-events: none;
        font-size: 0.95rem;
        z-index: 2;
      }
      .pwd-modal__field input {
        width: 100% !important;
        padding: 14px 16px 14px 44px !important;
        background: #0a0a0f !important;
        border: 1.5px solid rgba(0, 240, 255, 0.15) !important;
        border-radius: 6px !important;
        color: #f0f0ff !important;
        font-family: 'Share Tech Mono', monospace !important;
        font-size: 0.95rem !important;
        letter-spacing: 0.1em;
        outline: none !important;
        box-shadow: none !important;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box !important;
      }
      .pwd-modal__field input:focus {
        border-color: #ff3333 !important;
        box-shadow: 0 0 0 3px rgba(255, 51, 51, 0.15) !important;
      }
      .pwd-modal__field input.pwd-shake {
        animation: jcdcPwdShake 0.4s ease;
      }
      @keyframes jcdcPwdShake {
        0%, 100% { transform: translateX(0); }
        20%      { transform: translateX(-8px); }
        40%      { transform: translateX(8px); }
        60%      { transform: translateX(-6px); }
        80%      { transform: translateX(6px); }
      }

      .pwd-modal__error {
        min-height: 1.2em;
        margin: 0 0 16px !important;
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.75rem;
        color: #ff3333 !important;
        letter-spacing: 0.05em;
        text-align: center;
      }

      .pwd-modal__actions {
        display: flex !important;
        gap: 10px;
        justify-content: center;
      }
      .pwd-btn {
        flex: 1;
        padding: 14px 20px;
        border-radius: 6px;
        font-family: 'Orbitron', system-ui, sans-serif;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.25s ease;
        border: 1.5px solid;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .pwd-btn--primary {
        background: linear-gradient(135deg, rgba(255, 51, 51, 0.15), rgba(184, 41, 221, 0.1));
        border-color: #ff3333;
        color: #ff3333;
      }
      .pwd-btn--primary:hover:not(:disabled) {
        background: #ff3333;
        color: #0a0a0f;
        box-shadow: 0 0 25px rgba(255, 51, 51, 0.55);
      }
      .pwd-btn--primary:disabled { opacity: 0.5; cursor: wait; }
      .pwd-btn--ghost {
        background: transparent;
        border-color: rgba(0, 240, 255, 0.2);
        color: #a0a8b8;
      }
      .pwd-btn--ghost:hover {
        border-color: #a0a8b8;
        color: #f0f0ff;
      }

      .pwd-modal__close {
        position: absolute !important;
        top: 10px;
        right: 12px;
        width: 30px; height: 30px;
        background: transparent;
        border: none;
        color: #6a7080;
        font-size: 1.4rem;
        line-height: 1;
        cursor: pointer;
        border-radius: 50%;
        transition: all 0.2s;
      }
      .pwd-modal__close:hover {
        background: rgba(255, 51, 51, 0.12);
        color: #ff3333;
      }

      /* Cursor encima del modal */
      body.jcdc-modal-open .cursor-dot,
      body.jcdc-modal-open .cursor-ring {
        z-index: 100002 !important;
      }
      body.jcdc-modal-open { cursor: none; }
      body.jcdc-modal-open a,
      body.jcdc-modal-open button,
      body.jcdc-modal-open input { cursor: none; }

      @media (max-width: 480px) {
        .pwd-modal { padding: 32px 20px 20px !important; }
        .pwd-modal__icon { width: 52px; height: 52px; font-size: 1.25rem; margin-bottom: 12px; }
        .pwd-modal__title { font-size: 0.92rem !important; letter-spacing: 0.1em; }
        .pwd-modal__actions { flex-direction: column-reverse; }
      }
    `;
    document.head.appendChild(style);
  },

  async pedirPasswordFactura() {
    if (this.facturaUnlocked) return true;

    // ✅ Inyectar estilos ANTES de crear el modal
    this._inyectarEstilosModal();

    const self = this;
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'pwd-overlay';
      overlay.innerHTML = `
        <div class="pwd-modal" role="dialog" aria-modal="true">
          <div class="pwd-modal__icon"><i class="fa-solid fa-lock"></i></div>
          <h3 class="pwd-modal__title">ACCESO RESTRINGIDO</h3>
          <p class="pwd-modal__desc">La generación de <strong>FACTURAS</strong> requiere contraseña.<br>
          Las cotizaciones siguen disponibles sin restricción.</p>
          <div class="pwd-modal__field">
            <i class="fa-solid fa-key"></i>
            <input type="password" id="pwdFacturaInput" autocomplete="off" placeholder="Contraseña" />
          </div>
          <p class="pwd-modal__error" id="pwdFacturaError"></p>
          <div class="pwd-modal__actions">
            <button type="button" class="pwd-btn pwd-btn--ghost" id="pwdFacturaCancel">Cancelar</button>
            <button type="button" class="pwd-btn pwd-btn--primary" id="pwdFacturaOk">
              <i class="fa-solid fa-unlock"></i> Desbloquear
            </button>
          </div>
          <button type="button" class="pwd-modal__close" id="pwdFacturaClose" aria-label="Cerrar">×</button>
        </div>
      `;
      document.body.appendChild(overlay);
      document.body.classList.add('jcdc-modal-open');

      const input = overlay.querySelector('#pwdFacturaInput');
      const error = overlay.querySelector('#pwdFacturaError');
      const ok = overlay.querySelector('#pwdFacturaOk');
      const cancel = overlay.querySelector('#pwdFacturaCancel');
      const close = overlay.querySelector('#pwdFacturaClose');

      setTimeout(() => input.focus(), 80);

      function cerrar(resultado) {
        document.body.classList.remove('jcdc-modal-open');
        overlay.classList.add('pwd-overlay--closing');
        setTimeout(() => overlay.remove(), 220);
        resolve(resultado);
      }

      async function intentar() {
        const val = input.value.trim();
        if (!val) {
          error.textContent = 'Introduce la contraseña';
          return;
        }
        ok.disabled = true;
        const valida = await self.verificarPassword(val);
        ok.disabled = false;

        if (valida) {
          self.facturaUnlocked = true;
          if (typeof Toast !== 'undefined') Toast.show('Factura desbloqueada', 'success', 1800);
          cerrar(true);
        } else {
          error.textContent = 'Contraseña incorrecta';
          input.value = '';
          input.classList.add('pwd-shake');
          setTimeout(() => input.classList.remove('pwd-shake'), 400);
        }
      }

      ok.addEventListener('click', intentar);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') intentar();
        if (e.key === 'Escape') cerrar(false);
      });
      cancel.addEventListener('click', () => cerrar(false));
      close.addEventListener('click', () => cerrar(false));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cerrar(false);
      });
    });
  },
  /* ============================================
     HELPERS
  ============================================ */
  loadDefaults() {
    this.values = {};
    const cfg = this.services[this.service];
    if (!cfg || !cfg.fields) return;
    cfg.fields.forEach(function (f) { this.values[f.id] = f.default; }.bind(this));
  },

  renderStepIndicator() {
    const self = this;
    this.els.steps.forEach(function (step) {
      const n = parseInt(step.dataset.step, 10);
      step.classList.toggle('active', n === self.currentStep);
      step.classList.toggle('done', n < self.currentStep);
    });
    this.els.progressBar.style.width = ((this.currentStep / this.maxStep) * 100) + '%';
    this.els.panels.forEach(function (p) {
      p.classList.toggle('active', parseInt(p.dataset.panel, 10) === self.currentStep);
    });
  },

  updateNextBtn() {
    if (this.currentStep === 1 && !this.service) {
      this.els.next.disabled = true;
    } else {
      this.els.next.disabled = false;
    }
    if (this.els.back) {
      this.els.back.disabled = this.currentStep <= 1;
    }
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
      if (this.service === 'reparacion') {
        this.renderReparacionFields();
      } else {
        this.renderFields();
      }
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
    window.scrollTo({ top: top, behavior: 'smooth' });
  },

  /* ============================================
     RENDER · Campos normales
  ============================================ */
  renderFields() {
    const cfg = this.services[this.service];
    if (!cfg) return;
    this.els.scopeTitle.textContent = 'Alcance · ' + cfg.label;

    let html = '';
    cfg.fields.forEach(function (f) {
      const val = this.values[f.id];
      html += '<div class="quote-field" data-field="' + f.id + '">';
      html += '  <div class="quote-field__head">';
      html += '    <span class="quote-field__label">' + f.label + '</span>';
      html += '    <span class="quote-field__rate">' + f.unitLabel + '</span>';
      html += '  </div>';
      html += '  <div class="quote-field__row">';
      html += '    <input type="range" class="quote-range" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" value="' + val + '" data-field-slider="' + f.id + '">';
      html += '    <span class="quote-field__val" data-field-val="' + f.id + '">' + val + '</span>';
      html += '  </div>';
      html += '</div>';
    }.bind(this));
    this.els.fields.innerHTML = html;

    const self = this;
    this.els.fields.querySelectorAll('[data-field-slider]').forEach(function (slider) {
      const id = slider.dataset.fieldSlider;
      const valEl = self.els.fields.querySelector('[data-field-val="' + id + '"]');
      slider.addEventListener('input', function () {
        self.values[id] = parseInt(slider.value, 10);
        if (valEl) valEl.textContent = slider.value;
      });
    });
  },

  /* ============================================
     RENDER · Reparación Técnica
  ============================================ */
  renderReparacionFields() {
    const cfg = window.SOPORTE_CONFIG;
    if (!cfg) {
      this.els.fields.innerHTML = '<p style="text-align:center;color:var(--neon-red);">Error: falta servicios-config.js</p>';
      return;
    }

    this.els.scopeTitle.textContent = 'Detalles de la reparación';

    const now = new Date();
    const yy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hoy = yy + mm + dd;
    let contador = 1;
    try {
      const counters = JSON.parse(localStorage.getItem('jcdc_doc_counter') || '{}');
      contador = (counters[hoy] || 0) + 1;
      counters[hoy] = contador;
      localStorage.setItem('jcdc_doc_counter', JSON.stringify(counters));
    } catch (e) {
      contador = Math.floor(Math.random() * 900 + 100);
    }
    const numDoc = 'COT-' + hoy + '-' + String(contador).padStart(3, '0');
    const diasValidez = (cfg.documentos && cfg.documentos.cotizacionValidezDias) || 7;
    const venc = new Date(now.getTime() + diasValidez * 24 * 60 * 60 * 1000);

    this.reparacion = {
      equipo: '',
      marca: '',
      modelo: '',
      problemas: [],
      descripcion: '',
      tipoDoc: 'cotizacion',
      estado: 'pagada',
      garantia: 30,
      numero: numDoc,
      fechaEmision: now.toISOString().slice(0, 10),
      fechaVencimiento: venc.toISOString().slice(0, 10),
      diasValidez: diasValidez,
      codigoVerificacion: '',
      timestamp: now.getTime(),
      cliente: { nombre: '', cedula: '', telefono: '', email: '', direccion: '' }
    };

    const self = this;
    const esFactura = false;

    let html = '';

    // Tipo documento — con candado en FACTURA
    html += '<div class="rep-doc-type">';
    html += '  <button type="button" class="rep-doc-btn active" data-tipodoc="cotizacion">';
    html += '    <i class="fa-solid fa-file-invoice"></i> COTIZACIÓN';
    html += '    <small>Documento informativo · válido ' + diasValidez + ' días</small>';
    html += '  </button>';
    html += '  <button type="button" class="rep-doc-btn rep-doc-btn--locked" data-tipodoc="factura">';
    html += '    <i class="fa-solid fa-file-invoice-dollar"></i> FACTURA ';
    html += '    <span class="rep-lock-badge"><i class="fa-solid fa-lock"></i> PRIVADO</span>';
    html += '    <small>Requiere contraseña · solo personal autorizado</small>';
    html += '  </button>';
    html += '</div>';

    html += '<div class="rep-estado" id="repEstadoWrap" style="display:none;">';
    html += '  <label class="rep-estado__label">Estado de la factura:</label>';
    html += '  <div class="rep-estado__opts">';
    html += '    <button type="button" class="rep-estado-btn active" data-estado="pagada"><i class="fa-solid fa-circle-check"></i> PAGADA</button>';
    html += '    <button type="button" class="rep-estado-btn" data-estado="no-pagada"><i class="fa-solid fa-circle-xmark"></i> NO PAGADA</button>';
    html += '  </div>';
    html += '</div>';

    // Datos del cliente
    html += '<div class="rep-block">';
    html += '  <h4 class="rep-block__title"><i class="fa-solid fa-user"></i> Datos del cliente</h4>';
    html += '  <div class="rep-grid-2">';
    html += '    <div class="tool-field"><label for="repCliente">Nombre completo *</label>';
    html += '      <input type="text" id="repCliente" class="tool-input" placeholder="Ej: Juan Pérez"></div>';
    html += '    <div class="tool-field"><label for="repCedula">Cédula / RNC</label>';
    html += '      <input type="text" id="repCedula" class="tool-input" placeholder="000-0000000-0"></div>';
    html += '    <div class="tool-field"><label for="repTelefono">Teléfono</label>';
    html += '      <input type="tel" id="repTelefono" class="tool-input" placeholder="809-000-0000"></div>';
    html += '    <div class="tool-field"><label for="repEmail">Email</label>';
    html += '      <input type="email" id="repEmail" class="tool-input" placeholder="cliente@email.com"></div>';
    html += '  </div>';
    html += '  <div class="tool-field" style="margin-top:var(--space-sm);"><label for="repDireccion">Dirección</label>';
    html += '    <input type="text" id="repDireccion" class="tool-input" placeholder="Dirección del cliente"></div>';
    html += '</div>';

    // Equipo
    html += '<div class="rep-block">';
    html += '  <h4 class="rep-block__title"><i class="fa-solid fa-microchip"></i> Equipo a reparar</h4>';
    html += '  <div class="tool-field" style="margin-bottom:var(--space-sm);">';
    html += '    <label>Tipo de equipo *</label>';
    html += '    <div class="rep-pills" id="repEquipo">';
    cfg.equipos.forEach(function (eq) {
      html += '<button type="button" class="rep-pill" data-equipo="' + eq.id + '">';
      html += '<i class="fa-solid ' + eq.icon + '"></i> ' + eq.label;
      html += '</button>';
    });
    html += '    </div>';
    html += '  </div>';
    html += '  <div class="tool-field" id="repMarcaWrap" style="display:none;">';
    html += '    <label for="repMarca">Marca *</label>';
    html += '    <select id="repMarca" class="tool-input">';
    html += '      <option value="">— Primero elige tipo de equipo —</option>';
    html += '    </select>';
    html += '  </div>';
    html += '  <div class="tool-field" style="margin-top:var(--space-sm);">';
    html += '    <label for="repModelo">Modelo (opcional)</label>';
    html += '    <input type="text" id="repModelo" class="tool-input" placeholder="Ej: L3250, LaserJet M15w...">';
    html += '  </div>';
    html += '</div>';

    // Problemas
    html += '<div class="rep-block">';
    html += '  <h4 class="rep-block__title"><i class="fa-solid fa-screwdriver-wrench"></i> Trabajos realizados</h4>';
    html += '  <p class="rep-block__hint">Marca todo lo que se hizo o se va a hacer. Precios preestablecidos.</p>';
    html += '  <div class="rep-problems" id="repProblems">';
    cfg.problemas.forEach(function (p) {
      html += '<label class="rep-problem" data-cat="' + p.cat + '" data-problema="' + p.id + '">';
      html += '  <input type="checkbox" value="' + p.id + '" data-precio="' + p.precio + '">';
      html += '  <span class="rep-problem__name">' + p.label + '</span>';
      html += '  <span class="rep-problem__price">RD$' + p.precio.toLocaleString('es-DO') + '</span>';
      html += '</label>';
    });
    html += '  </div>';
    html += '</div>';

    // Garantía
    html += '<div class="rep-block">';
    html += '  <h4 class="rep-block__title"><i class="fa-solid fa-shield-halved"></i> Garantía del servicio</h4>';
    html += '  <p class="rep-block__hint">Selecciona el tiempo de garantía sobre la reparación.</p>';
    html += '  <div class="rep-garantia__opts">';
    html += '    <button type="button" class="rep-garantia-btn" data-garantia="0"><i class="fa-solid fa-ban"></i> Sin garantía</button>';
    html += '    <button type="button" class="rep-garantia-btn" data-garantia="15">15 días</button>';
    html += '    <button type="button" class="rep-garantia-btn active" data-garantia="30">30 días</button>';
    html += '    <button type="button" class="rep-garantia-btn" data-garantia="60">60 días</button>';
    html += '    <button type="button" class="rep-garantia-btn" data-garantia="90">90 días</button>';
    html += '    <button type="button" class="rep-garantia-btn" data-garantia="180">6 meses</button>';
    html += '    <button type="button" class="rep-garantia-btn" data-garantia="365">1 año</button>';
    html += '  </div>';
    html += '</div>';

    // Observaciones
    html += '<div class="rep-block">';
    html += '  <h4 class="rep-block__title"><i class="fa-solid fa-comment"></i> Observaciones</h4>';
    html += '  <textarea id="repDesc" class="tool-input" rows="3" placeholder="Ej: Impresora Epson L3250 regaba tinta, se desarmó, lavó y armó completa..."></textarea>';
    html += '</div>';

    // Total en vivo
    html += '<div class="rep-total" id="repTotal">';
    html += '  <span class="rep-total__label">TOTAL ESTIMADO:</span>';
    html += '  <span class="rep-total__value" id="repTotalValue">RD$0</span>';
    html += '</div>';

    this.els.fields.innerHTML = html;

    // Eventos tipo doc — FACTURA pide contraseña
    document.querySelectorAll('.rep-doc-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const tipo = btn.dataset.tipodoc;

        if (tipo === 'factura' && !self.facturaUnlocked) {
          const ok = await self.pedirPasswordFactura();
          if (!ok) return;
        }

        document.querySelectorAll('.rep-doc-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self.reparacion.tipoDoc = tipo;

        if (tipo === 'factura') {
          btn.classList.remove('rep-doc-btn--locked');
        } else if (!self.facturaUnlocked) {
          const fb = document.querySelector('.rep-doc-btn[data-tipodoc="factura"]');
          if (fb) fb.classList.add('rep-doc-btn--locked');
        }

        // Mostrar/ocultar selector de estado
        const estadoWrap = document.getElementById('repEstadoWrap');
        if (estadoWrap) {
          estadoWrap.style.display = (tipo === 'factura') ? 'block' : 'none';
        }
      });
    });

    // Eventos del selector PAGADA / NO PAGADA
    document.querySelectorAll('.rep-estado-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.rep-estado-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self.reparacion.estado = btn.dataset.estado;
      });
    });

    // Eventos del selector de GARANTÍA
    document.querySelectorAll('.rep-garantia-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.rep-garantia-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self.reparacion.garantia = parseInt(btn.dataset.garantia, 10);
      });
    });

    // Cliente
    const clientFieldMap = {
      Cliente:   'nombre',
      Cedula:    'cedula',
      Telefono:  'telefono',
      Email:     'email',
      Direccion: 'direccion'
    };
    Object.keys(clientFieldMap).forEach(function (field) {
      const el = document.getElementById('rep' + field);
      if (!el) return;
      el.addEventListener('input', function (e) {
        self.reparacion.cliente[clientFieldMap[field]] = e.target.value;
      });
    });

    // Equipo
    document.querySelectorAll('.rep-pill[data-equipo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.rep-pill').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self.reparacion.equipo = btn.dataset.equipo;
        self.loadMarcasByEquipo(btn.dataset.equipo);
        self.filterProblemsByEquipo(btn.dataset.equipo);
        self.updateRepTotal();
      });
    });

    const marcaSel = document.getElementById('repMarca');
    if (marcaSel) marcaSel.addEventListener('change', function (e) { self.reparacion.marca = e.target.value; });

    const modeloEl = document.getElementById('repModelo');
    if (modeloEl) modeloEl.addEventListener('input', function (e) { self.reparacion.modelo = e.target.value; });

    document.querySelectorAll('.rep-problem').forEach(function (label) {
      const input = label.querySelector('input');
      if (!input) return;
      input.addEventListener('change', function () {
        label.classList.toggle('checked', input.checked);
        self.reparacion.problemas = Array.from(document.querySelectorAll('.rep-problem input:checked'))
          .map(function (i) { return i.value; });
        self.updateRepTotal();
      });
    });

    const descEl = document.getElementById('repDesc');
    if (descEl) descEl.addEventListener('input', function (e) { self.reparacion.descripcion = e.target.value; });
  },

  loadMarcasByEquipo(equipo) {
    const cfg = window.SOPORTE_CONFIG;
    const marcas = cfg.marcas[equipo] || cfg.marcas['otro'];
    const select = document.getElementById('repMarca');
    const wrap = document.getElementById('repMarcaWrap');
    if (!select || !wrap) return;
    select.innerHTML = '<option value="">— Selecciona la marca —</option>';
    marcas.forEach(function (m) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      select.appendChild(opt);
    });
    wrap.style.display = 'block';
  },

  filterProblemsByEquipo(equipo) {
    document.querySelectorAll('.rep-problem').forEach(function (label) {
      const cat = label.dataset.cat;
      const compatible = (cat === equipo) || (equipo === 'otro');
      label.style.display = compatible ? 'flex' : 'none';
      if (!compatible) {
        const input = label.querySelector('input');
        if (input && input.checked) {
          input.checked = false;
          label.classList.remove('checked');
        }
      }
    });
  },

  updateRepTotal() {
    let total = 0;
    document.querySelectorAll('.rep-problem input:checked').forEach(function (input) {
      const lbl = input.closest('.rep-problem');
      if (lbl && lbl.style.display === 'none') return;
      total += parseInt(input.dataset.precio, 10) || 0;
    });
    const el = document.getElementById('repTotalValue');
    if (el) el.textContent = 'RD$' + total.toLocaleString('es-DO');
    return total;
  },

  /* ============================================
     CÓDIGO DE VERIFICACIÓN
  ============================================ */
  generarCodigoVerificacion(numDoc, fecha, contenido) {
    const sec = (window.SOPORTE_CONFIG.security && window.SOPORTE_CONFIG.security.docSecret) || 'jcdc';
    const data = numDoc + '|' + fecha + '|' + contenido + '|' + sec;
    let h = 5381;
    for (let i = 0; i < data.length; i++) {
      h = ((h << 5) + h + data.charCodeAt(i)) >>> 0;
    }
    const hex = h.toString(16).toUpperCase().padStart(8, '0');
    return 'VC-' + hex.slice(0, 4) + '-' + hex.slice(4, 8);
  },

  /* ============================================
     CÁLCULOS
  ============================================ */
  calculate() {
    const self = this;

    if (this.service === 'reparacion') {
      const calc = this.calcularReparacion();
      const lines = calc.lines;
      let total = calc.total;
      let extrasTotal = 0;
      let urgentPct = 0;

      Object.keys(this.extrasDef).forEach(function (key) {
        if (!self.extras[key]) return;
        const ex = self.extrasDef[key];
        if (ex.percentage) {
          urgentPct = ex.percentage;
        } else {
          const exDop = Math.round(ex.price * self.RATE_DOP);
          extrasTotal += exDop;
          lines.push({ label: ex.label, sub: '$' + ex.price + ' USD', value: exDop });
        }
      });

      total += extrasTotal;
      if (urgentPct > 0) {
        const urgAmount = Math.round(total * urgentPct);
        lines.push({ label: 'Entrega urgente', sub: '+' + (urgentPct * 100) + '%', value: urgAmount });
        total += urgAmount;
      }
      return { lines: lines, total: total };
    }

    const cfg = this.services[this.service];
    const lines = [];
    let subtotal = cfg.base;
    lines.push({ label: cfg.label + ' · base', value: cfg.base });

    cfg.fields.forEach(function (f) {
      const qty = self.values[f.id] || 0;
      const cost = qty * f.unit;
      subtotal += cost;
      lines.push({ label: f.label, sub: qty + ' × $' + f.unit, value: cost });
    });

    let extrasTotal = 0;
    let urgentPct = 0;
    Object.keys(this.extrasDef).forEach(function (key) {
      if (!self.extras[key]) return;
      const ex = self.extrasDef[key];
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
      lines.push({ label: 'Entrega urgente', sub: '+' + (urgentPct * 100) + '%', value: urgAmount });
      total += urgAmount;
    }
    return { lines: lines, total: total };
  },

  calcularReparacion() {
    const cfg = window.SOPORTE_CONFIG;
    const self = this;
    const lines = [];
    let total = 0;
    const equipo = cfg.equipos.find(function (e) { return e.id === self.reparacion.equipo; });
    const equipoLabel = equipo ? equipo.label : 'Equipo';

    document.querySelectorAll('.rep-problem input:checked').forEach(function (input) {
      const lbl = input.closest('.rep-problem');
      if (lbl && lbl.style.display === 'none') return;
      const problema = cfg.problemas.find(function (p) { return p.id === input.value; });
      if (problema) {
        lines.push({
          label: problema.label,
          sub: equipoLabel + (self.reparacion.marca ? ' · ' + self.reparacion.marca : '') + (self.reparacion.modelo ? ' ' + self.reparacion.modelo : ''),
          value: problema.precio
        });
        total += problema.precio;
      }
    });
    return { lines: lines, total: total };
  },

  /* ============================================
     RENDER SUMMARY
  ============================================ */
  renderSummary() {
    const calc = this.calculate();
    const lines = calc.lines;
    const total = calc.total;
    const isReparacion = this.service === 'reparacion';
    const dop = isReparacion ? total : total * this.RATE_DOP;
    const usd = isReparacion ? null : total;

    let html = '';

    if (isReparacion && this.reparacion) {
      const r = this.reparacion;
      const esFactura = r.tipoDoc === 'factura';

      html += '<div class="quote-summary__client' + (esFactura ? ' quote-summary__client--factura' : '') + '">';
      html += '  <div class="quote-summary__client-head">';
      html += '    <i class="fa-solid fa-' + (esFactura ? 'file-invoice-dollar' : 'file-invoice') + '"></i>';
      html += '    <strong>' + (esFactura ? 'FACTURA' : 'COTIZACIÓN') + '</strong>';
      html += '    <span>' + r.numero + '</span>';
      html += '  </div>';
      html += '  <div class="quote-summary__client-row"><span>Cliente:</span><strong>' + (r.cliente.nombre || '—') + '</strong></div>';
      if (r.cliente.cedula) html += '  <div class="quote-summary__client-row"><span>Cédula/RNC:</span><strong>' + r.cliente.cedula + '</strong></div>';
      if (r.cliente.telefono) html += '  <div class="quote-summary__client-row"><span>Teléfono:</span><strong>' + r.cliente.telefono + '</strong></div>';
      if (r.cliente.email) html += '  <div class="quote-summary__client-row"><span>Email:</span><strong>' + r.cliente.email + '</strong></div>';
      if (r.equipo) {
        const eq = window.SOPORTE_CONFIG.equipos.find(function (e) { return e.id === r.equipo; });
        html += '  <div class="quote-summary__client-row"><span>Equipo:</span><strong>' + (eq ? eq.label : r.equipo) + (r.marca ? ' ' + r.marca : '') + (r.modelo ? ' ' + r.modelo : '') + '</strong></div>';
      }
      html += '  <div class="quote-summary__client-row"><span>Emisión:</span><strong>' + r.fechaEmision + '</strong></div>';
      if (!esFactura) {
        html += '  <div class="quote-summary__client-row"><span>Válida hasta:</span><strong>' + r.fechaVencimiento + ' (' + r.diasValidez + ' días)</strong></div>';
      }
      html += '</div>';
    }

    if (!lines.length) {
      html += '<div class="quote-summary__row"><span class="quote-summary__label">Sin elementos seleccionados</span></div>';
    }

    lines.forEach(function (l) {
      const sub = l.sub ? '<small>' + l.sub + '</small>' : '';
      const price = isReparacion
        ? 'RD$' + l.value.toLocaleString('es-DO')
        : '$' + l.value.toLocaleString('en-US');
      html += '<div class="quote-summary__row">';
      html += '  <span class="quote-summary__label">' + l.label + sub + '</span>';
      html += '  <span class="quote-summary__value">' + price + '</span>';
      html += '</div>';
    });

    if (isReparacion) {
      html += '<div class="quote-summary__totals">';
      html += '  <div class="quote-summary__totals-label">TOTAL</div>';
      html += '  <div class="quote-summary__total-usd">RD$' + Math.round(dop).toLocaleString('es-DO') + '</div>';
      html += '  <div class="quote-summary__total-dop">Pesos dominicanos (DOP)</div>';
      html += '</div>';
    } else {
      html += '<div class="quote-summary__totals">';
      html += '  <div class="quote-summary__totals-label">TOTAL ESTIMADO</div>';
      html += '  <div class="quote-summary__total-usd">$' + usd.toLocaleString('en-US') + ' USD</div>';
      html += '  <div class="quote-summary__total-dop">≈ RD$' + Math.round(dop).toLocaleString('es-DO') + ' DOP</div>';
      html += '</div>';
    }

    this.els.summary.innerHTML = html;
  },

  /* ============================================
     RESTART
  ============================================ */
  restart() {
    this.currentStep = 1;
    this.service = null;
    this.values = {};
    this.extras = {};
    this.reparacion = null;

    document.querySelectorAll('[data-service]').forEach(function (o) {
      o.classList.remove('checked');
      const inp = o.querySelector('input');
      if (inp) inp.checked = false;
    });
    document.querySelectorAll('[data-extra]').forEach(function (o) {
      o.classList.remove('checked');
      const inp = o.querySelector('input');
      if (inp) inp.checked = false;
    });

    this.renderStepIndicator();
    this.updateNextBtn();
    this.scrollTop();
    if (typeof Toast !== 'undefined') Toast.show('Cotizador reiniciado', 'info', 1600);
  },

  /* ============================================
     TEXTO PLANO
  ============================================ */
  buildPlainText() {
    const cfg = this.services[this.service];
    const calc = this.calculate();
    const lines = calc.lines;
    const total = calc.total;
    const isReparacion = this.service === 'reparacion';
    const dop = isReparacion ? total : Math.round(total * this.RATE_DOP);
    const date = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });

    const esFactura = isReparacion && this.reparacion && this.reparacion.tipoDoc === 'factura';
    const codigoVC = isReparacion && this.reparacion
      ? this.generarCodigoVerificacion(this.reparacion.numero, this.reparacion.fechaEmision, total.toString())
      : '';

    let txt = '';
    txt += '═══════════════════════════════════════\n';
    txt += '  ' + (esFactura ? 'FACTURA' : 'COTIZACIÓN') + '\n';
    txt += '  JCDurán — Redes · Ciberseguridad\n';
    txt += '═══════════════════════════════════════\n\n';
    txt += 'Fecha: ' + date + '\n';
    txt += 'Servicio: ' + cfg.label + '\n';

    if (isReparacion && this.reparacion) {
      const r = this.reparacion;
      txt += 'Documento: ' + r.numero + '\n';
      if (r.cliente.nombre) txt += 'Cliente: ' + r.cliente.nombre + '\n';
      if (r.equipo) txt += 'Equipo: ' + r.equipo + (r.marca ? ' ' + r.marca : '') + (r.modelo ? ' ' + r.modelo : '') + '\n';
      if (!esFactura) txt += 'Válida hasta: ' + r.fechaVencimiento + '\n';
      if (codigoVC) txt += 'Verificación: ' + codigoVC + '\n';
    }
    txt += '\n── DETALLE ────────────────────────────\n';

    lines.forEach(function (l) {
      const sub = l.sub ? ' (' + l.sub + ')' : '';
      txt += '• ' + l.label + sub + '\n';
      txt += '  ' + (isReparacion ? 'RD$' + l.value.toLocaleString('es-DO') : '$' + l.value.toLocaleString('en-US')) + '\n';
    });

    txt += '\n── TOTALES ────────────────────────────\n';
    if (isReparacion) {
      txt += 'Total DOP:  RD$' + dop.toLocaleString('es-DO') + '\n';
      if (esFactura) txt += '*** PAGADO ***\n';
    } else {
      txt += 'Total USD:  $' + total.toLocaleString('en-US') + '\n';
      txt += 'Total DOP:  RD$' + dop.toLocaleString('es-DO') + '\n';
      txt += 'Tasa ref.:  1 USD = ' + this.RATE_DOP + ' DOP\n';
    }
    txt += '\nContacto:\n';
    txt += '  Email: jcdurancasado@gmail.com\n';
    txt += '  Web:   https://jcdurancasado.github.io/inf/\n';
    return txt;
  },

  sendWhatsApp() {
    if (!this.service) {
      if (typeof Toast !== 'undefined') Toast.show('Completa el cotizador primero', 'info', 2000);
      return;
    }
    this.registrarDocumento();
    const txt = this.buildPlainText();
    const url = 'https://wa.me/18090000000?text=' + encodeURIComponent(txt);
    window.open(url, '_blank', 'noopener');
    if (typeof Toast !== 'undefined') Toast.show('Abriendo WhatsApp…', 'success', 1800);
  },

  sendEmail() {
    if (!this.service) {
      if (typeof Toast !== 'undefined') Toast.show('Completa el cotizador primero', 'info', 2000);
      return;
    }
    this.registrarDocumento();
    const cfg = this.services[this.service];
    const subject = 'Solicitud de cotización — ' + cfg.label;
    const body = this.buildPlainText();
    const url = 'mailto:jcdurancasado@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    window.location.href = url;
  },

  /* ============================================
     SELLO PAGADO (SVG azul)
  ============================================ */
  generarSelloPagado(fecha, monto, numDoc, estado) {
    const cfg = window.SOPORTE_CONFIG.documentos || {};
    const esPagada = estado !== 'no-pagada';
    const color = esPagada ? (cfg.colorSello || '#1e40af') : '#dc2626';
    const texto = esPagada ? 'PAGADO' : 'NO PAGADA';
    const prov = (window.SOPORTE_CONFIG.proveedor) || {};
    const nombre = (prov.nombre || 'JCDURÁN CASADO').toUpperCase();
    const fontBig = esPagada ? 38 : 24;

    return `
<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" class="sello-svg">
  <defs>
    <path id="arcT-${numDoc}" d="M 30,110 A 80,80 0 0 1 190,110" fill="none"/>
    <path id="arcB-${numDoc}" d="M 35,110 A 75,75 0 0 0 185,110" fill="none"/>
    <filter id="rough-${numDoc}">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.3" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <g filter="url(#rough-${numDoc})" fill="none" stroke="${color}">
    <circle cx="110" cy="110" r="98" stroke-width="4"/>
    <circle cx="110" cy="110" r="86" stroke-width="1.5"/>
    <circle cx="110" cy="110" r="80" stroke-width="1" opacity="0.6"/>
    <text font-family="Arial Black, sans-serif" font-size="12" font-weight="900" fill="${color}" stroke="none" letter-spacing="2.5">
      <textPath href="#arcT-${numDoc}" startOffset="50%" text-anchor="middle">${nombre}</textPath>
    </text>
    <text font-family="Arial, sans-serif" font-size="7.5" fill="${color}" stroke="none" letter-spacing="1.8">
      <textPath href="#arcB-${numDoc}" startOffset="50%" text-anchor="middle">REDES · CIBERSEGURIDAD · SOPORTE TÉCNICO</textPath>
    </text>
    <line x1="30" y1="99" x2="190" y2="99" stroke-width="1.5"/>
    <text x="110" y="${esPagada ? 122 : 120}" font-family="Arial Black, sans-serif" font-size="${fontBig}" font-weight="900" fill="${color}" stroke="none" text-anchor="middle" letter-spacing="3">${texto}</text>
    <line x1="30" y1="132" x2="190" y2="132" stroke-width="1.5"/>
    <text x="110" y="150" font-family="Arial, sans-serif" font-size="9" fill="${color}" stroke="none" text-anchor="middle" letter-spacing="2">FECHA</text>
    <text x="110" y="163" font-family="Arial Black, sans-serif" font-size="10" fill="${color}" stroke="none" text-anchor="middle">${fecha}</text>
    <text x="110" y="180" font-family="Arial, sans-serif" font-size="8" fill="${color}" stroke="none" text-anchor="middle" letter-spacing="1">${numDoc}</text>
  </g>
</svg>`;
  },

  /* ============================================
     GUARDAR REGISTRO · llamar desde WhatsApp, Email y PDF
  ============================================ */
  registrarDocumento() {
    if (!this.service) return '';

    const isReparacion = this.service === 'reparacion';
    const calc  = this.calculate();
    const lines = calc.lines;
    const total = calc.total;
    const dop   = isReparacion ? total : Math.round(total * this.RATE_DOP);
    const usd   = isReparacion ? null : total;
    const date  = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });

    const rep       = isReparacion ? this.reparacion : null;
    const isFactura = rep && rep.tipoDoc === 'factura';
    const estado    = (rep && rep.estado) ? rep.estado : 'pagada';
    const esPagada  = estado === 'pagada';
    const numDoc    = rep ? rep.numero : ('JCDC-' + Date.now().toString(36).toUpperCase());

    const codigoVC = isReparacion && rep
      ? this.generarCodigoVerificacion(rep.numero, rep.fechaEmision, total.toString())
      : '';

    try {
      const registro = JSON.parse(localStorage.getItem('jcdc_registro_docs') || '[]');
      const idx = registro.findIndex(function (r) { return r.numero === numDoc; });

      const historial = (idx >= 0 && registro[idx].historial) ? registro[idx].historial : [];

      if (idx < 0) {
        historial.push({
          evento: 'emision',
          titulo: isFactura ? 'Factura emitida' : 'Cotización emitida',
          descripcion: isFactura
            ? (esPagada ? 'Documento emitido con estado PAGADA' : 'Documento emitido con estado NO PAGADA')
            : 'Documento generado desde el cotizador',
          fecha: date,
          timestamp: Date.now()
        });
      }

      const nuevoDoc = {
        tipo: isFactura ? 'factura' : 'cotizacion',
        estado: isFactura ? estado : '—',
        numero: numDoc,
        fecha: date,
        fechaISO: new Date().toISOString(),
        total: total,
        moneda: isReparacion ? 'DOP' : 'USD',
        cliente: rep ? (rep.cliente.nombre || '—') : '—',
        equipo: rep ? (rep.equipo || '—') : '—',
        codigoVC: codigoVC,
        timestamp: Date.now(),
        historial: historial,
        comentarios: (idx >= 0 && registro[idx].comentarios) ? registro[idx].comentarios : [],
        snapshot: {
          tipoDoc: rep ? rep.tipoDoc : 'cotizacion',
          numero: numDoc,
          fechaEmision: rep ? rep.fechaEmision : new Date().toISOString().slice(0, 10),
          fechaVencimiento: rep ? rep.fechaVencimiento : '',
          diasValidez: rep ? rep.diasValidez : 7,
          garantia: rep ? (rep.garantia || 30) : 30,
          cliente: rep ? JSON.parse(JSON.stringify(rep.cliente || {})) : {},
          equipo: rep ? rep.equipo : '',
          marca: rep ? rep.marca : '',
          modelo: rep ? rep.modelo : '',
          descripcion: rep ? rep.descripcion : '',
          problemas: rep ? (rep.problemas || []) : [],
          lines: lines,
          totalUSD: usd,
          totalDOP: dop,
          rate: this.RATE_DOP
        }
      };

      if (idx >= 0) registro[idx] = nuevoDoc;
      else registro.push(nuevoDoc);

      localStorage.setItem('jcdc_registro_docs', JSON.stringify(registro));
      console.log('[JCDC] Registro guardado en localStorage:', numDoc, codigoVC);

      // === SUBIR A FIRESTORE ===
      try {
        var self = this;
        var db = window.db;
        if (db) {
          // Recolectar todo el documento
          var docParaNube = {
            tipo: nuevoDoc.tipo,
            estado: nuevoDoc.estado,
            numero: nuevoDoc.numero,
            fecha: nuevoDoc.fecha,
            fechaISO: nuevoDoc.fechaISO,
            total: nuevoDoc.total,
            moneda: nuevoDoc.moneda,
            cliente: nuevoDoc.cliente,
            equipo: nuevoDoc.equipo,
            codigoVC: nuevoDoc.codigoVC,
            timestamp: nuevoDoc.timestamp,
            historial: nuevoDoc.historial,
            comentarios: nuevoDoc.comentarios,
            snapshot: nuevoDoc.snapshot
          };

          db.collection('documentos').doc(codigoVC).set(docParaNube)
            .then(function () {
              console.log('[Firestore] ✓ Documento subido:', codigoVC);
            })
            .catch(function (err) {
              console.error('[Firestore] ✗ Error subiendo:', err);
            });
        } else {
          console.warn('[Firestore] window.db no disponible');
        }
      } catch (e) {
        console.error('[Firestore] Error inesperado:', e);
      }
      // === FIN SUBIR A FIRESTORE ===

      // === ENVIAR EMAIL AL ADMIN (solo una vez por documento) ===
      try {
        this._emailsEnviados = this._emailsEnviados || {};
        if (!this._emailsEnviados[codigoVC]) {
          this._emailsEnviados[codigoVC] = true;

          var payload = {
            tipo: isFactura ? 'factura' : 'cotizacion',
            numero: numDoc,
            codigoVC: codigoVC,
            cliente: rep ? (rep.cliente.nombre || 'Sin nombre') : 'Sin nombre',
            total: total,
            moneda: isReparacion ? 'DOP' : 'USD',
            fecha: date
          };

          fetch('https://jcdcapi.vercel.app/api/enviar-cotizacion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d && d.ok) {
              console.log('[JCDC] ✓ Email enviado al admin:', numDoc);
            } else {
              console.warn('[JCDC] Email no enviado:', d);
            }
          })
          .catch(function (err) {
            console.warn('[JCDC] No se pudo enviar email (no bloquea):', err);
          });
        }
      } catch (e) {
        console.warn('[JCDC] Error enviando email:', e);
      }
      // === FIN ENVIAR EMAIL ===

      return codigoVC;
    } catch (e) {
      console.error('[JCDC] Error guardando registro:', e);
      return codigoVC;
    }
  },

  /* ============================================
     PDF
  ============================================ */
  downloadPDF() {
    if (!this.service) {
      if (typeof Toast !== 'undefined') Toast.show('Completa el cotizador primero', 'info', 2000);
      return;
    }

    const isReparacion = this.service === 'reparacion';
    const calc = this.calculate();
    const lines = calc.lines;
    const total = calc.total;
    const dop = isReparacion ? total : Math.round(total * this.RATE_DOP);
    const usd = isReparacion ? null : total;
    const date = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });

    const prov = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.proveedor) || {};
    const docCfg = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.documentos) || {};
    const rep = isReparacion ? this.reparacion : null;
    const isFactura = rep && rep.tipoDoc === 'factura';
    const estado = (rep && rep.estado) ? rep.estado : 'pagada';
    const esPagada = estado === 'pagada';
    const numDoc = rep ? rep.numero : ('JCDC-' + Date.now().toString(36).toUpperCase());
    const tituloDoc = isFactura ? 'FACTURA' : 'COTIZACIÓN';
    const rate = this.RATE_DOP;

    const codigoVC = isReparacion && rep
      ? this.generarCodigoVerificacion(rep.numero, rep.fechaEmision, total.toString())
      : '';

    try {
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({
          path: isFactura ? 'factura-generada' : 'cotizacion-generada',
          title: isFactura ? 'Factura generada' : 'Cotización generada',
          event: true
        });
      }
    } catch (e) {}

    this.registrarDocumento();

    let clienteBlock = '';
    if (rep && rep.cliente && (rep.cliente.nombre || rep.cliente.cedula || rep.cliente.telefono || rep.cliente.email || rep.cliente.direccion)) {
      clienteBlock += '<div class="info-block">';
      clienteBlock += '  <div class="info-block__title">DATOS DEL CLIENTE</div>';
      clienteBlock += '  <div class="info-block__grid">';
      clienteBlock += '    <div class="ii"><span>Cliente</span><strong>' + (rep.cliente.nombre || '—') + '</strong></div>';
      clienteBlock += '    <div class="ii"><span>Cédula / RNC</span><strong>' + (rep.cliente.cedula || '—') + '</strong></div>';
      clienteBlock += '    <div class="ii"><span>Teléfono</span><strong>' + (rep.cliente.telefono || '—') + '</strong></div>';
      clienteBlock += '    <div class="ii"><span>Email</span><strong>' + (rep.cliente.email || '—') + '</strong></div>';
      if (rep.cliente.direccion) clienteBlock += '    <div class="ii ii--full"><span>Dirección</span><strong>' + rep.cliente.direccion + '</strong></div>';
      clienteBlock += '  </div>';
      clienteBlock += '</div>';
    }

    let equipoBlock = '';
    if (rep && rep.equipo) {
      const eq = window.SOPORTE_CONFIG.equipos.find(function (e) { return e.id === rep.equipo; });
      const eqLabel = eq ? eq.label : rep.equipo;
      equipoBlock += '<div class="info-block">';
      equipoBlock += '  <div class="info-block__title">EQUIPO / SERVICIO</div>';
      equipoBlock += '  <div class="info-block__grid">';
      equipoBlock += '    <div class="ii ii--full"><span>Equipo</span><strong>' + eqLabel + (rep.marca ? ' · ' + rep.marca : '') + (rep.modelo ? ' ' + rep.modelo : '') + '</strong></div>';
      equipoBlock += '  </div>';
      equipoBlock += '</div>';
    }

    let rows = '';
    lines.forEach(function (l) {
      const sub = l.sub ? '<div class="row-sub">' + l.sub + '</div>' : '';
      const price = isReparacion ? ('RD$' + l.value.toLocaleString('es-DO')) : ('$' + l.value.toLocaleString('en-US'));
      rows += '<tr>';
      rows += '  <td>' + l.label + sub + '</td>';
      rows += '  <td class="row-price">' + price + '</td>';
      rows += '</tr>';
    });

    const totalRow = isReparacion ? ('RD$' + dop.toLocaleString('es-DO')) : ('$' + usd.toLocaleString('en-US'));

    const hora = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
    const garantiaDias = (rep && typeof rep.garantia === 'number') ? rep.garantia : 30;
    const garantiaTexto = garantiaDias === 0
      ? 'Este servicio <strong>no incluye garantía</strong>.'
      : 'Garantía de <strong>' + garantiaDias + ' días</strong> sobre la reparación.';
    const notaTexto = isFactura
      ? '<strong>Nota:</strong> Esta factura corresponde al servicio descrito arriba. ' + garantiaTexto + ' Gracias por su preferencia.'
      : '<strong>Nota:</strong> Cotización generada desde el cotizador web <strong>jcdurancasado.github.io/inf</strong> el ' + date + ' a las ' + hora + '. Válida por ' + (rep ? rep.diasValidez : 7) + ' días.';

    const watermarkHTML = (!isFactura && docCfg.mostrarWatermark !== false)
      ? '<div class="watermark-doc">COTIZACIÓN</div>'
      : '';

    const selloHTML = (isFactura)
      ? '<div class="sello-container">' + this.generarSelloPagado(date, totalRow, numDoc, estado) + '</div>'
      : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${tituloDoc} ${numDoc}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: auto; }
    body {
      font-family: 'Segoe UI', Roboto, Arial, sans-serif;
      color: #111;
      padding: 8px 10px;
      max-width: 700px;
      margin: 0 auto;
      font-size: 10.5px;
      line-height: 1.35;
      position: relative;
    }

    .header { border-bottom: 2.5px solid #00bcd4; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 16px; font-weight: 800; color: #0a0a0f; letter-spacing: 0.5px; }
    .brand small { display: block; font-size: 8.5px; font-weight: 400; color: #666; letter-spacing: 2px; margin-top: 2px; }
    .meta { text-align: right; font-size: 9.5px; color: #666; }
    .meta strong { color: #111; font-size: 11px; }

    .doc-type { text-align: center; font-size: 17px; font-weight: 800; letter-spacing: 4px; color: ${isFactura ? (esPagada ? '#0a7f2e' : '#c81e1e') : '#0a0a0f'}; margin-bottom: 3px; text-transform: uppercase; }
    .doc-sub { text-align: center; font-size: 9.5px; color: #888; margin-bottom: 9px; }

    .info-block { margin-bottom: 8px; }
    .info-block__title {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #0369a1;
      margin-bottom: 4px;
      padding-bottom: 2px;
      border-bottom: 1px solid #e0e6ed;
    }
    .info-block__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px;
    }
    .ii {
      padding: 5px 7px;
      background: #f5f7fa;
      border-radius: 3px;
      border-left: 2.5px solid #00bcd4;
    }
    .ii--full { grid-column: 1 / -1; }
    .ii span {
      display: block;
      font-size: 7px;
      letter-spacing: 1px;
      color: #94a3b8;
      text-transform: uppercase;
      margin-bottom: 1px;
      font-weight: 600;
    }
    .ii strong { font-size: 10px; color: #111; word-break: break-word; font-weight: 600; }

    .section-title {
      font-size: 8.5px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #666;
      margin: 9px 0 4px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 2px;
      font-weight: 700;
    }

    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
    thead th {
      background: #0a0a0f;
      color: #fff;
      padding: 5px 8px;
      text-align: left;
      font-size: 8px;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-weight: 700;
    }
    thead th:last-child { text-align: right; }
    tbody td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
    tbody tr:last-child td { border-bottom: none; }
    .row-sub { font-size: 8px; color: #94a3b8; margin-top: 1px; }
    .row-price { text-align: right; font-weight: 700; white-space: nowrap; }

    .totals {
      background: linear-gradient(135deg, #e0f7fa, #ede9fe);
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 8px;
      text-align: center;
      border: 1.5px solid #00bcd4;
    }
    .totals .label { font-size: 8px; letter-spacing: 2px; color: #666; margin-bottom: 2px; font-weight: 700; }
    .totals .amount { font-size: 19px; font-weight: 800; color: #0a0a0f; letter-spacing: -0.5px; }
    .totals .sub { font-size: 9px; color: #444; margin-top: 2px; }

    .note {
      padding: 6px 9px;
      background: #fff9e6;
      border-left: 2.5px solid #fbbf24;
      border-radius: 3px;
      font-size: 8.5px;
      color: #555;
      line-height: 1.4;
      margin-bottom: 7px;
    }
    .obs {
      padding: 6px 9px;
      background: #f8f9fa;
      border-left: 2.5px solid #00bcd4;
      border-radius: 3px;
      font-size: 8.5px;
      color: #555;
      line-height: 1.4;
      margin-bottom: 7px;
    }

    .verif {
      text-align: center;
      padding: 5px 10px;
      background: #f0f9ff;
      border: 1px dashed #0284c7;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 8.5px;
      color: #075985;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .verif strong { color: #0c4a6e; }

    .firma-wrapper {
      position: relative;
      margin-top: 18px;
      padding-top: 4px;
    }
    .firma-block {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
    }
    .firma-item { text-align: center; }
    .firma-line { border-bottom: 1.2px solid #111; height: 38px; width: 65%; margin: 0 auto 6px; }
    .firma-label { font-size: 8px; color: #666; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; }
    .firma-name { font-size: 10px; font-weight: 700; color: #111; margin-top: 1px; }
    .firma-info { font-size: 8px; color: #888; margin-top: 1px; }

    .sello-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-14deg);
      width: 130px;
      height: 130px;
      pointer-events: none;
      z-index: 5;
      opacity: 0.72;
    }
    .sello-svg { width: 100%; height: 100%; display: block; }

    .qr-block {
      text-align: center;
      margin: 8px 0 4px;
      position: relative;
      z-index: 3;
    }
    .qr-container {
      display: inline-block;
      width: 52px;
      height: 52px;
      background: #fff;
      padding: 3px;
      border-radius: 3px;
      border: 1px solid #ddd;
      line-height: 0;
    }
    .qr-container canvas, .qr-container img { width: 100% !important; height: 100% !important; display: block; }
    .qr-label { font-size: 7.5px; color: #666; letter-spacing: 1px; margin-top: 2px; font-weight: 600; }

    .footer {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #e5e7eb;
      font-size: 8px;
      color: #888;
      text-align: center;
      line-height: 1.4;
    }
    .footer strong { color: #111; }

    .watermark-doc {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-28deg);
      font-family: 'Arial Black', sans-serif;
      font-size: 100px;
      font-weight: 900;
      color: rgba(0, 188, 212, 0.06);
      letter-spacing: 12px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 1;
      user-select: none;
    }

    @media print {
      body { padding: 0; }
      .totals, .firma-wrapper, .sello-container, .qr-block { break-inside: avoid; page-break-inside: avoid; }
      .info-block { break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${watermarkHTML}

  <div class="header">
    <div class="brand">
      <svg viewBox="0 0 100 100" width="38" height="38" style="flex-shrink:0;vertical-align:middle;margin-right:10px;">
        <path d="M50 4 L88 26 L88 62 Q88 88 50 96 Q12 88 12 62 L12 26 Z"
              fill="none" stroke="#00bcd4" stroke-width="3.5" stroke-linejoin="round"/>
        <circle cx="50" cy="50" r="34" fill="none" stroke="#00bcd4" stroke-width="1.5"
                opacity="0.55" stroke-dasharray="3 4"/>
        <circle cx="50" cy="50" r="24" fill="none" stroke="#00bcd4" stroke-width="1.5"
                opacity="0.65" stroke-dasharray="2 3"/>
        <path d="M50 36 L60 42 L60 54 L50 60 L40 54 L40 42 Z"
              fill="rgba(0,188,212,0.12)" stroke="#00bcd4" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="50" cy="50" r="4" fill="#00bcd4"/>
        <line x1="50" y1="4"  x2="50" y2="10" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="88" y1="26" x2="83" y2="30" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="88" y1="62" x2="83" y2="58" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="50" y1="96" x2="50" y2="90" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="12" y1="62" x2="17" y2="58" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="12" y1="26" x2="17" y2="30" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <span style="display:inline-block;vertical-align:middle;">
        ${prov.nombre || 'JCDURANCASADO'}
        <small style="display:block;font-size:8px;font-weight:400;color:#666;letter-spacing:1.2px;margin-top:1px;">REDES · CIBERSEGURIDAD · SOPORTE TÉCNICO</small>
      </span>
    </div>
    <div class="meta">
      <div><strong>${numDoc}</strong></div>
      <div>${date}</div>
    </div>
  </div>

  <div class="doc-type">${tituloDoc}</div>
  <div class="doc-sub">${isFactura ? (esPagada ? 'Comprobante de servicio · PAGADA' : 'Comprobante de servicio · PENDIENTE DE PAGO') : 'Propuesta de servicio'}</div>

  <div class="info-block">
    <div class="info-block__title">DATOS DEL PROVEEDOR</div>
    <div class="info-block__grid">
      <div class="ii"><span>Proveedor</span><strong>${prov.nombre || '—'}</strong></div>
      <div class="ii"><span>Cédula / RNC</span><strong>${prov.cedula || '—'}</strong></div>
      <div class="ii"><span>Teléfono</span><strong>${prov.telefono || '—'}</strong></div>
      <div class="ii"><span>Email</span><strong>${prov.email || '—'}</strong></div>
    </div>
  </div>

  ${clienteBlock}
  ${equipoBlock}

  ${rep && rep.fechaEmision ? `
    <div class="info-block">
      <div class="info-block__title">INFORMACIÓN DEL DOCUMENTO</div>
      <div class="info-block__grid">
        <div class="ii"><span>Fecha de emisión</span><strong>${rep.fechaEmision}</strong></div>
        <div class="ii"><span>${isFactura ? 'Estado' : 'Válida hasta'}</span><strong>${isFactura ? (esPagada ? '✓ PAGADA' : '✗ NO PAGADA') : rep.fechaVencimiento + ' (' + rep.diasValidez + ' días)'}</strong></div>
      </div>
    </div>
  ` : ''}

  <div class="section-title">Detalle del servicio</div>
  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>${isReparacion ? 'Monto (DOP)' : 'Monto (USD)'}</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="2" style="text-align:center;color:#888;padding:12px;">Sin elementos seleccionados</td></tr>'}</tbody>
  </table>

  <div class="totals">
    <div class="label">${isFactura ? (esPagada ? 'TOTAL PAGADO' : 'TOTAL A PAGAR') : 'TOTAL ESTIMADO'}</div>
    <div class="amount">${totalRow}</div>
    ${!isReparacion && dop ? '<div class="sub">≈ RD$' + dop.toLocaleString('es-DO') + ' DOP · Tasa 1 USD = ' + rate + ' DOP</div>' : ''}
    ${isReparacion ? '<div class="sub">Pesos dominicanos (DOP)</div>' : ''}
  </div>

  ${rep && rep.descripcion ? '<div class="obs"><strong>Observaciones:</strong> ' + rep.descripcion + '</div>' : ''}

  <div class="note">${notaTexto}</div>

  ${codigoVC ? '<div class="verif">🔒 VERIFICACIÓN: <strong>' + codigoVC + '</strong> · ' + date + ' · Ref: ' + numDoc + '</div>' : ''}

  <div class="firma-wrapper">
    ${selloHTML}
    <div class="firma-block">
      <div class="firma-item">
        <div class="firma-line"></div>
        <div class="firma-label">Entregado por</div>
        <div class="firma-name">${prov.nombre || '—'}</div>
        <div class="firma-info">${prov.profesion || ''}</div>
        <div class="firma-info">Cédula: ${prov.cedula || '—'}</div>
      </div>
      <div class="firma-item">
        <div class="firma-line"></div>
        <div class="firma-label">${isFactura ? 'Recibido por' : 'Aprobado por'}</div>
        <div class="firma-name">${rep && rep.cliente && rep.cliente.nombre ? rep.cliente.nombre : 'Cliente'}</div>
        <div class="firma-info">${rep && rep.cliente && rep.cliente.cedula ? 'Cédula: ' + rep.cliente.cedula : ''}</div>
        <div class="firma-info">Fecha: _______________</div>
      </div>
    </div>
  </div>

  <div class="qr-block">
    <div class="qr-container" id="qrContainer"></div>
    <div class="qr-label">VERIFICA EN: jcdurancasado.github.io/inf</div>
  </div>

  <div class="footer">
    <strong>${prov.nombre || 'JCDURANCASADO'}</strong> · Redes · Ciberseguridad · Soporte Técnico<br>
    ${prov.email || ''} · ${prov.telefono || ''} · ${prov.web || ''}
  </div>

  <script src="https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js"><\/script>
  <script>
    function generarQR() {
      var cont = document.getElementById('qrContainer');
      if (!cont) return;
      try {
        if (typeof QRCode !== 'undefined') {
          cont.innerHTML = '';
          new QRCode(cont, {
            text: 'https://jcdurancasado.github.io/inf/',
            width: 46,
            height: 46,
            colorDark: '#0a0a0f',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
          });
          return true;
        }
      } catch (e) { console.error('QR error:', e); }
      return false;
    }

    window.addEventListener('load', function () {
      generarQR();
      setTimeout(function () {
        var cont = document.getElementById('qrContainer');
        if (cont && !cont.querySelector('canvas, img')) generarQR();
      }, 300);
      setTimeout(function () { window.print(); }, 900);
    });
  <\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');

    if (!win) {
      if (typeof Toast !== 'undefined') Toast.show('Permite las ventanas emergentes', 'error', 2500);
      URL.revokeObjectURL(url);
      return;
    }

    setTimeout(function () { URL.revokeObjectURL(url); }, 90000);

    const msg = isFactura
      ? ('Factura ' + (esPagada ? 'PAGADA' : 'NO PAGADA') + ' lista · QR + sello')
      : 'Cotización lista · QR';
    if (typeof Toast !== 'undefined') Toast.show(msg, 'success', 2200);
  },
};

document.addEventListener('DOMContentLoaded', function () {
  QuoteWizard.init();
});