/**
 * JCDURANCASADO · Configuración de Reparación Técnica
 * ⚙️ EDITA AQUÍ: precios, marcas, datos del proveedor
 */
window.SOPORTE_CONFIG = {

  // ============================================
  // TUS DATOS (aparecen en cotización y factura)
  // ============================================
  proveedor: {
    nombre: 'Julio C. Durán Casado',
    cedula: '016-0017787-5',        // ← EDITA con tu cédula o RNC
    profesion: 'Ingeniero en Redes y Telecomunicaciones',
    telefono: '+1 829-421-3163',    // ← EDITA con tu teléfono
    email: 'jcdurancasado@gmail.com',
    web: 'jcdurancasado.github.io/inf'
  },

  // ============================================
  // EQUIPOS
  // ============================================
  equipos: [
    { id: 'impresora',      label: 'Impresora',          icon: 'fa-print' },
    { id: 'impresora-red',  label: 'Impresora en red',   icon: 'fa-print' },
    { id: 'laptop',         label: 'Laptop / PC',        icon: 'fa-laptop' },
    { id: 'red',            label: 'Red / Router',       icon: 'fa-network-wired' },
    { id: 'otro',           label: 'Otro equipo',        icon: 'fa-microchip' }
  ],

  // ============================================
  // MARCAS por tipo de equipo
  // ============================================
  marcas: {
    'impresora':      ['Epson', 'HP', 'Canon', 'Brother', 'Lexmark', 'Samsung', 'Ricoh', 'Xerox', 'Otra'],
    'impresora-red':  ['Epson', 'HP', 'Canon', 'Brother', 'Lexmark', 'Samsung', 'Ricoh', 'Xerox', 'Otra'],
    'laptop':         ['Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Apple', 'MSI', 'Toshiba', 'Gateway', 'Otra'],
    'red':            ['TP-Link', 'D-Link', 'Mikrotik', 'Cisco', 'Ubiquiti', 'Netgear', 'Huawei', 'Tenda', 'Linksys', 'Otra'],
    'otro':           ['Otra']
  },

  // ============================================
  // PROBLEMAS / SERVICIOS (precios en RD$)
  // ⚙️ EDITA AQUÍ
  // ============================================
  problemas: [
    // Impresoras
    { id: 'almohadillas',       label: 'Mantenimiento de almohadillas',    precio: 1500, cat: 'impresora' },
    { id: 'cabezal',            label: 'Limpieza profunda de cabezal',     precio: 1200, cat: 'impresora' },
    { id: 'tinta-tapada',       label: 'Sistema de tinta tapado',          precio: 800,  cat: 'impresora' },
    { id: 'atasco',             label: 'Atasco de papel',                  precio: 500,  cat: 'impresora' },
    { id: 'no-imprime',         label: 'No imprime / mala calidad',        precio: 700,  cat: 'impresora' },
    { id: 'no-enciende',        label: 'No enciende (diagnóstico)',        precio: 1500, cat: 'impresora' },
    { id: 'cambio-rodillo',     label: 'Cambio de rodillo',                precio: 900,  cat: 'impresora' },
    { id: 'desarmado-completo', label: 'Desarme y limpieza completa',      precio: 2000, cat: 'impresora' },

    // Impresora en red
    { id: 'wifi-impresora',     label: 'Configurar impresora WiFi',        precio: 700,  cat: 'impresora-red' },
    { id: 'red-impresora',      label: 'Configurar impresora en red LAN',  precio: 900,  cat: 'impresora-red' },
    { id: 'ip-fija',            label: 'Asignar IP fija a impresora',      precio: 500,  cat: 'impresora-red' },

    // Laptop / PC
    { id: 'formateo',           label: 'Formateo + Windows + Drivers',     precio: 2500, cat: 'laptop' },
    { id: 'pasta-termica',      label: 'Cambio de pasta térmica',          precio: 1200, cat: 'laptop' },
    { id: 'limpieza-pc',        label: 'Limpieza interna completa',        precio: 800,  cat: 'laptop' },
    { id: 'cambio-disco',       label: 'Instalación de SSD/HDD',           precio: 1000, cat: 'laptop' },
    { id: 'cambio-ram',         label: 'Ampliación de RAM',                precio: 700,  cat: 'laptop' },
    { id: 'virus',              label: 'Eliminación de virus/malware',     precio: 1200, cat: 'laptop' },
    { id: 'recuperacion',       label: 'Recuperación de datos',            precio: 3000, cat: 'laptop' },
    { id: 'pantalla',           label: 'Cambio de pantalla',               precio: 2000, cat: 'laptop' },
    { id: 'teclado',            label: 'Cambio de teclado',                precio: 1500, cat: 'laptop' },
    { id: 'no-enciende-pc',     label: 'No enciende (diagnóstico PC)',     precio: 1000, cat: 'laptop' },
    { id: 'lentitud',           label: 'Optimización de rendimiento',      precio: 1000, cat: 'laptop' },
    { id: 'instalacion-office', label: 'Instalación de Office',            precio: 800,  cat: 'laptop' },

    // Redes
    { id: 'config-router',      label: 'Configurar router',                precio: 1200, cat: 'red' },
    { id: 'red-completa',       label: 'Instalación de red completa',      precio: 3500, cat: 'red' },
    { id: 'wifi-optimizar',     label: 'Optimización de WiFi',             precio: 800,  cat: 'red' },
    { id: 'punto-acceso',       label: 'Instalación de access point',      precio: 1500, cat: 'red' },
    { id: 'cable-estructurado', label: 'Cableado (por punto)',             precio: 1200, cat: 'red' },
    { id: 'red-caida',          label: 'Diagnóstico de red caída',         precio: 1000, cat: 'red' },
    { id: 'config-vlan',        label: 'Configuración de VLANs',           precio: 1500, cat: 'red' },
    { id: 'vpn-config',         label: 'Configuración de VPN',             precio: 2000, cat: 'red' }
  ]
};

// ============================================
// SEGURIDAD · Protección de factura
// ============================================
window.SOPORTE_CONFIG.security = {
  // Contraseña en texto plano (fácil de cambiar).
  // Cámbiala por la que tú quieras: 'mi-clave-secreta-2025'
  facturaPassword: 'Admin2026',
  
  // (Opcional avanzado) Si prefieres usar hash SHA-256 en lugar
  // de texto plano, pon el hash aquí y borra facturaPassword.
  // Genera tu hash abriendo la consola del navegador (F12) y pegando:
  //   crypto.subtle.digest('SHA-256', new TextEncoder().encode('MI_PASSWORD'+'jcdc-2024')).then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')));
  facturaPasswordHash: '',
  facturaSalt: 'jcdc-2024',
  
  // Secreto para el código de verificación de documentos
  docSecret: 'jcdc-verify-2024-v1'
};

// ============================================
// DOCUMENTOS · Configuración
// ============================================
window.SOPORTE_CONFIG.documentos = {
  cotizacionValidezDias: 7,     // ← Validez de la cotización (días)
  mostrarWatermark: true,       // Marca de agua "COTIZACIÓN" en cotizaciones
  selloPagoAzul: true,          // Sello "PAGADO" en facturas
  colorSello: '#1e40af'         // Azul del sello (cámbialo si quieres)
};