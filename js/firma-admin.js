/**
 * JCDC · Firma admin (sessionStorage)
 * - Muestra botón "Cargar firma" cuando hay admin logueado
 * - Guarda el PNG en sessionStorage (no toca el repo)
 * - Expone window.JCDC_FIRMA para los generadores de PDF
 */
(function () {
  'use strict';

  var KEY = 'jcdc_firma_admin';
  var btn = null;

  function getFirma() {
    try { return sessionStorage.getItem(KEY) || ''; }
    catch (e) { return ''; }
  }

  function setFirma(dataUrl) {
    try {
      if (dataUrl) sessionStorage.setItem(KEY, dataUrl);
      else sessionStorage.removeItem(KEY);
    } catch (e) {}
    window.JCDC_FIRMA = getFirma();
  }

  function mostrarBtn() {
    if (btn) { btn.style.display = 'flex'; return; }

    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'jcdcFirmaBtn';
    btn.className = 'jcdc-firma-btn';
    btn.innerHTML = '<i class="fa-solid fa-signature"></i><span>Cargar firma</span>';
    btn.addEventListener('click', abrirInput);

    document.body.appendChild(btn);
    actualizarBtn();
  }

  function ocultarBtn() {
    if (btn) btn.style.display = 'none';
  }

  function actualizarBtn() {
    if (!btn) return;
    var tiene = !!getFirma();
    btn.classList.toggle('jcdc-firma-btn--ok', tiene);
    btn.innerHTML = tiene
      ? '<i class="fa-solid fa-circle-check"></i><span>Firma cargada · clic para cambiar</span>'
      : '<i class="fa-solid fa-signature"></i><span>Cargar firma</span>';
  }

  function abrirInput() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/png,image/jpeg,image/webp';
    inp.style.display = 'none';
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      if (f.size > 800 * 1024) {
        if (typeof Toast !== 'undefined') Toast.show('La imagen es muy grande (máx 800 KB)', 'error', 3000);
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        setFirma(ev.target.result);
        actualizarBtn();
        if (typeof Toast !== 'undefined') Toast.show('✅ Firma cargada para esta sesión', 'success', 2500);
      };
      reader.readAsDataURL(f);
    });
    document.body.appendChild(inp);
    inp.click();
    setTimeout(function () { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 500);
  }

  function chequearAdmin() {
    if (document.body.classList.contains('admin-unlocked')) return true;
    if (window.QuoteWizard && (window.QuoteWizard.facturaUnlocked || window.QuoteWizard._tipoAcceso === 'admin')) {
      return true;
    }
    return false;
  }

  var observer = new MutationObserver(function () {
    if (chequearAdmin()) mostrarBtn();
    else ocultarBtn();
  });

  function init() {
    window.JCDC_FIRMA = getFirma();
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    if (chequearAdmin()) mostrarBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();