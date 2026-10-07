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
    result.innerHTML = html;
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
        '  <input type="email" id="vPwdEmail" autocomplete="email" placeholder="Email" value="jcdurancasado@gmail.com" style="margin-bottom:8px;" />' +
        '  <input type="password" id="vPwdInput" autocomplete="current-password" placeholder="Contraseña" />' +
        '  <p class="err" id="vPwdError"></p>' +
        '  <div class="verify-pwd__actions">' +
        '    <button type="button" class="cancel" id="vPwdCancel">Cancelar</button>' +
        '    <button type="button" class="ok" id="vPwdOk">Entrar</button>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(overlay);

      var emailEl = overlay.querySelector('#vPwdEmail');
      var inp = overlay.querySelector('#vPwdInput');
      var errEl = overlay.querySelector('#vPwdError');
      var okBtn = overlay.querySelector('#vPwdOk');
      var cancelBtn = overlay.querySelector('#vPwdCancel');

      setTimeout(function () { inp.focus(); }, 80);

      function cerrar(r) { overlay.remove(); resolve(r); }

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
      new QRCode(tmp, { text: 'https://jcdurancasado.github.io/inf/', width: 92, height: 92, colorDark: '#0a0a0f', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
      var canvas = tmp.querySelector('canvas');
      var dataUrl = canvas ? canvas.toDataURL('image/png') : '';
      document.body.removeChild(tmp);
      return dataUrl;
    } catch (e) { return ''; }
  }

  function generarSelloPagado(fecha, monto, numDoc, estado) {
    var docCfg = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.documentos) || {};
    var esPagada = estado !== 'no-pagada';
    var color = esPagada ? (docCfg.colorSello || '#1e40af') : '#dc2626';
    var texto = esPagada ? 'PAGADO' : 'NO PAGADA';
    var prov = (window.SOPORTE_CONFIG && window.SOPORTE_CONFIG.proveedor) || {};
    var nombre = (prov.nombre || 'JCDURÁN CASADO').toUpperCase();
    var fontBig = esPagada ? 38 : 24;
    return '<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" class="sello-svg">' +
      '<defs>' +
      '<path id="arcT-' + numDoc + '" d="M 30,110 A 80,80 0 0 1 190,110" fill="none"/>' +
      '<path id="arcB-' + numDoc + '" d="M 35,110 A 75,75 0 0 0 185,110" fill="none"/>' +
      '<filter id="rough-' + numDoc + '"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.3" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '</defs>' +
      '<g filter="url(#rough-' + numDoc + ')" fill="none" stroke="' + color + '">' +
      '<circle cx="110" cy="110" r="98" stroke-width="4"/>' +
      '<circle cx="110" cy="110" r="86" stroke-width="1.5"/>' +
      '<circle cx="110" cy="110" r="80" stroke-width="1" opacity="0.6"/>' +
      '<text font-family="Arial Black, sans-serif" font-size="12" font-weight="900" fill="' + color + '" stroke="none" letter-spacing="2.5"><textPath href="#arcT-' + numDoc + '" startOffset="50%" text-anchor="middle">' + nombre + '</textPath></text>' +
      '<text font-family="Arial, sans-serif" font-size="7.5" fill="' + color + '" stroke="none" letter-spacing="1.8"><textPath href="#arcB-' + numDoc + '" startOffset="50%" text-anchor="middle">REDES · CIBERSEGURIDAD · SOPORTE TÉCNICO</textPath></text>' +
      '<line x1="30" y1="99" x2="190" y2="99" stroke-width="1.5"/>' +
      '<text x="110" y="' + (esPagada ? 122 : 120) + '" font-family="Arial Black, sans-serif" font-size="' + fontBig + '" font-weight="900" fill="' + color + '" stroke="none" text-anchor="middle" letter-spacing="3">' + texto + '</text>' +
      '<line x1="30" y1="132" x2="190" y2="132" stroke-width="1.5"/>' +
      '<text x="110" y="150" font-family="Arial, sans-serif" font-size="9" fill="' + color + '" stroke="none" text-anchor="middle" letter-spacing="2">FECHA</text>' +
      '<text x="110" y="163" font-family="Arial Black, sans-serif" font-size="10" fill="' + color + '" stroke="none" text-anchor="middle">' + fecha + '</text>' +
      '<text x="110" y="180" font-family="Arial, sans-serif" font-size="8" fill="' + color + '" stroke="none" text-anchor="middle" letter-spacing="1">' + numDoc + '</text>' +
      '</g></svg>';
  }

  function generarPDF(record) {
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

    var watermarkHTML = (!isFactura && docCfg.mostrarWatermark !== false) ? '<div class="watermark-doc">COTIZACIÓN</div>' : '';
    var selloHTML = isFactura ? '<div class="sello-container">' + generarSelloPagado(date, totalRow, numDoc, record.estado) + '</div>' : '';
    var qrDataUrl = getQrDataUrl();
    var qrHTML = qrDataUrl ? '<div class="qr-block"><div class="qr-container"><img src="' + qrDataUrl + '" alt="QR" style="width:100%;height:100%;display:block;"></div><div class="qr-label">VERIFICA EN: jcdurancasado.github.io/inf</div></div>' : '';

    var svgLogo = '<svg viewBox="0 0 100 100" width="38" height="38" style="flex-shrink:0;vertical-align:middle;margin-right:10px;">' +
      '<path d="M50 4 L88 26 L88 62 Q88 88 50 96 Q12 88 12 62 L12 26 Z" fill="none" stroke="#00bcd4" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<circle cx="50" cy="50" r="34" fill="none" stroke="#00bcd4" stroke-width="1.5" opacity="0.55" stroke-dasharray="3 4"/>' +
      '<circle cx="50" cy="50" r="24" fill="none" stroke="#00bcd4" stroke-width="1.5" opacity="0.65" stroke-dasharray="2 3"/>' +
      '<path d="M50 36 L60 42 L60 54 L50 60 L40 54 L40 42 Z" fill="rgba(0,188,212,0.12)" stroke="#00bcd4" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="50" cy="50" r="4" fill="#00bcd4"/>' +
      '<line x1="50" y1="4" x2="50" y2="10" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="88" y1="26" x2="83" y2="30" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="88" y1="62" x2="83" y2="58" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="50" y1="96" x2="50" y2="90" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="12" y1="62" x2="17" y2="58" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="12" y1="26" x2="17" y2="30" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round"/>' +
      '</svg>';

    var css = '@page{size:A4;margin:10mm;}*{box-sizing:border-box;margin:0;padding:0;}html,body{height:auto;}body{font-family:"Segoe UI",Roboto,Arial,sans-serif;color:#111;padding:8px 10px;max-width:700px;margin:0 auto;font-size:10.5px;line-height:1.35;position:relative;}' +
      '.header{border-bottom:2.5px solid #00bcd4;padding-bottom:8px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-end;}' +
      '.brand{font-size:16px;font-weight:800;color:#0a0a0f;letter-spacing:0.5px;}.brand small{display:block;font-size:8.5px;font-weight:400;color:#666;letter-spacing:2px;margin-top:2px;}' +
      '.meta{text-align:right;font-size:9.5px;color:#666;}.meta strong{color:#111;font-size:11px;}' +
      '.doc-type{text-align:center;font-size:17px;font-weight:800;letter-spacing:4px;color:' + (isFactura ? (esPagada ? '#0a7f2e' : '#c81e1e') : '#0a0a0f') + ';margin-bottom:3px;text-transform:uppercase;}' +
      '.doc-sub{text-align:center;font-size:9.5px;color:#888;margin-bottom:9px;}' +
      '.info-block{margin-bottom:8px;}.info-block__title{font-size:8.5px;font-weight:700;letter-spacing:2px;color:#0369a1;margin-bottom:4px;padding-bottom:2px;border-bottom:1px solid #e0e6ed;}' +
      '.info-block__grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;}' +
      '.ii{padding:5px 7px;background:#f5f7fa;border-radius:3px;border-left:2.5px solid #00bcd4;}.ii--full{grid-column:1/-1;}' +
      '.ii span{display:block;font-size:7px;letter-spacing:1px;color:#94a3b8;text-transform:uppercase;margin-bottom:1px;font-weight:600;}' +
      '.ii strong{font-size:10px;color:#111;word-break:break-word;font-weight:600;}' +
      '.section-title{font-size:8.5px;letter-spacing:2px;text-transform:uppercase;color:#666;margin:9px 0 4px;border-bottom:1px solid #e5e7eb;padding-bottom:2px;font-weight:700;}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:10px;}' +
      'thead th{background:#0a0a0f;color:#fff;padding:5px 8px;text-align:left;font-size:8px;letter-spacing:1px;text-transform:uppercase;font-weight:700;}' +
      'thead th:last-child{text-align:right;}tbody td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px;}tbody tr:last-child td{border-bottom:none;}' +
      '.row-sub{font-size:8px;color:#94a3b8;margin-top:1px;}.row-price{text-align:right;font-weight:700;white-space:nowrap;}' +
      '.totals{background:linear-gradient(135deg,#e0f7fa,#ede9fe);padding:10px;border-radius:6px;margin-bottom:8px;text-align:center;border:1.5px solid #00bcd4;}' +
      '.totals .label{font-size:8px;letter-spacing:2px;color:#666;margin-bottom:2px;font-weight:700;}' +
      '.totals .amount{font-size:19px;font-weight:800;color:#0a0a0f;letter-spacing:-0.5px;}.totals .sub{font-size:9px;color:#444;margin-top:2px;}' +
      '.note{padding:6px 9px;background:#fff9e6;border-left:2.5px solid #fbbf24;border-radius:3px;font-size:8.5px;color:#555;line-height:1.4;margin-bottom:7px;}' +
      '.obs{padding:6px 9px;background:#f8f9fa;border-left:2.5px solid #00bcd4;border-radius:3px;font-size:8.5px;color:#555;line-height:1.4;margin-bottom:7px;}' +
      '.verif{text-align:center;padding:5px 10px;background:#f0f9ff;border:1px dashed #0284c7;border-radius:4px;font-family:"Courier New",monospace;font-size:8.5px;color:#075985;letter-spacing:0.5px;margin-bottom:8px;}' +
      '.verif strong{color:#0c4a6e;}' +
      '.firma-wrapper{position:relative;margin-top:18px;padding-top:4px;}' +
      '.firma-block{display:grid;grid-template-columns:1fr 1fr;gap:60px;}' +
      '.firma-item{text-align:center;}.firma-line{border-bottom:1.2px solid #111;height:38px;width:65%;margin:0 auto 6px;}' +
      '.firma-label{font-size:8px;color:#666;letter-spacing:1px;text-transform:uppercase;font-weight:700;}' +
      '.firma-name{font-size:10px;font-weight:700;color:#111;margin-top:1px;}.firma-info{font-size:8px;color:#888;margin-top:1px;}' +
      '.sello-container{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-14deg);width:130px;height:130px;pointer-events:none;z-index:5;opacity:0.72;}' +
      '.sello-svg{width:100%;height:100%;display:block;}' +
      '.qr-block{text-align:center;margin:8px 0 4px;position:relative;z-index:3;}' +
      '.qr-container{display:inline-block;width:52px;height:52px;background:#fff;padding:3px;border-radius:3px;border:1px solid #ddd;line-height:0;}' +
      '.qr-container img{width:100%!important;height:100%!important;display:block;}' +
      '.qr-label{font-size:7.5px;color:#666;letter-spacing:1px;margin-top:2px;font-weight:600;}' +
      '.footer{margin-top:8px;padding-top:6px;border-top:1px solid #e5e7eb;font-size:8px;color:#888;text-align:center;line-height:1.4;}' +
      '.footer strong{color:#111;}' +
      '.watermark-doc{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);font-family:"Arial Black",sans-serif;font-size:100px;font-weight:900;color:rgba(0,188,212,0.06);letter-spacing:12px;white-space:nowrap;pointer-events:none;z-index:1;user-select:none;}' +
      '@media print{body{padding:0;}.totals,.firma-wrapper,.sello-container,.qr-block{break-inside:avoid;page-break-inside:avoid;}.info-block{break-inside:avoid;}}';

    var body = watermarkHTML +
      '<div class="header"><div class="brand">' + svgLogo +
      '<span style="display:inline-block;vertical-align:middle;">' + (prov.nombre || 'JCDURANCASADO') + '<small>REDES · CIBERSEGURIDAD · SOPORTE TÉCNICO</small></span>' +
      '</div><div class="meta"><div><strong>' + numDoc + '</strong></div><div>' + date + '</div></div></div>' +
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
      '<div class="ii"><span>' + (isFactura ? 'Estado' : 'Válida hasta') + '</span><strong>' + (isFactura ? (esPagada ? '✓ PAGADA' : '✗ NO PAGADA') : ((s.fechaVencimiento || '—') + ' (' + (s.diasValidez || 7) + ' días)')) + '</strong></div>' +
      '</div></div>' +
      '<div class="section-title">Detalle del servicio</div>' +
      '<table><thead><tr><th>Descripción</th><th>' + (isReparacion ? 'Monto (DOP)' : 'Monto (USD)') + '</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="2" style="text-align:center;color:#888;padding:12px;">Sin elementos seleccionados</td></tr>') +
      '</tbody></table>' +
      '<div class="totals"><div class="label">' + (isFactura ? (esPagada ? 'TOTAL PAGADO' : 'TOTAL A PAGAR') : 'TOTAL ESTIMADO') + '</div>' +
      '<div class="amount">' + totalRow + '</div>' +
      (isReparacion ? '<div class="sub">Pesos dominicanos (DOP)</div>' : '<div class="sub">≈ RD$' + dop.toLocaleString('es-DO') + ' DOP · Tasa 1 USD = ' + rate + ' DOP</div>') +
      '</div>' +
      (s.descripcion ? '<div class="obs"><strong>Observaciones:</strong> ' + s.descripcion + '</div>' : '') +
      '<div class="note">' + notaTexto + '</div>' +
      (record.codigoVC ? '<div class="verif">🔒 VERIFICACIÓN: <strong>' + record.codigoVC + '</strong> · ' + date + ' · Ref: ' + numDoc + '</div>' : '') +
      '<div class="firma-wrapper">' + selloHTML +
      '<div class="firma-block">' +
      '<div class="firma-item"><div class="firma-line"></div><div class="firma-label">Entregado por</div><div class="firma-name">' + (prov.nombre || '—') + '</div><div class="firma-info">' + (prov.profesion || '') + '</div><div class="firma-info">Cédula: ' + (prov.cedula || '—') + '</div></div>' +
      '<div class="firma-item"><div class="firma-line"></div><div class="firma-label">' + (isFactura ? 'Recibido por' : 'Aprobado por') + '</div><div class="firma-name">' + (cli.nombre || 'Cliente') + '</div><div class="firma-info">' + (cli.cedula ? 'Cédula: ' + cli.cedula : '') + '</div><div class="firma-info">Fecha: _______________</div></div>' +
      '</div></div>' + qrHTML +
      '<div class="footer"><strong>' + (prov.nombre || 'JCDURANCASADO') + '</strong> · Redes · Ciberseguridad · Soporte Técnico<br>' + (prov.email || '') + ' · ' + (prov.telefono || '') + ' · ' + (prov.web || '') + '</div>';

    var html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>' + tituloDoc + ' ' + numDoc + '</title><style>' + css + '</style></head><body>' + body + '</body></html>';

    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var win = window.open(url, '_blank');
    if (!win) { alert('Permite las ventanas emergentes.'); URL.revokeObjectURL(url); return; }
    setTimeout(function () { URL.revokeObjectURL(url); }, 90000);
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    if (!input || !btn || !result) return;

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
      generarPDF(target);
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

        html += '<div class="admin-lista__fila" data-id="' + d._id + '" data-code="' + (d.codigoVC || d.numero) + '">';
        html += '  <div class="admin-lista__tipo ' + tipoClase + '">' + tipoTxt + '</div>';
        html += '  <div class="admin-lista__num" title="' + (d.numero || '') + '">' + (d.numero || '—') + '</div>';
        html += '  <div class="admin-lista__cliente" title="' + (d.cliente || '') + '">' + (d.cliente || '—') + '</div>';
        html += '  <div class="admin-lista__monto">' + totalFmt + '</div>';
        html += '  <div class="admin-lista__fecha">' + fecha + '</div>';
        html += '  <div class="admin-lista__estado ' + estadoClase + '">' + estadoTxt + '</div>';
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
          if (tipo === 'ver') {
            cerrarRegistro();
            input.value = code;
            verificar();
          } else if (tipo === 'del') {
            if (!confirm('¿Eliminar este documento permanentemente?\n\nEsta acción no se puede deshacer.')) return;
            window.db.collection('documentos').doc(id).delete()
              .then(function () {
                todosLosDocs = todosLosDocs.filter(function (x) { return x._id !== id; });
                renderListaAdmin();
              })
              .catch(function (err) { alert('Error eliminando: ' + err.message); });
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