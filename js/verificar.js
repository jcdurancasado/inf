/* ============================================================
   JCDC · VERIFICADOR DE DOCUMENTOS (v2 con Firestore)
   ------------------------------------------------------------
   - Lectura pública de Firestore (verificar)
   - Login admin con Firebase Auth (email + contraseña)
   - Admin puede: emitir factura, marcar pagada/no pagada,
     comentar, servicio realizado, eliminar comentarios
   - Panel admin con lista de TODOS los documentos
   ============================================================ */

(function () {
  'use strict';

  // Referencias DOM principales
  var input = document.getElementById('verifyInput');
  var btn = document.getElementById('verifyBtn');
  var result = document.getElementById('verifyResult');

  // Estado en memoria
  var docActual = null;       // documento actualmente verificado
  var adminUnlocked = false;  // ¿admin logueado?
  var adminEmail = null;      // email del admin logueado
  var vieneDeCorreo = false;  // ¿llegó con ?code= desde el correo?

  // ============================================================
  // HELPERS
  // ============================================================
  function normalizar(str) { return String(str || '').trim().toUpperCase(); }

  function formatearMoneda(valor, moneda) {
    if (moneda === 'DOP') return 'RD$' + Number(valor || 0).toLocaleString('es-DO');
    return '$' + Number(valor || 0).toLocaleString('en-US') + ' USD';
  }

  function fechaLegible() {
    return new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function fechaActualHora() {
    return fechaLegible() + ' - ' + new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
  }

  function generarNumeroFactura() {
    var now = new Date();
    var hoy = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    var contador = Math.floor(Math.random() * 900 + 100); // Fallback
    return 'FAC-' + hoy + '-' + String(contador).padStart(3, '0');
  }

  // Genera código VC de forma determinística (mismo algoritmo que cotizador)
  function generarCodigoVC(numDoc, fecha, contenido) {
    var sec = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.security && window.SOPORTE_CONFIG.security.docSecret) || 'jcdc';
    var data = numDoc + '|' + fecha + '|' + contenido + '|' + sec;
    var h = 5381;
    for (var i = 0; i < data.length; i++) { h = ((h << 5) + h + data.charCodeAt(i)) >>> 0; }
    var hex = h.toString(16).toUpperCase().padStart(8, '0');
    return 'VC-' + hex.slice(0, 4) + '-' + hex.slice(4, 8);
  }

  // ============================================================
  // FIRESTORE HELPERS
  // ============================================================

  // Consultar un documento por codigoVC o numero
  async function buscarRegistro(codigo) {
    var q = normalizar(codigo);
    if (!q) return [];

    var encontrados = [];

    // 1. Buscar por codigoVC
    try {
      var snap1 = await window.db.collection('documentos').where('codigoVC', '==', q).get();
      snap1.forEach(function (doc) { encontrados.push(Object.assign({ _id: doc.id }, doc.data())); });
    } catch (e) { console.error('[Firestore] Error buscando por codigoVC:', e); }

    // 2. Buscar por numero
    try {
      var snap2 = await window.db.collection('documentos').where('numero', '==', q).get();
      snap2.forEach(function (doc) {
        // Evitar duplicados
        if (!encontrados.find(function (r) { return r._id === doc.id; })) {
          encontrados.push(Object.assign({ _id: doc.id }, doc.data()));
        }
      });
    } catch (e) { console.error('[Firestore] Error buscando por numero:', e); }

    // 3. Buscar por facturaVinculada
    try {
      var snap3 = await window.db.collection('documentos').where('facturaVinculada', '==', q).get();
      snap3.forEach(function (doc) {
        if (!encontrados.find(function (r) { return r._id === doc.id; })) {
          encontrados.push(Object.assign({ _id: doc.id }, doc.data()));
        }
      });
    } catch (e) { /* Ignorar */ }

    return encontrados;
  }

  // Leer todos los documentos (para panel admin)
  async function listarTodos() {
    try {
      var snap = await window.db.collection('documentos').orderBy('timestamp', 'desc').limit(200).get();
      var arr = [];
      snap.forEach(function (doc) { arr.push(Object.assign({ _id: doc.id }, doc.data())); });
      return arr;
    } catch (e) {
      console.error('[Firestore] Error listando todos:', e);
      return [];
    }
  }

  // Actualizar un documento
  async function actualizarDoc(id, campos) {
    try {
      await window.db.collection('documentos').doc(id).update(campos);
      return true;
    } catch (e) {
      console.error('[Firestore] Error actualizando:', e);
      return false;
    }
  }

  // ============================================================
  // RENDER DE RESULTADOS
  // ============================================================
  function render(records, code) {
    result.className = 'verify-result show';
    if (!records.length) {
      result.classList.add('verify-result--error');
      result.innerHTML =
        '<div class="verify-result__head"><i class="fa-solid fa-circle-xmark"></i><strong>NO ENCONTRADO</strong></div>' +
        '<div class="verify-row"><span>Código ingresado</span><strong>' + code + '</strong></div>' +
        '<div class="verify-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>No se encontró ningún documento con ese código.</p></div>';
      return;
    }
    result.classList.add('verify-result--ok');
    var html = '<div class="verify-result__head"><i class="fa-solid fa-circle-check"></i><strong>DOCUMENTO VERIFICADO</strong></div>';
    records.forEach(function (r, i) {
      if (records.length > 1) html += '<div style="margin-top:1rem;font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted);letter-spacing:0.1em;">COINCIDENCIA ' + (i+1) + ' DE ' + records.length + '</div>';
      var tipoTag = r.tipo === 'factura' ? 'tag--factura' : 'tag--cotizacion';
      html += '<div class="verify-row"><span>Tipo</span><strong class="tag ' + tipoTag + '">' + (r.tipo || '-').toUpperCase() + '</strong></div>';
      html += '<div class="verify-row"><span>Número</span><strong>' + (r.numero || '-') + '</strong></div>';
      if (r.codigoVC) html += '<div class="verify-row"><span>Código VC</span><strong>' + r.codigoVC + '</strong></div>';
      html += '<div class="verify-row"><span>Fecha de emisión</span><strong>' + (r.fecha || '-') + '</strong></div>';
      html += '<div class="verify-row"><span>Monto total</span><strong>' + formatearMoneda(r.total, r.moneda) + '</strong></div>';
      if (r.cliente && r.cliente !== '-') html += '<div class="verify-row"><span>Cliente</span><strong>' + r.cliente + '</strong></div>';
      if (r.tipo === 'factura') {
        var estadoTag = r.estado === 'no-pagada' ? 'tag--no-pagada' : 'tag--pagada';
        var estadoTxt = r.estado === 'no-pagada' ? 'NO PAGADA' : 'PAGADA';
        html += '<div class="verify-row"><span>Estado</span><strong class="tag ' + estadoTag + '">' + estadoTxt + '</strong></div>';
      }
      if (r.cotizacionOrigen) html += '<div class="verify-row"><span>Cotización origen</span><strong style="color:var(--neon-purple);">' + r.cotizacionOrigen + '</strong></div>';
      if (r.facturaVinculada) {
        html += '<div class="verify-row"><span>Factura emitida</span><strong style="color:var(--neon-green);">' + r.facturaVinculada + '</strong></div>';
        html += '<div class="verify-row"><span>Cómo verificarla</span><strong style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);">Pega ese número arriba y pulsa Verificar</strong></div>';
      }
      if (r.comentarios && r.comentarios.length) {
        html += '<div style="margin-top:1rem;padding:0.75rem 1rem;background:rgba(255,238,0,0.05);border-left:3px solid var(--neon-yellow);border-radius:0 4px 4px 0;">';
        html += '<div style="font-family:var(--font-display);font-size:0.75rem;color:var(--neon-yellow);letter-spacing:0.08em;margin-bottom:0.5rem;"><i class="fa-solid fa-comment-dots"></i> MENSAJE DEL PROVEEDOR</div>';
        r.comentarios.forEach(function (c) {
          html += '<div class="verify-comment-wrap" style="margin-bottom:0.6rem;">';
          html += '<div style="font-size:0.88rem;color:var(--text-primary);line-height:1.55;margin-bottom:0.35rem;">' + c.texto + '</div>';
          html += '<div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-muted);letter-spacing:0.05em;">' + (c.fecha || '') + '</div>';
          html += '<button type="button" class="verify-comment-del" data-id="' + r._id + '" data-ts="' + (c.timestamp || 0) + '" title="Eliminar comentario"><i class="fa-solid fa-trash"></i></button>';
          html += '</div>';
        });
        html += '</div>';
      }
      if (r.historial && r.historial.length) {
        html += '<div style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border-subtle);">';
        html += '<div style="font-family:var(--font-display);font-size:0.75rem;color:var(--neon-cyan);letter-spacing:0.05em;margin-bottom:0.5rem;"><i class="fa-solid fa-clock-rotate-left"></i> HISTORIAL</div>';
        r.historial.forEach(function (h) {
          html += '<div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.35rem;">· <strong style="color:var(--text-primary);">' + (h.titulo || h.evento) + '</strong>' + (h.descripcion ? ' - ' + h.descripcion : '') + '<button type="button" class="verify-hist-del" data-id="' + r._id + '" data-ts="' + (h.timestamp || 0) + '"><i class="fa-solid fa-trash"></i></button><br><span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-muted);">' + (h.fecha || '') + '</span></div>';
        });
        html += '</div>';
      }
      if (records.length > 1) html += '<hr style="border:none;border-top:1px dashed var(--border-subtle);margin:0.75rem 0;">';
    });

    // Botón DESCARGAR (solo si viene del correo ?code=)
    var mostrarAcciones = (records.length === 1) && vieneDeCorreo;
    if (mostrarAcciones) {
      html += '<div class="verify-actions">';
      html += '  <button type="button" class="cyber-btn cyber-btn--primary cyber-btn--large" id="verifyDownloadBtn">';
      html += '    <span>DESCARGAR PDF</span><i class="fa-solid fa-file-pdf"></i>';
      html += '  </button>';
      html += '</div>';
    }

    result.innerHTML = html;

    if (mostrarAcciones) {
      var dlBtn = document.getElementById('verifyDownloadBtn');
      if (dlBtn) dlBtn.addEventListener('click', function () {
        if (docActual) descargarDocPDF(docActual);
      });
    }
  }

  // ============================================================
  // AUTO-DETECCIÓN DE BOTONES ADMIN
  // ============================================================
  function actualizarBotonesAdmin() {
    var adminContexto = document.getElementById('adminContexto');
    var btnEmitirPagada = document.getElementById('adminEmitirFactura');
    var btnEmitirNoPagada = document.getElementById('adminEmitirFacturaNoPagada');
    var btnPagada = document.getElementById('adminMarcarPagada');
    var btnNoPagada = document.getElementById('adminMarcarNoPagada');
    var btnServicio = document.getElementById('adminMarcarServicio');
    var btnPDF = document.getElementById('adminDescargarPDF');

    if (!adminContexto) return;

    if (!docActual) {
      adminContexto.innerHTML = 'Busca un documento arriba para ver las acciones disponibles.';
      if (btnEmitirPagada) btnEmitirPagada.disabled = true;
      if (btnEmitirNoPagada) btnEmitirNoPagada.disabled = true;
      if (btnPagada) btnPagada.disabled = true;
      if (btnNoPagada) btnNoPagada.disabled = true;
      if (btnServicio) btnServicio.disabled = true;
      if (btnPDF) { btnPDF.disabled = true; btnPDF.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Descargar PDF'; }
      return;
    }

    var esCotizacion = docActual.tipo === 'cotizacion';
    var esFactura = docActual.tipo === 'factura';
    var tieneFactura = !!docActual.facturaVinculada;
    var esFacturaPagada = esFactura && docActual.estado === 'pagada';
    var esFacturaNoPagada = esFactura && docActual.estado === 'no-pagada';

    if (esCotizacion && !tieneFactura) adminContexto.innerHTML = 'Documento actual: <strong>COTIZACIÓN ' + docActual.numero + '</strong>. Puedes emitir factura, comentar, o marcar servicio realizado.';
    else if (esCotizacion && tieneFactura) adminContexto.innerHTML = 'Documento actual: <strong>COTIZACIÓN ' + docActual.numero + '</strong> · Factura vinculada: <strong>' + docActual.facturaVinculada + '</strong>.';
    else if (esFacturaPagada) adminContexto.innerHTML = 'Documento actual: <strong>FACTURA PAGADA ' + docActual.numero + '</strong>.';
    else if (esFacturaNoPagada) adminContexto.innerHTML = 'Documento actual: <strong>FACTURA NO PAGADA ' + docActual.numero + '</strong>. Puedes marcarla como PAGADA cuando el cliente pague.';

    if (btnEmitirPagada) btnEmitirPagada.disabled = !esCotizacion || tieneFactura;
    if (btnEmitirNoPagada) btnEmitirNoPagada.disabled = !esCotizacion || tieneFactura;
    if (btnPagada) btnPagada.disabled = !esFacturaNoPagada;
    if (btnNoPagada) btnNoPagada.disabled = !esFacturaPagada;
    if (btnServicio) btnServicio.disabled = false;
    if (btnPDF) {
      btnPDF.disabled = false;
      if (tieneFactura) btnPDF.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Descargar FACTURA emitida (' + docActual.facturaVinculada + ')';
      else if (esFactura) btnPDF.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Descargar FACTURA actual';
      else btnPDF.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Descargar COTIZACIÓN actual';
    }
  }

  // ============================================================
  // VERIFICAR (búsqueda pública en Firestore)
  // ============================================================
  async function verificar() {
    var code = input.value.trim();
    if (!code) {
      result.className = 'verify-result show verify-result--error';
      result.innerHTML = '<div class="verify-result__head"><i class="fa-solid fa-circle-xmark"></i><strong>INGRESA UN CÓDIGO</strong></div>';
      docActual = null;
      actualizarBotonesAdmin();
      return;
    }

    // Estado de carga
    result.className = 'verify-result show';
    result.innerHTML = '<div style="text-align:center;padding:2rem;"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:var(--neon-cyan);"></i><p style="font-family:var(--font-mono);color:var(--text-muted);margin-top:1rem;letter-spacing:0.05em;">Verificando documento, por favor espere...</p></div>';

    var regs = await buscarRegistro(code);
    docActual = regs.length ? regs[0] : null;
    render(regs, code);
    actualizarBotonesAdmin();
  }

  // ============================================================
  // LOGIN ADMIN (Firebase Auth)
  // ============================================================
  function pedirPassword() {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'verify-pwd-overlay';
      overlay.innerHTML =
        '<div class="verify-pwd">' +
        '  <h3><i class="fa-solid fa-lock"></i> ACCESO ADMIN</h3>' +
        '  <p>Ingresa tus credenciales de administrador.</p>' +
        '  <input type="email" id="vPwdEmail" autocomplete="off" placeholder="Email" style="margin-bottom:8px;" />' +
        '  <input type="password" id="vPwdInput" autocomplete="new-password" placeholder="Contraseña" />' +
        '  <p class="err" id="vPwdError"></p>' +
        '  <div class="verify-pwd__actions">' +
        '    <button type="button" class="cancel" id="vPwdCancel">Cancelar</button>' +
        '    <button type="button" class="ok" id="vPwdOk">Entrar</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(overlay);
      document.body.classList.add('jcdc-modal-open');

      var emailEl = overlay.querySelector('#vPwdEmail');
      var inp = overlay.querySelector('#vPwdInput');
      var errEl = overlay.querySelector('#vPwdError');
      var okBtn = overlay.querySelector('#vPwdOk');
      var cancelBtn = overlay.querySelector('#vPwdCancel');

      setTimeout(function () { emailEl.focus(); }, 80);

      function cerrar(r) {
        document.body.classList.remove('jcdc-modal-open');
        overlay.remove();
        resolve(r);
      }

      async function intentar() {
        var email = emailEl.value.trim();
        var pass = inp.value;
        if (!email || !pass) { errEl.textContent = 'Completa email y contraseña'; return; }
        okBtn.disabled = true;
        okBtn.textContent = 'Verificando...';
        try {
          await window.auth.signInWithEmailAndPassword(email, pass);
          errEl.textContent = '';
          cerrar(true);
        } catch (e) {
          okBtn.disabled = false;
          okBtn.textContent = 'Entrar';
          var code = e.code || '';
          var msg = 'Error al iniciar sesión';
          if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
            msg = '❌ Contraseña incorrecta';
          } else if (code === 'auth/user-not-found') {
            msg = '❌ Usuario no encontrado';
          } else if (code === 'auth/invalid-email') {
            msg = '❌ Email inválido';
          } else if (code === 'auth/too-many-requests') {
            msg = '⏳ Demasiados intentos. Espera un momento.';
          } else if (code === 'auth/network-request-failed') {
            msg = '⚠️ Error de conexión';
          }
          errEl.textContent = msg;
          console.warn('[JCDC Auth] Error:', code, e.message);
        }
      }

      okBtn.addEventListener('click', intentar);
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') intentar();
        if (e.key === 'Escape') cerrar(false);
      });
      emailEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') inp.focus();
      });
      cancelBtn.addEventListener('click', function () { cerrar(false); });
    });
  }

  // ============================================================
  // ACTUALIZAR DOCUMENTO ACTUAL (helper)
  // ============================================================
  async function actualizarDocActual(callback) {
    if (!docActual) { alert('Primero busca un documento.'); return false; }
    if (!adminUnlocked) { alert('Solo admin.'); return false; }

    // Aplicar cambio al objeto local
    callback(docActual);

    // Persistir en Firestore
    var ok = await actualizarDoc(docActual._id, {
      estado: docActual.estado,
      historial: docActual.historial,
      comentarios: docActual.comentarios,
      facturaVinculada: docActual.facturaVinculada || null,
      cotizacionOrigen: docActual.cotizacionOrigen || null
    });

    if (ok) {
      render([docActual], docActual.codigoVC || docActual.numero);
      actualizarBotonesAdmin();
    } else {
      alert('Error guardando en Firestore. Revisa la consola.');
    }
    return ok;
  }

  // ============================================================
  // EMITIR FACTURA (crea nueva factura a partir de cotización)
  // ============================================================
  async function emitirFactura(estadoFactura) {
    if (!docActual) { alert('Primero busca una cotización.'); return; }
    if (!adminUnlocked) { alert('Solo admin.'); return; }
    if (docActual.tipo === 'factura') { alert('Este documento ya es una FACTURA.'); return; }
    if (docActual.facturaVinculada) { alert('Esta cotización ya tiene la factura ' + docActual.facturaVinculada + ' emitida.'); return; }

    var esPagada = estadoFactura === 'pagada';
    var etiqueta = esPagada ? 'PAGADA' : 'NO PAGADA';
    if (!confirm('¿Emitir FACTURA ' + etiqueta + ' a partir de esta cotización?')) return;

    var numFactura = generarNumeroFactura();
    var fechaHoy = new Date().toISOString().slice(0, 10);
    var codigoVC = generarCodigoVC(numFactura, fechaHoy, String(docActual.total || 0));
    var fechaTxt = fechaLegible();

    var factura = {
      tipo: 'factura',
      estado: estadoFactura,
      numero: numFactura,
      fecha: fechaTxt,
      fechaISO: new Date().toISOString(),
      total: docActual.total,
      moneda: docActual.moneda,
      cliente: docActual.cliente,
      equipo: docActual.equipo,
      codigoVC: codigoVC,
      cotizacionOrigen: docActual.numero,
      timestamp: Date.now(),
      historial: [{
        evento: 'emision',
        titulo: 'Factura emitida (' + etiqueta + ')',
        descripcion: 'Generada a partir de la cotización ' + docActual.numero,
        fecha: fechaTxt,
        timestamp: Date.now()
      }],
      comentarios: [],
      snapshot: docActual.snapshot || {}
    };

    try {
      // Crear la factura en Firestore
      await window.db.collection('documentos').doc(codigoVC).set(factura);
    } catch (e) {
      console.error('Error creando factura:', e);
      alert('Error creando factura en Firestore.');
      return;
    }

    // Actualizar la cotización origen
    docActual.facturaVinculada = numFactura;
    docActual.historial = docActual.historial || [];
    docActual.historial.push({
      evento: esPagada ? 'pagada' : 'no-pagada',
      titulo: 'Cotización convertida en FACTURA ' + etiqueta,
      descripcion: 'Se emitió la factura ' + numFactura + ' (código ' + codigoVC + ').',
      fecha: fechaTxt,
      timestamp: Date.now()
    });
    docActual.comentarios = docActual.comentarios || [];
    docActual.comentarios.push({
      texto: 'Se emitió la factura ' + numFactura + ' (' + etiqueta + '). Para verificarla, copia el número ' + numFactura + ' y pégalo en el buscador.',
      fecha: fechaTxt,
      timestamp: Date.now()
    });

    await actualizarDoc(docActual._id, {
      facturaVinculada: numFactura,
      historial: docActual.historial,
      comentarios: docActual.comentarios
    });

    render([docActual], docActual.codigoVC || docActual.numero);
    actualizarBotonesAdmin();
    alert('✅ Factura emitida como ' + etiqueta + '\n\nNúmero: ' + numFactura + '\nCódigo VC: ' + codigoVC);
  }

  // ============================================================
  // PDF (SIN CAMBIOS — usa snapshot del registro)
  // ============================================================
  function getQrDataUrl() {
    try {
      var tmp = document.createElement('div');
      tmp.style.position = 'absolute'; tmp.style.left = '-9999px';
      document.body.appendChild(tmp);
      if (typeof QRCode === 'undefined') { document.body.removeChild(tmp); return ''; }
      new QRCode(tmp, { text: 'https://jcdurancasado.github.io/inf/verificar.html', width: 92, height: 92, colorDark: '#0a0a0f', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
      var canvas = tmp.querySelector('canvas');
      var dataUrl = canvas ? canvas.toDataURL('image/png') : '';
      document.body.removeChild(tmp);
      return dataUrl;
    } catch (e) { return ''; }
  }

  function generarSello(fecha, numDoc, tipoDoc, estado) {
    var docCfg = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.documentos) || {};
    var prov = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.proveedor) || {};
    var nombre = (prov.nombre || 'JCDURÁN CASADO').toUpperCase();

    var color, texto, fontBig, letterSpacing;

    if (tipoDoc === 'factura') {
      var esPagada = estado !== 'no-pagada';
      color = esPagada ? (docCfg.colorSelloPagado || '#0a7f2e') : (docCfg.colorSelloNoPagada || '#c81e1e');
      texto = esPagada ? 'PAGADO' : 'NO PAGADA';
      fontBig = esPagada ? 34 : 21;
      letterSpacing = esPagada ? 4 : 2.5;
    } else {
      color = docCfg.colorSelloCotizacion || '#0369a1';
      texto = 'COTIZACIÓN';
      fontBig = 21;
      letterSpacing = 1;
    }

    return '<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" class="sello-svg">' +
      '<defs>' +
      '<path id="arcT-' + numDoc + '" d="M 23,110 A 87,87 0 0 1 197,110" fill="none"/>' +
      '<path id="arcB-' + numDoc + '" d="M 15,110 A 95,95 0 0 0 205,110" fill="none"/>' +
      '<filter id="rough-' + numDoc + '"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0.5" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '</defs>' +
      '<g filter="url(#rough-' + numDoc + ')" fill="none" stroke="' + color + '">' +
      '<circle cx="110" cy="110" r="104" stroke-width="3.5"/>' +
      '<circle cx="110" cy="110" r="80" stroke-width="1.2"/>' +
      '<text font-family="Arial Black, sans-serif" font-size="13" font-weight="900" fill="' + color + '" stroke="none" letter-spacing="2"><textPath href="#arcT-' + numDoc + '" startOffset="50%" text-anchor="middle">' + nombre + '</textPath></text>' +
      '<text font-family="Arial, sans-serif" font-size="8.5" fill="' + color + '" stroke="none" letter-spacing="1.2"><textPath href="#arcB-' + numDoc + '" startOffset="50%" text-anchor="middle">REDES · CIBERSEGURIDAD · SOPORTE TÉCNICO</textPath></text>' +
      '<line x1="30" y1="100" x2="190" y2="100" stroke-width="1.2"/>' +
      '<text x="110" y="122" font-family="Arial Black, sans-serif" font-size="' + fontBig + '" font-weight="900" fill="' + color + '" stroke="none" text-anchor="middle" letter-spacing="' + letterSpacing + '">' + texto + '</text>' +
      '<line x1="30" y1="136" x2="190" y2="136" stroke-width="1.2"/>' +
      '<text x="110" y="151" font-family="Arial, sans-serif" font-size="7.5" fill="' + color + '" stroke="none" text-anchor="middle" letter-spacing="2">FECHA</text>' +
      '<text x="110" y="162" font-family="Arial Black, sans-serif" font-size="9" fill="' + color + '" stroke="none" text-anchor="middle">' + fecha + '</text>' +
      '<text x="110" y="175" font-family="Arial, sans-serif" font-size="7" fill="' + color + '" stroke="none" text-anchor="middle" letter-spacing="0.8">' + numDoc + '</text>' +
      '</g></svg>';
  }

  function generarDocHTML(record, mode) {
    mode = mode || 'view';
    var autoPrintFlag = (mode === 'print');
    var autoDownloadFlag = (mode === 'download');
    var s = record.snapshot || {};
    var prov = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.proveedor) || {};
    var docCfg = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.documentos) || {};
    var isFactura = record.tipo === 'factura';
    var esPagada = record.estado === 'pagada';
    var numDoc = record.numero;
    var tituloDoc = isFactura ? 'FACTURA' : 'COTIZACIÓN';
    var rate = s.rate || 60;
    var lines = s.lines || [];
    var total = record.total || 0;
    var isReparacion = record.moneda === 'DOP';
    var dop = isReparacion ? total : Math.round(total * rate);
    var usd = isReparacion ? null : total;
    var date = record.fecha;
    var totalRow = isReparacion ? ('RD$' + dop.toLocaleString('es-DO')) : ('$' + usd.toLocaleString('en-US'));

    var colorDoc;
    if (isFactura) {
      colorDoc = esPagada ? (docCfg.colorSelloPagado || '#0a7f2e') : (docCfg.colorSelloNoPagada || '#c81e1e');
    } else {
      colorDoc = docCfg.colorSelloCotizacion || '#0369a1';
    }

    var cli = s.cliente || {};
    var clienteBlock = '';
    if (cli.nombre || cli.cedula || cli.telefono || cli.email || cli.direccion) {
      clienteBlock = '<div class="info-block"><div class="info-block__title">DATOS DEL CLIENTE</div><div class="info-block__grid">' +
        '<div class="ii"><span>Cliente</span><strong>' + (cli.nombre || '—') + '</strong></div>' +
        '<div class="ii"><span>Cédula / RNC</span><strong>' + (cli.cedula || '—') + '</strong></div>' +
        '<div class="ii"><span>Teléfono</span><strong>' + (cli.telefono || '—') + '</strong></div>' +
        '<div class="ii"><span>Email</span><strong>' + (cli.email || '—') + '</strong></div>' +
        (cli.direccion ? '<div class="ii ii--full"><span>Dirección</span><strong>' + cli.direccion + '</strong></div>' : '') +
        '</div></div>';
    }

    var equipoBlock = '';
    if (s.equipo) {
      var eq = (window.SOPORTE_CONFIG.equipos || []).find(function (e) { return e.id === s.equipo; });
      var eqLabel = eq ? eq.label : s.equipo;
      equipoBlock = '<div class="info-block"><div class="info-block__title">EQUIPO / SERVICIO</div><div class="info-block__grid">' +
        '<div class="ii ii--full"><span>Equipo</span><strong>' + eqLabel + (s.marca ? ' · ' + s.marca : '') + (s.modelo ? ' ' + s.modelo : '') + '</strong></div>' +
        '</div></div>';
    }

    var rows = '';
    lines.forEach(function (l) {
      var sub = l.sub ? '<div class="row-sub">' + l.sub + '</div>' : '';
      var price = isReparacion ? ('RD$' + Number(l.value).toLocaleString('es-DO')) : ('$' + Number(l.value).toLocaleString('en-US'));
      rows += '<tr><td>' + l.label + sub + '</td><td class="row-price">' + price + '</td></tr>';
    });

    var hora = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
    var garantiaDias = s.garantia || 30;
    var garantiaTexto = garantiaDias === 0 ? 'Este servicio <strong>no incluye garantía</strong>.' : 'Garantía de <strong>' + garantiaDias + ' días</strong> sobre la reparación.';
    var notaTexto = isFactura
      ? '<strong>Nota:</strong> Esta factura corresponde al servicio descrito arriba. ' + garantiaTexto + ' Gracias por su preferencia.'
      : '<strong>Nota:</strong> Cotización generada desde el cotizador web <strong>jcdurancasado.github.io/inf</strong> el ' + date + ' a las ' + hora + '. Válida por ' + (s.diasValidez || 7) + ' días.';

    var observacionesTexto = (s.descripcion && s.descripcion.trim())
      ? s.descripcion
      : '<span class="obs-empty">Sin observaciones registradas</span>';

    var watermarkHTML = (!isFactura && docCfg.mostrarWatermark !== false) ? '<div class="watermark-doc">COTIZACIÓN</div>' : '';
    var selloHTML = '<div class="sello-container">' + generarSello(date, numDoc, isFactura ? 'factura' : 'cotizacion', record.estado) + '</div>';
    var qrDataUrl = getQrDataUrl();
    var qrHTML = qrDataUrl ? '<div class="qr-block"><div class="qr-inner"><div class="qr-container"><img src="' + qrDataUrl + '" alt="QR" style="width:100%;height:100%;display:block;"></div><div class="qr-label">VERIFICA EN: jcdurancasado.github.io/inf/verificar.html</div></div></div>' : '';

    var svgLogo = '<svg viewBox="0 0 100 100" width="42" height="42" style="flex-shrink:0;vertical-align:middle;margin-right:10px;">' +
      '<path d="M50 4 L88 26 L88 62 Q88 88 50 96 Q12 88 12 62 L12 26 Z" fill="none" stroke="' + colorDoc + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<circle cx="50" cy="50" r="34" fill="none" stroke="' + colorDoc + '" stroke-width="1.5" opacity="0.55" stroke-dasharray="3 4"/>' +
      '<circle cx="50" cy="50" r="24" fill="none" stroke="' + colorDoc + '" stroke-width="1.5" opacity="0.65" stroke-dasharray="2 3"/>' +
      '<path d="M50 36 L60 42 L60 54 L50 60 L40 54 L40 42 Z" fill="' + colorDoc + '20" stroke="' + colorDoc + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="50" cy="50" r="4" fill="' + colorDoc + '"/>' +
      '<line x1="50" y1="4" x2="50" y2="10" stroke="' + colorDoc + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="88" y1="26" x2="83" y2="30" stroke="' + colorDoc + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="88" y1="62" x2="83" y2="58" stroke="' + colorDoc + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="50" y1="96" x2="50" y2="90" stroke="' + colorDoc + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="12" y1="62" x2="17" y2="58" stroke="' + colorDoc + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="12" y1="26" x2="17" y2="30" stroke="' + colorDoc + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '</svg>';

    var css = '@page{size:Letter;margin:12mm 10mm;}*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}html,body{height:auto;}' +      'body{font-family:"Segoe UI",Roboto,Arial,sans-serif;color:#111;padding:8px 10px;max-width:720px;margin:0 auto;font-size:11px;line-height:1.4;position:relative;}' +
      '.header{border-bottom:3px solid ' + colorDoc + ';padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;gap:12px;}' +
      '.brand{font-size:17px;font-weight:800;color:#0a0a0f;letter-spacing:0.5px;}.brand small{display:block;font-size:9px;font-weight:400;color:#666;letter-spacing:2px;margin-top:3px;}' +
      '.meta{text-align:right;font-size:11px;color:#666;}.meta strong{color:#111;font-size:14px;display:block;letter-spacing:0.5px;}' +
      '.doc-type{text-align:center;font-size:24px;font-weight:900;letter-spacing:5px;color:' + colorDoc + ';margin-bottom:4px;text-transform:uppercase;}' +
      '.doc-sub{text-align:center;font-size:11px;color:#666;margin-bottom:14px;}' +
      '.info-block{margin-bottom:10px;}.info-block__title{font-size:9.5px;font-weight:700;letter-spacing:2px;color:#0369a1;margin-bottom:5px;padding-bottom:2px;border-bottom:1px solid #e0e6ed;}' +
      '.info-block__grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;}' +
      '.ii{padding:6px 8px;background:#f5f7fa;border-radius:3px;border-left:2.5px solid ' + colorDoc + ';}.ii--full{grid-column:1/-1;}' +
      '.ii span{display:block;font-size:8px;letter-spacing:1px;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;font-weight:600;}' +
      '.ii strong{font-size:11.5px;color:#111;word-break:break-word;font-weight:600;}' +
      '.section-title{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#ffffff;background:#000000;padding:8px 12px;margin:14px 0 0;font-weight:700;border-radius:3px 3px 0 0;page-break-after:avoid;}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px;page-break-inside:auto;}' +
      'thead{display:table-header-group;}thead th{background:#2f2f42;color:#fff;padding:6px 10px;text-align:left;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;}' +      'thead th:last-child{text-align:right;}tbody td{padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;}tbody tr{page-break-inside:avoid;}tbody tr:last-child td{border-bottom:none;}' +
      '.row-sub{font-size:9.5px;color:#64748b;margin-top:2px;font-weight:500;}.row-price{text-align:right;font-weight:700;white-space:nowrap;}' +      '.totals{background:#f0f9ff;padding:14px 12px;border-radius:6px;margin-bottom:12px;text-align:center;border:1.5px solid ' + colorDoc + ';page-break-inside:avoid;}' +      '.totals .label{font-size:9px;letter-spacing:2.5px;color:#666;margin-bottom:4px;font-weight:700;}' +
      '.totals .amount{font-size:24px;font-weight:900;color:#0a0a0f;letter-spacing:-0.5px;}.totals .sub{font-size:10px;color:#444;margin-top:3px;}' +
      '.note{padding:8px 11px;background:#fff9e6;border-left:3px solid #fbbf24;border-radius:0 3px 3px 0;font-size:10px;color:#555;line-height:1.5;margin-bottom:10px;page-break-inside:avoid;}' +
      '.obs{padding:8px 11px;background:#f0f9ff;border-left:3px solid ' + colorDoc + ';border-radius:0 3px 3px 0;font-size:10px;color:#555;line-height:1.5;margin-bottom:10px;min-height:40px;page-break-inside:avoid;}' +
      '.obs .obs-empty{color:#94a3b8;font-style:italic;}.obs strong{color:#111;}' +
      '.verif{text-align:center;padding:7px 12px;background:#f0f9ff;border:1px dashed ' + colorDoc + ';border-radius:4px;font-family:"Courier New",monospace;font-size:10px;color:' + colorDoc + ';letter-spacing:0.5px;margin-bottom:14px;page-break-inside:avoid;}' +
      '.verif strong{color:#0c4a6e;font-weight:700;}' +
      '.firma-wrapper{position:relative;margin-top:26px;padding-top:6px;page-break-inside:avoid;break-inside:avoid;}' +
      '.firma-block{display:grid;grid-template-columns:1fr 1fr;gap:60px;}.firma-item{text-align:center;}' +
      '.firma-line{border-bottom:1.3px solid #111;height:42px;width:70%;margin:0 auto 8px;}' +
      '.firma-label{font-size:9px;color:#666;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;}' +
      '.firma-name{font-size:12px;font-weight:700;color:#111;margin-top:2px;}.firma-info{font-size:10px;color:#777;margin-top:2px;}' +
      '.sello-container{position:absolute;top:55%;left:50%;transform:translate(-50%,-50%) rotate(-14deg);width:175px;height:175px;pointer-events:none;z-index:5;opacity:0.78;}' +
      '.sello-svg{width:100%;height:100%;display:block;}' +
      '.qr-block{text-align:left;margin:14px 0 6px;position:relative;z-index:3;page-break-inside:avoid;}' +
      '.qr-inner{display:inline-block;text-align:center;}' +
      '.qr-container{display:inline-block;width:58px;height:58px;background:#fff;padding:3px;border-radius:3px;border:1px solid #ddd;line-height:0;}' +
      '.qr-container img{width:100%!important;height:100%!important;display:block;}' +
      '.qr-label{font-size:8px;color:#666;letter-spacing:1px;margin-top:3px;font-weight:600;}' +
      '.footer{margin-top:12px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:9px;color:#888;text-align:center;line-height:1.5;page-break-inside:avoid;}' +
      '.footer strong{color:#111;}' +
      '.watermark-doc{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);font-family:"Arial Black",sans-serif;font-size:110px;font-weight:900;color:rgba(0,188,212,0.05);letter-spacing:14px;white-space:nowrap;pointer-events:none;z-index:0;user-select:none;}' +
      '@media print{body{padding:0;}.info-block{break-inside:avoid;}.totals,.note,.obs,.verif,.firma-wrapper,.sello-container,.qr-block{break-inside:avoid;page-break-inside:avoid;}}';

    var body = watermarkHTML +
      '<div class="header"><div class="brand">' + svgLogo +
      '<span style="display:inline-block;vertical-align:middle;">' + (prov.nombre || 'JCDURANCASADO') + '<small>REDES · CIBERSEGURIDAD · SOPORTE TÉCNICO</small></span>' +
      '</div><div class="meta"><strong>' + numDoc + '</strong><div>' + date + '</div></div></div>' +
      '<div class="doc-type">' + tituloDoc + '</div>' +
      '<div class="doc-sub">' + (isFactura ? (esPagada ? 'Comprobante de servicio · PAGADA' : 'Comprobante de servicio · PENDIENTE DE PAGO') : 'Propuesta de servicio') + '</div>' +
      '<div class="info-block"><div class="info-block__title">DATOS DEL PROVEEDOR</div><div class="info-block__grid">' +
      '<div class="ii"><span>Proveedor</span><strong>' + (prov.nombre || '—') + '</strong></div>' +
      '<div class="ii"><span>Cédula / RNC</span><strong>' + (prov.cedula || '—') + '</strong></div>' +
      '<div class="ii"><span>Teléfono</span><strong>' + (prov.telefono || '—') + '</strong></div>' +
      '<div class="ii"><span>Email</span><strong>' + (prov.email || '—') + '</strong></div>' +
      '</div></div>' + clienteBlock + equipoBlock +
      '<div class="info-block"><div class="info-block__title">INFORMACIÓN DEL DOCUMENTO</div><div class="info-block__grid">' +
      '<div class="ii"><span>Fecha de emisión</span><strong>' + (s.fechaEmision || '—') + '</strong></div>' +
      '<div class="ii"><span>' + (isFactura ? 'Estado' : 'Válida hasta') + '</span><strong style="color:' + (isFactura ? colorDoc : '#111') + ';">' + (isFactura ? (esPagada ? '✓ PAGADA' : '✗ NO PAGADA') : ((s.fechaVencimiento || '—') + ' (' + (s.diasValidez || 7) + ' días)')) + '</strong></div>' +
      '</div></div>' +
      '<div class="section-title">Detalle del servicio</div>' +
      '<table><thead><tr><th>Descripción</th><th>' + (isReparacion ? 'Monto (DOP)' : 'Monto (USD)') + '</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="2" style="text-align:center;color:#888;padding:14px;">Sin elementos seleccionados</td></tr>') +
      '</tbody></table>' +
      '<div class="totals"><div class="label">' + (isFactura ? (esPagada ? 'TOTAL PAGADO' : 'TOTAL A PAGAR') : 'TOTAL ESTIMADO') + '</div>' +
      '<div class="amount">' + totalRow + '</div>' +
      (isReparacion ? '<div class="sub">Pesos dominicanos (DOP)</div>' : '<div class="sub">≈ RD$' + dop.toLocaleString('es-DO') + ' DOP · Tasa 1 USD = ' + rate + ' DOP</div>') +
      '</div>' +
      '<div class="obs"><strong>Observaciones:</strong> ' + observacionesTexto + '</div>' +
      '<div class="note">' + notaTexto + '</div>' +
      (record.codigoVC ? '<div class="verif">🔒 VERIFICACIÓN: <strong>' + record.codigoVC + '</strong> · ' + date + ' · Ref: ' + numDoc + '</div>' : '') +
      '<div class="firma-wrapper">' + selloHTML +
      '<div class="firma-block">' +
      '<div class="firma-item"><div class="firma-line"></div><div class="firma-label">Entregado por</div><div class="firma-name">' + (prov.nombre || '—') + '</div><div class="firma-info">' + (prov.profesion || '') + '</div><div class="firma-info">Cédula: ' + (prov.cedula || '—') + '</div></div>' +
      '<div class="firma-item"><div class="firma-line"></div><div class="firma-label">' + (isFactura ? 'Recibido por' : 'Aprobado por') + '</div><div class="firma-name">' + (cli.nombre || 'Cliente') + '</div><div class="firma-info">' + (cli.cedula ? 'Cédula: ' + cli.cedula : '') + '</div><div class="firma-info">Fecha: _______________</div></div>' +
      '</div></div>' + qrHTML +
      '<div class="footer"><strong>' + (prov.nombre || 'JCDURANCASADO') + '</strong> · Redes · Ciberseguridad · Soporte Técnico<br>' + (prov.email || '') + ' · ' + (prov.telefono || '') + ' · ' + (prov.web || '') + '</div>';

    var autoPrintScript =
      '<script src="https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js"><\\/script>' +
      '<script>' +
      '  var AUTO_PRINT = ' + (autoPrintFlag ? 'true' : 'false') + ';' +
      '  function generarQR() {' +
      '    var cont = document.getElementById("qrContainer");' +
      '    if (!cont) return;' +
      '    try {' +
      '      if (typeof QRCode !== "undefined") {' +
      '        cont.innerHTML = "";' +
      '        new QRCode(cont, {' +
      '          text: "https://jcdurancasado.github.io/inf/verificar.html",' +
      '          width: 52, height: 52,' +
      '          colorDark: "#0a0a0f", colorLight: "#ffffff",' +
      '          correctLevel: QRCode.CorrectLevel.M' +
      '        });' +
      '        return true;' +
      '      }' +
      '    } catch (e) {}' +
      '    return false;' +
      '  }' +
      '  window.addEventListener("load", function () {' +
      '    generarQR();' +
      '    setTimeout(function () {' +
      '      var cont = document.getElementById("qrContainer");' +
      '      if (cont && !cont.querySelector("canvas, img")) generarQR();' +
      '    }, 300);' +
      '    if (AUTO_PRINT) {' +
      '      setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 2200);' +
      '    }' +
      '  });' +
      '<\\/script>';

    var downloadScript = '';
    if (autoDownloadFlag) {
      downloadScript = '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\\/script>' +
        '<script>' +
        '  function descargarAuto() {' +
        '    if (typeof window.html2pdf === "undefined") { setTimeout(descargarAuto, 250); return; }' +
        '    try {' +
        '      var el = document.querySelector(".firma-wrapper") && document.body ? document.body : null;' +
        '      if (!el) return;' +
        '      window.html2pdf().set({' +
        '        margin: 0,' +
        '        filename: "' + (tituloDoc === "FACTURA" ? "FACTURA" : "COTIZACION") + '-' + numDoc + '.pdf",' +
        '        image: { type: "jpeg", quality: 0.98 },' +
        '        html2canvas: { scale: 2, useCORS: true, scrollY: 0, backgroundColor: "#ffffff", windowWidth: 820 },' +
        '        jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },' +
        '        pagebreak: { mode: ["css", "legacy"] }' +
        '      }).from(document.body).save().then(function () {' +
        '        setTimeout(function () { try { window.close(); } catch (e) {} }, 800);' +
        '      });' +
        '    } catch (e) { console.error("[JCDC Download]", e); }' +
        '  }' +
        '  window.addEventListener("load", function () {' +
        '    generarQR();' +
        '    setTimeout(function () {' +
        '      var cont = document.getElementById("qrContainer");' +
        '      if (cont && !cont.querySelector("canvas, img")) generarQR();' +
        '    }, 300);' +
        '    setTimeout(descargarAuto, 1800);' +
        '  });' +
        '<\\/script>';
    }

    var html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>' + tituloDoc + ' ' + numDoc + '</title><style>' + css + '</style></head><body>' + body + autoPrintScript + downloadScript + '</body></html>';

    return html;
  }

  // Abre el documento en pestaña nueva (view / print / download)
  function abrirDocPestana(record, mode) {
    mode = mode || 'view';
    var html = generarDocHTML(record, mode);
    var win = window.open('', '_blank');
    if (!win) {
      if (typeof Toast !== 'undefined') Toast.show('Permite las ventanas emergentes', 'error', 2500);
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  // Descarga el documento (abre pestaña con auto-download)
  function descargarDocPDF(record) {
    abrirDocPestana(record, 'download');
  }

  // ============================================================
  // ENVIAR POR EMAIL AL CLIENTE
  // ============================================================
  function pedirEmailClienteModal(numDoc, clienteNombre) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'verify-pwd-overlay';
      overlay.innerHTML =
        '<div class="verify-pwd">' +
        '  <h3><i class="fa-solid fa-envelope"></i> ENVIAR POR CORREO</h3>' +
        '  <p>Documento: <strong>' + numDoc + '</strong>' + (clienteNombre ? '<br>Cliente: <strong>' + clienteNombre + '</strong>' : '') + '<br><br>Ingresa el correo al que quieres enviar este documento.</p>' +
        '  <input type="email" id="sendEmailInput" autocomplete="off" placeholder="correo@cliente.com" />' +
        '  <p class="err" id="sendEmailError"></p>' +
        '  <div class="verify-pwd__actions">' +
        '    <button type="button" class="cancel" id="sendEmailCancel">Cancelar</button>' +
        '    <button type="button" class="ok" id="sendEmailOk">Enviar</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(overlay);
      document.body.classList.add('jcdc-modal-open');

      var inp = overlay.querySelector('#sendEmailInput');
      var errEl = overlay.querySelector('#sendEmailError');
      var okBtn = overlay.querySelector('#sendEmailOk');
      var cancelBtn = overlay.querySelector('#sendEmailCancel');

      setTimeout(function () { inp.focus(); }, 80);

      function cerrar(v) {
        document.body.classList.remove('jcdc-modal-open');
        overlay.remove();
        resolve(v);
      }

      function validar() {
        var email = inp.value.trim();
        if (!email) { errEl.textContent = 'Ingresa un correo'; return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          errEl.textContent = 'Correo inválido';
          return;
        }
        cerrar(email);
      }

      okBtn.addEventListener('click', validar);
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') validar();
        if (e.key === 'Escape') cerrar(null);
      });
      cancelBtn.addEventListener('click', function () { cerrar(null); });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) cerrar(null);
      });
    });
  }

  async function solicitarEnviarEmail(doc) {
    var email = await pedirEmailClienteModal(doc.numero || doc.codigoVC || 'documento', doc.cliente);
    if (!email) return;

    try {
      if (typeof Toast !== 'undefined') Toast.show('Enviando correo...', 'info', 1800);

      var r = await fetch('https://jcdcapi.vercel.app/api/enviar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          documento: {
            tipo: doc.tipo,
            estado: doc.estado,
            numero: doc.numero,
            codigoVC: doc.codigoVC,
            total: doc.total,
            moneda: doc.moneda,
            cliente: doc.cliente,
            fecha: doc.fecha,
            snapshot: doc.snapshot || {}
          }
        })
      });
      var data = await r.json();

      if (data.ok) {
        if (typeof Toast !== 'undefined') Toast.show(data.message || '✅ Correo enviado a ' + email, 'success', 3000);
      } else {
        if (typeof Toast !== 'undefined') Toast.show(data.error || '❌ Error enviando el correo', 'error', 3500);
      }
    } catch (e) {
      console.error('[JCDC Email] Error:', e);
      if (typeof Toast !== 'undefined') Toast.show('❌ Error de conexión', 'error', 3000);
    }
  }

  // ============================================================
  // ELIMINAR DOCUMENTO · modal contraseña + modal confirmación
  // ============================================================
  function pedirPasswordAdminModal(numDoc) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'verify-pwd-overlay';
      overlay.innerHTML =
        '<div class="verify-pwd">' +
        '  <h3><i class="fa-solid fa-lock"></i> CONFIRMAR IDENTIDAD</h3>' +
        '  <p>Para eliminar el documento <strong>' + numDoc + '</strong>, ingresa tu clave de administrador.</p>' +
        '  <input type="password" id="delPwdInput" autocomplete="off" placeholder="Clave de administrador" />' +
        '  <p class="err" id="delPwdError"></p>' +
        '  <div class="verify-pwd__actions">' +
        '    <button type="button" class="cancel" id="delPwdCancel">Cancelar</button>' +
        '    <button type="button" class="ok" id="delPwdOk">Verificar</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(overlay);
      document.body.classList.add('jcdc-modal-open');

      var inp = overlay.querySelector('#delPwdInput');
      var errEl = overlay.querySelector('#delPwdError');
      var okBtn = overlay.querySelector('#delPwdOk');
      var cancelBtn = overlay.querySelector('#delPwdCancel');

      setTimeout(function () { inp.focus(); }, 80);

      function cerrar(v) {
        document.body.classList.remove('jcdc-modal-open');
        overlay.remove();
        resolve(v);
      }

      async function validar() {
        var pwd = inp.value.trim();
        if (!pwd) { errEl.textContent = 'Ingresa la clave'; return; }
        okBtn.disabled = true;
        okBtn.textContent = 'Verificando...';
        errEl.textContent = '';
        try {
          var r = await fetch('https://jcdcapi.vercel.app/api/validar-admin-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clave: pwd })
          });
          var d = await r.json();
          if (d.ok && d.admin) {
            cerrar(pwd);
          } else {
            okBtn.disabled = false;
            okBtn.textContent = 'Verificar';
            errEl.textContent = '❌ Clave incorrecta';
            inp.value = '';
            inp.focus();
          }
        } catch (e) {
          okBtn.disabled = false;
          okBtn.textContent = 'Verificar';
          errEl.textContent = 'Error de conexión';
        }
      }

      okBtn.addEventListener('click', validar);
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') validar();
        if (e.key === 'Escape') cerrar(null);
      });
      cancelBtn.addEventListener('click', function () { cerrar(null); });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) cerrar(null);
      });
    });
  }

  function confirmarEliminarModal(numDoc) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'jcdc-confirm-overlay';
      overlay.innerHTML =
        '<div class="jcdc-confirm jcdc-confirm--danger" role="dialog" aria-modal="true">' +
        '  <div class="jcdc-confirm__icon"><i class="fa-solid fa-triangle-exclamation"></i></div>' +
        '  <h3 class="jcdc-confirm__title">¿ELIMINAR DOCUMENTO?</h3>' +
        '  <p class="jcdc-confirm__msg">Vas a eliminar permanentemente el documento <strong>' + numDoc + '</strong>.<br><br>Esta acción <strong>no se puede deshacer</strong>.</p>' +
        '  <div class="jcdc-confirm__actions">' +
        '    <button type="button" class="jcdc-confirm__btn jcdc-confirm__btn--cancel" data-res="0">Cancelar</button>' +
        '    <button type="button" class="jcdc-confirm__btn jcdc-confirm__btn--ok" data-res="1">Sí, eliminar</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(overlay);

      function cerrar(v) {
        overlay.classList.add('closing');
        setTimeout(function () { overlay.remove(); }, 200);
        resolve(v);
      }

      overlay.querySelector('[data-res="0"]').addEventListener('click', function () { cerrar(false); });
      overlay.querySelector('[data-res="1"]').addEventListener('click', function () { cerrar(true); });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) cerrar(false);
      });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { document.removeEventListener('keydown', esc); cerrar(false); }
      });
      setTimeout(function () {
        var ok = overlay.querySelector('[data-res="1"]');
        if (ok) ok.focus();
      }, 80);
    });
  }

  async function solicitarEliminar(doc, todosLosDocsRef, onSuccess) {
    var pwd = await pedirPasswordAdminModal(doc.numero || doc.codigoVC || 'documento');
    if (!pwd) return;

    var ok = await confirmarEliminarModal(doc.numero || doc.codigoVC || 'documento');
    if (!ok) return;

    try {
      await window.db.collection('documentos').doc(doc._id).delete();

      // Quitar de la lista en memoria (sin recargar)
      var idx = todosLosDocsRef.indexOf(doc);
      if (idx !== -1) todosLosDocsRef.splice(idx, 1);

      // Re-renderizar la lista sin salir del panel
      if (typeof onSuccess === 'function') onSuccess();

      console.log('[JCDC Admin] ✓ Documento eliminado:', doc.numero || doc.codigoVC);
      if (typeof Toast !== 'undefined') Toast.show('✅ Documento eliminado correctamente', 'success', 2500);
    } catch (e) {
      console.error('[JCDC Admin] Error eliminando:', e);
      if (typeof Toast !== 'undefined') Toast.show('❌ Error eliminando: ' + (e.message || 'desconocido'), 'error', 3500);
    }
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    if (!input || !btn || !result) return;

    // Auto-verificar si viene ?code=... en la URL (link del correo al cliente)
    try {
      var urlParams = new URLSearchParams(window.location.search);
      var autoCode = urlParams.get('code');
      if (autoCode) {
        vieneDeCorreo = true;
        setTimeout(function () {
          input.value = autoCode;
          verificar();
        }, 350);
      }
    } catch (e) {}

    var adminToggle = document.getElementById('adminToggleBtn');
    var adminToggleLabel = document.getElementById('adminToggleLabel');
    var adminPanel = document.getElementById('adminPanel');
    var btnEmitirPagada = document.getElementById('adminEmitirFactura');
    var btnEmitirNoPagada = document.getElementById('adminEmitirFacturaNoPagada');
    var btnPagada = document.getElementById('adminMarcarPagada');
    var btnNoPagada = document.getElementById('adminMarcarNoPagada');
    var btnServicio = document.getElementById('adminMarcarServicio');
    var btnPDF = document.getElementById('adminDescargarPDF');
    var btnComentario = document.getElementById('adminAgregarComentario');
    var txtComentario = document.getElementById('adminComentarioInput');

    // Verificar/Verificar
    btn.addEventListener('click', verificar);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') verificar(); });

    // Detectar si ya había sesión Firebase activa
    window.auth.onAuthStateChanged(function (user) {
      if (user) {
        adminUnlocked = true;
        adminEmail = user.email;
        document.body.classList.add('admin-unlocked');
        if (adminPanel) adminPanel.classList.add('show');
        if (adminToggle) adminToggle.classList.add('is-active');
        if (adminToggleLabel) adminToggleLabel.textContent = 'Bloquear';
        if (adminToggle) adminToggle.querySelector('i').className = 'fa-solid fa-lock-open';
        console.log('[JCDC Auth] Sesión activa:', user.email);
      } else {
        adminUnlocked = false;
        adminEmail = null;
        document.body.classList.remove('admin-unlocked');
        if (adminPanel) adminPanel.classList.remove('show');
        if (adminToggle) adminToggle.classList.remove('is-active');
        if (adminToggleLabel) adminToggleLabel.textContent = 'Desbloquear';
        if (adminToggle) adminToggle.querySelector('i').className = 'fa-solid fa-lock';
      }
    });

    // Toggle admin
    if (adminToggle) {
      adminToggle.addEventListener('click', async function () {
        if (adminUnlocked) {
          await window.auth.signOut();
          return;
        }
        var ok = await pedirPassword();
        if (!ok) return;
      });
    }

    // Eliminar comentario/historial
    result.addEventListener('click', async function (e) {
      var delC = e.target.closest('.verify-comment-del');
      var delH = e.target.closest('.verify-hist-del');
      var elBtn = delC || delH;
      if (!elBtn) return;
      if (!adminUnlocked) { alert('Acceso solo para administrador.'); return; }
      if (!confirm('¿Eliminar este registro?')) return;

      var id = elBtn.getAttribute('data-id');
      var ts = parseInt(elBtn.getAttribute('data-ts'), 10);

      // Aplicar al documento actual
      if (delC && docActual && docActual.comentarios) {
        docActual.comentarios = docActual.comentarios.filter(function (c) { return (c.timestamp || 0) !== ts; });
      }
      if (delH && docActual && docActual.historial) {
        docActual.historial = docActual.historial.filter(function (h) { return (h.timestamp || 0) !== ts; });
      }

      await actualizarDoc(id, {
        comentarios: docActual.comentarios || [],
        historial: docActual.historial || []
      });

      render([docActual], docActual.codigoVC || docActual.numero);
      actualizarBotonesAdmin();
    });

    // Emitir facturas
    if (btnEmitirPagada) btnEmitirPagada.addEventListener('click', function () { emitirFactura('pagada'); });
    if (btnEmitirNoPagada) btnEmitirNoPagada.addEventListener('click', function () { emitirFactura('no-pagada'); });

    // Marcar pagada
    if (btnPagada) btnPagada.addEventListener('click', function () {
      actualizarDocActual(function (doc) {
        doc.estado = 'pagada';
        doc.historial = doc.historial || [];
        doc.historial.push({ evento: 'pagada', titulo: 'Factura marcada como PAGADA', descripcion: 'El pago fue confirmado por el proveedor.', fecha: fechaActualHora(), timestamp: Date.now() });
      });
    });

    // Marcar no pagada
    if (btnNoPagada) btnNoPagada.addEventListener('click', function () {
      actualizarDocActual(function (doc) {
        doc.estado = 'no-pagada';
        doc.historial = doc.historial || [];
        doc.historial.push({ evento: 'no-pagada', titulo: 'Factura marcada como NO PAGADA', descripcion: 'El pago aún está pendiente.', fecha: fechaActualHora(), timestamp: Date.now() });
      });
    });

    // Servicio realizado
    if (btnServicio) btnServicio.addEventListener('click', function () {
      actualizarDocActual(function (doc) {
        doc.historial = doc.historial || [];
        doc.historial.push({ evento: 'servicio-realizado', titulo: 'Servicio realizado', descripcion: 'El trabajo fue ejecutado correctamente.', fecha: fechaActualHora(), timestamp: Date.now() });
      });
    });

    // Publicar comentario
    if (btnComentario) btnComentario.addEventListener('click', async function () {
      var texto = txtComentario.value.trim();
      if (!texto) { alert('Escribe un comentario.'); return; }
      var ok = await actualizarDocActual(function (doc) {
        doc.comentarios = doc.comentarios || [];
        doc.comentarios.push({ texto: texto, fecha: fechaActualHora(), timestamp: Date.now() });
      });
      if (ok) txtComentario.value = '';
    });

    // Descargar PDF
    if (btnPDF) btnPDF.addEventListener('click', async function () {
      if (!docActual) { alert('Primero busca un documento.'); return; }
      var target = docActual;
      if (docActual.facturaVinculada) {
        // Cargar la factura vinculada desde Firestore
        try {
          var snap = await window.db.collection('documentos').doc(docActual.facturaVinculada).get();
          if (!snap.exists) {
            // Si el docId no es el número de factura, buscar por campo
            var arr = await buscarRegistro(docActual.facturaVinculada);
            if (arr.length) target = arr[0];
          } else {
            target = Object.assign({ _id: snap.id }, snap.data());
          }
        } catch (e) { console.error(e); }
      }
      descargarDocPDF(target);
    });

    // ============================================================
    // PANEL ADMIN — REGISTRO COMPLETO
    // ============================================================
    var overlay = document.getElementById('adminListaOverlay');
    var listaContenido = document.getElementById('adminListaContenido');
    var listaInfo = document.getElementById('adminListaInfo');
    var listaBuscar = document.getElementById('adminListaBuscar');
    var listaCerrar = document.getElementById('adminListaCerrar');
    var btnVerRegistro = document.getElementById('adminVerRegistro');
    var filtroActual = 'todos';
    var todosLosDocs = [];

    async function abrirRegistro() {
      if (!adminUnlocked) { alert('Acceso solo para administrador.'); return; }
      if (!overlay) return;
      overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
      listaContenido.innerHTML = '<div class="admin-lista__loader"><i class="fa-solid fa-spinner fa-spin"></i><p style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted);margin-top:10px;">Cargando documentos...</p></div>';

      try {
        var snap = await window.db.collection('documentos').orderBy('timestamp', 'desc').limit(500).get();
        todosLosDocs = [];
        snap.forEach(function (doc) {
          todosLosDocs.push(Object.assign({ _id: doc.id }, doc.data()));
        });
        renderListaAdmin();
      } catch (e) {
        console.error('Error cargando lista:', e);
        listaContenido.innerHTML = '<div class="admin-lista__empty"><i class="fa-solid fa-triangle-exclamation"></i><p>Error cargando los documentos</p></div>';
      }
    }

    function cerrarRegistro() {
      if (!overlay) return;
      overlay.classList.remove('show');
      document.body.style.overflow = '';
    }

    function renderListaAdmin() {
      if (!listaContenido) return;
      var q = (listaBuscar.value || '').trim().toLowerCase();
      var filtrados = todosLosDocs.filter(function (d) {
        // Filtro por tipo/estado
        if (filtroActual === 'cotizacion' && d.tipo !== 'cotizacion') return false;
        if (filtroActual === 'factura' && d.tipo !== 'factura') return false;
        if (filtroActual === 'pagada' && !(d.tipo === 'factura' && d.estado === 'pagada')) return false;
        if (filtroActual === 'no-pagada' && !(d.tipo === 'factura' && d.estado === 'no-pagada')) return false;

        // Filtro por búsqueda
        if (q) {
          var texto = [
            d.numero || '', d.cliente || '', d.codigoVC || '',
            d.equipo || '', d.facturaVinculada || '', d.cotizacionOrigen || ''
          ].join(' ').toLowerCase();
          if (texto.indexOf(q) === -1) return false;
        }
        return true;
      });

      if (!filtrados.length) {
        listaContenido.innerHTML = '<div class="admin-lista__empty"><i class="fa-solid fa-inbox"></i><p>No hay documentos' + (q || filtroActual !== 'todos' ? ' que coincidan con el filtro' : ' registrados aún') + '</p></div>';
        if (listaInfo) listaInfo.textContent = '0 documentos';
        return;
      }

      var html = '';
      filtrados.forEach(function (d) {
        var tipoClase = d.tipo === 'factura' ? 'admin-lista__tipo--fac' : 'admin-lista__tipo--cot';
        var tipoTxt = d.tipo === 'factura' ? 'FACT' : 'COT';
        var estadoClase = 'admin-lista__estado--na';
        var estadoTxt = '—';
        if (d.tipo === 'factura') {
          if (d.estado === 'pagada') { estadoClase = 'admin-lista__estado--pagada'; estadoTxt = 'PAGADA'; }
          else if (d.estado === 'no-pagada') { estadoClase = 'admin-lista__estado--nopagada'; estadoTxt = 'NO PAG.'; }
        }
        var fecha = d.fecha || (d.fechaISO ? d.fechaISO.slice(0, 10) : '—');
        if (fecha.length > 15) fecha = fecha.slice(0, 12) + '...';
        var moneda = d.moneda || 'DOP';
        var totalFmt = (moneda === 'DOP' ? 'RD$' : '$') + Number(d.total || 0).toLocaleString(moneda === 'DOP' ? 'es-DO' : 'en-US');

        var code = d.codigoVC || d.numero || '';
        html += '<div class="admin-lista__fila" data-id="' + d._id + '" data-code="' + code + '">';
        html += '  <div class="admin-lista__tipo ' + tipoClase + '">' + tipoTxt + '</div>';
        html += '  <div class="admin-lista__num" title="' + (d.numero || '') + '">' + (d.numero || '—') + '</div>';
        html += '  <div class="admin-lista__cliente" title="' + (d.cliente || '') + '">' + (d.cliente || '—') + '</div>';
        html += '  <div class="admin-lista__monto">' + totalFmt + '</div>';
        html += '  <div class="admin-lista__fecha">' + fecha + '</div>';
        html += '  <div class="admin-lista__estado ' + estadoClase + '">' + estadoTxt + '</div>';
        html += '  <div class="admin-lista__acciones">';
        html += '    <button type="button" class="admin-lista__accion" data-action="ver" data-id="' + d._id + '" data-code="' + code + '" title="Ver documento"><i class="fa-solid fa-eye"></i></button>';
        html += '    <button type="button" class="admin-lista__accion" data-action="download" data-id="' + d._id + '" data-code="' + code + '" title="Descargar PDF"><i class="fa-solid fa-download"></i></button>';
        html += '    <button type="button" class="admin-lista__accion" data-action="print" data-id="' + d._id + '" data-code="' + code + '" title="Imprimir"><i class="fa-solid fa-print"></i></button>';
        html += '    <button type="button" class="admin-lista__accion admin-lista__accion--email" data-action="email" data-id="' + d._id + '" data-code="' + code + '" title="Enviar por correo al cliente"><i class="fa-solid fa-envelope"></i></button>';
        html += '    <button type="button" class="admin-lista__accion admin-lista__accion--del" data-action="del" data-id="' + d._id + '" data-code="' + code + '" title="Eliminar permanentemente"><i class="fa-solid fa-trash"></i></button>';
        html += '  </div>';
        html += '</div>';
      });

      listaContenido.innerHTML = html;
      if (listaInfo) listaInfo.textContent = filtrados.length + ' documento' + (filtrados.length === 1 ? '' : 's') + (todosLosDocs.length !== filtrados.length ? ' (de ' + todosLosDocs.length + ' en total)' : '');
    }

    // Event listeners del panel
    if (btnVerRegistro) btnVerRegistro.addEventListener('click', abrirRegistro);
    if (listaCerrar) listaCerrar.addEventListener('click', cerrarRegistro);
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) cerrarRegistro(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('show')) cerrarRegistro();
    });

    if (listaBuscar) {
      var buscarTimeout;
      listaBuscar.addEventListener('input', function () {
        clearTimeout(buscarTimeout);
        buscarTimeout = setTimeout(renderListaAdmin, 200);
      });
    }

    document.querySelectorAll('.admin-lista__chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        document.querySelectorAll('.admin-lista__chip').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        filtroActual = chip.getAttribute('data-filtro') || 'todos';
        renderListaAdmin();
      });
    });

    // Clic en una fila → cerrar y verificar ese documento
    if (listaContenido) {
      listaContenido.addEventListener('click', function (e) {
        var accion = e.target.closest('.admin-lista__accion');
        if (accion) {
          e.stopPropagation();
          var id = accion.getAttribute('data-id');
          var tipo = accion.getAttribute('data-action');
          var code = accion.getAttribute('data-code');
          var doc = todosLosDocs.find(function (x) { return x._id === id; });

          if (tipo === 'ver') {
            if (!doc) { alert('No se encontró el documento.'); return; }
            abrirDocPestana(doc, 'view');
          } else if (tipo === 'download') {
            if (!doc) { alert('No se encontró el documento.'); return; }
            descargarDocPDF(doc);
          } else if (tipo === 'print') {
            if (!doc) { alert('No se encontró el documento.'); return; }
            abrirDocPestana(doc, 'print');
          } else if (tipo === 'email') {
            if (!doc) { alert('No se encontró el documento.'); return; }
            solicitarEnviarEmail(doc);
          } else if (tipo === 'del') {
            if (!doc) { alert('No se encontró el documento.'); return; }
            solicitarEliminar(doc, todosLosDocs, renderListaAdmin);
          }
          return;
        }
        var fila = e.target.closest('.admin-lista__fila');
        if (!fila) return;
        var code = fila.getAttribute('data-code');
        if (!code) return;
        cerrarRegistro();
        input.value = code;
        verificar();
      });
    }

    actualizarBotonesAdmin();
  }

  // Inicializar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();