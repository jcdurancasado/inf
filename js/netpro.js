/**
 * JCDURANCASADO · NetPro
 * IP · DNS · WHOIS en vivo desde el navegador
 */
'use strict';

/* ==========================================
   Helpers · IP con fallback multi-proveedor
   ========================================== */
function countryToFlag(code) {
  if (!code || code.length !== 2) return '🌐';
  return code.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(127397 + c.charCodeAt(0))
  );
}

function normalizeIP(data, provider) {
  if (provider === 'ipapi.co') {
    return {
      success: !data.error,
      ip: data.ip,
      country: data.country_name,
      region: data.region,
      city: data.city,
      connection: {
        isp: data.org,
        asn: data.asn ? String(data.asn).replace(/^AS/, '') : null
      },
      type: data.version || (data.ip && data.ip.includes(':') ? 'IPv6' : 'IPv4'),
      timezone: { id: data.timezone },
      latitude: data.latitude,
      longitude: data.longitude,
      flag: { emoji: countryToFlag(data.country_code) }
    };
  }
  if (provider === 'ipapi.is') {
    return {
      success: true,
      ip: data.ip,
      country: data.location?.country,
      region: data.location?.state,
      city: data.location?.city,
      connection: {
        isp: data.asn?.org,
        asn: data.asn?.asn ? String(data.asn.asn) : null
      },
      type: data.ip && data.ip.includes(':') ? 'IPv6' : 'IPv4',
      timezone: { id: data.location?.timezone },
      latitude: data.location?.latitude,
      longitude: data.location?.longitude,
      flag: { emoji: countryToFlag(data.location?.country_code) }
    };
  }
  return data;
}

async function fetchIPWithFallback(ip) {
  const providers = [
    { name: 'ipwho.is', url: 'https://ipwho.is/' + (ip || '') },
    { name: 'ipapi.co', url: ip ? 'https://ipapi.co/' + ip + '/json/' : 'https://ipapi.co/json/' },
    { name: 'ipapi.is', url: ip ? 'https://api.ipapi.is/?q=' + ip : 'https://api.ipapi.is/' }
  ];

  let lastErr;
  for (const p of providers) {
    try {
      const r = await fetch(p.url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      if (data.success === false) throw new Error(data.message || 'API error');
      if (data.error) throw new Error(data.reason || data.error || 'API error');
      console.log('[NetPro IP] OK desde: ' + p.name);
      return normalizeIP(data, p.name);
    } catch (e) {
      lastErr = e;
      console.warn('[NetPro IP] ' + p.name + ' falló: ' + e.message);
    }
  }
  throw lastErr || new Error('Todos los proveedores fallaron');
}

/* ==========================================
   Helpers · MAC Vendor (maclookup.app, CORS nativo)
   ========================================== */
async function fetchMacVendor(mac) {
  const clean = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (clean.length < 6) throw new Error('MAC inválida (mínimo 6 hex)');

  const oui = clean.slice(0, 6);
  const formatted = oui.match(/.{1,2}/g).join(':');

  // Proveedores con CORS nativo (verificado)
  const providers = [
    {
      name: 'macverify.com',
      url: 'https://macverify.com/api/v1/lookup?mac=' + encodeURIComponent(formatted)
    },
    {
      name: 'ipwhois.net',
      url: 'https://ipwhois.net/api/mac/v1/lookup?mac=' + encodeURIComponent(formatted)
    }
  ];

  let lastErr;
  for (const p of providers) {
    try {
      const r = await fetch(p.url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) {
        if (r.status === 429) throw new Error('Rate limit. Espera un momento.');
        if (r.status === 404 || r.status === 204) throw new Error('MAC no encontrada');
        throw new Error('HTTP ' + r.status);
      }
      const data = await r.json();

      // MACVerify: devuelve { company, country, address, ... }
      if (p.name === 'macverify.com' && data.company) {
        console.log('[NetPro MAC] OK desde macverify.com');
        return {
          vendor: data.company,
          oui: formatted,
          country: data.country || null,
          address: data.address || null,
          blockStart: data.startHex || null,
          blockEnd: data.endHex || null
        };
      }

      // IPWhois.net: devuelve { success, vendor: { company, country, ... } }
      if (p.name === 'ipwhois.net' && data.success && data.vendor) {
        console.log('[NetPro MAC] OK desde ipwhois.net');
        return {
          vendor: data.vendor.company,
          oui: formatted,
          country: data.vendor.country || null,
          address: data.vendor.address || null,
          blockStart: null,
          blockEnd: null
        };
      }

      throw new Error('Respuesta inesperada');
    } catch (e) {
      lastErr = e;
      console.warn('[NetPro MAC] ' + p.name + ' falló: ' + e.message);
    }
  }
  throw lastErr || new Error('No se pudo consultar el fabricante');
}

/* ==========================================
   Helpers · WebRTC Leak Detection
   ========================================== */
function classifyIP(ip) {
  if (!ip) return 'unknown';
  // IPv6
  if (ip.includes(':')) {
    if (/^fe80:/i.test(ip)) return 'local';
    if (/^f[cd]/i.test(ip)) return 'local';
    if (/^::1$/.test(ip)) return 'loopback';
    return 'public';
  }
  // IPv4
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => isNaN(n) || n < 0 || n > 255)) return 'unknown';
  if (p[0] === 127) return 'loopback';
  if (p[0] === 10) return 'local';
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return 'local';
  if (p[0] === 192 && p[1] === 168) return 'local';
  if (p[0] === 169 && p[1] === 254) return 'local';
  if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return 'cgnat';
  return 'public';
}

function detectWebRTCLeaks() {
  return new Promise((resolve, reject) => {
    if (typeof RTCPeerConnection === 'undefined') {
      return reject(new Error('WebRTC no soportado en este navegador'));
    }

    const ips = new Map(); // ip → { type, protocol, candidateType }
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
      ]
    });

    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      try { pc.close(); } catch (e) {}
      if (ips.size === 0) {
        resolve([]);
      } else {
        const arr = [...ips.entries()].map(([ip, meta]) => ({ ip, ...meta }));
        resolve(arr);
      }
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate || !e.candidate.candidate) return;
      const parts = e.candidate.candidate.split(' ');
      const protocol = (parts[2] || 'udp').toLowerCase();
      const ip = parts[4];
      const candType = parts[7] || 'unknown';
      if (!ip || ip === '0.0.0.0' || ip === '::') return;
      if (!ips.has(ip)) {
        ips.set(ip, {
          type: classifyIP(ip),
          protocol: protocol,
          candidateType: candType
        });
      }
    };

    pc.createDataChannel('leaktest');
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(reject);

    // Esperar 5s a que se agoten los ICE candidates
    setTimeout(finish, 5000);
  });
}

/* ==========================================
   Helpers · ASN Lookup (asn.ipinfo.app, CORS nativo)
   ========================================== */
function isIP(str) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(str) || (/^[0-9a-fA-F:]+$/.test(str) && str.includes(':'));
}

async function fetchASN(query) {
  const clean = query.trim().replace(/^AS/i, '');
  const isIPQuery = isIP(clean);

  // ipinfo.io: CORS nativo, sin API key (50k req/mes free tier)
  // Solo acepta IPs. Si el usuario dio un ASN, avisamos.
  if (!isIPQuery) {
    throw new Error('Esta API consulta por IP. Introduce una IP del ASN (ej. 8.8.8.8 para Google, 1.1.1.1 para Cloudflare).');
  }

  const r = await fetch('https://ipinfo.io/' + encodeURIComponent(clean) + '/json', {
    signal: AbortSignal.timeout(10000)
  });
  if (!r.ok) {
    if (r.status === 404) throw new Error('IP no encontrada');
    if (r.status === 429) throw new Error('Rate limit (50k/mes). Espera un momento.');
    throw new Error('HTTP ' + r.status);
  }

  const data = await r.json();
  if (!data || !data.ip) throw new Error('Sin datos para esa IP');
  if (!data.org) throw new Error('Sin información de ASN para esa IP');

  // ipinfo.io devuelve org como: "AS15169 Google LLC"
  const match = data.org.match(/^(AS\d+)\s+(.+)$/);
  const asn = match ? match[1] : '—';
  const orgName = match ? match[2] : data.org;

  return {
    asn: asn,
    name: orgName,
    description: orgName,
    country: data.country || '—',
    rir: '—',
    ipv4Count: 0,
    ipv6Count: 0,
    ipv4: [],
    ipv6: []
  };
}

const NetPro = {
  /* ==========================================
     MI IP PÚBLICA
  ========================================== */
  async initMyIP() {
    const loading = document.getElementById('myipLoading');
    const result  = document.getElementById('myipResult');
    const error   = document.getElementById('myipError');
    const btn     = document.getElementById('myipRefresh');
    if (!result) return;

    const load = async () => {
      loading.hidden = false;
      result.hidden  = true;
      error.hidden   = true;

      try {
        // Cache 5 min
        const cacheKey = 'jcdc_myip';
        const cached = sessionStorage.getItem(cacheKey);
        let data;
        if (cached) {
          const c = JSON.parse(cached);
          if (Date.now() - c.t < 5 * 60 * 1000) data = c.d;
        }

        if (!data) {
          data = await fetchIPWithFallback();
          sessionStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), d: data }));
        }

        this.renderIPResult(data, 'myip');
        loading.hidden = true;
        result.hidden  = false;
      } catch (err) {
        console.error(err);
        loading.hidden = true;
        error.hidden   = false;
        error.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> No se pudo detectar tu IP. Verifica tu conexión.';
      }
    };

    if (btn) btn.addEventListener('click', () => {
      sessionStorage.removeItem('jcdc_myip');
      load();
    });

    // Copiar IP (delegado global, por si acaso)
    document.querySelectorAll('.netpro-copy').forEach(b => {
      b.addEventListener('click', () => this.copyIP(b));
    });

    load();
  },

  /* ==========================================
     IP LOOKUP
  ========================================== */
  initIPLookup() {
    const input = document.getElementById('iplookupInput');
    const btn   = document.getElementById('iplookupBtn');
    const clr   = document.getElementById('iplookupClear');
    const result = document.getElementById('iplookupResult');
    const loading = document.getElementById('iplookupLoading');
    const error   = document.getElementById('iplookupError');
    if (!btn) return;

    const lookup = async () => {
      const ip = input.value.trim();
      if (!ip) {
        if (typeof Toast !== 'undefined') Toast.show('Escribe una IP', 'info', 1800);
        return;
      }
      loading.hidden = false;
      result.hidden  = true;
      error.hidden   = true;

      try {
        const data = await fetchIPWithFallback(ip);

        this.renderIPResult(data, 'iplookup');
        loading.hidden = true;
        result.hidden  = false;
      } catch (err) {
        console.error(err);
        loading.hidden = true;
        error.hidden   = false;
        error.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> No se pudo consultar la IP: ' + (err.message || 'error');
      }
    };

    btn.addEventListener('click', lookup);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') lookup(); });
    if (clr) clr.addEventListener('click', () => {
      input.value = '';
      input.focus();
      result.hidden = true;
      error.hidden  = true;
    });
  },

  /* ==========================================
     Render común de resultado IP
  ========================================== */
  renderIPResult(d, prefix) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val || '—';
    };

    set(prefix + 'Flag', d.flag?.emoji || '🌐');
    set(prefix + 'Value', d.ip);
    set(prefix + 'Country', d.country || '—');
    set(prefix + 'City', d.city || '—');
    set(prefix + 'ISP', d.connection?.isp || '—');
    set(prefix + 'ASN', d.connection?.asn ? 'AS' + d.connection.asn : '—');
    set(prefix + 'Type', d.type === 'IPv4' ? 'IPv4' : 'IPv6');
    set(prefix + 'TZ', d.timezone?.id || '—');

    if (document.getElementById(prefix + 'Region')) set(prefix + 'Region', d.region || '—');
    if (document.getElementById(prefix + 'Coords')) {
      set(prefix + 'Coords', d.latitude ? `${d.latitude.toFixed(2)}, ${d.longitude.toFixed(2)}` : '—');
    }
  },

  copyIP(btn) {
    const targetId = btn.dataset.copyFrom || btn.closest('.netpro-ip-big')?.querySelector('.netpro-ip-big__value')?.id;
    const el = document.getElementById(targetId);
    if (!el) return;
    const text = el.textContent.trim();
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text).then(() => {
      btn.classList.add('copied');
      const icon = btn.querySelector('i');
      if (icon) icon.className = 'fa-solid fa-check';
      if (typeof Toast !== 'undefined') Toast.show('Copiado: ' + text, 'success', 1500);
      setTimeout(() => {
        btn.classList.remove('copied');
        if (icon) icon.className = 'fa-solid fa-copy';
      }, 1400);
    }).catch(() => {
      if (typeof Toast !== 'undefined') Toast.show('No se pudo copiar', 'error');
    });
  },

  /* ==========================================
     DNS LOOKUP
  ========================================== */
  initDNS() {
    const input = document.getElementById('dnsInput');
    const type  = document.getElementById('dnsType');
    const btn   = document.getElementById('dnsBtn');
    const clr   = document.getElementById('dnsClear');
    const result = document.getElementById('dnsResult');
    const loading = document.getElementById('dnsLoading');
    const error   = document.getElementById('dnsError');
    const recEl   = document.getElementById('dnsRecords');
    if (!btn) return;

    const TYPE_MAP = { A: 1, AAAA: 28, MX: 15, NS: 2, TXT: 16, CNAME: 5 };
    const TYPE_NAME = { 1: 'A', 28: 'AAAA', 15: 'MX', 2: 'NS', 16: 'TXT', 5: 'CNAME' };

    const queryOne = async (domain, t) => {
      const code = TYPE_MAP[t];
      const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${code}`);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    };

    const lookup = async () => {
      const domain = input.value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!domain) {
        if (typeof Toast !== 'undefined') Toast.show('Escribe un dominio', 'info', 1800);
        return;
      }

      loading.hidden = false;
      result.hidden  = true;
      error.hidden   = true;

      const types = type.value === 'ALL' ? ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME'] : [type.value];

      try {
        let html = '';
        let total = 0;

        for (const t of types) {
          const data = await queryOne(domain, t);
          const answers = data.Answer || [];

          if (answers.length === 0) continue;

          answers.forEach(a => {
            total++;
            const name = TYPE_NAME[a.type] || 'OTRO';
            const val = t === 'TXT' ? a.data.replace(/^"|"$/g, '') : a.data;
            html += `
              <div class="dns-record">
                <span class="dns-record__type" data-type="${name}">${name}</span>
                <span class="dns-record__value">${val}</span>
                <span class="dns-record__ttl">TTL ${a.TTL}s</span>
              </div>
            `;
          });
        }

        if (total === 0) {
          html = '<div class="dns-empty"><i class="fa-solid fa-circle-question"></i><br>Sin registros de este tipo</div>';
        }

        recEl.innerHTML = html;
        loading.hidden = true;
        result.hidden  = false;
      } catch (err) {
        console.error(err);
        loading.hidden = true;
        error.hidden   = false;
        error.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> No se pudo resolver el dominio: ' + (err.message || 'error');
      }
    };

    btn.addEventListener('click', lookup);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') lookup(); });
    type.addEventListener('change', lookup);
    if (clr) clr.addEventListener('click', () => {
      input.value = '';
      input.focus();
      result.hidden = true;
      error.hidden  = true;
    });
  },

  /* ==========================================
     WHOIS
  ========================================== */
  initWhois() {
    const input = document.getElementById('whoisInput');
    const btn   = document.getElementById('whoisBtn');
    const clr   = document.getElementById('whoisClear');
    const result = document.getElementById('whoisResult');
    const loading = document.getElementById('whoisLoading');
    const error   = document.getElementById('whoisError');
    if (!btn) return;

    const getEvent = (events, action) => {
      const e = (events || []).find(x => x.eventAction === action);
      if (!e) return '—';
      try {
        return new Date(e.eventDate).toLocaleDateString('es-DO', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
      } catch { return e.eventDate; }
    };

    const lookup = async () => {
      const domain = input.value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
      if (!domain) {
        if (typeof Toast !== 'undefined') Toast.show('Escribe un dominio', 'info', 1800);
        return;
      }

      loading.hidden = false;
      result.hidden  = true;
      error.hidden   = true;

      try {
        const r = await fetch('https://rdap.org/domain/' + encodeURIComponent(domain));
        if (!r.ok) throw new Error(r.status === 404 ? 'Dominio no encontrado en RDAP' : 'HTTP ' + r.status);
        const data = await r.json();

        const set = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.textContent = val || '—';
        };

        set('whoisDomain', data.ldhName || domain);
        set('whoisCreated', getEvent(data.events, 'registration'));
        set('whoisExpires', getEvent(data.events, 'expiration'));
        set('whoisUpdated', getEvent(data.events, 'last changed'));

        // Registrar: buscar entity tipo registrar
        let registrar = '—';
        if (data.entities) {
          for (const ent of data.entities) {
            if ((ent.roles || []).includes('registrar')) {
              const vcard = ent.vcardArray?.[1] || [];
              const fn = vcard.find(x => x[0] === 'fn');
              if (fn) { registrar = fn[3]; break; }
            }
          }
        }
        set('whoisRegistrar', registrar);

        // Estados
        const statusMap = {
          'client transfer prohibited': 'Transfer prohibido (cliente)',
          'client delete prohibited': 'Delete prohibido (cliente)',
          'client update prohibited': 'Update prohibido (cliente)',
          'client renew prohibited': 'Renovación prohibida (cliente)',
          'server transfer prohibited': 'Transfer prohibido (servidor)',
          'active': 'Activo',
          'ok': 'OK'
        };
        const statusText = (data.status || []).map(s => statusMap[s] || s).join(' · ') || '—';
        set('whoisStatus', statusText);

        loading.hidden = true;
        result.hidden  = false;
      } catch (err) {
        console.error(err);
        loading.hidden = true;
        error.hidden   = false;
        error.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> No se pudo consultar: ' + (err.message || 'error');
      }
    };

    btn.addEventListener('click', lookup);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') lookup(); });
    if (clr) clr.addEventListener('click', () => {
      input.value = '';
      input.focus();
      result.hidden = true;
      error.hidden  = true;
    });
  },

  /* ==========================================
     MAC VENDOR LOOKUP
  ========================================== */
  initMac() {
    const input   = document.getElementById('macInput');
    const btn     = document.getElementById('macBtn');
    const clr     = document.getElementById('macClear');
    const result  = document.getElementById('macResult');
    const loading = document.getElementById('macLoading');
    const error   = document.getElementById('macError');
    if (!btn) return;

    const lookup = async () => {
      const mac = input.value.trim();
      if (!mac) {
        if (typeof Toast !== 'undefined') Toast.show('Escribe una MAC', 'info', 1800);
        return;
      }

      loading.hidden = false;
      result.hidden  = true;
      error.hidden   = true;

      try {
        const { vendor, oui, country, address, blockStart, blockEnd } = await fetchMacVendor(mac);
        const clean = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

        const set = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.textContent = val || '—';
        };

        set('macValue', vendor);
        set('macAddress', clean.match(/.{1,2}/g).join(':'));
        set('macOUI', oui);
        set('macType', clean.length === 12 ? 'MAC completa (UAA)' : 'OUI (24 bits)');

        loading.hidden = true;
        result.hidden  = false;
      } catch (err) {
        console.error(err);
        loading.hidden = true;
        error.hidden   = false;
        error.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> No se pudo consultar la MAC: ' + (err.message || 'error');
      }
    };

    btn.addEventListener('click', lookup);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') lookup(); });
    if (clr) clr.addEventListener('click', () => {
      input.value = '';
      input.focus();
      result.hidden = true;
      error.hidden  = true;
    });
  },

  /* ==========================================
     WEBRTC LEAK TEST
  ========================================== */
  initWebRTC() {
    const btn     = document.getElementById('webrtcScan');
    const clr     = document.getElementById('webrtcClear');
    const loading = document.getElementById('webrtcLoading');
    const result  = document.getElementById('webrtcResult');
    const error   = document.getElementById('webrtcError');
    const summary = document.getElementById('webrtcSummary');
    const list    = document.getElementById('webrtcList');
    if (!btn) return;

    const typeLabel = {
      local:    { label: 'LOCAL (LAN)',   color: '#00ff88' },
      public:   { label: 'PÚBLICA',       color: '#ff6b00' },
      cgnat:    { label: 'CGNAT',         color: '#ffee00' },
      loopback: { label: 'LOOPBACK',      color: '#a0a8b8' },
      unknown:  { label: 'DESCONOCIDO',   color: '#ff3333' }
    };

    const scan = async () => {
      loading.hidden = false;
      result.hidden  = true;
      error.hidden   = true;

      try {
        const ips = await detectWebRTCLeaks();

        if (ips.length === 0) {
          loading.hidden = true;
          error.hidden = false;
          error.innerHTML = '<i class="fa-solid fa-circle-check"></i> No se filtró ninguna IP. Tu navegador está protegido contra leaks WebRTC.';
          error.style.background = 'rgba(0,255,136,0.06)';
          error.style.borderLeftColor = 'var(--neon-green)';
          error.style.color = 'var(--neon-green)';
          return;
        }

        // Reset error styling
        error.style.background = '';
        error.style.borderLeftColor = '';
        error.style.color = '';

        const locals  = ips.filter(x => x.type === 'local').length;
        const publics = ips.filter(x => x.type === 'public').length;
        const cgnat   = ips.filter(x => x.type === 'cgnat').length;

        summary.innerHTML = `
          <div class="netpro-grid__item"><span>TOTAL IPs</span><strong>${ips.length}</strong></div>
          <div class="netpro-grid__item"><span>LOCALES</span><strong style="color:#00ff88;">${locals}</strong></div>
          <div class="netpro-grid__item"><span>PÚBLICAS</span><strong style="color:#ff6b00;">${publics}</strong></div>
        `;

        list.innerHTML = ips.map(item => {
          const info = typeLabel[item.type] || typeLabel.unknown;
          const proto = (item.protocol || 'udp').toUpperCase();
          const cand = item.candidateType || 'host';
          return `
            <div class="dns-record">
              <span class="dns-record__type" style="color:${info.color};border-color:${info.color};background:${info.color}15;">${info.label}</span>
              <span class="dns-record__value">${item.ip}</span>
              <span class="dns-record__ttl">${proto} · ${cand}</span>
            </div>
          `;
        }).join('');

        loading.hidden = true;
        result.hidden  = false;

        if (typeof Toast !== 'undefined') {
          if (publics > 0) {
            Toast.show('⚠️ ' + publics + ' IP pública expuesta vía WebRTC', 'info', 3500);
          } else {
            Toast.show('Escaneo completo · solo IPs locales', 'success', 2500);
          }
        }
      } catch (err) {
        console.error(err);
        loading.hidden = true;
        error.hidden = false;
        error.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + (err.message || 'Error');
      }
    };

    btn.addEventListener('click', scan);
    if (clr) clr.addEventListener('click', () => {
      result.hidden = true;
      error.hidden  = true;
      error.style.background = '';
      error.style.borderLeftColor = '';
      error.style.color = '';
    });
  },

  /* ==========================================
     BGP / ASN LOOKUP
  ========================================== */
  initASN() {
    const input   = document.getElementById('asnInput');
    const btn     = document.getElementById('asnBtn');
    const clr     = document.getElementById('asnClear');
    const result  = document.getElementById('asnResult');
    const loading = document.getElementById('asnLoading');
    const error   = document.getElementById('asnError');
    const grid    = document.getElementById('asnGrid');
    const prefixEl = document.getElementById('asnPrefixes');
    if (!btn) return;

    const lookup = async () => {
      const query = input.value.trim();
      if (!query) {
        if (typeof Toast !== 'undefined') Toast.show('Escribe un ASN o IP', 'info', 1800);
        return;
      }

      loading.hidden = false;
      result.hidden  = true;
      error.hidden   = true;

      try {
        const data = await fetchASN(query);
        const flag = countryToFlag(data.country);

        document.getElementById('asnFlag').textContent = flag;
        document.getElementById('asnValue').textContent = data.asn + ' · ' + data.name;

        grid.innerHTML = `
          <div class="netpro-grid__item"><span>ASN</span><strong>${data.asn}</strong></div>
          <div class="netpro-grid__item"><span>NOMBRE</span><strong>${data.name}</strong></div>
          <div class="netpro-grid__item"><span>PAÍS</span><strong>${data.country}</strong></div>
        `;

        prefixEl.innerHTML = '<div class="dns-empty"><i class="fa-solid fa-circle-info"></i><br>Prefijos no disponibles en esta API. Consulta una IP del ASN.</div>';

        loading.hidden = true;
        result.hidden  = false;
      } catch (err) {
        console.error(err);
        loading.hidden = true;
        error.hidden   = false;
        error.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + (err.message || 'error');
      }
    };

    btn.addEventListener('click', lookup);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') lookup(); });
    if (clr) clr.addEventListener('click', () => {
      input.value = '';
      input.focus();
      result.hidden = true;
      error.hidden  = true;
    });
  },

  /* ==========================================
     INIT
  ========================================== */
  init() {
    this.initMyIP();
    this.initIPLookup();
    this.initDNS();
    this.initWhois();
    this.initMac();
    this.initWebRTC();
    this.initASN();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  NetPro.init();
});
