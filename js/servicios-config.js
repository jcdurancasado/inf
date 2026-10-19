/**
 * JCDURANCASADO · Configuración de Servicios
 * v4 — 13 servicios + garantía con precio + validez admin
 * ⚙️ EDITA AQUÍ: precios, marcas, datos del proveedor
 */
window.SOPORTE_CONFIG = {

  // ============================================
  // TUS DATOS (aparecen en cotización y factura)
  // ============================================
  proveedor: {
    nombre: 'Julio C. Durán Casado',
    cedula: '016-0017787-5',
    profesion: 'Ingeniero en Redes y Telecomunicaciones',
    telefono: '+1 829-421-3163',
    email: 'jcdurancasado@gmail.com',
    web: 'jcdurancasado.github.io/inf'
  },

  // ============================================
  // TASA DE CAMBIO Y URLS
  // ============================================
  rateDop: 60,
  apiBaseUrl: 'https://jcdcapi.vercel.app',
  whatsapp: '18294213163',

  // ============================================
  // GARANTÍA · Tramos y porcentaje sobre el total
  // Editable: cambia los "pct" cuando quieras
  // ============================================
  garantiaTramos: [
    { dias: 0,   label: 'Sin garantía', pct: 0    },
    { dias: 15,  label: '15 días',      pct: 0.03 },
    { dias: 30,  label: '30 días',      pct: 0.05 }, // 5%
    { dias: 60,  label: '60 días',      pct: 0.08 }, // 8%
    { dias: 90,  label: '90 días',      pct: 0.12 }, // 12%
    { dias: 180, label: '6 meses',      pct: 0.18 }, // 18%
    { dias: 365, label: '1 año',        pct: 0.28 }  // 28%
  ],

  // ============================================
  // EQUIPOS (reparación técnica)
  // ============================================
  equipos: [
    { id: 'impresora',      label: 'Impresora',          icon: 'fa-print' },
    { id: 'impresora-red',  label: 'Impresora en red',   icon: 'fa-print' },
    { id: 'laptop',         label: 'Laptop / PC',        icon: 'fa-laptop' },
    { id: 'red',            label: 'Red / Router',       icon: 'fa-network-wired' },
    { id: 'servidor',       label: 'Servidor / NAS',     icon: 'fa-server' },
    { id: 'cctv',           label: 'Cámara / DVR',       icon: 'fa-video' },
    { id: 'otro',           label: 'Otro equipo',        icon: 'fa-microchip' }
  ],

  // ============================================
  // MARCAS por tipo de equipo
  // ============================================
  marcas: {
    'impresora':      ['Epson', 'HP', 'Canon', 'Brother', 'Lexmark', 'Samsung', 'Ricoh', 'Xerox', 'Otra'],
    'impresora-red':  ['Epson', 'HP', 'Canon', 'Brother', 'Lexmark', 'Samsung', 'Ricoh', 'Xerox', 'Otra'],
    'laptop':         ['Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Apple', 'MSI', 'Toshiba', 'Gateway', 'Samsung', 'Huawei', 'Otra'],
    'red':            ['TP-Link', 'D-Link', 'Mikrotik', 'Cisco', 'Ubiquiti', 'Netgear', 'Huawei', 'Tenda', 'Linksys', 'Fortinet', 'Juniper', 'Otra'],
    'servidor':       ['Dell', 'HP', 'Lenovo', 'Supermicro', 'Synology', 'QNAP', 'Western Digital', 'Otra'],
    'cctv':           ['Hikvision', 'Dahua', 'Reolink', 'Axis', 'Bosch', 'Uniview', 'Otra'],
    'otro':           ['Otra']
  },

  // ============================================
  // PROBLEMAS / SERVICIOS DE REPARACIÓN (precios en RD$)
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
    { id: 'vpn-config',         label: 'Configuración de VPN',             precio: 2000, cat: 'red' },

    // Servidores / NAS
    { id: 'config-nas',         label: 'Configurar NAS / almacenamiento',  precio: 2500, cat: 'servidor' },
    { id: 'backup-config',      label: 'Configurar respaldos automáticos', precio: 1800, cat: 'servidor' },
    { id: 'recuperacion-raid',  label: 'Recuperación de RAID dañado',      precio: 5000, cat: 'servidor' },
    { id: 'migracion-servidor', label: 'Migración a servidor nuevo',       precio: 4500, cat: 'servidor' },
    { id: 'hardening-servidor', label: 'Hardening de servidor',            precio: 3000, cat: 'servidor' },

    // CCTV
    { id: 'cctv-config-camara', label: 'Configurar cámara IP',             precio: 800,  cat: 'cctv' },
    { id: 'cctv-config-nvr',    label: 'Configurar NVR / grabador',        precio: 1500, cat: 'cctv' },
    { id: 'cctv-reemplazo',     label: 'Reemplazo de cámara dañada',       precio: 2000, cat: 'cctv' },
    { id: 'cctv-acceso-remoto', label: 'Configurar acceso remoto CCTV',    precio: 1200, cat: 'cctv' },
    { id: 'cctv-mantenimiento', label: 'Mantenimiento preventivo CCTV',    precio: 2500, cat: 'cctv' }
  ],

  // ============================================
  // CATÁLOGO DE ACCESORIOS Y REPUESTOS (precios en RD$)
  // Estructura: categorías → familias → variantes
  // Editable: agrega/quita familias, variantes o cambia precios
  // ============================================
  catalogoAccesorios: [
    {
      cat: 'cables',
      label: 'Cables',
      icon: 'fa-plug',
      families: [
        {
          id: 'hdmi',
          label: 'Cable HDMI',
          variants: [
            { id: 'hdmi_1m',  label: '1m',   precio: 350 },
            { id: 'hdmi_2m',  label: '2m',   precio: 450 },
            { id: 'hdmi_3m',  label: '3m',   precio: 550 },
            { id: 'hdmi_5m',  label: '5m',   precio: 750 },
            { id: 'hdmi_10m', label: '10m',  precio: 1300 }
          ]
        },
        {
          id: 'vga',
          label: 'Cable VGA',
          variants: [
            { id: 'vga_15m', label: '1.5m', precio: 300 },
            { id: 'vga_3m',  label: '3m',   precio: 450 },
            { id: 'vga_5m',  label: '5m',   precio: 650 },
            { id: 'vga_10m', label: '10m',  precio: 1100 }
          ]
        },
        {
          id: 'displayport',
          label: 'Cable DisplayPort',
          variants: [
            { id: 'dp_15m', label: '1.5m', precio: 450 },
            { id: 'dp_3m',  label: '3m',   precio: 650 }
          ]
        },
        {
          id: 'dvi',
          label: 'Cable DVI',
          variants: [
            { id: 'dvi_15m', label: '1.5m', precio: 400 },
            { id: 'dvi_3m',  label: '3m',   precio: 550 }
          ]
        },
        {
          id: 'usbc_hdmi',
          label: 'Cable USB-C a HDMI',
          variants: [
            { id: 'usbc_hdmi_15', label: '1.5m', precio: 750 },
            { id: 'usbc_hdmi_3',  label: '3m',   precio: 950 }
          ]
        },
        {
          id: 'usb_impresora',
          label: 'Cable USB-A a USB-B (impresora)',
          variants: [
            { id: 'usb_ab_15', label: '1.5m', precio: 250 },
            { id: 'usb_ab_3',  label: '3m',   precio: 350 },
            { id: 'usb_ab_5',  label: '5m',   precio: 450 }
          ]
        },
        {
          id: 'rj45_cat5e',
          label: 'Cable de red Cat5e',
          variants: [
            { id: 'c5_1m',  label: '1m',  precio: 120 },
            { id: 'c5_3m',  label: '3m',  precio: 180 },
            { id: 'c5_5m',  label: '5m',  precio: 250 },
            { id: 'c5_10m', label: '10m', precio: 400 },
            { id: 'c5_20m', label: '20m', precio: 650 }
          ]
        },
        {
          id: 'rj45_cat6',
          label: 'Cable de red Cat6',
          variants: [
            { id: 'c6_1m',  label: '1m',  precio: 180 },
            { id: 'c6_3m',  label: '3m',  precio: 280 },
            { id: 'c6_5m',  label: '5m',  precio: 400 },
            { id: 'c6_10m', label: '10m', precio: 650 },
            { id: 'c6_20m', label: '20m', precio: 900 }
          ]
        },
        {
          id: 'rj45_cat6a',
          label: 'Cable de red Cat6A',
          variants: [
            { id: 'c6a_1m',  label: '1m',  precio: 250 },
            { id: 'c6a_3m',  label: '3m',  precio: 400 },
            { id: 'c6a_5m',  label: '5m',  precio: 550 },
            { id: 'c6a_10m', label: '10m', precio: 850 }
          ]
        },
        {
          id: 'corriente',
          label: 'Cable de corriente',
          variants: [
            { id: 'power_univ',   label: 'Universal (PC/impresora)',  precio: 200 },
            { id: 'power_laptop', label: 'Para laptop (con cargador)', precio: 850 },
            { id: 'power_ext',    label: 'Extensión 3 tomas 1m',      precio: 350 }
          ]
        },
        {
          id: 'audio',
          label: 'Cable de audio',
          variants: [
            { id: 'audio_35_1m', label: '3.5mm 1m', precio: 150 },
            { id: 'audio_35_3m', label: '3.5mm 3m', precio: 250 },
            { id: 'audio_35_5m', label: '3.5mm 5m', precio: 350 },
            { id: 'rca_15',      label: 'RCA 1.5m',  precio: 200 }
          ]
        },
        {
          id: 'otro_cable',
          label: 'Otro cable',
          variants: [
            { id: 'sata_power', label: 'Poder SATA',    precio: 150 },
            { id: 'molex',      label: 'Poder Molex',   precio: 150 },
            { id: 'usb_ext',    label: 'Extensión USB 1.5m', precio: 200 }
          ]
        }
      ]
    },
    {
      cat: 'perifericos',
      label: 'Periféricos',
      icon: 'fa-mouse',
      families: [
        {
          id: 'mouse',
          label: 'Mouse',
          variants: [
            { id: 'mouse_usb', label: 'USB básico',       precio: 250 },
            { id: 'mouse_opt', label: 'Óptico USB',       precio: 350 },
            { id: 'mouse_wl',  label: 'Inalámbrico',      precio: 550 },
            { id: 'mouse_gam', label: 'Gamer RGB',        precio: 1200 }
          ]
        },
        {
          id: 'teclado',
          label: 'Teclado',
          variants: [
            { id: 'teclado_usb', label: 'USB básico',  precio: 450 },
            { id: 'teclado_wl',  label: 'Inalámbrico', precio: 850 },
            { id: 'teclado_mec', label: 'Mecánico',    precio: 1800 },
            { id: 'teclado_gam', label: 'Gamer RGB',   precio: 2500 }
          ]
        },
        {
          id: 'combo',
          label: 'Combo mouse + teclado',
          variants: [
            { id: 'combo_usb', label: 'USB',         precio: 650 },
            { id: 'combo_wl',  label: 'Inalámbrico', precio: 1100 }
          ]
        },
        {
          id: 'mousepad',
          label: 'Mousepad',
          variants: [
            { id: 'mousepad',    label: 'Estándar',    precio: 200 },
            { id: 'mousepad_xl', label: 'XL gamer',    precio: 450 }
          ]
        },
        {
          id: 'webcam',
          label: 'Webcam',
          variants: [
            { id: 'webcam_720',  label: '720p',  precio: 850 },
            { id: 'webcam_1080', label: '1080p', precio: 1500 },
            { id: 'webcam_4k',   label: '4K',    precio: 3500 }
          ]
        },
        {
          id: 'parlantes',
          label: 'Parlantes',
          variants: [
            { id: 'parl_20', label: '2.0 USB',           precio: 650 },
            { id: 'parl_21', label: '2.1 con subwoofer', precio: 1800 }
          ]
        },
        {
          id: 'headset',
          label: 'Diadema / Headset',
          variants: [
            { id: 'head_bas',  label: 'Básico',         precio: 550 },
            { id: 'head_mic',  label: 'Con micrófono',  precio: 850 },
            { id: 'head_gam',  label: 'Gamer',          precio: 1800 }
          ]
        },
        {
          id: 'microfono',
          label: 'Micrófono',
          variants: [
            { id: 'mic_bas', label: 'Básico',           precio: 450 },
            { id: 'mic_usb', label: 'Condensador USB',  precio: 1500 }
          ]
        }
      ]
    },
    {
      cat: 'almacenamiento',
      label: 'Almacenamiento',
      icon: 'fa-hdd',
      families: [
        {
          id: 'pendrive',
          label: 'Pendrive USB',
          variants: [
            { id: 'usb_16',  label: '16GB',  precio: 400 },
            { id: 'usb_32',  label: '32GB',  precio: 650 },
            { id: 'usb_64',  label: '64GB',  precio: 1000 },
            { id: 'usb_128', label: '128GB', precio: 1800 },
            { id: 'usb_256', label: '256GB', precio: 3200 }
          ]
        },
        {
          id: 'sd',
          label: 'Tarjeta SD',
          variants: [
            { id: 'sd_32',  label: '32GB',  precio: 700 },
            { id: 'sd_64',  label: '64GB',  precio: 1200 },
            { id: 'sd_128', label: '128GB', precio: 2200 }
          ]
        },
        {
          id: 'microsd',
          label: 'Tarjeta MicroSD',
          variants: [
            { id: 'micro_32',  label: '32GB',  precio: 650 },
            { id: 'micro_64',  label: '64GB',  precio: 1100 },
            { id: 'micro_128', label: '128GB', precio: 2000 }
          ]
        },
        {
          id: 'hdd_ext',
          label: 'Disco duro externo',
          variants: [
            { id: 'hdd_500', label: '500GB', precio: 2500 },
            { id: 'hdd_1tb', label: '1TB',   precio: 3500 },
            { id: 'hdd_2tb', label: '2TB',   precio: 5500 }
          ]
        },
        {
          id: 'ssd_ext',
          label: 'SSD externo',
          variants: [
            { id: 'ssd_500', label: '500GB', precio: 4500 },
            { id: 'ssd_1tb', label: '1TB',   precio: 7500 }
          ]
        },
        {
          id: 'lector',
          label: 'Lector de tarjetas',
          variants: [
            { id: 'lector_sd',  label: 'SD/MicroSD',   precio: 350 },
            { id: 'lector_multi', label: 'Multiformato', precio: 550 }
          ]
        }
      ]
    },
    {
      cat: 'adaptadores',
      label: 'Adaptadores y Hubs',
      icon: 'fa-usb',
      families: [
        {
          id: 'adap_video',
          label: 'Adaptador de video',
          variants: [
            { id: 'dvi_vga',      label: 'DVI a VGA',        precio: 400 },
            { id: 'hdmi_vga',     label: 'HDMI a VGA',       precio: 550 },
            { id: 'usbc_hdmi_ad', label: 'USB-C a HDMI',     precio: 750 },
            { id: 'usbc_vga',     label: 'USB-C a VGA',      precio: 650 }
          ]
        },
        {
          id: 'adap_usb',
          label: 'Adaptador USB',
          variants: [
            { id: 'usbc_usba', label: 'USB-C a USB-A',        precio: 350 },
            { id: 'usbc_35',   label: 'USB-C a 3.5mm audio',  precio: 350 },
            { id: 'usb_serial',label: 'USB a serial RS232',   precio: 850 }
          ]
        },
        {
          id: 'hub',
          label: 'Hub USB',
          variants: [
            { id: 'hub_usb4',  label: '4 puertos',              precio: 550 },
            { id: 'hub_usb7',  label: '7 puertos con corriente',precio: 1500 },
            { id: 'hub_usbc7', label: 'USB-C 7-en-1',           precio: 2200 }
          ]
        },
        {
          id: 'adap_otros',
          label: 'Otros adaptadores',
          variants: [
            { id: 'sata_usb', label: 'SATA a USB',      precio: 650 },
            { id: 'rj45_usb', label: 'USB a Ethernet',  precio: 700 }
          ]
        }
      ]
    },
    {
      cat: 'repuestos',
      label: 'Repuestos y Consumibles',
      icon: 'fa-box',
      families: [
        {
          id: 'toner',
          label: 'Tóner',
          variants: [
            { id: 'toner_hp85',  label: 'HP 85A',  precio: 1800 },
            { id: 'toner_hp105', label: 'HP 105A', precio: 1500 },
            { id: 'toner_hp107', label: 'HP 107A', precio: 2200 },
            { id: 'toner_hp26',  label: 'HP 26A',  precio: 1500 },
            { id: 'toner_canon125', label: 'Canon 125', precio: 1500 },
            { id: 'toner_canon137', label: 'Canon 137', precio: 1800 }
          ]
        },
        {
          id: 'cartucho',
          label: 'Cartucho de tinta',
          variants: [
            { id: 'cart_epson_neg', label: 'Epson 664 negro',   precio: 550 },
            { id: 'cart_epson_col', label: 'Epson 664 color',   precio: 650 },
            { id: 'cart_epson_544', label: 'Epson 544 negro',   precio: 850 }
          ]
        },
        {
          id: 'ventilador',
          label: 'Ventilador case',
          variants: [
            { id: 'ven_80',  label: '80mm',  precio: 350 },
            { id: 'ven_120', label: '120mm', precio: 450 },
            { id: 'ven_140', label: '140mm', precio: 650 }
          ]
        },
        {
          id: 'fuente',
          label: 'Fuente de poder',
          variants: [
            { id: 'fuente_500', label: '500W', precio: 2200 },
            { id: 'fuente_600', label: '600W', precio: 2800 }
          ]
        },
        {
          id: 'consumibles',
          label: 'Consumibles',
          variants: [
            { id: 'pasta_termica', label: 'Pasta térmica',              precio: 250 },
            { id: 'rollo_80',      label: 'Rollo papel térmico 80mm',   precio: 150 },
            { id: 'rollo_57',      label: 'Rollo papel térmico 57mm',   precio: 120 },
            { id: 'etiqueta_term', label: 'Etiqueta térmica',           precio: 350 }
          ]
        }
      ]
    }
  ],

  // ============================================
  // SERVICIOS DEL COTIZADOR (13 servicios)
  // Genera el Paso 1 y define campos por servicio
  // ============================================
  serviciosCotizador: {
    // ==================== SOPORTE & REPARACIÓN ====================
    reparacion: {
      label: 'Reparación Técnica',
      category: 'soporte',
      categoryLabel: 'Soporte',
      icon: 'fa-toolbox',
      desc: 'Impresoras, PC, redes',
      base: 0,
      custom: true
    },
    accesorios: {
      label: 'Accesorios y Repuestos',
      category: 'soporte',
      categoryLabel: 'Soporte',
      icon: 'fa-plug',
      desc: 'Cables, periféricos y piezas',
      base: 0,
      custom: true
    },
    support: {
      label: 'Soporte Mensual',
      category: 'soporte',
      categoryLabel: 'Soporte',
      icon: 'fa-screwdriver-wrench',
      desc: 'Mantenimiento y asistencia',
      base: 200,
      fields: [
        { id: 'users', label: 'Usuarios', min: 1, max: 500, step: 5, default: 20, unit: 3, unitLabel: '$3 por usuario/mes' }
      ]
    },

    // ==================== REDES ====================
    red: {
      label: 'Red Empresarial',
      category: 'redes',
      categoryLabel: 'Redes',
      icon: 'fa-network-wired',
      desc: 'Cisco, VLANs, routing',
      base: 500,
      fields: [
        { id: 'users',    label: 'Usuarios / dispositivos', min: 1, max: 500, step: 5, default: 20, unit: 8,   unitLabel: '$8 por usuario' },
        { id: 'branches', label: 'Sucursales',              min: 1, max: 30,  step: 1, default: 1,  unit: 150, unitLabel: '$150 por sucursal' }
      ]
    },
    wifi: {
      label: 'Diseño WiFi Empresarial',
      category: 'redes',
      categoryLabel: 'Redes',
      icon: 'fa-wifi',
      desc: 'Site survey, APs, heat map',
      base: 400,
      fields: [
        { id: 'aps',  label: 'Access Points', min: 1,  max: 100,  step: 1,  default: 4,   unit: 60,  unitLabel: '$60 por AP' },
        { id: 'area', label: 'Área (m²)',     min: 50, max: 5000, step: 50, default: 300, unit: 0.5, unitLabel: '$0.50 por m²' }
      ]
    },
    cableado: {
      label: 'Cableado Estructurado',
      category: 'redes',
      categoryLabel: 'Redes',
      icon: 'fa-ethernet',
      desc: 'Cat 5e/6/6A certificado',
      base: 200,
      fields: [
        { id: 'puntos', label: 'Puntos de red', min: 1, max: 300, step: 1, default: 10, unit: 55, unitLabel: '$55 por punto' }
      ]
    },
    vpn: {
      label: 'VPN Corporativa',
      category: 'redes',
      categoryLabel: 'Redes',
      icon: 'fa-user-shield',
      desc: 'Site-to-site + Remote Access',
      base: 400,
      fields: [
        { id: 'sedes', label: 'Sedes a conectar', min: 2, max: 30,  step: 1, default: 2,  unit: 180, unitLabel: '$180 por sede' },
        { id: 'users', label: 'Usuarios remotos',  min: 1, max: 500, step: 5, default: 10, unit: 5,   unitLabel: '$5 por usuario' }
      ]
    },
    firewall: {
      label: 'Firewall Perimetral',
      category: 'redes',
      categoryLabel: 'Redes',
      icon: 'fa-fire-flame-curved',
      desc: 'Fortinet, pfSense, Cisco',
      base: 700,
      fields: [
        { id: 'users', label: 'Usuarios protegidos', min: 1, max: 1000, step: 10, default: 50, unit: 6, unitLabel: '$6 por usuario' }
      ]
    },

    // ==================== SEGURIDAD ====================
    audit: {
      label: 'Auditoría de Seguridad',
      category: 'seguridad',
      categoryLabel: 'Seguridad',
      icon: 'fa-shield-halved',
      desc: 'Análisis, hardening, informes',
      base: 800,
      fields: [
        { id: 'servers',  label: 'Servidores a auditar', min: 1, max: 100, step: 1, default: 3, unit: 100, unitLabel: '$100 por servidor' },
        { id: 'branches', label: 'Sucursales',            min: 1, max: 30,  step: 1, default: 1, unit: 200, unitLabel: '$200 por sucursal' }
      ]
    },
    pentest: {
      label: 'Pentesting',
      category: 'seguridad',
      categoryLabel: 'Seguridad',
      icon: 'fa-bullseye',
      desc: 'Pruebas ofensivas autorizadas',
      base: 1200,
      fields: [
        { id: 'targets', label: 'Objetivos (IPs / Dominios)', min: 1, max: 50, step: 1, default: 5, unit: 180, unitLabel: '$180 por objetivo' },
        { id: 'days',    label: 'Días de pruebas',             min: 2, max: 30, step: 1, default: 5, unit: 250, unitLabel: '$250 por día' }
      ]
    },

    // ==================== FORMACIÓN ====================
    training: {
      label: 'Capacitación Técnica',
      category: 'formacion',
      categoryLabel: 'Formación',
      icon: 'fa-chalkboard-user',
      desc: 'CCNA, CyberOps, IT Essentials',
      base: 300,
      fields: [
        { id: 'students', label: 'Estudiantes',   min: 5, max: 200, step: 5, default: 15, unit: 25, unitLabel: '$25 por estudiante' },
        { id: 'hours',    label: 'Horas totales', min: 4, max: 200, step: 4, default: 24, unit: 15, unitLabel: '$15 por hora' }
      ]
    },
    mentoria: {
      label: 'Mentoría Técnica 1:1',
      category: 'formacion',
      categoryLabel: 'Formación',
      icon: 'fa-user-graduate',
      desc: 'Sesiones privadas por videollamada',
      base: 0,
      fields: [
        { id: 'hours', label: 'Horas de mentoría', min: 1, max: 60, step: 1, default: 4, unit: 40, unitLabel: '$40 por hora' }
      ]
    },

    // ==================== CLOUD & CCTV ====================
    cloud: {
      label: 'Migración Cloud',
      category: 'cloud',
      categoryLabel: 'Cloud & CCTV',
      icon: 'fa-cloud-arrow-up',
      desc: 'M365 / Google Workspace',
      base: 300,
      fields: [
        { id: 'accounts', label: 'Cuentas a migrar', min: 1, max: 500, step: 1, default: 15, unit: 18, unitLabel: '$18 por cuenta' }
      ]
    },
    cctv: {
      label: 'Instalación CCTV IP',
      category: 'cloud',
      categoryLabel: 'Cloud & CCTV',
      icon: 'fa-video',
      desc: 'Hikvision, Dahua, NVR',
      base: 200,
      fields: [
        { id: 'cameras', label: 'Cámaras IP', min: 1, max: 100, step: 1, default: 4, unit: 120, unitLabel: '$120 por cámara' }
      ]
    },

  },

  // ============================================
  // EXTRAS · con lógica de incompatibilidades
  // "excludes": no mostrar si el servicio está en esta lista
  // "forReparacionOnly": solo para reparación (o lo contrario)
  // ============================================
  extrasQueGeneranDocumentos: {
    docs: 'documentacion',
    certificate: 'certificado',
    training: 'capacitacion'
  },

  extrasDef: {
    docs: {
      label: 'Documentación técnica',
      price: 150,
      icon: 'fa-file-lines'
    },
    certificate: {
      label: 'Certificado por escrito',
      price: 50,
      icon: 'fa-award',
      excludes: ['training', 'mentoria']   // ya incluyen certificado
    },
    onsite: {
      label: 'Visita presencial',
      price: 100,
      icon: 'fa-map-location-dot',
      excludes: ['reparacion']              // reparación ya es presencial por defecto
    },
    training: {
      label: 'Capacitación al equipo (4h)',
      price: 200,
      icon: 'fa-chalkboard-user',
      excludes: ['training', 'mentoria', 'reparacion']
    },
    urgent: {
      label: 'Entrega urgente (< 1 semana)',
      price: 0,
      percentage: 0.30,
      icon: 'fa-bolt',
      excludes: ['support']   // solo se oculta en Soporte Mensual
    }
  }
};

// ============================================
// SEGURIDAD · Protección de factura
// ============================================
window.SOPORTE_CONFIG.security = {
  // Contraseña en texto plano (fácil de cambiar)
  facturaPassword: 'Admin2026',

  // (Opcional avanzado) Si prefieres usar hash SHA-256, pon el hash aquí
  // y deja facturaPassword en blanco ''.
  // Comando para generarlo (F12 → Consola):
  //   crypto.subtle.digest('SHA-256', new TextEncoder().encode('TU_CLAVE'+'jcdc-2024')).then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')));
  facturaPasswordHash: '',
  facturaSalt: 'jcdc-2024',

  // Secreto para el código de verificación de documentos
  docSecret: 'jcdc-verify-2024-v1'
};

// ============================================
// DOCUMENTOS · Configuración
// ============================================
window.SOPORTE_CONFIG.documentos = {
  cotizacionValidezDias: 15,
  cotizacionValidezOpciones: [15, 30, 45, 60],
  mostrarWatermark: true,
  selloPagoAzul: true,

  colorSelloPagado:       '#0a7f2e',
  colorSelloNoPagada:     '#c81e1e',
  colorSelloCotizacion:   '#0369a1'
};