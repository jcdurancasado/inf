/* ============================================================
   JCDC · CONFIGURACIÓN DE FIREBASE
   ------------------------------------------------------------
   Este archivo es PÚBLICO. La seguridad la dan las reglas
   de Firestore (create: público, update/delete: solo admin).
   ============================================================ */

(function () {
  'use strict';

  if (typeof firebase === 'undefined') {
    console.error('[JCDC Firebase] SDK no cargado. Falta <script> en el HTML.');
    return;
  }

  // Config pública del proyecto Firebase
  var firebaseConfig = {
    apiKey: "AIzaSyCuJqiY6o4NB52fj4nkEFXMLawuiRBQ0UA",
    authDomain: "jcdc-docs.firebaseapp.com",
    projectId: "jcdc-docs",
    storageBucket: "jcdc-docs.firebasestorage.app",
    messagingSenderId: "574311049289",
    appId: "1:574311049289:web:7deb673d2bde7bc7043798"
  };

  // Inicializar (evita doble init si el script se carga varias veces)
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('[JCDC Firebase] Proyecto inicializado:', firebaseConfig.projectId);
  } else {
    console.log('[JCDC Firebase] Ya estaba inicializado.');
  }

  // Referencias globales
  window.db   = firebase.firestore();
  window.auth = firebase.auth();

  // Helpers disponibles para todos los scripts
  window.JCDC_FIREBASE = {
    db: window.db,
    auth: window.auth,
    ready: true,
    projectId: firebaseConfig.projectId
  };

  console.log('[JCDC Firebase] Listo. db y auth disponibles.');
})();