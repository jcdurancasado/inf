/**
 * JCDURANCASADO · Cotizador de Servicios
 * v4 — 13 servicios + garantía con % + validez admin + targeticas
 * Mantiene intacta la lógica de:
 *   · OTP por WhatsApp + clave admin
 *   · Firebase Auth (login admin)
 *   · Sello, QR, código de verificación, PDF, email
 *   · Registro en Firestore + localStorage
 *   · Badge admin/cliente + timeout 30 min
 */
'use strict';

const QuoteWizard = {
  currentStep: 1,
  maxStep: 4,
  service: null,
  values: {},
  extras: {},
  reparacion: null,
  facturaUnlocked: false,
  cotizacionUnlocked: false,

  // Estado nuevo: garantía y validez para TODOS los servicios
  garantiaSeleccionada: 0,
  diasValidez: 15,
  cantidadTargeticas: 12,

  documento: {
    tipoDoc: 'cotizacion',
    estado: 'pagada',
    cliente: { nombre: '', cedula: '', telefono: '', email: '', direccion: '' },
    observaciones: '',
    numero: '',
    fechaEmision: '',
    codigoVC: '',
    timestamp: 0
  },

  // Estado para el servicio de accesorios
  accesorios: {},
  accesoriosCatActiva: 'all',

  // ============================================
  // CONFIGURACIÓN (cargada desde SOPORTE_CONFIG)
  // ============================================
  services: {},
  categories: {
    soporte:    { label: 'SOPORTE & REPARACIÓN', icon: 'fa-screwdriver-wrench' },
    formacion:  { label: 'FORMACIÓN',            icon: 'fa-chalkboard-user' },
    desarrollo: { label: 'DESARROLLO',           icon: 'fa-laptop-code' },
    redes:      { label: 'REDES',                icon: 'fa-network-wired' },
    seguridad:  { label: 'SEGURIDAD',            icon: 'fa-shield-halved' },
    cloud:      { label: 'CLOUD & CCTV',         icon: 'fa-cloud' }
  },
  extrasDef: {},

  els: {},

  // ============================================
  // GETTERS dinámicos
  // ============================================
  get RATE_DOP() {
    return (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.rateDop) || 60;
  },
  get garantiaTramos() {
    return (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.garantiaTramos) || [
      { dias: 0,   label: 'Sin garantía', pct: 0    },
      { dias: 15,  label: '15 días',      pct: 0.03 },
      { dias: 30,  label: '30 días',      pct: 0.06 },
      { dias: 60,  label: '60 días',      pct: 0.10 },
      { dias: 90,  label: '90 días',      pct: 0.15 },
      { dias: 180, label: '6 meses',      pct: 0.22 },
      { dias: 365, label: '1 año',        pct: 0.35 }
    ];
  },

  // ============================================
  // INIT
  // ============================================
  init() {
    // Cargar servicios y extras desde config
    if (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.serviciosCotizador) {
      this.services = window.SOPORTE_CONFIG.serviciosCotizador;
    }
    if (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.extrasDef) {
      this.extrasDef = window.SOPORTE_CONFIG.extrasDef;
    }
    // Validez por defecto desde config
    if (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.documentos) {
      this.diasValidez = window.SOPORTE_CONFIG.documentos.cotizacionValidezDias || 15;
    }

    const wizard = document.getElementById('quoteWizard');

    // SIEMPRE arrancar bloqueado
    this.facturaUnlocked = false;
    this.cotizacionUnlocked = false;
    this._tipoAcceso = null;
    this._expiraEn = null;
    this._loggedInHere = false;

    // ✅ SIN listener automático — aislamiento por sessionStorage
    const selfInit = this;
    let cotizadorAdminLocal = false;
    try { cotizadorAdminLocal = sessionStorage.getItem('jcdc_admin_cotizador') === '1'; } catch (e) {}
    if (cotizadorAdminLocal) {
      this.facturaUnlocked = true;
      this._tipoAcceso = 'admin';
      this._loggedInHere = true;
      setTimeout(function () { selfInit._activarModoAdmin(); }, 200);
    }

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
      restart: document.getElementById('quoteRestart'),
      servicesHost: document.getElementById('quoteServicesHost')
    };

    const self = this;

    this._svcInjectStyles();

    // Generar los 13 servicios (si hay host en el HTML)
    this.renderServicesHost();

    // Extras (los existentes en HTML)
    document.querySelectorAll('[data-extra]').forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.preventDefault();
        const input = opt.querySelector('input');
        if (!input) return;
        input.checked = !input.checked;
        opt.classList.toggle('checked', input.checked);
        self.extras[opt.dataset.extra] = input.checked;
        self._updateExtrasTotal();
      });
    });

    // ✅ NUEVO: bloque de TOTAL ESTIMADO en el panel de extras (Paso 3)
    const extrasPanel = document.querySelector('.quote-panel[data-panel="3"]');
    if (extrasPanel && !extrasPanel.querySelector('#extrasTotal')) {
      const totalDiv = document.createElement('div');
      totalDiv.className = 'rep-total';
      totalDiv.id = 'extrasTotal';
      totalDiv.innerHTML = '<span class="rep-total__label">TOTAL ESTIMADO:</span>' +
                           '<span class="rep-total__value" id="extrasTotalValue">RD$0</span>';
      extrasPanel.appendChild(totalDiv);
    }

    this.els.back.addEventListener('click', function () { self.prev(); });
    this.els.next.addEventListener('click', function () { self.next(); });
    this.els.restart.addEventListener('click', function () { self.restart(); });

    const dlBtn = document.getElementById('quoteDownload');
    if (dlBtn) dlBtn.addEventListener('click', function () { self.downloadPDF(); });

    const signedBtn = document.getElementById('quoteRequestSigned');
    if (signedBtn) signedBtn.addEventListener('click', function () { self.requestSigned(); });

    const signedWABtn = document.getElementById('quoteRequestSignedWA');
    if (signedWABtn) signedWABtn.addEventListener('click', function () { self.requestSignedWA(); });

    this.renderStepIndicator();
    this.updateNextBtn();
  },

  // ============================================
  // RENDER · Servicios del Paso 1 (13 por categoría)
  // ============================================
  renderServicesHost() {
    let host = (this.els && this.els.servicesHost) || document.querySelector('.quote-options--services');
    if (host && !this.els.servicesHost) {
      this.els.servicesHost = host;
      if (!host.id) host.id = 'quoteServicesHost';
    }
    if (!host) {
      console.warn('[JCDC] No se encontró contenedor de servicios.');
      return;
    }

    host.innerHTML = '';
    const filtersHost = document.getElementById('quoteServicesFilters');

    const self = this;
    const cats = this.categories;
    const svcs = this.services;

    if (filtersHost) {
      let chipsHtml = '';
      chipsHtml += '<button type="button" class="quote-services-filters__chip active" data-filter="all">';
      chipsHtml += '  <i class="fa-solid fa-layer-group"></i><span>Todos</span>';
      chipsHtml += '</button>';
      Object.keys(cats).forEach(function (catId) {
        chipsHtml += '<button type="button" class="quote-services-filters__chip" data-filter="' + catId + '">';
        chipsHtml += '  <i class="fa-solid ' + cats[catId].icon + '"></i><span>' + cats[catId].label + '</span>';
        chipsHtml += '</button>';
      });
      filtersHost.innerHTML = chipsHtml;

      filtersHost.querySelectorAll('.quote-services-filters__chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          filtersHost.querySelectorAll('.quote-services-filters__chip').forEach(function (c) {
            c.classList.remove('active');
          });
          chip.classList.add('active');
          const filter = chip.dataset.filter || 'all';

          host.querySelectorAll('.svc-card[data-service]').forEach(function (card) {
            const cat = card.dataset.category || 'otros';
            const show = (filter === 'all') || (cat === filter);
            card.dataset.hidden = show ? 'false' : 'true';
          });
        });
      });
    }

    let html = '';
    // ✅ Ordenar servicios por campo "order" (fallback: 999 al final)
    const orderedIds = Object.keys(svcs).sort(function (a, b) {
      const oa = (svcs[a].order !== undefined) ? svcs[a].order : 999;
      const ob = (svcs[b].order !== undefined) ? svcs[b].order : 999;
      return oa - ob;
    });
    orderedIds.forEach(function (id) {
      const s = svcs[id];
      html += '<label class="svc-card" data-service="' + id + '" data-category="' + (s.category || 'otros') + '">';
      html += '  <input type="radio" name="service" value="' + id + '" style="display:none;">';
      html += '  <div class="svc-card__head">';
      html += '    <span class="svc-card__icon"><i class="fa-solid ' + (s.icon || 'fa-circle') + '"></i></span>';
      html += '    <span class="svc-card__name">' + s.label + '</span>';
      html += '  </div>';
      html += '  <span class="svc-card__desc">' + (s.desc || '') + '</span>';
      html += '</label>';
    });

    host.innerHTML = html;
    host.className = 'svc-cards-grid'; // ✅ Forzamos al contenedor a ser la cuadrícula

    host.querySelectorAll('[data-service]').forEach(function (opt) {
      opt.addEventListener('click', async function () {
        const servicioId = opt.dataset.service;
        self.cotizacionUnlocked = true;

        host.querySelectorAll('[data-service]').forEach(function (o) { o.classList.remove('checked'); });
        opt.classList.add('checked');
        const input = opt.querySelector('input');
        if (input) input.checked = true;
        self.service = servicioId;
        self.loadDefaults();
        self._aplicarFiltrosExtras(servicioId);
        self.updateNextBtn();
      });
    });
  },

  _aplicarFiltrosExtras(serviceId) {
    if (!this.extrasDef) return;
    document.querySelectorAll('[data-extra]').forEach(function (opt) {
      const key = opt.dataset.extra;
      const def = QuoteWizard.extrasDef[key];
      if (!def) return;
      const excl = def.excludes || [];
      const hidden = excl.indexOf(serviceId) !== -1;

      opt.style.display = hidden ? 'none' : '';
      if (hidden) {
        const input = opt.querySelector('input');
        if (input && input.checked) {
          input.checked = false;
          opt.classList.remove('checked');
          QuoteWizard.extras[key] = false;
        }
      }
    });
  },

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
      .pwd-modal__field--otp { position: relative; }
      .pwd-modal__field--otp input { padding-right: 48px !important; }
      .pwd-otp-eye {
        position: absolute;
        right: 10px; top: 50%; transform: translateY(-50%);
        width: 34px; height: 34px;
        background: transparent; border: none;
        color: #6a7080; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
        z-index: 3;
      }
      .pwd-otp-eye:hover { color: #ff3333; background: rgba(255,51,51,0.1); }
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

      body.jcdc-modal-open .cursor-dot,
      body.jcdc-modal-open .cursor-ring { z-index: 100002 !important; }
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
    if (window.auth && window.auth.currentUser && this._loggedInHere) {
      this.facturaUnlocked = true;
      this._activarModoAdmin();
      return true;
    }

    this._inyectarEstilosModal();

    const self = this;
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'pwd-overlay';
      overlay.innerHTML = `
        <div class="pwd-modal" role="dialog" aria-modal="true">
          <div class="pwd-modal__icon"><i class="fa-solid fa-lock"></i></div>
          <h3 class="pwd-modal__title">ACCESO RESTRINGIDO</h3>
          <p class="pwd-modal__desc">La generación de <strong>FACTURAS</strong> requiere acceso de administrador.<br>
          Las cotizaciones siguen disponibles sin restricción.</p>
          <div class="pwd-modal__field">
            <i class="fa-solid fa-envelope"></i>
            <input type="email" id="pwdFacturaEmail" autocomplete="email" placeholder="Email" />
          </div>
          <div class="pwd-modal__field">
            <i class="fa-solid fa-key"></i>
            <input type="password" id="pwdFacturaInput" autocomplete="current-password" placeholder="Contraseña" />
          </div>
          <p class="pwd-modal__error" id="pwdFacturaError"></p>
          <div class="pwd-modal__actions">
            <button type="button" class="pwd-btn pwd-btn--ghost" id="pwdFacturaCancel">Cancelar</button>
            <button type="button" class="pwd-btn pwd-btn--primary" id="pwdFacturaOk">
              <i class="fa-solid fa-unlock"></i> Entrar
            </button>
          </div>
          <button type="button" class="pwd-modal__close" id="pwdFacturaClose" aria-label="Cerrar">×</button>
        </div>
      `;
      document.body.appendChild(overlay);
      document.body.classList.add('jcdc-modal-open');

      const emailInp = overlay.querySelector('#pwdFacturaEmail');
      const input = overlay.querySelector('#pwdFacturaInput');
      const error = overlay.querySelector('#pwdFacturaError');
      const ok = overlay.querySelector('#pwdFacturaOk');
      const cancel = overlay.querySelector('#pwdFacturaCancel');
      const close = overlay.querySelector('#pwdFacturaClose');

      setTimeout(function () { input.focus(); }, 80);

      function cerrar(resultado) {
        document.body.classList.remove('jcdc-modal-open');
        overlay.classList.add('pwd-overlay--closing');
        setTimeout(function () { overlay.remove(); }, 220);
        resolve(resultado);
      }

      async function intentar() {
        const email = emailInp.value.trim();
        const pass = input.value;
        if (!email || !pass) {
          error.textContent = 'Completa email y contraseña';
          return;
        }
        if (!window.auth) {
          error.textContent = 'Error: Firebase Auth no disponible';
          return;
        }
        ok.disabled = true;
        try {
          await window.auth.signInWithEmailAndPassword(email, pass);
          try { sessionStorage.setItem('jcdc_admin_cotizador', '1'); } catch (e) {}
          self._loggedInHere = true;
          self.facturaUnlocked = true;
          self._tipoAcceso = 'admin';
          if (typeof Toast !== 'undefined') Toast.show('Acceso concedido', 'success', 1800);
          self._activarModoAdmin();
          cerrar(true);
        } catch (e) {
          ok.disabled = false;
          const code = e.code || '';
          let msg = 'Error al iniciar sesión';
          if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') msg = '❌ Contraseña incorrecta';
          else if (code === 'auth/user-not-found') msg = '❌ Usuario no encontrado';
          else if (code === 'auth/invalid-email') msg = '❌ Email inválido';
          else if (code === 'auth/too-many-requests') msg = '⏳ Demasiados intentos. Espera un momento.';
          else if (code === 'auth/network-request-failed') msg = '⚠️ Error de conexión';
          error.textContent = msg;
          input.value = '';
          input.classList.add('pwd-shake');
          setTimeout(function () { input.classList.remove('pwd-shake'); }, 400);
        }
      }

      ok.addEventListener('click', intentar);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') intentar();
        if (e.key === 'Escape') cerrar(false);
      });
      emailInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') input.focus();
      });
      cancel.addEventListener('click', function () { cerrar(false); });
      close.addEventListener('click', function () { cerrar(false); });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) cerrar(false);
      });
    });
  },

  async pedirCodigoOTP() {
    if (this.cotizacionUnlocked) return true;

    document.querySelectorAll('.pwd-overlay').forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    document.body.classList.remove('jcdc-modal-open');

    this._inyectarEstilosModal();

    const self = this;
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'pwd-overlay pwd-overlay--otp';
      overlay.innerHTML = `
        <div class="pwd-modal pwd-modal--otp" role="dialog" aria-modal="true">
          <div class="pwd-modal__icon">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <h3 class="pwd-modal__title">ACCESO TEMPORAL</h3>
          <p class="pwd-modal__desc">Ingresa el <strong>código temporal</strong> que el administrador te proporcionará, o tu <strong>clave de administrador</strong>.<br><span style="font-size:0.82rem;">El código es de <strong>un solo uso</strong> y vence en <strong>20 minutos</strong>.</span></p>
          <div class="pwd-modal__field pwd-modal__field--otp">
            <i class="fa-solid fa-key"></i>
            <input type="password" id="otpInput" autocomplete="off" placeholder="Código o clave admin" maxlength="50" />
            <button type="button" class="pwd-otp-eye" id="otpToggle" aria-label="Mostrar">
              <i class="fa-solid fa-eye"></i>
            </button>
          </div>
          <p class="pwd-modal__error" id="otpError"></p>
          <div id="otpTimer" style="display:none; font-family: 'Share Tech Mono', monospace; font-size: 0.85rem; color: #00f0ff; text-align: center; margin-bottom: 12px; letter-spacing: 0.1em;"></div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button type="button" class="pwd-btn" id="otpSolicitar" style="background: linear-gradient(135deg, rgba(0,240,255,0.15), rgba(0,255,136,0.1)); border-color: #00f0ff; color: #00f0ff; width: 100%;">
              <i class="fa-solid fa-paper-plane"></i> Solicitar código
            </button>
            <div style="display: flex; gap: 10px;">
              <button type="button" class="pwd-btn pwd-btn--ghost" id="otpCancel" style="flex: 1;">Cancelar</button>
              <button type="button" class="pwd-btn pwd-btn--primary" id="otpOk" style="flex: 1;">
                <i class="fa-solid fa-unlock"></i> Aceptar
              </button>
            </div>
          </div>
          <button type="button" class="pwd-modal__close" id="otpClose" aria-label="Cerrar">×</button>
        </div>
      `;
      document.body.appendChild(overlay);
      document.body.classList.add('jcdc-modal-open');

      const input = overlay.querySelector('#otpInput');
      const error = overlay.querySelector('#otpError');
      const ok = overlay.querySelector('#otpOk');
      const cancel = overlay.querySelector('#otpCancel');
      const close = overlay.querySelector('#otpClose');
      const solicitar = overlay.querySelector('#otpSolicitar');
      const timerEl = overlay.querySelector('#otpTimer');
      const otpToggle = overlay.querySelector('#otpToggle');

      let intervalTimer = null;
      let expiresAt = null;
      let cerrado = false;

      setTimeout(function () { input.focus(); }, 80);

      function cerrar(res) {
        if (cerrado) return;
        cerrado = true;
        if (intervalTimer) clearInterval(intervalTimer);
        document.body.classList.remove('jcdc-modal-open');
        overlay.classList.add('pwd-overlay--closing');
        setTimeout(function () {
          if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 200);
        resolve(res);
      }

      function actualizarTimer() {
        if (!expiresAt) return;
        const restante = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        if (restante <= 0) {
          timerEl.textContent = '⏱ Código expirado — solicita otro';
          timerEl.style.color = '#ff3333';
          if (intervalTimer) clearInterval(intervalTimer);
          return;
        }
        const min = Math.floor(restante / 60);
        const seg = String(restante % 60).padStart(2, '0');
        timerEl.style.color = restante < 180 ? '#ffaa00' : '#00f0ff';
        timerEl.textContent = '⏱ Tiempo restante: ' + min + ':' + seg;
      }

      async function solicitarCodigo() {
        if (solicitar.disabled) return;
        solicitar.disabled = true;
        solicitar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
        error.textContent = '';
        error.style.color = '#ff3333';

        var horaRD = parseInt(
          new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Santo_Domingo',
            hour: 'numeric',
            hour12: false
          }).format(new Date()),
          10
        );
        var saludo = (horaRD >= 5 && horaRD < 12) ? 'buenos días'
                   : (horaRD >= 12 && horaRD < 19) ? 'buenas tardes'
                   : 'buenas noches';
        var waMsg = encodeURIComponent(
          'Hola Julio C. Durán Casado, ' + saludo + '. Estoy intentando generar una cotización desde el cotizador de tu sitio web y el sistema me solicita un código de acceso temporal. ¿Podrías facilitármelo, por favor? Muchas gracias.'
        );
        var wa = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.whatsapp) || '10000000000';
        window.open('https://wa.me/' + wa + '?text=' + waMsg, '_blank', 'noopener');

        const apiBase = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.apiBaseUrl) || 'https://jcdcapi.vercel.app';

        try {
          const r = await fetch(apiBase + '/api/solicitar-codigo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          const d = await r.json();

          if (d.ok) {
            expiresAt = Date.now() + (d.expiresIn * 1000);
            timerEl.style.display = 'block';
            actualizarTimer();
            intervalTimer = setInterval(actualizarTimer, 1000);
            error.textContent = '✓ Código enviado. Confírmalo por WhatsApp.';
            error.style.color = '#00ff88';
            if (typeof Toast !== 'undefined') Toast.show('Código solicitado', 'success', 1800);
          } else {
            error.textContent = d.error || 'Error solicitando código';
            error.style.color = '#ff3333';
          }
        } catch (e) {
          error.textContent = 'Error de conexión';
          error.style.color = '#ff3333';
        } finally {
          solicitar.disabled = false;
          solicitar.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Solicitar código';
        }
      }

      async function validarCodigo() {
        if (ok.disabled) return;
        const valor = input.value.trim();
        if (!valor) {
          error.textContent = 'Ingresa un código o clave';
          error.style.color = '#ff3333';
          return;
        }

        const esOTP = /^\d{6}$/.test(valor);
        ok.disabled = true;
        error.textContent = 'Verificando...';
        error.style.color = '#00f0ff';

        const apiBase = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.apiBaseUrl) || 'https://jcdcapi.vercel.app';

        try {
          if (!esOTP) {
            const r = await fetch(apiBase + '/api/validar-admin-key', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clave: valor })
            });
            const d = await r.json();
            if (d.ok && d.admin) {
              try { sessionStorage.setItem('jcdc_admin_cotizador', '1'); } catch (e) {}
              self._loggedInHere = true;
              self.cotizacionUnlocked = true;
              self.facturaUnlocked = true;
              self._tipoAcceso = 'admin';
              if (typeof Toast !== 'undefined') Toast.show('Modo administrador activado', 'success', 1800);
              cerrar(true);
              setTimeout(function () {
                try { self._activarModoAdmin(); } catch (e) {}
                try { self._mostrarBadgeAdmin(); } catch (e) {}
              }, 400);
              return;
            } else {
              error.textContent = '❌ Clave incorrecta';
              error.style.color = '#ff3333';
              input.value = '';
              input.classList.add('pwd-shake');
              setTimeout(function () { input.classList.remove('pwd-shake'); }, 400);
            }
          } else {
            const r = await fetch(apiBase + '/api/validar-codigo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ codigo: valor })
            });
            const d = await r.json();
            if (d.ok) {
              self.cotizacionUnlocked = true;
              self._tipoAcceso = 'client';
              self._expiraEn = Date.now() + (20 * 60 * 1000);
              if (typeof Toast !== 'undefined') Toast.show('Acceso concedido por 20 minutos', 'success', 2000);
              cerrar(true);
              setTimeout(function () {
                try { self._iniciarTimerCliente(); } catch (e) {}
                try { self._mostrarBadgeCliente(); } catch (e) {}
              }, 400);
              return;
            } else {
              error.textContent = d.error || '❌ Código incorrecto o expirado';
              error.style.color = '#ff3333';
              input.value = '';
              input.classList.add('pwd-shake');
              setTimeout(function () { input.classList.remove('pwd-shake'); }, 400);
            }
          }
        } catch (e) {
          error.textContent = 'Error de conexión';
          error.style.color = '#ff3333';
        } finally {
          ok.disabled = false;
        }
      }

      if (otpToggle) {
        otpToggle.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (input.type === 'password') {
            input.type = 'text';
            otpToggle.querySelector('i').className = 'fa-solid fa-eye-slash';
          } else {
            input.type = 'password';
            otpToggle.querySelector('i').className = 'fa-solid fa-eye';
          }
        });
      }

      solicitar.addEventListener('click', solicitarCodigo);
      ok.addEventListener('click', validarCodigo);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); validarCodigo(); }
        if (e.key === 'Escape') cerrar(false);
      });
      cancel.addEventListener('click', function () { cerrar(false); });
      close.addEventListener('click', function () { cerrar(false); });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) cerrar(false);
      });
    });
  },

  _confirmar(mensaje, opciones) {
    opciones = opciones || {};
    const titulo = opciones.titulo || '¿Confirmar acción?';
    const tipo = opciones.tipo || 'info';
    const okLabel = opciones.okLabel || 'Aceptar';
    const cancelLabel = opciones.cancelLabel || 'Cancelar';
    const icono = opciones.icono || (tipo === 'danger' ? 'fa-triangle-exclamation' : tipo === 'warning' ? 'fa-circle-exclamation' : 'fa-circle-question');

    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'jcdc-confirm-overlay';
      overlay.innerHTML =
        '<div class="jcdc-confirm jcdc-confirm--' + tipo + '" role="dialog" aria-modal="true">' +
        '  <div class="jcdc-confirm__icon"><i class="fa-solid ' + icono + '"></i></div>' +
        '  <h3 class="jcdc-confirm__title">' + titulo + '</h3>' +
        '  <p class="jcdc-confirm__msg">' + mensaje + '</p>' +
        '  <div class="jcdc-confirm__actions">' +
        '    <button type="button" class="jcdc-confirm__btn jcdc-confirm__btn--cancel" data-res="0">' + cancelLabel + '</button>' +
        '    <button type="button" class="jcdc-confirm__btn jcdc-confirm__btn--ok" data-res="1">' + okLabel + '</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(overlay);

      function cerrar(res) {
        overlay.classList.add('closing');
        setTimeout(function () { overlay.remove(); }, 200);
        resolve(res);
      }

      overlay.querySelector('[data-res="0"]').addEventListener('click', function () { cerrar(false); });
      overlay.querySelector('[data-res="1"]').addEventListener('click', function () { cerrar(true); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) cerrar(false); });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { document.removeEventListener('keydown', esc); cerrar(false); }
        if (e.key === 'Enter') { document.removeEventListener('keydown', esc); cerrar(true); }
      });
      setTimeout(function () {
        const okBtn = overlay.querySelector('[data-res="1"]');
        if (okBtn) okBtn.focus();
      }, 80);
    });
  },

  _mostrarBadgeAdmin() {
    const self = this;
    const previo = document.getElementById('jcdcStatusBadge');
    if (previo) previo.remove();

    const badge = document.createElement('div');
    badge.id = 'jcdcStatusBadge';
    badge.className = 'jcdc-status-badge jcdc-status-badge--admin';
    badge.innerHTML =
      '<i class="fa-solid fa-user-shield jcdc-status-badge__icon"></i>' +
      '<span class="jcdc-status-badge__text">MODO ADMIN</span>' +
      '<button type="button" class="jcdc-status-badge__btn" id="jcdcBadgeLogout">BLOQUEAR</button>';
    document.body.appendChild(badge);

    const btn = badge.querySelector('#jcdcBadgeLogout');
    btn.addEventListener('click', function () {
      self._confirmar(
        'Se cerrará tu sesión de administrador.',
        { titulo: 'Bloquear', tipo: 'warning', okLabel: 'Sí, bloquear', cancelLabel: 'Atrás', icono: 'fa-lock' }
      ).then(function (ok) {
        if (ok) self._cerrarSesionAdmin();
      });
    });
  },

  _mostrarBadgeCliente() {
    const previo = document.getElementById('jcdcStatusBadge');
    if (previo) previo.remove();

    const badge = document.createElement('div');
    badge.id = 'jcdcStatusBadge';
    badge.className = 'jcdc-status-badge jcdc-status-badge--client';
    badge.innerHTML =
      '<i class="fa-solid fa-user jcdc-status-badge__icon"></i>' +
      '<span class="jcdc-status-badge__text">ACCESO TEMPORAL</span>' +
      '<span class="jcdc-status-badge__timer" id="jcdcBadgeTimer">20:00</span>';
    document.body.appendChild(badge);

    this._actualizarTimerBadge();
  },

  _actualizarTimerBadge() {
    const self = this;
    const badge = document.getElementById('jcdcStatusBadge');
    const el = document.getElementById('jcdcBadgeTimer');
    if (!el || !self._expiraEn || !badge) return;

    const restante = Math.max(0, Math.floor((self._expiraEn - Date.now()) / 1000));
    const min = Math.floor(restante / 60);
    const seg = String(restante % 60).padStart(2, '0');
    el.textContent = min + ':' + seg;

    badge.classList.remove('jcdc-status-badge--ok', 'jcdc-status-badge--warn', 'jcdc-status-badge--danger');
    if (restante <= 180) {
      badge.classList.add('jcdc-status-badge--danger');
      el.style.color = '#ff3333';
    } else if (restante <= 600) {
      badge.classList.add('jcdc-status-badge--warn');
      el.style.color = '#ffee00';
    } else {
      badge.classList.add('jcdc-status-badge--ok');
      el.style.color = '#00ff88';
    }

    if (restante <= 0) {
      clearInterval(self._timerBadge);
      self._timerBadge = null;
      self._cerrarSesionCliente();
    }
  },

  _iniciarTimerCliente() {
    const self = this;
    if (self._timerBadge) clearInterval(self._timerBadge);
    self._timerBadge = setInterval(function () { self._actualizarTimerBadge(); }, 1000);
  },

  _cerrarSesionCliente() {
    const self = this;
    if (self._timerBadge) clearInterval(self._timerBadge);
    self.cotizacionUnlocked = false;
    self._expiraEn = null;
    self._tipoAcceso = null;
    const badge = document.getElementById('jcdcStatusBadge');
    if (badge && badge.parentNode) badge.parentNode.removeChild(badge);

    this._reiniciarWizard();

    if (typeof Toast !== 'undefined') Toast.show('Acceso temporal finalizado', 'info', 2500);
  },

  _activarModoAdmin() {
    const self = this;

    const viejo = document.getElementById('adminLogoutFloat');
    if (viejo) viejo.remove();

    document.querySelectorAll('.admin-logout-float').forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });

    this._actualizarBadgeFactura(true);

    const validezWrap = document.getElementById('repValidezWrap');
    if (validezWrap) validezWrap.style.display = 'block';

    this._mostrarBadgeAdmin();

    if (this.currentStep === 4) {
      this._actualizarBloqueDocumentos();
      this._actualizarBloqueTargetica(this.service === 'reparacion');
    }

    this._reiniciarTimeoutAdmin();

    if (this._adminListeners) {
      this._adminListeners.forEach(function (l) {
        document.removeEventListener(l.evt, l.fn);
      });
    }
    this._adminListeners = [];
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(function (evt) {
      var fn = function () { self._reiniciarTimeoutAdmin(); };
      document.addEventListener(evt, fn);
      self._adminListeners.push({ evt: evt, fn: fn });
    });
  },

  _reiniciarTimeoutAdmin() {
    const self = this;
    if (this._adminTimeout) clearTimeout(this._adminTimeout);
    this._adminTimeout = setTimeout(function () {
      if (self.facturaUnlocked) {
        if (typeof Toast !== 'undefined') Toast.show('Sesión cerrada por inactividad', 'info', 2500);
        self._cerrarSesionAdmin();
      }
    }, 30 * 60 * 1000);
  },

  _reiniciarWizard() {
    this.currentStep = 1;
    this.service = null;
    this.values = {};
    this.extras = {};
    this.reparacion = null;
    this.garantiaSeleccionada = 0;
    this.diasValidez = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.documentos && window.SOPORTE_CONFIG.documentos.cotizacionValidezDias) || 15;
    this.documento = {
      tipoDoc: 'cotizacion',
      estado: 'pagada',
      cliente: { nombre: '', cedula: '', telefono: '', email: '', direccion: '' },
      observaciones: '',
      numero: '',
      fechaEmision: '',
      codigoVC: '',
      timestamp: 0
    };
    this.accesorios = {};
    this.accesoriosVariantes = {};
    this.accesoriosCatActiva = 'all';

    document.querySelectorAll('[data-service]').forEach(function (o) {
      o.classList.remove('checked');
      const inp = o.querySelector('input');
      if (inp) inp.checked = false;
    });
    document.querySelectorAll('[data-extra]').forEach(function (o) {
      o.classList.remove('checked');
      o.style.display = '';
      const inp = o.querySelector('input');
      if (inp) inp.checked = false;
    });

    if (this.els && this.els.steps && this.els.panels && this.els.progressBar) {
      this.renderStepIndicator();
      this.updateNextBtn();
      this.scrollTop();
    }
  },

  _cerrarSesionAdmin() {
    if (this._adminTimeout) clearTimeout(this._adminTimeout);
    if (this._timerBadge) { clearInterval(this._timerBadge); this._timerBadge = null; }
    try { sessionStorage.removeItem('jcdc_admin_cotizador'); } catch (e) {}
    this._loggedInHere = false;
    if (window.auth) {
      window.auth.signOut().catch(function (e) { console.warn(e); });
    }

    this.facturaUnlocked = false;
    this.cotizacionUnlocked = false;
    this._tipoAcceso = null;
    this._expiraEn = null;

    document.querySelectorAll('.admin-logout-float').forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });

    const badge = document.getElementById('jcdcStatusBadge');
    if (badge && badge.parentNode) badge.parentNode.removeChild(badge);

    this._actualizarBadgeFactura(false);

    const validezWrap = document.getElementById('repValidezWrap');
    if (validezWrap) validezWrap.style.display = 'none';

    this._reiniciarWizard();

    if (typeof Toast !== 'undefined') Toast.show('Sesión cerrada', 'info', 1800);
  },

  _actualizarBadgeFactura(esAdmin) {
    const btnFactura = document.querySelector('.rep-doc-btn[data-tipodoc="factura"]');
    if (!btnFactura) return;

    const badge = btnFactura.querySelector('.rep-lock-badge');
    const small = btnFactura.querySelector('small');

    if (esAdmin) {
      btnFactura.classList.add('rep-doc-btn--admin');
      btnFactura.classList.remove('rep-doc-btn--locked');
      if (small) small.textContent = 'Acceso autorizado · puedes facturar';

      if (badge) {
        badge.className = 'rep-lock-badge rep-lock-badge--admin';
        badge.innerHTML = '<i class="fa-solid fa-user-shield"></i> ADMIN · CLIC PARA SALIR';
        badge.style.cursor = 'pointer';
        badge.style.display = '';

        if (!badge._jcdcHandler) {
          badge._jcdcHandler = function (e) {
            e.stopPropagation();
            e.preventDefault();
            QuoteWizard._confirmar(
              'Se cerrará tu sesión de administrador. Tendrás que volver a iniciar sesión para generar facturas.',
              { titulo: 'Bloquear sesión', tipo: 'warning', okLabel: 'Sí, bloquear', cancelLabel: 'Atrás', icono: 'fa-lock' }
            ).then(function (ok) {
              if (ok) QuoteWizard._cerrarSesionAdmin();
            });
          };
          badge.addEventListener('click', badge._jcdcHandler);
        }
      }
    } else {
      btnFactura.classList.remove('rep-doc-btn--admin');
      btnFactura.classList.add('rep-doc-btn--locked');
      if (small) small.textContent = 'Requiere contraseña · solo personal autorizado';

      if (badge) {
        if (badge._jcdcHandler) {
          badge.removeEventListener('click', badge._jcdcHandler);
          badge._jcdcHandler = null;
        }
        badge.className = 'rep-lock-badge';
        badge.innerHTML = '<i class="fa-solid fa-lock"></i> PRIVADO';
        badge.style.cursor = '';
        badge.style.display = '';
      }
    }
  },

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

    const labelSpan = this.els.next.querySelector('span');
    if (labelSpan) {
      if (this.currentStep === 3) {
        labelSpan.textContent = 'GENERAR';
      } else {
        labelSpan.textContent = 'SIGUIENTE';
      }
    }
  },

  async next() {
    if (this.currentStep >= this.maxStep) return;
    if (this.currentStep === 1 && !this.service) {
      if (typeof Toast !== 'undefined') Toast.show('Selecciona un servicio', 'info', 1800);
      return;
    }

    if (this.currentStep === 1 && this.service) {
      try {
        if (this.service === 'reparacion') {
          this.renderReparacionFields();
        } else if (this.service === 'accesorios') {
          this.renderAccesoriosFields();
        } else {
          this.renderFields();
        }
      } catch (e) {
        console.error('[JCDC next] ERROR al renderizar "' + this.service + '":', e);
        if (typeof Toast !== 'undefined') Toast.show('Error interno — revisa F12 → Console', 'error', 3500);
        return;
      }
    }

    // ✅ OBLIGAR A SELECCIONAR EQUIPO EN REPARACIÓN
    if (this.currentStep === 2 && this.service === 'reparacion') {
      if (!this.reparacion || !this.reparacion.equipo) {
        if (typeof Toast !== 'undefined') Toast.show('Debes seleccionar un tipo de equipo antes de avanzar', 'warning', 2500);
        return;
      }
    }

    if (this.currentStep === 3) {
      const confirmado = await this._confirmarGeneracion();
      if (!confirmado) return;
      await this._generarTodo();
    }

    this.currentStep++;
    if (this.currentStep === 4) this.renderSummary();
    this.renderStepIndicator();
    this.updateNextBtn();
    this.scrollTop();

    // ✅ Actualizar total estimado según el paso actual
    if (this.currentStep === 3) {
      const self = this;
      setTimeout(function () { self._updateExtrasTotal(); }, 50);
    }
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

  renderFields() {
    const cfg = this.services[this.service];
    if (!cfg) return;
    this.els.scopeTitle.textContent = 'Alcance · ' + cfg.label;

    this._svcInjectStyles();

    let html = '';

    html += this._renderDocTypeBlock();

    if (cfg.include && cfg.include.length) {
      html += '<div class="rep-block">';
      html += '  <h4 class="rep-block__title"><i class="fa-solid fa-circle-check"></i> QUÉ INCLUYE ESTE SERVICIO</h4>';
      html += '  <ul class="svc-include-list">';
      cfg.include.forEach(function (item) {
        html += '<li><i class="fa-solid fa-check"></i> ' + item + '</li>';
      });
      html += '  </ul>';
      html += '</div>';
    }

    if (cfg.fields && cfg.fields.length) {
      html += '<div class="rep-block">';
      html += '  <h4 class="rep-block__title"><i class="fa-solid fa-sliders"></i> AJUSTA EL ALCANCE</h4>';
      html += '  <p class="rep-block__hint">Ajusta las cantidades con los controles. El total se recalcula en vivo.</p>';
      const _rateDOP = this.RATE_DOP;
      cfg.fields.forEach(function (f) {
        const val = this.values[f.id];
        const _unitDOP = Math.round((f.unit || 0) * _rateDOP);
        const _sufijo = (f.unitLabel || '').replace(/^\$[\d.]+\s*/, '');
        const _unitLabelDOP = 'RD$' + _unitDOP.toLocaleString('es-DO') + (_sufijo ? ' ' + _sufijo : '');
        html += '<div class="quote-field" data-field="' + f.id + '" style="margin-top:12px;">';
        html += '  <div class="quote-field__head">';
        html += '    <span class="quote-field__label">' + f.label + '</span>';
        html += '    <span class="quote-field__rate">' + _unitLabelDOP + '</span>';
        html += '  </div>';
        if (f.hint) {
          html += '  <div class="svc-field-hint">' + f.hint + '</div>';
        }
        html += '  <div class="quote-field__row">';
        html += '    <button type="button" class="quote-step-btn" data-step-btn="' + f.id + '" data-dir="-1" aria-label="Disminuir">−</button>';
        html += '    <input type="range" class="quote-range" min="' + f.min + '" max="' + f.max + '" step="1" value="' + val + '" data-field-slider="' + f.id + '" data-min="' + f.min + '" data-max="' + f.max + '">';
        html += '    <span class="quote-field__val" data-field-val="' + f.id + '">' + val + '</span>';
        html += '    <button type="button" class="quote-step-btn" data-step-btn="' + f.id + '" data-dir="1" aria-label="Aumentar">+</button>';
        html += '  </div>';
        html += '</div>';
      }.bind(this));
      html += '</div>';
    }

    html += this._renderClienteBlock();
    html += this._renderGarantiaBlock();
    html += this._renderValidezBlock();
    html += this._renderObservacionesBlock();

    html += '<div class="rep-total" id="stdTotal">';
    html += '  <span class="rep-total__label">TOTAL ESTIMADO:</span>';
    html += '  <span class="rep-total__value" id="stdTotalValue">RD$0</span>';
    html += '</div>';
    html += '<div class="svc-total-breakdown" id="stdTotalBreakdown"></div>';

    this.els.fields.innerHTML = html;

    const self = this;
    this.els.fields.querySelectorAll('[data-field-slider]').forEach(function (slider) {
      const id = slider.dataset.fieldSlider;
      const valEl = self.els.fields.querySelector('[data-field-val="' + id + '"]');
      slider.addEventListener('input', function () {
        self.values[id] = parseInt(slider.value, 10);
        if (valEl) valEl.textContent = slider.value;
        self._updateStdTotal();
      });
    });

    this.els.fields.querySelectorAll('[data-step-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.dataset.stepBtn;
        const dir = parseInt(btn.dataset.dir, 10);
        const slider = self.els.fields.querySelector('[data-field-slider="' + id + '"]');
        if (!slider) return;
        const min = parseInt(slider.dataset.min, 10);
        const max = parseInt(slider.dataset.max, 10);
        let current = parseInt(slider.value, 10) || 0;
        let next = current + dir;
        if (next < min) next = min;
        if (next > max) next = max;
        slider.value = next;
        self.values[id] = next;
        const valEl = self.els.fields.querySelector('[data-field-val="' + id + '"]');
        if (valEl) valEl.textContent = next;
        self._updateStdTotal();
      });
    });

    this._attachGarantiaHandlers();
    this._attachValidezHandlers();
    this._updateStdTotal();
  },

  _generarNumeroDocumento() {
    const doc = this.documento;
    const prefijo = (doc.tipoDoc === 'factura') ? 'FAC' : 'COT';

    if (doc.numero && doc.numero.indexOf(prefijo + '-') === 0) {
      return doc.numero;
    }

    const now = new Date();
    const ymd = now.getFullYear()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0');

    let contador = 1;
    try {
      const counters = JSON.parse(localStorage.getItem('jcdc_doc_counter') || '{}');
      contador = (counters[ymd] || 0) + 1;
      counters[ymd] = contador;
      localStorage.setItem('jcdc_doc_counter', JSON.stringify(counters));
    } catch (e) {
      contador = Math.floor(Math.random() * 900) + 100;
    }

    doc.numero = prefijo + '-' + ymd + '-' + String(contador).padStart(3, '0');
    doc.fechaEmision = now.toISOString().slice(0, 10);
    doc.timestamp = now.getTime();
    return doc.numero;
  },

  _renderDocTypeBlock() {
    const self = this;
    const doc = this.documento;
    const esAdmin = (this._tipoAcceso === 'admin' || this.facturaUnlocked);
    const esCot = doc.tipoDoc === 'cotizacion';
    const esFac = doc.tipoDoc === 'factura';

    let html = '<div class="rep-doc-type" id="repDocType">';

    html += '<button type="button" class="rep-doc-btn' + (esCot ? ' active' : '') + '" data-tipodoc="cotizacion">';
    html += '  <i class="fa-solid fa-file-invoice"></i> COTIZACIÓN';
    html += '  <small>Documento informativo · válido ' + this.diasValidez + ' días</small>';
    html += '</button>';

    html += '<button type="button" class="rep-doc-btn' + (esFac ? ' active' : '') + (esAdmin ? ' rep-doc-btn--admin' : ' rep-doc-btn--locked') + '" data-tipodoc="factura">';
    html += '  <i class="fa-solid fa-file-invoice-dollar"></i> FACTURA ';
    if (esAdmin) {
      html += '  <span class="rep-lock-badge rep-lock-badge--admin"><i class="fa-solid fa-user-shield"></i> ADMIN</span>';
      html += '  <small>Acceso autorizado · puedes facturar</small>';
    } else {
      html += '  <span class="rep-lock-badge"><i class="fa-solid fa-lock"></i> PRIVADO</span>';
      html += '  <small>Requiere contraseña · solo personal autorizado</small>';
    }
    html += '</button>';
    html += '</div>';

    html += '<div class="rep-estado" id="repEstadoWrap" style="display:' + (esFac ? 'block' : 'none') + ';">';
    html += '  <label class="rep-estado__label">Estado de la factura:</label>';
    html += '  <div class="rep-estado__opts">';
    html += '    <button type="button" class="rep-estado-btn' + (doc.estado === 'pagada' ? ' active' : '') + '" data-estado="pagada"><i class="fa-solid fa-circle-check"></i> PAGADA</button>';
    html += '    <button type="button" class="rep-estado-btn' + (doc.estado === 'no-pagada' ? ' active' : '') + '" data-estado="no-pagada"><i class="fa-solid fa-circle-xmark"></i> NO PAGADA</button>';
    html += '  </div>';
    html += '</div>';

    setTimeout(function () {
      document.querySelectorAll('#repDocType .rep-doc-btn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          const tipo = btn.dataset.tipodoc;
          if (tipo === 'cotizacion') {
            self.cotizacionUnlocked = true;
          }
          if (tipo === 'factura') {
            if (self._tipoAcceso === 'admin' || self.facturaUnlocked) {
              // ya autorizado
            } else if (self._tipoAcceso === 'client') {
              if (typeof Toast !== 'undefined') Toast.show('Factura solo para administrador', 'info', 2500);
              return;
            } else {
              const ok = await self.pedirPasswordFactura();
              if (!ok) return;
              self._tipoAcceso = 'admin';
            }
          }
          document.querySelectorAll('#repDocType .rep-doc-btn').forEach(function (b) {
            b.classList.remove('active');
            if (b.dataset.tipodoc === 'factura' && !self.facturaUnlocked) {
              b.classList.add('rep-doc-btn--locked');
              b.classList.remove('rep-doc-btn--admin');
            }
          });
          btn.classList.add('active');
          if (self.documento.tipoDoc !== tipo) {
            self.documento.numero = '';
            self.documento.codigoVC = '';
            self.documento.fechaEmision = '';
          }
          self.documento.tipoDoc = tipo;
          const estadoWrap = document.getElementById('repEstadoWrap');
          if (estadoWrap) estadoWrap.style.display = (tipo === 'factura') ? 'block' : 'none';
          const validezWrap = document.getElementById('repValidezWrap');
          if (validezWrap) {
            const esAdm = (self._tipoAcceso === 'admin' || self.facturaUnlocked);
            validezWrap.style.display = (tipo === 'cotizacion' && esAdm) ? 'block' : 'none';
          }
        });
      });
      document.querySelectorAll('#repEstadoWrap .rep-estado-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.querySelectorAll('#repEstadoWrap .rep-estado-btn').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          self.documento.estado = btn.dataset.estado;
        });
      });
    }, 0);

    return html;
  },

  _renderClienteBlock() {
    const cli = this.documento.cliente;
    let html = '<div class="rep-block">';
    html += '  <h4 class="rep-block__title"><i class="fa-solid fa-user"></i> Datos del cliente</h4>';
    html += '  <div class="rep-grid-2">';
    html += '    <div class="tool-field"><label for="genClienteNombre">Nombre completo *</label>';
    html += '      <input type="text" id="genClienteNombre" class="tool-input" placeholder="Ej: Juan Pérez" value="' + (cli.nombre || '') + '"></div>';
    html += '    <div class="tool-field"><label for="genClienteCedula">Cédula / RNC</label>';
    html += '      <input type="text" id="genClienteCedula" class="tool-input" placeholder="000-0000000-0" value="' + (cli.cedula || '') + '"></div>';
    html += '    <div class="tool-field"><label for="genClienteTelefono">Teléfono</label>';
    html += '      <input type="tel" id="genClienteTelefono" class="tool-input" placeholder="809-000-0000" value="' + (cli.telefono || '') + '"></div>';
    html += '    <div class="tool-field"><label for="genClienteEmail">Email</label>';
    html += '      <input type="email" id="genClienteEmail" class="tool-input" placeholder="cliente@email.com" value="' + (cli.email || '') + '"></div>';
    html += '  </div>';
    html += '  <div class="tool-field" style="margin-top:var(--space-sm);"><label for="genClienteDireccion">Dirección</label>';
    html += '    <input type="text" id="genClienteDireccion" class="tool-input" placeholder="Dirección" value="' + (cli.direccion || '') + '"></div>';
    html += '</div>';

    const self = this;
    setTimeout(function () {
      const map = { genClienteNombre: 'nombre', genClienteCedula: 'cedula', genClienteTelefono: 'telefono', genClienteEmail: 'email', genClienteDireccion: 'direccion' };
      Object.keys(map).forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function (e) { self.documento.cliente[map[id]] = e.target.value; });
      });
    }, 0);

    return html;
  },

  _renderObservacionesBlock() {
    const self = this;
    let html = '<div class="rep-block">';
    html += '  <h4 class="rep-block__title"><i class="fa-solid fa-comment"></i> Observaciones</h4>';
    html += '  <textarea id="genObservaciones" class="tool-input" rows="3" placeholder="Detalles, condiciones, notas...">' + (this.documento.observaciones || '') + '</textarea>';
    html += '</div>';
    setTimeout(function () {
      const el = document.getElementById('genObservaciones');
      if (el) el.addEventListener('input', function (e) { self.documento.observaciones = e.target.value; });
    }, 0);
    return html;
  },

  _renderGarantiaBlock() {
    const tramos = this.garantiaTramos;
    let html = '';
    html += '<div class="rep-block">';
    html += '  <h4 class="rep-block__title"><i class="fa-solid fa-shield-halved"></i> Garantía del servicio</h4>';
    html += '  <p class="rep-block__hint">A mayor garantía, mayor cobertura. El porcentaje se suma al total.</p>';
    html += '  <div class="rep-garantia__opts">';
    tramos.forEach(function (t) {
      const active = (t.dias === QuoteWizard.garantiaSeleccionada) ? ' active' : '';
      const pctTxt = t.pct > 0 ? '<span class="pct">+' + Math.round(t.pct * 100) + '%</span>' : '';
      html += '<button type="button" class="rep-garantia-btn' + active + '" data-garantia="' + t.dias + '">';
      if (t.dias === 0) html += '<i class="fa-solid fa-ban"></i> ';
      html += t.label + ' ' + pctTxt;
      html += '</button>';
    });
    html += '  </div>';
    html += '</div>';
    return html;
  },

  _renderValidezBlock() {
    const cfg = window.SOPORTE_CONFIG || {};
    const opts = (cfg.documentos && cfg.documentos.cotizacionValidezOpciones) || [15, 30, 45, 60];
    const current = this.diasValidez;
    const show = (this.facturaUnlocked || this._tipoAcceso === 'admin');

    let html = '<div class="rep-block rep-validez" id="repValidezWrap" style="display:' + (show ? 'block' : 'none') + ';">';
    html += '  <h4 class="rep-block__title"><i class="fa-solid fa-calendar-check"></i> Validez de la cotización <span class="rep-validez__badge">SOLO ADMIN</span></h4>';
    html += '  <p class="rep-block__hint">Días que la cotización permanece vigente desde su emisión.</p>';
    html += '  <div class="rep-validez__opts">';
    opts.forEach(function (d) {
      const active = (d === current) ? ' active' : '';
      html += '<button type="button" class="rep-validez__btn' + active + '" data-validez="' + d + '">' + d + ' días</button>';
    });
    html += '  </div>';
    html += '</div>';
    return html;
  },

  _attachGarantiaHandlers() {
    const self = this;
    document.querySelectorAll('.rep-garantia-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.rep-garantia-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self.garantiaSeleccionada = parseInt(btn.dataset.garantia, 10);
        if (self.reparacion) self.reparacion.garantia = self.garantiaSeleccionada;

        // ✅ ACTUALIZAR EL TOTAL VISUAL EN TIEMPO REAL
        if (self.service === 'reparacion') self.updateRepTotal();
        else if (self.service === 'accesorios') self._updateAccTotal();
        else self._updateStdTotal();
      });
    });
  },

  _attachValidezHandlers() {
    const self = this;
    document.querySelectorAll('.rep-validez__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.rep-validez__btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        const dias = parseInt(btn.dataset.validez, 10);
        self.diasValidez = dias;
        if (self.reparacion) {
          self.reparacion.diasValidez = dias;
          const nuevaVenc = new Date(new Date(self.reparacion.fechaEmision).getTime() + dias * 24 * 60 * 60 * 1000);
          self.reparacion.fechaVencimiento = nuevaVenc.toISOString().slice(0, 10);
        }
        const smallCot = document.querySelector('.rep-doc-btn[data-tipodoc="cotizacion"] small');
        if (smallCot) smallCot.textContent = 'Documento informativo · válido ' + dias + ' días';
      });
    });
  },

  // ============================================
  // RENDER · Accesorios y Repuestos
  // ============================================
  renderAccesoriosFields() {
    const cfg = window.SOPORTE_CONFIG;
    if (!cfg || !cfg.catalogoAccesorios) {
      this.els.fields.innerHTML = '<p style="text-align:center;color:var(--neon-red);">Error: falta el catálogo de accesorios.</p>';
      return;
    }

    this.els.scopeTitle.textContent = 'Selecciona los accesorios o repuestos';
    this._accInjectStyles();

    const self = this;
    const catActiva = this.accesoriosCatActiva || 'all';

    let html = '';

    // ✅ TIPO DE DOCUMENTO PRIMERO
    html += this._renderDocTypeBlock();

    html += '<div class="rep-block">';
    html += '  <h4 class="rep-block__title"><i class="fa-solid fa-plug"></i> Productos disponibles</h4>';
    html += '  <p class="rep-block__hint">Elige el tamaño/variante con el desplegable y ajusta la cantidad con + / −. Solo se suman los que tengan cantidad mayor a 0.</p>';
    html += '</div>';

    html += '<div class="acc-filters" id="accFilters">';
    html += '<button type="button" class="acc-filter' + (catActiva === 'all' ? ' active' : '') + '" data-cat="all"><i class="fa-solid fa-layer-group"></i> Todos</button>';
    cfg.catalogoAccesorios.forEach(function (cat) {
      html += '<button type="button" class="acc-filter' + (catActiva === cat.cat ? ' active' : '') + '" data-cat="' + cat.cat + '"><i class="fa-solid ' + (cat.icon || 'fa-box') + '"></i> ' + cat.label + '</button>';
    });
    html += '</div>';

    self.accesoriosVariantes = self.accesoriosVariantes || {};
    cfg.catalogoAccesorios.forEach(function (cat) {
      cat.families.forEach(function (fam) {
        if (self.accesoriosVariantes[fam.id] === undefined) {
          self.accesoriosVariantes[fam.id] = '';
        }
      });
    });

    html += '<div class="acc-grid" id="accGrid">';
    cfg.catalogoAccesorios.forEach(function (cat) {
      cat.families.forEach(function (fam) {
        const selId = self.accesoriosVariantes[fam.id];
        const sel = selId ? fam.variants.find(function (v) { return v.id === selId; }) : null;
        const qty = sel ? (parseInt(self.accesorios[sel.id], 10) || 0) : 0;

        html += '<div class="acc-item' + (qty > 0 ? ' acc-item--on' : '') + '" data-cat="' + cat.cat + '" data-family="' + fam.id + '">';
        html += '  <div class="acc-item__head">';
        html += '    <div class="acc-item__name-wrap">';
        html += '      <span class="acc-item__name">' + fam.label + '</span>';
        html += '      <span class="acc-qty" data-acc-qty="' + fam.id + '" title="Cantidad: ' + qty + '">Cant: ' + qty + '</span>';
        html += '    </div>';
        html += '    <span class="acc-item__price" data-acc-price="' + fam.id + '">' + (sel ? 'RD$' + sel.precio.toLocaleString('es-DO') : 'RD$0') + '</span>';
        html += '  </div>';
        html += '  <div class="acc-item__row">';
        html += '    <button type="button" class="acc-btn" data-acc-minus="' + fam.id + '"' + (sel && qty > 0 ? '' : ' disabled') + ' aria-label="Disminuir">−</button>';
        html += '    <select class="acc-variant" data-acc-variant="' + fam.id + '">';
        html += '      <option value=""' + (!sel ? ' selected' : '') + '>— Seleccionar —</option>';
        fam.variants.forEach(function (v) {
          const isSel = (sel && v.id === sel.id) ? ' selected' : '';
          html += '<option value="' + v.id + '" data-precio="' + v.precio + '"' + isSel + '>' + v.label + ' — RD$' + v.precio.toLocaleString('es-DO') + '</option>';
        });
        html += '    </select>';
        html += '    <button type="button" class="acc-btn" data-acc-plus="' + fam.id + '"' + (sel ? '' : ' disabled') + ' aria-label="Aumentar">+</button>';
        html += '  </div>';
        html += '</div>';
      });
    });
    html += '</div>';

    html += this._renderClienteBlock();
    html += this._renderGarantiaBlock();
    html += this._renderValidezBlock();
    html += this._renderObservacionesBlock();

    html += '<div class="rep-total" id="accTotal">';
    html += '  <span class="rep-total__label">TOTAL ESTIMADO:</span>';
    html += '  <span class="rep-total__value" id="accTotalValue">RD$0</span>';
    html += '</div>';

    this.els.fields.innerHTML = html;

    if (catActiva !== 'all') {
      document.querySelectorAll('.acc-item').forEach(function (el) {
        if (el.dataset.cat !== catActiva) el.style.display = 'none';
      });
    }

    document.querySelectorAll('.acc-filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const cat = btn.dataset.cat;
        self.accesoriosCatActiva = cat;
        document.querySelectorAll('.acc-filter').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        document.querySelectorAll('.acc-item').forEach(function (el) {
          el.style.display = (cat === 'all' || el.dataset.cat === cat) ? '' : 'none';
        });
      });
    });

    function refreshFamily(famId) {
      const item = document.querySelector('.acc-item[data-family="' + famId + '"]');
      if (!item) return;
      const selId = self.accesoriosVariantes[famId];
      let qty = 0;
      if (selId) qty = parseInt(self.accesorios[selId], 10) || 0;

      const qtyEl = item.querySelector('[data-acc-qty]');
      if (qtyEl) {
        qtyEl.textContent = 'Cant: ' + qty;
        qtyEl.title = 'Cantidad: ' + qty;
      }

      const plusBtn = item.querySelector('[data-acc-plus]');
      if (plusBtn) plusBtn.disabled = !selId;

      const minusBtn = item.querySelector('[data-acc-minus]');
      if (minusBtn) minusBtn.disabled = !selId || qty <= 0;

      item.classList.toggle('acc-item--on', qty > 0);
      self._updateAccTotal();
    }

    document.querySelectorAll('[data-acc-variant]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        const famId = sel.dataset.accVariant;
        const opt = sel.options[sel.selectedIndex];
        const prevVal = self.accesoriosVariantes[famId];
        
        // ✅ FIX: Borrar la cantidad de la variante anterior si cambiamos a otra
        if (prevVal && prevVal !== opt.value) {
          delete self.accesorios[prevVal];
        }

        self.accesoriosVariantes[famId] = opt.value || '';
        
        const precioEl = document.querySelector('[data-acc-price="' + famId + '"]');
        if (precioEl) {
          precioEl.textContent = opt.value ? 'RD$' + parseInt(opt.dataset.precio, 10).toLocaleString('es-DO') : 'RD$0';
        }

        // ✅ AUTO-INCREMENTAR AL SELECCIONAR
        if (opt.value) {
          if (!self.accesorios[opt.value]) {
            self.accesorios[opt.value] = 1;
          }
        }

        refreshFamily(famId);
      });
    });

    document.querySelectorAll('[data-acc-plus]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const famId = btn.dataset.accPlus;
        const selId = self.accesoriosVariantes[famId];
        if (!selId) return;
        self.accesorios[selId] = (parseInt(self.accesorios[selId], 10) || 0) + 1;
        refreshFamily(famId);
      });
    });

    document.querySelectorAll('[data-acc-minus]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const famId = btn.dataset.accMinus;
        const selId = self.accesoriosVariantes[famId];
        if (!selId) return;
        const cur = parseInt(self.accesorios[selId], 10) || 0;
        if (cur <= 1) {
          delete self.accesorios[selId];
        } else {
          self.accesorios[selId] = cur - 1;
        }
        refreshFamily(famId);
      });
    });

    this._attachGarantiaHandlers();
    this._attachValidezHandlers();

    if (this.facturaUnlocked || this._tipoAcceso === 'admin') {
      this._actualizarBadgeFactura(true);
      const vw = document.getElementById('repValidezWrap');
      if (vw) vw.style.display = 'block';
    }

    this._updateAccTotal();
  },

  _findFamilyById(famId) {
    const cfg = window.SOPORTE_CONFIG;
    if (!cfg || !cfg.catalogoAccesorios) return null;
    let found = null;
    cfg.catalogoAccesorios.forEach(function (cat) {
      cat.families.forEach(function (fam) {
        if (fam.id === famId) found = fam;
      });
    });
    return found;
  },

  _updateAccTotal() {
    const self = this;
    const cfg = window.SOPORTE_CONFIG;
    if (!cfg || !cfg.catalogoAccesorios) return;
    
    const preciosMap = {};
    cfg.catalogoAccesorios.forEach(function (cat) {
      cat.families.forEach(function (fam) {
        fam.variants.forEach(function (v) {
          preciosMap[v.id] = Number(v.precio) || 0;
        });
      });
    });

    let baseTotal = 0;
    const acc = self.accesorios || {};
    Object.keys(acc).forEach(function (id) {
      const qty = parseInt(acc[id], 10) || 0;
      if (qty > 0) baseTotal += qty * (preciosMap[id] || 0);
    });

    const tramo = self.garantiaTramos.find(function(t) { return t.dias === self.garantiaSeleccionada; });
    let garantiaAmount = 0;
    if (tramo && tramo.pct > 0) {
      garantiaAmount = Math.round(baseTotal * tramo.pct);
    }

    const total = baseTotal + garantiaAmount;
    const el = document.getElementById('accTotalValue');
    if (el) el.textContent = 'RD$' + total.toLocaleString('es-DO');
  },

  // ============================================
  // RENDER · Reparación Técnica
  // ============================================
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
      contador = Math.floor(Math.random() * 900) + 100;
    }
    const numDoc = 'COT-' + hoy + '-' + String(contador).padStart(3, '0');
    const diasValidez = this.diasValidez || ((cfg.documentos && cfg.documentos.cotizacionValidezDias) || 15);
    const venc = new Date(now.getTime() + diasValidez * 24 * 60 * 60 * 1000);

    this.reparacion = {
      equipo: '',
      marca: '',
      modelo: '',
      problemas: [],
      descripcion: '',
      tipoDoc: 'cotizacion',
      estado: 'pagada',
      garantia: this.garantiaSeleccionada,
      numero: numDoc,
      fechaEmision: now.toISOString().slice(0, 10),
      fechaVencimiento: venc.toISOString().slice(0, 10),
      diasValidez: diasValidez,
      codigoVerificacion: '',
      timestamp: now.getTime(),
      cliente: { nombre: '', cedula: '', telefono: '', email: '', direccion: '' }
    };

    const self = this;

    let html = '';

    // Tipo documento
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

    // Estado factura
    html += '<div class="rep-estado" id="repEstadoWrap" style="display:none;">';
    html += '  <label class="rep-estado__label">Estado de la factura:</label>';
    html += '  <div class="rep-estado__opts">';
    html += '    <button type="button" class="rep-estado-btn active" data-estado="pagada"><i class="fa-solid fa-circle-check"></i> PAGADA</button>';
    html += '    <button type="button" class="rep-estado-btn" data-estado="no-pagada"><i class="fa-solid fa-circle-xmark"></i> NO PAGADA</button>';
    html += '  </div>';
    html += '</div>';

    // Cliente
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
    html += '  <div class="rep-problems" id="repProblems" style="display:none;">';
    cfg.problemas.forEach(function (p) {
      html += '<label class="rep-problem" data-cat="' + p.cat + '" data-problema="' + p.id + '">';
      html += '  <input type="checkbox" value="' + p.id + '" data-precio="' + p.precio + '">';
      html += '  <span class="rep-problem__name">' + p.label + '</span>';
      html += '  <span class="rep-problem__price">RD$' + p.precio.toLocaleString('es-DO') + '</span>';
      html += '</label>';
    });
    html += '  </div>';
    html += '</div>';

    html += this._renderGarantiaBlock();
    html += this._renderValidezBlock();

    // Observaciones
    html += '<div class="rep-block">';
    html += '  <h4 class="rep-block__title"><i class="fa-solid fa-comment"></i> Observaciones</h4>';
    html += '  <textarea id="repDesc" class="tool-input" rows="3" placeholder="Ej: Impresora Epson L3250 regaba tinta, se desarmó, lavó y armó completa..."></textarea>';
    html += '</div>';

    html += '<div class="rep-total" id="repTotal">';
    html += '  <span class="rep-total__label">TOTAL ESTIMADO:</span>';
    html += '  <span class="rep-total__value" id="repTotalValue">RD$0</span>';
    html += '</div>';

    this.els.fields.innerHTML = html;

    if (self.facturaUnlocked || self._tipoAcceso === 'admin') {
      self._actualizarBadgeFactura(true);
      const vw = document.getElementById('repValidezWrap');
      if (vw) vw.style.display = 'block';
    }

    document.querySelectorAll('.rep-doc-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const tipo = btn.dataset.tipodoc;

        if (tipo === 'cotizacion') {
          if (!self.cotizacionUnlocked) {
            const ok = await self.pedirCodigoOTP();
            if (!ok) return;
          }
        }

        if (tipo === 'factura') {
          if (self._tipoAcceso === 'admin' || self.facturaUnlocked) {
            // ya autorizado
          } else if (self._tipoAcceso === 'client') {
            if (typeof Toast !== 'undefined') Toast.show('Factura solo disponible para administrador', 'info', 2500);
            return;
          } else {
            const ok = await self.pedirPasswordFactura();
            if (!ok) return;
            self._tipoAcceso = 'admin';
          }
        }

        document.querySelectorAll('.rep-doc-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        if (self.reparacion.tipoDoc !== tipo) {
          const prefijoActual = (self.reparacion.numero || '').slice(0, 3);
          const prefijoNuevo = (tipo === 'factura') ? 'FAC' : 'COT';
          if (prefijoActual !== prefijoNuevo) {
            const partes = (self.reparacion.numero || '').split('-');
            if (partes.length >= 2) {
              self.reparacion.numero = prefijoNuevo + '-' + partes.slice(1).join('-');
            }
          }
        }

        self.reparacion.tipoDoc = tipo;

        if (tipo === 'factura') {
          btn.classList.remove('rep-doc-btn--locked');
        } else if (!self.facturaUnlocked) {
          const fb = document.querySelector('.rep-doc-btn[data-tipodoc="factura"]');
          if (fb) fb.classList.add('rep-doc-btn--locked');
        }

        const estadoWrap = document.getElementById('repEstadoWrap');
        if (estadoWrap) estadoWrap.style.display = (tipo === 'factura') ? 'block' : 'none';

        const validezWrap = document.getElementById('repValidezWrap');
        if (validezWrap) {
          const esAdmin = (self._tipoAcceso === 'admin' || self.facturaUnlocked);
          validezWrap.style.display = (tipo === 'cotizacion' && esAdmin) ? 'block' : 'none';
        }
      });
    });

    document.querySelectorAll('.rep-estado-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.rep-estado-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self.reparacion.estado = btn.dataset.estado;
      });
    });

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

    document.querySelectorAll('.rep-pill[data-equipo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.rep-pill').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        self.reparacion.equipo = btn.dataset.equipo;
        self.loadMarcasByEquipo(btn.dataset.equipo);
        self.filterProblemsByEquipo(btn.dataset.equipo);
        
        const problemsContainer = document.getElementById('repProblems');
        if (problemsContainer) problemsContainer.style.display = 'grid';

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

    this._attachGarantiaHandlers();
    this._attachValidezHandlers();

    if (self.facturaUnlocked && window.auth && window.auth.currentUser) {
      self._activarModoAdmin();
    }
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

  _accInjectStyles() {
    if (document.getElementById('acc-custom-styles')) return;
    const s = document.createElement('style');
    s.id = 'acc-custom-styles';
    s.textContent = `
      .acc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 15px; }
      .acc-item {
        background: linear-gradient(145deg, rgba(20, 20, 30, 0.9), rgba(10, 10, 15, 0.95));
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px; padding: 16px; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 14px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
      }
      .acc-item:hover { border-color: rgba(0, 240, 255, 0.3); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); transform: translateY(-2px); }
      .acc-item--on {
        border-color: rgba(0, 255, 136, 0.5);
        box-shadow: 0 8px 24px rgba(0, 255, 136, 0.15);
        background: linear-gradient(145deg, rgba(0, 255, 136, 0.05), rgba(10, 10, 15, 0.95));
      }
      .acc-item--on::before {
        content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px;
        background: linear-gradient(90deg, transparent, #00ff88, transparent);
      }
      .acc-item__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
      .acc-item__name-wrap { display: flex; flex-direction: column; gap: 6px; }
      .acc-item__name { font-family: 'Rajdhani', sans-serif; font-size: 1.05rem; font-weight: 700; color: #fff; line-height: 1.3; }
      .acc-qty {
        font-family: 'Share Tech Mono', monospace; font-size: 0.75rem; background: rgba(255, 255, 255, 0.05);
        color: #8b93a7; padding: 2px 8px; border-radius: 20px; display: inline-flex; align-items: center;
        justify-content: center; border: 1px solid transparent; width: max-content; transition: all 0.3s;
      }
      .acc-item--on .acc-qty { background: rgba(0, 255, 136, 0.15); color: #00ff88; border-color: rgba(0, 255, 136, 0.3); }
      .acc-item__price { font-family: 'Share Tech Mono', monospace; font-size: 1.1rem; font-weight: 700; color: #00f0ff; text-align: right; white-space: nowrap; }
      .acc-item--on .acc-item__price { color: #00ff88; text-shadow: 0 0 10px rgba(0, 255, 136, 0.3); }
      .acc-item__row { display: flex; gap: 8px; margin-top: auto; }
      .acc-btn {
        width: 38px; height: 38px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
        background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
        color: #a0a8b8; font-size: 1.2rem; font-weight: bold; cursor: pointer; transition: all 0.2s;
      }
      .acc-btn:hover:not(:disabled) { background: rgba(0, 240, 255, 0.1); border-color: #00f0ff; color: #00f0ff; }
      .acc-btn:disabled { opacity: 0.2; cursor: not-allowed; }
      .acc-variant {
        flex: 1; min-width: 0; padding: 0 12px; height: 38px;
        background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
        color: #fff; font-family: 'Rajdhani', sans-serif; font-size: 0.85rem; font-weight: 500;
        outline: none; cursor: pointer; appearance: none; -webkit-appearance: none; text-overflow: ellipsis;
        background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300f0ff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
        background-repeat: no-repeat; background-position: right 12px center; background-size: 10px; transition: all 0.2s;
      }
      .acc-variant:focus { border-color: #00f0ff; box-shadow: 0 0 10px rgba(0, 240, 255, 0.15); }
      .acc-variant option { background: #13131a; color: #fff; }
    `;
    document.head.appendChild(s);
  },

  _svcInjectStyles() {
    if (document.getElementById('svc-std-styles')) return;
    const s = document.createElement('style');
    s.id = 'svc-std-styles';
    s.textContent = `
      /* 🎨 NUEVAS TARJETAS PARA EL PASO 1 (SERVICIOS) */
      .svc-cards-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
        gap: 16px !important;
        margin-top: 15px !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        list-style: none !important;
      }
      .svc-card {
        background: linear-gradient(145deg, rgba(20, 20, 30, 0.9), rgba(10, 10, 15, 0.95)) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        border-radius: 12px !important;
        padding: 20px !important;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        position: relative !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
        gap: 12px !important;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2) !important;
        cursor: pointer !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        width: auto !important;
        height: auto !important;
      }
      .svc-card[data-hidden="true"] { display: none !important; }
      .svc-card:hover {
        border-color: rgba(0, 240, 255, 0.3) !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
        transform: translateY(-2px) !important;
      }
      .svc-card.checked {
        border-color: rgba(0, 255, 136, 0.5) !important;
        box-shadow: 0 8px 24px rgba(0, 255, 136, 0.15) !important;
        background: linear-gradient(145deg, rgba(0, 255, 136, 0.05), rgba(10, 10, 15, 0.95)) !important;
      }
      .svc-card.checked::before {
        content: '';
        position: absolute;
        top: 0; left: 0; width: 100%; height: 2px;
        background: linear-gradient(90deg, transparent, #00ff88, transparent);
      }
      .svc-card__head {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }
      .svc-card__icon {
        width: 42px !important; height: 42px !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        background: rgba(0, 240, 255, 0.05) !important;
        border: 1px solid rgba(0, 240, 255, 0.2) !important;
        border-radius: 10px !important;
        color: #00f0ff !important;
        font-size: 1.2rem !important;
        transition: all 0.3s !important;
        flex-shrink: 0 !important;
      }
      .svc-card.checked .svc-card__icon {
        background: rgba(0, 255, 136, 0.1) !important;
        border-color: rgba(0, 255, 136, 0.4) !important;
        color: #00ff88 !important;
        box-shadow: 0 0 15px rgba(0, 255, 136, 0.2) !important;
      }
      .svc-card__name {
        font-family: 'Rajdhani', sans-serif !important;
        font-size: 1.15rem !important;
        font-weight: 700 !important;
        color: #fff !important;
        line-height: 1.3 !important;
      }
      .svc-card__desc {
        font-size: 0.85rem !important;
        color: #a0a8b8 !important;
        line-height: 1.4 !important;
      }

      /* ESTILOS DEL PASO 2 */
      .svc-include-list { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 8px; }
      .svc-include-list li {
        display: flex; gap: 10px; align-items: flex-start;
        padding: 9px 12px;
        background: rgba(0,255,136,0.04);
        border-left: 3px solid var(--neon-green, #00ff88);
        border-radius: 4px;
        font-size: 0.88rem;
        color: var(--text-primary, #f0f0ff);
        line-height: 1.4;
      }
      .svc-include-list li i { color: var(--neon-green, #00ff88); margin-top: 3px; font-size: 0.75rem; flex-shrink: 0; }
      .svc-field-hint {
        font-size: 0.76rem; color: var(--text-muted, #8b93a7);
        font-style: italic; margin: 2px 0 8px;
        font-family: var(--font-mono, monospace);
        letter-spacing: 0.02em;
      }
      .svc-total-breakdown {
        margin-top: 14px; padding: 14px 16px;
        background: rgba(0,240,255,0.03);
        border: 1px solid rgba(0,240,255,0.2);
        border-radius: 8px;
      }
      .svc-total-breakdown__row {
        display: flex; justify-content: space-between; gap: 12px;
        padding: 6px 0; font-size: 0.85rem;
        border-bottom: 1px dashed rgba(255,255,255,0.08);
      }
      .svc-total-breakdown__row:last-of-type { border-bottom: none; }
      .svc-total-breakdown__label { color: var(--text-secondary, #a0a8b8); }
      .svc-total-breakdown__value { font-family: var(--font-mono, monospace); color: var(--text-primary, #f0f0ff); }
      .svc-total-breakdown__row--total {
        padding-top: 10px; margin-top: 6px;
        border-top: 2px solid var(--neon-cyan, #00f0ff);
        border-bottom: none;
        font-weight: 700;
      }
      .svc-total-breakdown__row--total .svc-total-breakdown__label {
        color: var(--neon-cyan, #00f0ff); font-size: 0.9rem;
      }
      .svc-total-breakdown__value--total {
        color: var(--neon-green, #00ff88); font-size: 1.15rem; font-weight: 800;
      }
      .svc-total-breakdown__foot {
        text-align: right; margin-top: 8px;
        font-size: 0.7rem; color: var(--text-muted, #8b93a7);
        font-family: var(--font-mono, monospace);
      }
    `;
    document.head.appendChild(s);
  },

  _updateStdTotal() {
    const self = this;
    const cfg = this.services[this.service];
    if (!cfg || cfg.custom) return;

    const rate = self.RATE_DOP;
    const subtotalBase = cfg.base || 0;
    const desglose = [];
    let subtotalFieldsDOP = 0;

    if (cfg.fields) {
      cfg.fields.forEach(function (f) {
        const qty = self.values[f.id] || 0;
        const unitDOP = Math.round((f.unit || 0) * rate);
        const costDOP = qty * unitDOP;
        subtotalFieldsDOP += costDOP;
        desglose.push({
          label: f.label + ' (' + qty + ' × RD$' + unitDOP.toLocaleString('es-DO') + ')',
          valueDOP: costDOP,
          qty: qty
        });
      });
    }

    const baseDOP = Math.round(subtotalBase * rate);
    const subtotalDOP = baseDOP + subtotalFieldsDOP;

    const tramo = self.garantiaTramos.find(function (t) {
      return t.dias === self.garantiaSeleccionada;
    });
    let garantiaDOP = 0;
    if (tramo && tramo.pct > 0) {
      garantiaDOP = Math.round(subtotalDOP * tramo.pct);
    }

    const totalDOP = subtotalDOP + garantiaDOP;

    const el = document.getElementById('stdTotalValue');
    if (el) el.textContent = 'RD$' + totalDOP.toLocaleString('es-DO');

    const breakdown = document.getElementById('stdTotalBreakdown');
    if (breakdown) {
      let html = '';
      if (baseDOP > 0) {
        html += '<div class="svc-total-breakdown__row">';
        html += '  <span class="svc-total-breakdown__label">' + (cfg.baseLabel || 'Base del servicio') + '</span>';
        html += '  <span class="svc-total-breakdown__value">RD$' + baseDOP.toLocaleString('es-DO') + '</span>';
        html += '</div>';
      }
      desglose.forEach(function (d) {
        if (d.qty <= 0 && d.valueDOP <= 0) return;
        html += '<div class="svc-total-breakdown__row">';
        html += '  <span class="svc-total-breakdown__label">' + d.label + '</span>';
        html += '  <span class="svc-total-breakdown__value">RD$' + d.valueDOP.toLocaleString('es-DO') + '</span>';
        html += '</div>';
      });
      if (garantiaDOP > 0) {
        html += '<div class="svc-total-breakdown__row">';
        html += '  <span class="svc-total-breakdown__label">Garantía ' + tramo.label + ' (+' + Math.round(tramo.pct * 100) + '%)</span>';
        html += '  <span class="svc-total-breakdown__value">RD$' + garantiaDOP.toLocaleString('es-DO') + '</span>';
        html += '</div>';
      }
      html += '<div class="svc-total-breakdown__row svc-total-breakdown__row--total">';
      html += '  <span class="svc-total-breakdown__label">TOTAL</span>';
      html += '  <span class="svc-total-breakdown__value svc-total-breakdown__value--total">RD$' + totalDOP.toLocaleString('es-DO') + '</span>';
      html += '</div>';
      breakdown.innerHTML = html;
    }
  },

  _updateExtrasTotal() {
    const el = document.getElementById('extrasTotalValue');
    if (!el) return;
    if (!this.service) { el.textContent = 'RD$0'; return; }
    const calc = this.calculate();
    const isReparacion = this.service === 'reparacion';
    const isAccesorios = this.service === 'accesorios';
    const esDOP = isReparacion || isAccesorios;
    const totalDOP = esDOP ? calc.total : Math.round(calc.total * this.RATE_DOP);
    el.textContent = 'RD$' + totalDOP.toLocaleString('es-DO');
  },

  updateRepTotal() {
    const self = this;
    let baseTotal = 0;
    // ✅ Buscar todos los checkboxes seleccionados
    const checkboxes = document.querySelectorAll('.rep-problem input[type="checkbox"]:checked');
    
    checkboxes.forEach(function (input) {
      const lbl = input.closest('.rep-problem');
      // Si el elemento está oculto por el filtro de equipo, no sumarlo
      if (lbl && lbl.style.display === 'none') return;
      
      const precio = parseInt(input.getAttribute('data-precio'), 10);
      if (!isNaN(precio)) {
        baseTotal += precio;
      }
    });

    // ✅ Calcular porcentaje de garantía
    const tramo = self.garantiaTramos.find(function(t) { return parseInt(t.dias) === parseInt(self.garantiaSeleccionada); });
    let garantiaAmount = 0;
    if (tramo && tramo.pct > 0) {
      garantiaAmount = Math.round(baseTotal * tramo.pct);
    }

    const total = baseTotal + garantiaAmount;
    const el = document.getElementById('repTotalValue');
    if (el) el.textContent = 'RD$' + total.toLocaleString('es-DO');
    return total;
  },

  imprimirTargetica() {
    if (typeof window.JCDC_Targetica === 'undefined' || typeof window.JCDC_Targetica.print !== 'function') {
      if (typeof Toast !== 'undefined') Toast.show('Módulo targetica.js no cargado', 'error', 2500);
      return;
    }

    const rep = this.reparacion;
    if (!rep) return;

    const equipo = (window.SOPORTE_CONFIG.equipos || []).find(function (e) { return e.id === rep.equipo; });

    window.JCDC_Targetica.print({
      numero: rep.numero,
      tipoDoc: rep.tipoDoc,
      estado: rep.estado,
      fechaEmision: rep.fechaEmision,
      garantiaDias: rep.garantia,
      cliente: rep.cliente,
      equipo: equipo ? equipo.label : rep.equipo,
      marca: rep.marca,
      modelo: rep.modelo,
      descripcion: rep.descripcion,
      codigoVC: this.generarCodigoVerificacion(rep.numero, rep.fechaEmision, String(this.updateRepTotal())),
      cantidad: this.cantidadTargeticas || 12
    });
  },

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

  calculate() {
    const self = this;

    // ------------------ ACCESORIOS ------------------
    if (this.service === 'accesorios') {
      const cfg = window.SOPORTE_CONFIG;
      const lines = [];
      let total = 0;

      (cfg.catalogoAccesorios || []).forEach(function (cat) {
        cat.families.forEach(function (fam) {
          fam.variants.forEach(function (v) {
            const qty = parseInt(self.accesorios[v.id], 10) || 0;
            if (qty > 0) {
              const subtotal = qty * v.precio;
              lines.push({
                label: fam.label + ' — ' + v.label,
                sub: qty + ' × RD$' + v.precio.toLocaleString('es-DO'),
                value: subtotal
              });
              total += subtotal;
            }
          });
        });
      });

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
          lines.push({ label: ex.label, sub: 'Adicional', value: exDop });
        }
      });
      total += extrasTotal;

      const tramo = self.garantiaTramos.find(function (t) { return t.dias === self.garantiaSeleccionada; });
      if (tramo && tramo.pct > 0) {
        const gAmount = Math.round(total * tramo.pct);
        lines.push({ label: 'Garantía ' + tramo.label, sub: '+' + Math.round(tramo.pct * 100) + '%', value: gAmount });
        total += gAmount;
      }

      if (urgentPct > 0) {
        const urgAmount = Math.round(total * urgentPct);
        lines.push({ label: 'Entrega urgente', sub: '+' + (urgentPct * 100) + '%', value: urgAmount });
        total += urgAmount;
      }

      return { lines: lines, total: total };
    }

    // ------------------ REPARACIÓN ------------------
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
          lines.push({ label: ex.label, sub: 'Adicional', value: exDop });
        }
      });
      total += extrasTotal;

      const tramo = self.garantiaTramos.find(function (t) { return t.dias === self.garantiaSeleccionada; });
      if (tramo && tramo.pct > 0) {
        const gAmount = Math.round(total * tramo.pct);
        lines.push({ label: 'Garantía ' + tramo.label, sub: '+' + Math.round(tramo.pct * 100) + '%', value: gAmount });
        total += gAmount;
      }

      if (urgentPct > 0) {
        const urgAmount = Math.round(total * urgentPct);
        lines.push({ label: 'Entrega urgente', sub: '+' + (urgentPct * 100) + '%', value: urgAmount });
        total += urgAmount;
      }
      return { lines: lines, total: total };
    }

    // ------------------ SERVICIOS NORMALES ------------------
    const cfg = this.services[this.service];
    if (!cfg) return { lines: [], total: 0 };

    const lines = [];
    const _rateN = self.RATE_DOP;
    let subtotal = cfg.base;
    lines.push({ label: (cfg.baseLabel || cfg.label + ' · base'), value: cfg.base });

    cfg.fields.forEach(function (f) {
      const qty = self.values[f.id] || 0;
      const cost = qty * f.unit;
      subtotal += cost;
      const unitDOP = Math.round((f.unit || 0) * _rateN);
      lines.push({ label: f.label, sub: qty + ' × RD$' + unitDOP.toLocaleString('es-DO'), value: cost });
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

    const tramo = this.garantiaTramos.find(function (t) { return t.dias === self.garantiaSeleccionada; });
    if (tramo && tramo.pct > 0) {
      const gAmount = Math.round(total * tramo.pct);
      lines.push({ label: 'Garantía ' + tramo.label, sub: '+' + Math.round(tramo.pct * 100) + '%', value: gAmount });
      total += gAmount;
    }

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

  _buildClienteHeaderHTML(esFactura, numero, cliente, fechaEmision, fechaVencimiento, diasValidez, equipo, marca, modelo) {
    let html = '';
    html += '<div class="quote-summary__client' + (esFactura ? ' quote-summary__client--factura' : '') + '">';
    html += '  <div class="quote-summary__client-head">';
    html += '    <i class="fa-solid fa-' + (esFactura ? 'file-invoice-dollar' : 'file-invoice') + '"></i>';
    html += '    <strong>' + (esFactura ? 'FACTURA' : 'COTIZACIÓN') + '</strong>';
    if (numero && numero !== '—') html += '    <span>' + numero + '</span>';
    html += '  </div>';
    html += '  <div class="quote-summary__client-row"><span>Cliente:</span><strong>' + (cliente.nombre || '—') + '</strong></div>';
    if (cliente.cedula) html += '  <div class="quote-summary__client-row"><span>Cédula/RNC:</span><strong>' + cliente.cedula + '</strong></div>';
    if (cliente.telefono) html += '  <div class="quote-summary__client-row"><span>Teléfono:</span><strong>' + cliente.telefono + '</strong></div>';
    if (cliente.email) html += '  <div class="quote-summary__client-row"><span>Email:</span><strong>' + cliente.email + '</strong></div>';
    if (equipo) {
      const eqList = (window.SOPORTE_CONFIG.equipos || []);
      const eqObj = eqList.find(function (e) { return e.id === equipo; });
      html += '  <div class="quote-summary__client-row"><span>Equipo:</span><strong>' + (eqObj ? eqObj.label : equipo) + (marca ? ' ' + marca : '') + (modelo ? ' ' + modelo : '') + '</strong></div>';
    }
    if (fechaEmision) html += '  <div class="quote-summary__client-row"><span>Emisión:</span><strong>' + fechaEmision + '</strong></div>';
    if (!esFactura && fechaVencimiento) {
      html += '  <div class="quote-summary__client-row"><span>Válida hasta:</span><strong>' + fechaVencimiento + ' (' + diasValidez + ' días)</strong></div>';
    }
    html += '</div>';
    return html;
  },

  renderSummary() {
    const calc = this.calculate();
    const lines = calc.lines;
    const total = calc.total;
    const isReparacion = this.service === 'reparacion';
    const isAccesorios = this.service === 'accesorios';
    const esDOP = isReparacion || isAccesorios;
    const rate = this.RATE_DOP;
    const dop = esDOP ? total : Math.round(total * rate);

    let html = '';

    if (isReparacion && this.reparacion) {
      const r = this.reparacion;
      const esFactura = r.tipoDoc === 'factura';
      html += this._buildClienteHeaderHTML(
        esFactura, r.numero, r.cliente, r.fechaEmision,
        r.fechaVencimiento, r.diasValidez, r.equipo, r.marca, r.modelo
      );
    } else {
      const doc = this.documento;
      const esFactura = doc.tipoDoc === 'factura';
      const fechaEmision = new Date().toISOString().slice(0, 10);
      html += this._buildClienteHeaderHTML(
        esFactura, '—', doc.cliente, fechaEmision, '', this.diasValidez, '', '', ''
      );
    }

    if (!lines.length) {
      html += '<div class="quote-summary__row"><span class="quote-summary__label">Sin elementos seleccionados</span></div>';
    }

    lines.forEach(function (l) {
      const sub = l.sub ? '<small>' + l.sub + '</small>' : '';
      const valueDOP = esDOP ? l.value : Math.round(l.value * rate);
      const price = 'RD$' + valueDOP.toLocaleString('es-DO');
      html += '<div class="quote-summary__row">';
      html += '  <span class="quote-summary__label">' + l.label + sub + '</span>';
      html += '  <span class="quote-summary__value">' + price + '</span>';
      html += '</div>';
    });

    html += '<div class="quote-summary__totals">';
    html += '  <div class="quote-summary__totals-label">TOTAL ESTIMADO</div>';
    html += '  <div class="quote-summary__total-usd">RD$' + dop.toLocaleString('es-DO') + '</div>';
    html += '  <div class="quote-summary__total-dop">Pesos dominicanos (DOP)</div>';
    html += '</div>';

    this.els.summary.innerHTML = html;

    // ✅ Lógica dinámica para los botones
    const rep = isReparacion ? this.reparacion : null;
    const tipoDoc = rep ? rep.tipoDoc : this.documento.tipoDoc;
    const btnDownloadText = document.getElementById('quoteDownloadText');
    const btnRequestSigned = document.getElementById('quoteRequestSigned');

    const btnRequestSignedWA = document.getElementById('quoteRequestSignedWA');

    if (tipoDoc === 'factura') {
      if (btnDownloadText) btnDownloadText.textContent = 'DESCARGAR FACTURA';
      if (btnRequestSigned) btnRequestSigned.style.display = 'none';
      if (btnRequestSignedWA) btnRequestSignedWA.style.display = 'none';
    } else {
      if (btnDownloadText) btnDownloadText.textContent = 'DESCARGAR COTIZACIÓN';
      if (btnRequestSigned) btnRequestSigned.style.display = 'inline-flex';
      if (btnRequestSignedWA) btnRequestSignedWA.style.display = 'inline-flex';
    }

    this._actualizarBloqueDocumentos();
    this._actualizarBloqueTargetica(isReparacion);
  },

  async _confirmarGeneracion() {
    const isReparacion = this.service === 'reparacion';
    const rep = isReparacion ? this.reparacion : null;
    const tipoDoc = rep ? rep.tipoDoc : this.documento.tipoDoc;
    const estado = rep ? rep.estado : this.documento.estado;

    let tipoLabel = 'COTIZACIÓN';
    if (tipoDoc === 'factura') {
      tipoLabel = estado === 'pagada' ? 'FACTURA PAGADA' : 'FACTURA NO PAGADA';
    }

    const esFacturaPagada = (tipoDoc === 'factura' && estado === 'pagada');
    const disponibles = (esFacturaPagada && typeof window.JCDC_Plantillas !== 'undefined' && window.JCDC_Plantillas.disponibles)
      ? window.JCDC_Plantillas.disponibles(this.extras)
      : [];

    let msg = 'Se generará la <strong>' + tipoLabel + '</strong>.';
    if (disponibles.length) {
      msg += '<br><br>También se generará' + (disponibles.length === 1 ? '' : 'n') + ' <strong>' + disponibles.length + ' documento' + (disponibles.length === 1 ? '' : 's') + ' adicional' + (disponibles.length === 1 ? '' : 'es') + '</strong>.';
    }
    msg += '<br><br>Todo quedará guardado en el sistema con su <strong>código de verificación</strong>.';
    msg += '<br><br><em style="color:var(--neon-green); font-size:0.85rem;">💡 Si necesitas este documento <strong>firmado y sellado</strong> por el encargado, podrás solicitarlo en el siguiente paso.</em>';
    msg += '<br><br>¿Deseas continuar?';

    return this._confirmar(msg, {
      titulo: 'Confirmar generación',
      tipo: 'info',
      okLabel: 'Sí, generar',
      cancelLabel: 'Atrás',
      icono: 'fa-file-circle-check'
    });
  },

  async _generarTodo() {
    const isReparacion = this.service === 'reparacion';
    const rep = isReparacion ? this.reparacion : null;
    const tipoDoc = rep ? rep.tipoDoc : this.documento.tipoDoc;
    const estado  = rep ? rep.estado  : this.documento.estado;
    const esFacturaPagada = (tipoDoc === 'factura' && estado === 'pagada');

    try { this.registrarDocumento(); } catch (e) { console.error('[JCDC]', e); }

    if (tipoDoc === 'cotizacion') {
      console.log('[JCDC] Cotización: sin adicionales.');
      return;
    }
    if (!esFacturaPagada) {
      console.log('[JCDC] Factura no pagada: sin adicionales.');
      return;
    }

    const disponibles = (typeof window.JCDC_Plantillas !== 'undefined' && window.JCDC_Plantillas.disponibles)
      ? window.JCDC_Plantillas.disponibles(this.extras)
      : [];
    if (!disponibles.length) return;

    const tipos = disponibles.map(function (d) { return d.id; });
    const data = this._buildDocsData();
    if (!data) return;

    const docs = window.JCDC_Plantillas.compute(data, tipos);
    if (!docs || !docs.length) return;

    this._registrarDocumentosGenerados(docs, data);
    window.JCDC_Plantillas.open(data, docs);
  },

  _buildDocsData() {
    const isReparacion = this.service === 'reparacion';
    const calc = this.calculate();
    const total = calc.total;
    const lines = calc.lines;

    const isAccesorios = this.service === 'accesorios';
    const esDOP = isReparacion || isAccesorios;
    const rep = isReparacion ? this.reparacion : null;
    const doc = this.documento;
    const cfgServ = this.services[this.service] || {};
    const cli = rep ? rep.cliente : doc.cliente;
    const eqList = (window.SOPORTE_CONFIG.equipos || []);
    const equipo = rep ? (eqList.find(function (e) { return e.id === rep.equipo; }) || {}) : {};

    const numeroBase = rep ? rep.numero : (this.documento.numero || this._generarNumeroDocumento());

    const fechaBaseVC = rep ? rep.fechaEmision : (this.documento.fechaEmision || new Date().toISOString().slice(0, 10));
    const codigoVCpadre = this.generarCodigoVerificacion(numeroBase, fechaBaseVC, total.toString());

    return {
      numero: numeroBase,
      tipoDoc: rep ? rep.tipoDoc : doc.tipoDoc,
      estado: rep ? rep.estado : doc.estado,
      fechaEmision: fechaBaseVC,
      garantiaDias: rep ? (rep.garantia || 0) : this.garantiaSeleccionada,
      cliente: {
        nombre: cli.nombre || '',
        cedula: cli.cedula || '',
        telefono: cli.telefono || '',
        email: cli.email || '',
        direccion: cli.direccion || ''
      },
      equipo: equipo.label || (rep ? rep.equipo : '') || '',
      marca: rep ? rep.marca : '',
      modelo: rep ? rep.modelo : '',
      descripcion: rep ? rep.descripcion : doc.observaciones,
      servicioLabel: cfgServ.label || '',
      lines: lines,
      total: total,
      moneda: (isReparacion || isAccesorios) ? 'DOP' : 'USD',
      rate: this.RATE_DOP,
      codigoVCpadre: codigoVCpadre
    };
  },

  _actualizarBloqueDocumentos() {
    const actionsContainer = document.querySelector('.quote-cta__actions');
    if (!actionsContainer) return;
    const prev = actionsContainer.querySelector('.rep-documentos-wrap');
    if (prev) prev.remove();
  },

  abrirModalDocumentos(disponibles) {
    const self = this;

    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'jcdc-docs-overlay';

      let itemsHtml = '';
      disponibles.forEach(function (d) {
        itemsHtml +=
          '<label class="jcdc-docs-item checked" data-doc-type="' + d.id + '">' +
          '  <input type="checkbox" checked value="' + d.id + '">' +
          '  <span class="jcdc-docs-check"><i class="fa-solid fa-check"></i></span>' +
          '  <span class="jcdc-docs-item-icon"><i class="fa-solid ' + d.icon + '"></i></span>' +
          '  <span class="jcdc-docs-item-body">' +
          '    <span class="jcdc-docs-item-name">' + d.label + '</span>' +
          '    <span class="jcdc-docs-item-desc">' + (d.descripcion || 'Con su propio código VC') + '</span>' +
          '  </span>' +
          '</label>';
      });

      overlay.innerHTML =
        '<div class="jcdc-docs-modal" role="dialog" aria-modal="true">' +
        '  <div class="jcdc-docs-icon"><i class="fa-solid fa-file-circle-plus"></i></div>' +
        '  <h3 class="jcdc-docs-title">Documentos adicionales</h3>' +
        '  <p class="jcdc-docs-sub">Selecciona los documentos que quieres generar.<br>Cada uno llevará su propio código de verificación VC.</p>' +
        '  <div class="jcdc-docs-list">' + itemsHtml + '</div>' +
        '  <p class="jcdc-docs-note">Los documentos se abrirán en una nueva pestaña.<br>Se imprimirán uno por página.</p>' +
        '  <div class="jcdc-docs-actions">' +
        '    <button type="button" class="jcdc-docs-btn jcdc-docs-btn--ghost" data-action="cancel">Cancelar</button>' +
        '    <button type="button" class="jcdc-docs-btn jcdc-docs-btn--primary" data-action="generate">' +
        '      <i class="fa-solid fa-print"></i> Generar e imprimir' +
        '    </button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(overlay);
      document.body.classList.add('jcdc-modal-open');

      overlay.querySelectorAll('.jcdc-docs-item').forEach(function (item) {
        const input = item.querySelector('input');
        item.addEventListener('click', function (e) {
          e.preventDefault();
          input.checked = !input.checked;
          item.classList.toggle('checked', input.checked);
        });
      });

      function cerrar(v) {
        document.body.classList.remove('jcdc-modal-open');
        overlay.classList.add('closing');
        setTimeout(function () { overlay.remove(); }, 200);
        resolve(v);
      }

      overlay.querySelector('[data-action="cancel"]').addEventListener('click', function () { cerrar(null); });

      overlay.querySelector('[data-action="generate"]').addEventListener('click', function () {
        const seleccionados = [];
        overlay.querySelectorAll('.jcdc-docs-item.checked input:checked').forEach(function (inp) {
          seleccionados.push(inp.value);
        });
        if (!seleccionados.length) {
          if (typeof Toast !== 'undefined') Toast.show('Selecciona al menos un documento', 'info', 2200);
          return;
        }
        cerrar(seleccionados);
      });

      overlay.addEventListener('click', function (e) { if (e.target === overlay) cerrar(null); });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { document.removeEventListener('keydown', esc); cerrar(null); }
      });
    }).then(function (seleccionados) {
      if (!seleccionados) return;
      self.imprimirDocumentosSeleccionados(seleccionados);
    });
  },

  async imprimirDocumentosSeleccionados(tipos) {
    if (typeof window.JCDC_Plantillas === 'undefined') {
      if (typeof Toast !== 'undefined') Toast.show('Módulo plantillas.js no cargado', 'error', 2500);
      return;
    }

    const data = this._buildDocsData();
    if (!data) return;

    const docs = window.JCDC_Plantillas.compute(data, tipos);
    if (!docs.length) return;

    this.registrarDocumento();
    this._registrarDocumentosGenerados(docs, data);
    window.JCDC_Plantillas.open(data, docs);
  },

  _registrarDocumentosGenerados(generados, data) {
    if (data.tipoDoc !== 'factura' || data.estado !== 'pagada') {
      console.log('[JCDC] Guard: solo se anidan adicionales en FACTURA PAGADA. Ignorado.');
      return;
    }
    const db = window.db;
    if (!db) {
      if (typeof Toast !== 'undefined') Toast.show('Error: sin base de datos', 'error', 3000);
      return;
    }
    const fechaTxt = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
    const labels = { certificado: 'Certificado de servicio', documentacion: 'Documentación técnica', capacitacion: 'Certificado de capacitación' };
    const vcPadre = data.codigoVCpadre || '';
    if (!vcPadre) return;

    const adicionales = generados.map(function (g) {
      return {
        tipo: g.tipo,
        numero: g.numero,
        label: labels[g.tipo] || g.tipo,
        codigoVCpadre: vcPadre,
        fecha: fechaTxt,
        timestamp: Date.now(),
        snapshot: {
          tipoDoc: g.tipo,
          numero: g.numero,
          numeroPadre: data.numero,
          fechaEmision: data.fechaEmision,
          garantia: data.garantiaDias,
          cliente: data.cliente,
          equipo: data.equipo,
          marca: data.marca,
          modelo: data.modelo,
          descripcion: data.descripcion,
          lines: data.lines,
          rate: data.rate
        }
      };
    });

    db.collection('documentos').doc(vcPadre).set({
      documentosAdicionales: adicionales
    }, { merge: true })
      .then(function () { console.log('[Firestore] Adicionales anidados en', vcPadre); })
      .catch(function (err) { console.error('[Firestore]', err); });

    if (typeof Toast !== 'undefined') Toast.show(adicionales.length + ' doc anidado(s)', 'success', 2500);
  },

  _actualizarBloqueTargetica(isReparacion) {
    const self = this;
    const actionsContainer = document.querySelector('.quote-cta__actions');
    if (!actionsContainer) return;

    const prev = actionsContainer.querySelector('.rep-targetica-wrap');
    if (prev) prev.remove();

    if (!isReparacion || !this.reparacion) return;
    const rep = this.reparacion;
    const esAdmin = (this._tipoAcceso === 'admin' || this.facturaUnlocked);
    const esFactura = rep.tipoDoc === 'factura';
    const esPagada = rep.estado === 'pagada';
    const tieneDatos = !!rep.cliente.nombre && !!rep.equipo;
    if (!(esAdmin && esFactura && esPagada && tieneDatos)) return;

    const cantidadActual = this.cantidadTargeticas || 12;

    const wrap = document.createElement('div');
    wrap.className = 'rep-targetica-wrap';
    wrap.innerHTML = `
      <div class="rep-targetica-count">
        <span class="rep-targetica-count__label">Cantidad de targeticas:</span>
        <div class="rep-targetica-count__opts">
          <button type="button" class="rep-targetica-count__btn${cantidadActual === 1 ? ' active' : ''}" data-count="1">1</button>
          <button type="button" class="rep-targetica-count__btn${cantidadActual === 2 ? ' active' : ''}" data-count="2">2</button>
          <button type="button" class="rep-targetica-count__btn${cantidadActual === 4 ? ' active' : ''}" data-count="4">4</button>
          <button type="button" class="rep-targetica-count__btn${cantidadActual === 8 ? ' active' : ''}" data-count="8">8</button>
          <button type="button" class="rep-targetica-count__btn${cantidadActual === 12 ? ' active' : ''}" data-count="12">12</button>
        </div>
      </div>
      <button type="button" class="rep-targetica-btn" id="repTargeticaBtn">
        <i class="fa-solid fa-tag"></i>
        <span id="repTargeticaBtnLabel">IMPRIMIR ${cantidadActual} TARGETICA${cantidadActual === 1 ? '' : 'S'}</span>
      </button>
    `;

    actionsContainer.insertBefore(wrap, actionsContainer.firstChild);

    wrap.querySelectorAll('.rep-targetica-count__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const n = parseInt(btn.dataset.count, 10);
        self.cantidadTargeticas = n;
        wrap.querySelectorAll('.rep-targetica-count__btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        const lbl = document.getElementById('repTargeticaBtnLabel');
        if (lbl) lbl.textContent = 'IMPRIMIR ' + n + ' TARGETICA' + (n === 1 ? '' : 'S');
      });
    });

    const tBtn = document.getElementById('repTargeticaBtn');
    if (tBtn) {
      tBtn.addEventListener('click', function () { self.imprimirTargetica(); });
    }
  },

  restart() {
    this.currentStep = 1;
    this.service = null;
    this.values = {};
    this.extras = {};
    this.reparacion = null;
    this.garantiaSeleccionada = 0;
    this.diasValidez = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.documentos && window.SOPORTE_CONFIG.documentos.cotizacionValidezDias) || 15;
    this.documento = {
      tipoDoc: 'cotizacion',
      estado: 'pagada',
      cliente: { nombre: '', cedula: '', telefono: '', email: '', direccion: '' },
      observaciones: '',
      numero: '',
      fechaEmision: '',
      codigoVC: '',
      timestamp: 0
    };
    this.accesorios = {};
    this.accesoriosVariantes = {};
    this.accesoriosCatActiva = 'all';

    document.querySelectorAll('[data-service]').forEach(function (o) {
      o.classList.remove('checked');
      const inp = o.querySelector('input');
      if (inp) inp.checked = false;
    });
    document.querySelectorAll('[data-extra]').forEach(function (o) {
      o.classList.remove('checked');
      o.style.display = '';
      const inp = o.querySelector('input');
      if (inp) inp.checked = false;
    });

    this.renderStepIndicator();
    this.updateNextBtn();
    this.scrollTop();
    if (typeof Toast !== 'undefined') Toast.show('Cotizador reiniciado', 'info', 1600);
  },

  buildPlainText() {
    const cfg = this.services[this.service];
    const calc = this.calculate();
    const lines = calc.lines;
    const total = calc.total;
    const isReparacion = this.service === 'reparacion';
    const isAccesorios = this.service === 'accesorios';
    const esDOP = isReparacion || isAccesorios;
    const dop = esDOP ? total : Math.round(total * this.RATE_DOP);
    const date = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });

    const esFactura = isReparacion && this.reparacion && this.reparacion.tipoDoc === 'factura';
    const numDocTxt = isReparacion && this.reparacion ? this.reparacion.numero : this._generarNumeroDocumento();
    const fechaBaseVC = isReparacion && this.reparacion
      ? this.reparacion.fechaEmision
      : (this.documento.fechaEmision || new Date().toISOString().slice(0, 10));
    const codigoVC = this.generarCodigoVerificacion(numDocTxt, fechaBaseVC, total.toString());

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
    } else {
      const doc = this.documento;
      txt += 'Documento: ' + numDocTxt + '\n';
      if (doc.cliente.nombre) txt += 'Cliente: ' + doc.cliente.nombre + '\n';
      if (codigoVC) txt += 'Verificación: ' + codigoVC + '\n';
    }
    txt += '\n── DETALLE ────────────────────────────\n';

    const _rateTxt = this.RATE_DOP;
    lines.forEach(function (l) {
      const sub = l.sub ? ' (' + l.sub + ')' : '';
      const valueDOP = esDOP ? l.value : Math.round(l.value * _rateTxt);
      txt += '• ' + l.label + sub + '\n';
      txt += '  RD$' + valueDOP.toLocaleString('es-DO') + '\n';
    });

    txt += '\n── TOTALES ────────────────────────────\n';
    txt += 'TOTAL:  RD$' + Math.round(dop).toLocaleString('es-DO') + '\n';
    if (isReparacion && esFactura) txt += '*** PAGADO ***\n';
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
    const wa = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.whatsapp) || '10000000000';
    const url = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(txt);
    window.open(url, '_blank', 'noopener');
    if (typeof Toast !== 'undefined') Toast.show('Abriendo WhatsApp…', 'success', 1800);
  },

  requestSigned() {
    if (!this.service) {
      if (typeof Toast !== 'undefined') Toast.show('Completa el cotizador primero', 'info', 2000);
      return;
    }
    
    this.registrarDocumento();

    const isReparacion = this.service === 'reparacion';
    const rep = isReparacion ? this.reparacion : null;
    const doc = this.documento;
    
    const cliente = rep ? (rep.cliente.nombre || 'Cliente') : (doc.cliente.nombre || 'Cliente');
    const num = rep ? (rep.numero || 'No generado') : (doc.numero || 'No generado');
    const vc = rep ? (rep.codigoVC || 'No generado') : (doc.codigoVC || 'No generado');
    const tipo = rep ? (rep.tipoDoc === 'factura' ? 'Factura' : 'Cotización') : (doc.tipoDoc === 'factura' ? 'Factura' : 'Cotización');

    const provEmail = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.proveedor && window.SOPORTE_CONFIG.proveedor.email) || 'jcdurancasado@gmail.com';
    
    const subject = `Solicitud de ${tipo} Firmada - ${num}`;
    const body = `Hola Julio C. Durán Casado,\n\nAcabo de generar la ${tipo} ${num} (VC: ${vc}) a nombre de ${cliente}.\n\nNecesito que la misma sea firmada y sellada por el encargado.\n\n¡Gracias!`;
    
    window.location.href = `mailto:${provEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    if (typeof Toast !== 'undefined') Toast.show('Abriendo cliente de correo...', 'success', 1800);
  },

  requestSignedWA() {
    if (!this.service) {
      if (typeof Toast !== 'undefined') Toast.show('Completa el cotizador primero', 'info', 2000);
      return;
    }
    
    this.registrarDocumento();

    const isReparacion = this.service === 'reparacion';
    const rep = isReparacion ? this.reparacion : null;
    const doc = this.documento;
    
    const cliente = rep ? (rep.cliente.nombre || 'Cliente') : (doc.cliente.nombre || 'Cliente');
    const num = rep ? (rep.numero || 'No generado') : (doc.numero || 'No generado');
    const vc = rep ? (rep.codigoVC || 'No generado') : (doc.codigoVC || 'No generado');
    const tipo = rep ? (rep.tipoDoc === 'factura' ? 'Factura' : 'Cotización') : (doc.tipoDoc === 'factura' ? 'Factura' : 'Cotización');

    const msg = `Hola Julio C. Durán Casado, acabo de generar la ${tipo} *${num}* (VC: ${vc}) a nombre de *${cliente}*. Necesito que la misma sea firmada y sellada por el encargado. ¡Gracias!`;
    const wa = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.whatsapp) || '10000000000';
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank');
    
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

  generarSello(fecha, numDoc, tipoDoc, estado) {
    const cfg = window.SOPORTE_CONFIG.documentos || {};
    const prov = (window.SOPORTE_CONFIG.proveedor) || {};
    const nombre = (prov.nombre || 'JCDURÁN CASADO').toUpperCase();

    let color, texto, fontBig, letterSpacing;

    if (tipoDoc === 'factura') {
      const esPagada = estado !== 'no-pagada';
      color = esPagada ? (cfg.colorSelloPagado || '#0a7f2e') : (cfg.colorSelloNoPagada || '#c81e1e');
      texto = esPagada ? 'PAGADO' : 'NO PAGADA';
      fontBig = esPagada ? 34 : 21;
      letterSpacing = esPagada ? 4 : 2.5;
    } else {
      color = cfg.colorSelloCotizacion || '#0369a1';
      texto = 'COTIZACIÓN';
      fontBig = 21;
      letterSpacing = 1;
    }

    return `
<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" class="sello-svg">
  <defs>
    <path id="arcT-${numDoc}" d="M 23,110 A 87,87 0 0 1 197,110" fill="none"/>
    <path id="arcB-${numDoc}" d="M 15,110 A 95,95 0 0 0 205,110" fill="none"/>
    <filter id="rough-${numDoc}">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="0.5" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <g filter="url(#rough-${numDoc})" fill="none" stroke="${color}">
    <circle cx="110" cy="110" r="104" stroke-width="3.5"/>
    <circle cx="110" cy="110" r="80" stroke-width="1.2"/>

    <text font-family="Arial Black, sans-serif" font-size="13" font-weight="900" fill="${color}" stroke="none" letter-spacing="2">
      <textPath href="#arcT-${numDoc}" startOffset="50%" text-anchor="middle">${nombre}</textPath>
    </text>

    <text font-family="Arial, sans-serif" font-size="8.5" fill="${color}" stroke="none" letter-spacing="1.2">
      <textPath href="#arcB-${numDoc}" startOffset="50%" text-anchor="middle">REDES · CIBERSEGURIDAD · SOPORTE TÉCNICO</textPath>
    </text>

    <line x1="30" y1="100" x2="190" y2="100" stroke-width="1.2"/>
    <text x="110" y="122" font-family="Arial Black, sans-serif" font-size="${fontBig}" font-weight="900" fill="${color}" stroke="none" text-anchor="middle" letter-spacing="${letterSpacing}">${texto}</text>
    <line x1="30" y1="136" x2="190" y2="136" stroke-width="1.2"/>

    <text x="110" y="151" font-family="Arial, sans-serif" font-size="7.5" fill="${color}" stroke="none" text-anchor="middle" letter-spacing="2">FECHA</text>
    <text x="110" y="162" font-family="Arial Black, sans-serif" font-size="9" fill="${color}" stroke="none" text-anchor="middle">${fecha}</text>
    <text x="110" y="175" font-family="Arial, sans-serif" font-size="7" fill="${color}" stroke="none" text-anchor="middle" letter-spacing="0.8">${numDoc}</text>
  </g>
</svg>`;
  },

  registrarDocumento() {
    if (!this.service) return '';

    const isReparacion = this.service === 'reparacion';
    const isAccesorios = this.service === 'accesorios';
    const esDOP = isReparacion || isAccesorios;
    const calc  = this.calculate();
    const lines = calc.lines;
    const total = calc.total;
    const dop   = esDOP ? total : Math.round(total * this.RATE_DOP);
    const usd   = esDOP ? null : total;
    const date  = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });

    const rep       = isReparacion ? this.reparacion : null;
    const isFactura = rep ? (rep.tipoDoc === 'factura') : (this.documento.tipoDoc === 'factura');
    const estado    = rep ? (rep.estado || 'pagada') : (this.documento.estado || 'pagada');
    const esPagada  = estado === 'pagada';
    const numDoc    = rep ? rep.numero : this._generarNumeroDocumento();

    const fechaBaseVC = rep ? rep.fechaEmision : (this.documento.fechaEmision || new Date().toISOString().slice(0, 10));
    const codigoFinal = this.generarCodigoVerificacion(numDoc, fechaBaseVC, total.toString());

    if (!rep) {
      this.documento.codigoVC = codigoFinal;
      this.documento.fechaEmision = fechaBaseVC;
    } else {
      rep.codigoVC = codigoFinal;
    }

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

      const cfgServicio = this.services[this.service] || {};

      const nuevoDoc = {
        tipo: isFactura ? 'factura' : 'cotizacion',
        estado: isFactura ? estado : '—',
        numero: numDoc,
        fecha: date,
        fechaISO: new Date().toISOString(),
        total: total,
        moneda: esDOP ? 'DOP' : 'USD',
        cliente: rep ? (rep.cliente.nombre || '—') : (this.documento.cliente.nombre || '—'),
        equipo: rep ? (rep.equipo || '—') : (cfgServicio.label || '—'),
        codigoVC: codigoFinal,
        timestamp: Date.now(),
        historial: historial,
        comentarios: (idx >= 0 && registro[idx].comentarios) ? registro[idx].comentarios : [],
        snapshot: {
          tipoDoc: rep ? rep.tipoDoc : 'cotizacion',
          numero: numDoc,
          fechaEmision: rep ? rep.fechaEmision : new Date().toISOString().slice(0, 10),
          fechaVencimiento: rep ? rep.fechaVencimiento : '',
          diasValidez: rep ? rep.diasValidez : this.diasValidez,
          garantia: rep ? (rep.garantia || this.garantiaSeleccionada) : this.garantiaSeleccionada,
          cliente: rep ? JSON.parse(JSON.stringify(rep.cliente || {})) : JSON.parse(JSON.stringify(this.documento.cliente || {})),
          equipo: rep ? rep.equipo : ((this.services[this.service] || {}).label || ''),
          marca: rep ? rep.marca : '',
          modelo: rep ? rep.modelo : '',
          descripcion: rep ? rep.descripcion : '',
          problemas: rep ? (rep.problemas || []) : [],
          lines: lines,
          totalUSD: usd,
          totalDOP: dop,
          rate: this.RATE_DOP,
          extras: JSON.parse(JSON.stringify(this.extras || {})),
          servicioId: this.service,
          servicioLabel: (this.services[this.service] || {}).label || ''
        }
      };

      if (idx >= 0) registro[idx] = nuevoDoc;
      else registro.push(nuevoDoc);

      localStorage.setItem('jcdc_registro_docs', JSON.stringify(registro));
      console.log('[JCDC] Registro guardado:', numDoc, codigoFinal);

      try {
        var db = window.db;
        if (db && codigoFinal) {
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

          db.collection('documentos').doc(codigoFinal).set(docParaNube, { merge: true })
            .then(function () { console.log('[Firestore] ✓', codigoFinal); })
            .catch(function (err) { console.error('[Firestore] ✗', err); });
        }
      } catch (e) {
        console.error('[Firestore] Error:', e);
      }

      try {
        this._emailsEnviados = this._emailsEnviados || {};
        if (codigoFinal && !this._emailsEnviados[codigoFinal]) {
          this._emailsEnviados[codigoFinal] = true;

          var apiBase = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.apiBaseUrl) || 'https://jcdcapi.vercel.app';

          var payload = {
            tipo: isFactura ? 'factura' : 'cotizacion',
            numero: numDoc,
            codigoVC: codigoFinal,
            cliente: rep ? (rep.cliente.nombre || 'Sin nombre') : 'Sin nombre',
            total: total,
            moneda: esDOP ? 'DOP' : 'USD',
            fecha: date
          };

          fetch(apiBase + '/api/enviar-cotizacion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d && d.ok) console.log('[JCDC] ✓ Email enviado:', numDoc);
          })
          .catch(function (err) { console.warn('[JCDC] Email fail:', err); });
        }
      } catch (e) {
        console.warn('[JCDC] Error email:', e);
      }

      return codigoFinal;
    } catch (e) {
      console.error('[JCDC] Error guardando:', e);
      return codigoFinal;
    }
  },

  downloadPDF() {
    if (!this.service) {
      if (typeof Toast !== 'undefined') Toast.show('Completa el cotizador primero', 'info', 2000);
      return;
    }

    const isReparacion = this.service === 'reparacion';
    const isAccesorios = this.service === 'accesorios';
    const esDOP = isReparacion || isAccesorios;
    const calc = this.calculate();
    const lines = calc.lines;
    const total = calc.total;
    const dop = esDOP ? total : Math.round(total * this.RATE_DOP);
    const usd = esDOP ? null : total;
    const date = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });

    const prov = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.proveedor) || {};
    const docCfg = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.documentos) || {};
    const rep = isReparacion ? this.reparacion : null;
    const isFactura = rep && rep.tipoDoc === 'factura';
    const estado = (rep && rep.estado) ? rep.estado : 'pagada';
    const esPagada = estado === 'pagada';
    const numDoc = rep ? rep.numero : this._generarNumeroDocumento();
    const tituloDoc = isFactura ? 'FACTURA' : 'COTIZACIÓN';
    const rate = this.RATE_DOP;

    let colorDoc;
    if (isFactura) {
      colorDoc = esPagada ? (docCfg.colorSelloPagado || '#0a7f2e') : (docCfg.colorSelloNoPagada || '#c81e1e');
    } else {
      colorDoc = docCfg.colorSelloCotizacion || '#0369a1';
    }

    const fechaBaseVC = rep ? rep.fechaEmision : (this.documento.fechaEmision || new Date().toISOString().slice(0, 10));
    const codigoVC = this.generarCodigoVerificacion(numDoc, fechaBaseVC, total.toString());

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
    const cliData = rep ? rep.cliente : this.documento.cliente;
    if (cliData && (cliData.nombre || cliData.cedula || cliData.telefono || cliData.email || cliData.direccion)) {
      clienteBlock += '<div class="info-block">';
      clienteBlock += '  <div class="info-block__title">DATOS DEL CLIENTE</div>';
      clienteBlock += '  <div class="info-block__grid">';
      clienteBlock += '    <div class="ii"><span>Cliente</span><strong>' + (cliData.nombre || '—') + '</strong></div>';
      clienteBlock += '    <div class="ii"><span>Cédula / RNC</span><strong>' + (cliData.cedula || '—') + '</strong></div>';
      clienteBlock += '    <div class="ii"><span>Teléfono</span><strong>' + (cliData.telefono || '—') + '</strong></div>';
      clienteBlock += '    <div class="ii"><span>Email</span><strong>' + (cliData.email || '—') + '</strong></div>';
      if (cliData.direccion) clienteBlock += '    <div class="ii ii--full"><span>Dirección</span><strong>' + cliData.direccion + '</strong></div>';
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
    } else if (!isReparacion) {
      const cfgServ = this.services[this.service] || {};
      if (cfgServ.label) {
        equipoBlock += '<div class="info-block">';
        equipoBlock += '  <div class="info-block__title">EQUIPO / SERVICIO</div>';
        equipoBlock += '  <div class="info-block__grid">';
        equipoBlock += '    <div class="ii ii--full"><span>Servicio</span><strong>' + cfgServ.label + '</strong></div>';
        equipoBlock += '  </div>';
        equipoBlock += '</div>';
      }
    }

    let rows = '';
    lines.forEach(function (l) {
      const sub = l.sub ? '<div class="row-sub">' + l.sub + '</div>' : '';
      const lValueDOP = esDOP ? l.value : Math.round(l.value * rate);
      const price = 'RD$' + lValueDOP.toLocaleString('es-DO');
      rows += '<tr>';
      rows += '  <td>' + l.label + sub + '</td>';
      rows += '  <td class="row-price">' + price + '</td>';
      rows += '</tr>';
    });

    const totalRow = 'RD$' + dop.toLocaleString('es-DO');

    const hora = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
    const garantiaDias = (rep && typeof rep.garantia === 'number') ? rep.garantia : this.garantiaSeleccionada;
    const garantiaTexto = garantiaDias === 0
      ? 'Este servicio <strong>no incluye garantía</strong>.'
      : 'Garantía de <strong>' + garantiaDias + ' días</strong> sobre el servicio.';
    const notaTexto = isFactura
      ? '<strong>Nota:</strong> Esta factura corresponde al servicio descrito arriba. ' + garantiaTexto + ' Gracias por su preferencia.'
      : '<strong>Nota:</strong> Cotización generada desde el cotizador web <strong>jcdurancasado.github.io/inf</strong> el ' + date + ' a las ' + hora + '. Válida por ' + (rep ? rep.diasValidez : this.diasValidez) + ' días.';

    const obsReal = rep ? rep.descripcion : this.documento.observaciones;
    const observacionesTexto = (obsReal && obsReal.trim())
      ? obsReal
      : '<span class="obs-empty">Sin observaciones registradas</span>';

    const watermarkHTML = (!isFactura && docCfg.mostrarWatermark !== false)
      ? '<div class="watermark-doc">COTIZACIÓN</div>'
      : '';

    const selloHTML = '<div class="sello-container">' +
      this.generarSello(date, numDoc, isFactura ? 'factura' : 'cotizacion', estado) +
      '</div>';
    const firmaHTML = (window.JCDC_FIRMA && window.JCDC_FIRMA.length > 50)
      ? '<img src="' + window.JCDC_FIRMA + '" alt="Firma" class="firma-img">'
      : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${tituloDoc} ${numDoc}</title>
  <style>
    @page { size: Letter; margin: 12mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important; }
    html, body { height: auto; }
    body {
      font-family: 'Segoe UI', Roboto, Arial, sans-serif;
      color: #111;
      padding: 8px 10px;
      max-width: 720px;
      margin: 0 auto;
      font-size: 11px;
      line-height: 1.4;
      position: relative;
    }
    .header { border-bottom: 3px solid ${colorDoc}; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
    .brand { font-size: 17px; font-weight: 800; color: #0a0a0f; letter-spacing: 0.5px; }
    .brand small { display: block; font-size: 9px; font-weight: 400; color: #666; letter-spacing: 2px; margin-top: 3px; }
    .meta { text-align: right; font-size: 11px; color: #666; }
    .meta strong { color: #111; font-size: 14px; display: block; letter-spacing: 0.5px; }
    .doc-type { text-align: center; font-size: 24px; font-weight: 900; letter-spacing: 5px; color: ${colorDoc}; margin-bottom: 4px; text-transform: uppercase; }
    .doc-sub { text-align: center; font-size: 11px; color: #666; margin-bottom: 14px; }
    .info-block { margin-bottom: 10px; }
    .info-block__title { font-size: 9.5px; font-weight: 700; letter-spacing: 2px; color: #0369a1; margin-bottom: 5px; padding-bottom: 2px; border-bottom: 1px solid #e0e6ed; }
    .info-block__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .ii { padding: 6px 8px; background: #f5f7fa; border-radius: 3px; border-left: 2.5px solid ${colorDoc}; }
    .ii--full { grid-column: 1 / -1; }
    .ii span { display: block; font-size: 8px; letter-spacing: 1px; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; font-weight: 600; }
    .ii strong { font-size: 11.5px; color: #111; word-break: break-word; font-weight: 600; }
    .section-title { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #ffffff; background: #000000; padding: 8px 12px; margin: 14px 0 0; font-weight: 700; border-radius: 3px 3px 0 0; page-break-after: avoid; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; page-break-inside: auto; }
    thead { display: table-header-group; }
    thead th { background: #2f2f42; color: #fff; padding: 6px 10px; text-align: left; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; }
    thead th:last-child { text-align: right; }
    tbody td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    tbody tr { page-break-inside: avoid; }
    tbody tr:last-child td { border-bottom: none; }
    .row-sub { font-size: 9.5px; color: #64748b; margin-top: 2px; font-weight: 500; }
    .row-price { text-align: right; font-weight: 700; white-space: nowrap; }
    .totals { background: #f0f9ff; padding: 14px 12px; border-radius: 6px; margin-bottom: 12px; text-align: center; border: 1.5px solid ${colorDoc}; page-break-inside: avoid; }
    .totals .label { font-size: 9px; letter-spacing: 2.5px; color: #666; margin-bottom: 4px; font-weight: 700; }
    .totals .amount { font-size: 24px; font-weight: 900; color: #0a0a0f; letter-spacing: -0.5px; }
    .totals .sub { font-size: 10px; color: #444; margin-top: 3px; }
    .note { padding: 8px 11px; background: #fff9e6; border-left: 3px solid #fbbf24; border-radius: 0 3px 3px 0; font-size: 10px; color: #555; line-height: 1.5; margin-bottom: 10px; page-break-inside: avoid; }
    .obs { padding: 8px 11px; background: #f0f9ff; border-left: 3px solid ${colorDoc}; border-radius: 0 3px 3px 0; font-size: 10px; color: #555; line-height: 1.5; margin-bottom: 10px; min-height: 40px; page-break-inside: avoid; }
    .obs .obs-empty { color: #94a3b8; font-style: italic; }
    .obs strong { color: #111; }
    .verif { text-align: center; padding: 7px 12px; background: #f0f9ff; border: 1px dashed ${colorDoc}; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 10px; color: ${colorDoc}; letter-spacing: 0.5px; margin-bottom: 14px; page-break-inside: avoid; }
    .verif strong { color: #0c4a6e; font-weight: 700; }
    .firma-wrapper { position: relative; margin-top: 26px; padding-top: 6px; page-break-inside: avoid; break-inside: avoid; }
    .firma-block { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
    .firma-item { text-align: center; }
    .firma-line { border-bottom: 1.3px solid #111; height: 42px; width: 70%; margin: 0 auto 8px; position: relative; }
    .firma-img { position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); max-width: 270px; max-height: 75px; object-fit: contain; pointer-events: none; mix-blend-mode: multiply; }
    .firma-label { font-size: 9px; color: #666; letter-spacing: 1.2px; text-transform: uppercase; font-weight: 700; }
    .firma-name { font-size: 12px; font-weight: 700; color: #111; margin-top: 2px; }
    .firma-info { font-size: 10px; color: #777; margin-top: 2px; }
    .sello-container { position: absolute; top: 55%; left: 50%; transform: translate(-50%, -50%) rotate(-14deg); width: 175px; height: 175px; pointer-events: none; z-index: 5; opacity: 0.78; }
    .sello-svg { width: 100%; height: 100%; display: block; }
    .qr-block { text-align: left; margin: 14px 0 6px; position: relative; z-index: 3; page-break-inside: avoid; }
    .qr-inner { display: inline-block; text-align: center; }
    .qr-container { display: inline-block; width: 58px; height: 58px; background: #fff; padding: 3px; border-radius: 3px; border: 1px solid #ddd; line-height: 0; }
    .qr-container canvas, .qr-container img { width: 100% !important; height: 100% !important; display: block; }
    .qr-label { font-size: 8px; color: #666; letter-spacing: 1px; margin-top: 3px; font-weight: 600; }
    .footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #888; text-align: center; line-height: 1.5; page-break-inside: avoid; }
    .footer strong { color: #111; }
    .watermark-doc { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-28deg); font-family: 'Arial Black', sans-serif; font-size: 110px; font-weight: 900; color: rgba(0, 188, 212, 0.05); letter-spacing: 14px; white-space: nowrap; pointer-events: none; z-index: 0; user-select: none; }
    @media print {
      body { padding: 0; }
      .info-block { break-inside: avoid; }
      .totals, .note, .obs, .verif, .firma-wrapper, .sello-container, .qr-block { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${watermarkHTML}

  <div class="header">
    <div class="brand">
      <svg viewBox="0 0 100 100" width="42" height="42" style="flex-shrink:0;vertical-align:middle;margin-right:10px;">
        <path d="M50 4 L88 26 L88 62 Q88 88 50 96 Q12 88 12 62 L12 26 Z" fill="none" stroke="${colorDoc}" stroke-width="3.5" stroke-linejoin="round"/>
        <circle cx="50" cy="50" r="34" fill="none" stroke="${colorDoc}" stroke-width="1.5" opacity="0.55" stroke-dasharray="3 4"/>
        <circle cx="50" cy="50" r="24" fill="none" stroke="${colorDoc}" stroke-width="1.5" opacity="0.65" stroke-dasharray="2 3"/>
        <path d="M50 36 L60 42 L60 54 L50 60 L40 54 L40 42 Z" fill="${colorDoc}20" stroke="${colorDoc}" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="50" cy="50" r="4" fill="${colorDoc}"/>
        <line x1="50" y1="4"  x2="50" y2="10" stroke="${colorDoc}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="88" y1="26" x2="83" y2="30" stroke="${colorDoc}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="88" y1="62" x2="83" y2="58" stroke="${colorDoc}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="50" y1="96" x2="50" y2="90" stroke="${colorDoc}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="12" y1="62" x2="17" y2="58" stroke="${colorDoc}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="12" y1="26" x2="17" y2="30" stroke="${colorDoc}" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <span style="display:inline-block;vertical-align:middle;">
        ${prov.nombre || 'JCDURANCASADO'}
        <small style="display:block;font-size:8.5px;font-weight:400;color:#666;letter-spacing:1.4px;margin-top:2px;">REDES · CIBERSEGURIDAD · SOPORTE TÉCNICO</small>
      </span>
    </div>
    <div class="meta">
      <strong>${numDoc}</strong>
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

  ${(() => {
    const fechaEmision = rep ? rep.fechaEmision : this.documento.fechaEmision;
    if (!fechaEmision) return '';
    const diasVal = rep ? rep.diasValidez : this.diasValidez;
    const venc = rep ? rep.fechaVencimiento : (() => {
      const d = new Date(fechaEmision);
      d.setDate(d.getDate() + diasVal);
      return d.toISOString().slice(0, 10);
    })();
    return `
    <div class="info-block">
      <div class="info-block__title">INFORMACIÓN DEL DOCUMENTO</div>
      <div class="info-block__grid">
        <div class="ii"><span>Fecha de emisión</span><strong>${fechaEmision}</strong></div>
        <div class="ii"><span>${isFactura ? 'Estado' : 'Válida hasta'}</span><strong style="color:${isFactura ? colorDoc : '#111'};">${isFactura ? (esPagada ? '✓ PAGADA' : '✗ NO PAGADA') : venc + ' (' + diasVal + ' días)'}</strong></div>
      </div>
    </div>`;
  })()}

  <div class="section-title">Detalle del servicio</div>
  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Monto (DOP)</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="2" style="text-align:center;color:#888;padding:14px;">Sin elementos seleccionados</td></tr>'}</tbody>
  </table>

  <div class="totals">
    <div class="label">${isFactura ? (esPagada ? 'TOTAL PAGADO' : 'TOTAL A PAGAR') : 'TOTAL ESTIMADO'}</div>
    <div class="amount">${totalRow}</div>
    <div class="sub">Pesos dominicanos (DOP)</div>
  </div>

  <div class="obs"><strong>Observaciones:</strong> ${observacionesTexto}</div>

  <div class="note">${notaTexto}</div>

  ${codigoVC ? '<div class="verif">🔒 VERIFICACIÓN: <strong>' + codigoVC + '</strong> · ' + date + ' · Ref: ' + numDoc + '</div>' : ''}

  <div class="firma-wrapper">
    ${selloHTML}
    <div class="firma-block">
      <div class="firma-item">
        <div class="firma-line firma-line--con-firma">${firmaHTML}</div>
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
    <div class="qr-inner">
      <div class="qr-container" id="qrContainer"></div>
      <div class="qr-label">VERIFICA EN: jcdurancasado.github.io/inf/verificar.html</div>
    </div>
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
            text: 'https://jcdurancasado.github.io/inf/verificar.html',
            width: 52,
            height: 52,
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