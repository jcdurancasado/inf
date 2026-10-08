/**
 * JCDC · Página de Pagos
 * Sistema de acceso OTP + admin key (reutiliza jcdcapi)
 */
'use strict';

(function () {
  const API = 'https://jcdcapi.vercel.app';
  const WA_PHONE = '18294213163';
  const STORAGE_KEY = 'jcdc_pagos';
  const OTP_TTL = 1200; // 20 min

  const els = {
    content: document.getElementById('pagosContent'),
    status: document.getElementById('pagosStatus'),
    acciones: document.getElementById('pagosAcciones'),
    pdfBtn: document.getElementById('pagosPdfBtn'),
    printBtn: document.getElementById('pagosPrintBtn')
  };

  let expiresAt = null;
  let timerHandle = null;
  let esAdmin = false;

  // ============================================
  // Estado guardado
  // ============================================
  function guardarEstado(data, expiraEn) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        data,
        admin: esAdmin,
        exp: expiraEn ? Date.now() + expiraEn * 1000 : null
      }));
    } catch (e) {}
  }

  function leerEstado() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (obj.exp && Date.now() > obj.exp) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return obj;
    } catch (e) { return null; }
  }

  // ============================================
  // Render
  // ============================================
  function renderPagos(data) {
    if (!els.content) return;
    let html = '';
    (data.bloques || []).forEach(function (bloque) {
      html += '<div class="pagos-bloque" data-reveal>';
      html += '  <h2 class="pagos-bloque__titulo"><i class="fa-solid fa-money-bill-transfer"></i> ' + bloque.titulo + '</h2>';
      html += '  <div class="pagos-grid">';
      (bloque.tarjetas || []).forEach(function (t) {
        html += '<article class="pago-card" data-pay="' + t.id + '">';
        html += '  <div class="pago-card__head">';
        html += '    <span class="pago-card__nombre">' + t.nombre + '</span>';
        html += '  </div>';
        html += '  <div class="pago-card__datos">';
        html += '    <div class="pago-card__row"><span>Titular</span><strong>' + (t.titular || data.titular) + '</strong></div>';
        if (t.cuenta)   html += '    <div class="pago-card__row"><span>Cuenta</span><strong>' + t.cuenta + '</strong></div>';
        if (t.tipo)     html += '    <div class="pago-card__row"><span>Tipo</span><strong>' + t.tipo + '</strong></div>';
        if (t.moneda)   html += '    <div class="pago-card__row"><span>Moneda</span><strong>' + t.moneda + '</strong></div>';
        if (t.routing)  html += '    <div class="pago-card__row"><span>Routing</span><strong>' + t.routing + '</strong></div>';
        if (t.iban)     html += '    <div class="pago-card__row"><span>IBAN</span><strong>' + t.iban + '</strong></div>';
        if (t.bic)      html += '    <div class="pago-card__row"><span>BIC</span><strong>' + t.bic + '</strong></div>';
        if (t.usuario)  html += '    <div class="pago-card__row"><span>Usuario</span><strong>' + t.usuario + '</strong></div>';
        if (t.correo)   html += '    <div class="pago-card__row"><span>Correo</span><strong>' + t.correo + '</strong></div>';
        if (t.cedula || data.cedula) html += '    <div class="pago-card__row"><span>Cédula</span><strong>' + (t.cedula || data.cedula) + '</strong></div>';
        if (t.direccion) html += '    <div class="pago-card__row"><span>Dirección</span><strong>' + t.direccion + '</strong></div>';
        html += '  </div>';
        if (t.url) {
          html += '  <a href="' + t.url + '" target="_blank" rel="noopener" class="pago-card__btn">';
          html += '    <span>Ir al banco</span><i class="fa-solid fa-arrow-up-right-from-square"></i>';
          html += '  </a>';
        }
        html += '</article>';
      });
      html += '  </div>';
      html += '</div>';
    });

    els.content.innerHTML = html;
    if (els.acciones) els.acciones.hidden = false;
    if (typeof Reveal !== 'undefined' && Reveal.init) Reveal.init();
  }

  // Reemplaza TODO el contenido del status (no solo el texto)
  // para que los botones u otros elementos desaparezcan al cambiar de estado.
  function setStatus(html, tipo) {
    if (!els.status) return;
    els.status.hidden = false;
    els.status.className = 'pagos-status pagos-status--' + (tipo || 'info');
    els.status.innerHTML = html;
  }

  function actualizarTimer() {
    if (!expiresAt || esAdmin) return;
    const restante = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    const timerEl = document.getElementById('pagosStatusTimer');
    if (timerEl) {
      const min = Math.floor(restante / 60);
      const seg = String(restante % 60).padStart(2, '0');
      timerEl.textContent = '⏳ ' + min + ':' + seg;
    }
    if (restante <= 0) {
      clearInterval(timerHandle);
      sessionStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  }

  // ============================================
  // Modal de acceso
  // ============================================
  function abrirModal() {
    if (document.getElementById('pagosModal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'pagosModal';
    overlay.className = 'pwd-overlay';
    overlay.innerHTML = `
      <div class="pwd-modal pwd-modal--otp" role="dialog" aria-modal="true">
        <div class="pwd-modal__icon"><i class="fa-solid fa-lock"></i></div>
        <h3 class="pwd-modal__title">ACCESO A PAGOS</h3>
        <p class="pwd-modal__desc">Ingresa tu <strong>código de autorización</strong> o tu <strong>clave de administrador</strong>.<br><span style="font-size:0.82rem;">El código es de <strong>un solo uso</strong> y vence en <strong>20 minutos</strong>.</span></p>
        <div class="pwd-modal__field pwd-modal__field--otp">
          <i class="fa-solid fa-key"></i>
          <input type="password" id="pagosOtpInput" autocomplete="off" placeholder="Código o clave admin" maxlength="50" />
          <button type="button" class="pwd-otp-eye" id="pagosOtpToggle" aria-label="Mostrar">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
        <p class="pwd-modal__error" id="pagosOtpError"></p>
        <div id="pagosOtpTimer" style="display:none; font-family: 'Share Tech Mono', monospace; font-size: 0.85rem; color: #00f0ff; text-align: center; margin-bottom: 12px; letter-spacing: 0.1em;"></div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button type="button" class="pwd-btn" id="pagosOtpSolicitar" style="background: linear-gradient(135deg, rgba(0,240,255,0.15), rgba(0,255,136,0.1)); border-color: #00f0ff; color: #00f0ff; width: 100%;">
            <i class="fa-solid fa-paper-plane"></i> Solicitar código
          </button>
          <div style="display: flex; gap: 10px;">
            <button type="button" class="pwd-btn pwd-btn--ghost" id="pagosOtpCancel" style="flex: 1;">Cancelar</button>
            <button type="button" class="pwd-btn pwd-btn--primary" id="pagosOtpOk" style="flex: 1;">
              <i class="fa-solid fa-unlock"></i> Aceptar
            </button>
          </div>
        </div>
        <button type="button" class="pwd-modal__close" id="pagosOtpClose" aria-label="Cerrar">×</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add('jcdc-modal-open');

    const input = overlay.querySelector('#pagosOtpInput');
    const error = overlay.querySelector('#pagosOtpError');
    const ok = overlay.querySelector('#pagosOtpOk');
    const cancel = overlay.querySelector('#pagosOtpCancel');
    const close = overlay.querySelector('#pagosOtpClose');
    const solicitar = overlay.querySelector('#pagosOtpSolicitar');
    const timerEl = overlay.querySelector('#pagosOtpTimer');
    const toggleEye = overlay.querySelector('#pagosOtpToggle');

    let intervalTimer = null;
    let expiraEnModal = null;

    setTimeout(() => input.focus(), 80);

    function cerrar() {
      if (intervalTimer) clearInterval(intervalTimer);
      document.body.classList.remove('jcdc-modal-open');
      overlay.classList.add('pwd-overlay--closing');
      setTimeout(() => overlay.remove(), 220);
    }

    function actualizarTimerModal() {
      if (!expiraEnModal) return;
      const r = Math.max(0, Math.floor((expiraEnModal - Date.now()) / 1000));
      if (r <= 0) {
        timerEl.textContent = '⏱ Código expirado — solicita otro';
        timerEl.style.color = '#ff3333';
        clearInterval(intervalTimer);
        return;
      }
      const m = Math.floor(r / 60);
      const s = String(r % 60).padStart(2, '0');
      timerEl.style.color = r < 180 ? '#ffaa00' : '#00f0ff';
      timerEl.textContent = '⏱ Tiempo restante: ' + m + ':' + s;
    }

    if (toggleEye) {
      toggleEye.addEventListener('click', (e) => {
        e.preventDefault();
        if (input.type === 'password') {
          input.type = 'text';
          toggleEye.querySelector('i').className = 'fa-solid fa-eye-slash';
        } else {
          input.type = 'password';
          toggleEye.querySelector('i').className = 'fa-solid fa-eye';
        }
      });
    }

    solicitar.addEventListener('click', async () => {
      if (solicitar.disabled) return;
      solicitar.disabled = true;
      solicitar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
      error.textContent = '';
      error.style.color = '#ff3333';

      // Hora RD para el saludo
      let horaRD;
      try {
        horaRD = parseInt(new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Santo_Domingo', hour: 'numeric', hour12: false
        }).format(new Date()), 10);
      } catch (e) { horaRD = new Date().getHours(); }
      const saludo = (horaRD >= 5 && horaRD < 12) ? 'buenos días'
                   : (horaRD >= 12 && horaRD < 19) ? 'buenas tardes'
                   : 'buenas noches';

      const waMsg = encodeURIComponent(
        'Hola Julio C. Durán Casado, ' + saludo + '. Estoy intentando acceder a la página de pagos y el sistema me solicita un código de acceso temporal. ¿Podrías facilitármelo, por favor? Muchas gracias.'
      );
      window.open('https://wa.me/' + WA_PHONE + '?text=' + waMsg, '_blank', 'noopener');

      try {
        const r = await fetch(API + '/api/solicitar-codigo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const d = await r.json();
        if (d.ok) {
          expiraEnModal = Date.now() + (d.expiresIn || OTP_TTL) * 1000;
          timerEl.style.display = 'block';
          actualizarTimerModal();
          intervalTimer = setInterval(actualizarTimerModal, 1000);
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
    });

    async function validar() {
      if (ok.disabled) return;
      const valor = input.value.trim();
      if (!valor) {
        error.textContent = 'Ingresa un código o clave';
        error.style.color = '#ff3333';
        return;
      }
      ok.disabled = true;
      error.textContent = 'Verificando...';
      error.style.color = '#00f0ff';

      try {
        const r = await fetch(API + '/api/pagos-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo: valor })
        });
        const d = await r.json();

        if (d.ok && d.data) {
          esAdmin = !!d.admin;
          expiresAt = d.admin ? null : Date.now() + (d.expiresIn || OTP_TTL) * 1000;
          guardarEstado(d.data, d.admin ? null : (d.expiresIn || OTP_TTL));
          cerrar();
          setTimeout(() => iniciarSesion(d.data), 250);
          if (typeof Toast !== 'undefined') {
            Toast.show(d.admin ? 'Modo administrador activado' : 'Acceso concedido por 20 minutos', 'success', 2000);
          }
        } else {
          error.textContent = d.error || '❌ Código incorrecto';
          error.style.color = '#ff3333';
          input.value = '';
          input.classList.add('pwd-shake');
          setTimeout(() => input.classList.remove('pwd-shake'), 400);
        }
      } catch (e) {
        error.textContent = 'Error de conexión';
        error.style.color = '#ff3333';
      } finally {
        ok.disabled = false;
      }
    }

    ok.addEventListener('click', validar);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); validar(); }
      if (e.key === 'Escape') cerrar();
    });
    cancel.addEventListener('click', cerrar);
    close.addEventListener('click', cerrar);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  }

  // ============================================
  // Iniciar sesión ya desbloqueada
  // ============================================
  function iniciarSesion(data) {
    // Botón de cerrar sesión (común a admin y cliente)
    const logoutBtn =
      '<button type="button" class="cyber-btn cyber-btn--secondary" id="pagosLogoutBtn" style="padding:0.6rem 1.2rem;font-size:0.72rem;gap:0.4rem;">' +
        '<i class="fa-solid fa-right-from-bracket"></i><span>Cerrar sesión</span>' +
      '</button>';

    if (esAdmin) {
      setStatus(
        '<span><i class="fa-solid fa-user-shield"></i> Acceso de administrador concedido</span>' +
        logoutBtn,
        'admin'
      );
      if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    } else {
      setStatus(
        '<span>ACCESO TEMPORAL</span><span id="pagosStatusTimer">—</span>' +
        logoutBtn,
        'cliente'
      );
      if (timerHandle) clearInterval(timerHandle);
      actualizarTimer();
      timerHandle = setInterval(actualizarTimer, 1000);
    }

    // Enganchar el botón de cerrar sesión
    const btn = document.getElementById('pagosLogoutBtn');
    if (btn) btn.addEventListener('click', cerrarSesion);

    renderPagos(data);
  }

  // ============================================
  // Cerrar sesión (admin o cliente)
  // ============================================
  function cerrarSesion() {
    // 1. Borrar el estado guardado
    sessionStorage.removeItem(STORAGE_KEY);

    // 2. Resetear variables
    esAdmin = false;
    expiresAt = null;
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }

    // 3. Volver al estado bloqueado (sin reabrir el modal automáticamente)
    mostrarBloqueado();

    // 4. Aviso al usuario
    if (typeof Toast !== 'undefined') {
      Toast.show('Sesión cerrada correctamente', 'info', 2000);
    }
  }

  // ============================================
  // Botones PDF e imprimir
  // ============================================
  function generarPDF() {
    window.print();
  }

  if (els.pdfBtn) els.pdfBtn.addEventListener('click', generarPDF);
  if (els.printBtn) els.printBtn.addEventListener('click', () => window.print());

  // ============================================
  // ESTADO BLOQUEADO con botón para reabrir modal
  // ============================================
  function mostrarBloqueado() {
    if (els.content) els.content.innerHTML = '';
    if (els.acciones) els.acciones.hidden = true;

    setStatus(
      '<span><i class="fa-solid fa-lock"></i> Contenido bloqueado — necesitas un código de acceso</span>' +
      '<button type="button" class="cyber-btn cyber-btn--primary" id="pagosUnlockBtn" style="padding:0.7rem 1.4rem;font-size:0.75rem;">' +
        '<i class="fa-solid fa-key"></i><span>Colocar contraseña</span>' +
      '</button>',
      'locked'
    );

    const btn = document.getElementById('pagosUnlockBtn');
    if (btn) btn.addEventListener('click', abrirModal);
  }

  // ============================================
  // INIT
  // ============================================
  document.addEventListener('DOMContentLoaded', () => {
    const estado = leerEstado();
    if (estado && estado.data) {
      esAdmin = !!estado.admin;
      expiresAt = estado.exp ? estado.exp : null;
      iniciarSesion(estado.data);
    } else {
      mostrarBloqueado();
      abrirModal();
    }
  });
})();