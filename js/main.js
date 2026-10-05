/**
 * JCDURANCASADO SYSTEMS v8.0
 * Cyberpunk Link Manager
 * "No hablo en técnico cuando explico.
 *  La tecnología debe servir a las personas, no al revés."
 */
'use strict';

// ==========================================
// CONFIG
// ==========================================
const CONFIG = {
  bootDuration: 2200,
  typingSpeed: 38,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  hasHover: window.matchMedia('(hover: hover)').matches
};

// ==========================================
// TOAST
// ==========================================
const Toast = {
  container: null,
  init() {
    this.container = document.querySelector('.toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'info', duration = 3200) {
    if (!this.container) this.init();
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};
// ==========================================
// THEME TOGGLE
// ==========================================
const Theme = {
  init() {
    const toggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    // El tema ya fue aplicado por el script inline en <head>.
    // Solo aseguramos que esté sincronizado.
    const saved = localStorage.getItem('jcdc_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    if (html.getAttribute('data-theme') !== theme) {
      html.setAttribute('data-theme', theme);
    }

    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('jcdc_theme', next);
      Toast.show(`Modo ${next === 'dark' ? 'oscuro' : 'claro'} activado`, 'info');
    });
  }
};
// ==========================================
// BOOT SEQUENCE
// ==========================================
const Boot = {
  KEY: 'jcdc_booted',

  lines: [
    'Inicializando kernel JCDURANCASADO...',
    'Cargando módulos de red... [OK]',
    'Verificando credenciales... [OK]',
    'Sincronizando enlaces...',
    'Sistema listo.'
  ],
  init() {
    const screen = document.getElementById('boot-sequence');
    const linesEl = document.getElementById('boot-lines');
    const bar = document.getElementById('boot-bar');
    const status = document.getElementById('boot-status');
    if (!screen) return;

    // ✅ Si ya se mostró el boot en esta sesión, saltarlo
    const alreadyBooted = sessionStorage.getItem(this.KEY) === '1';
    if (alreadyBooted) {
      screen.classList.add('booted');
      return;
    }

    if (CONFIG.reducedMotion) {
      screen.classList.add('booted');
      sessionStorage.setItem(this.KEY, '1');
      return;
    }

    let i = 0;
    const delay = CONFIG.bootDuration / this.lines.length;

    const addLine = () => {
      if (i < this.lines.length) {
        const line = document.createElement('div');
        line.className = 'boot-line';
        line.textContent = `> ${this.lines[i]}`;
        linesEl.appendChild(line);
        const progress = ((i + 1) / this.lines.length) * 100;
        bar.style.width = `${progress}%`;
        status.textContent = `Cargando... ${Math.round(progress)}%`;
        i++;
        setTimeout(addLine, delay);
      } else {
        status.textContent = 'SISTEMA LISTO';
        setTimeout(() => {
          screen.classList.add('booted');
          sessionStorage.setItem(this.KEY, '1');
          Toast.show('Acceso concedido', 'success');
        }, 400);
      }
    };
    setTimeout(addLine, 300);
  }
};

// ==========================================
// TYPING EFFECT
// ==========================================
const TypeWriter = {
  init() {
    const el = document.querySelector('.typing-text');
    if (!el) return;
    const text = el.dataset.text;
    if (!text) return;

    if (CONFIG.reducedMotion) {
      el.textContent = text;
      return;
    }

    let i = 0;
    el.textContent = '';
    const type = () => {
      if (i < text.length) {
        el.textContent += text.charAt(i++);
        setTimeout(type, CONFIG.typingSpeed + Math.random() * 25);
      }
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setTimeout(type, 400);
        observer.disconnect();
      }
    });
    observer.observe(el);
  }
};

// ==========================================
// PARTICLES
// ==========================================
const Particles = {
  canvas: null, ctx: null, particles: [], animationId: null, visible: false,
  init() {
    if (CONFIG.reducedMotion) return;
    this.canvas = document.getElementById('particles');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.create();
    window.addEventListener('resize', () => this.resize(), { passive: true });

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.visible = true;
        this.animate();
      } else {
        this.visible = false;
        cancelAnimationFrame(this.animationId);
      }
    });
    observer.observe(this.canvas);
  },
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },
  create() {
    const count = window.innerWidth < 768 ? 18 : 25;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.5 ? '0,240,255' : '184,41,221'
      });
    }
  },
  animate() {
    if (!this.visible) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach((p, i) => {
      p.x += p.speedX; p.y += p.speedY;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.x < 0) p.x = this.canvas.width;
      if (p.y > this.canvas.height) p.y = 0;
      if (p.y < 0) p.y = this.canvas.height;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
      this.ctx.fill();

      for (let j = i + 1; j < this.particles.length; j += 2) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x, dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(${p.color},${0.1 * (1 - dist / 100)})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    });
    this.animationId = requestAnimationFrame(() => this.animate());
  }
};

// ==========================================
// NAVIGATION
// ==========================================
const Nav = {
  init() {
    const header = document.querySelector('[data-header]');
    const nav = document.querySelector('[data-nav]');
    const toggle = document.querySelector('[data-nav-toggle]');

    if (header) {
      window.addEventListener('scroll', () => {
        header.classList.toggle('header--scrolled', window.pageYOffset > 50);
      }, { passive: true });
    }

    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !expanded);
        nav.classList.toggle('active');
        document.body.style.overflow = expanded ? '' : 'hidden';
      });
    }

    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id === '#' || id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const offset = header ? header.offsetHeight : 70;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
        history.pushState(null, '', id);
        if (nav?.classList.contains('active')) toggle.click();
      });
    });

    const sections = document.querySelectorAll('section[id]');
    const links = document.querySelectorAll('[data-nav-link]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach(l => {
            const href = l.getAttribute('href') || '';
            const hash = href.includes('#') ? '#' + href.split('#')[1] : href;
            l.classList.toggle('nav__link--active', hash === `#${id}`);
          });
        }
      });
    }, { threshold: 0.3 });
    sections.forEach(s => observer.observe(s));
  }
};

// ==========================================
// REVEAL
// ==========================================
const Reveal = {
  init() {
    const els = document.querySelectorAll('[data-reveal]');
    if (CONFIG.reducedMotion) {
      els.forEach(el => el.classList.add('revealed'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    els.forEach(el => observer.observe(el));
  }
};

// ==========================================
// SCROLL TOP + PAY FLOAT + THEME TOGGLE
// ==========================================
const ScrollTop = {
  init() {
    const btn = document.getElementById('scrollTop');
    const payBtn = document.querySelector('.pay-float');
    const themeBtn = document.getElementById('themeToggle');
    const callBtn = document.getElementById('callFloat');
    const soundBtn = document.getElementById('soundToggle');
    const notifBtn = document.getElementById('notifBtn');
    const installBtn = document.getElementById('installBtn');
    if (!btn) return;

    const toggleAll = (show) => {
      btn.classList.toggle('visible', show);
      if (payBtn) payBtn.classList.toggle('visible', show);
      if (themeBtn) themeBtn.classList.toggle('visible', show);
      if (callBtn) callBtn.classList.toggle('visible', show);
      if (soundBtn) soundBtn.classList.toggle('visible', show);
      if (notifBtn && !notifBtn.hidden) notifBtn.classList.toggle('visible', show);
      if (installBtn && !installBtn.hidden) installBtn.classList.toggle('visible', show);
    };

    // Aparecen apenas el usuario baja un poco (10% del viewport, mín. 100px)
    const getThreshold = () => Math.max(100, window.innerHeight * 0.10);

    window.addEventListener('scroll', () => {
      toggleAll(window.pageYOffset > getThreshold());
    }, { passive: true });

    // Recalcular al cambiar el tamaño de la ventana
    window.addEventListener('resize', () => {
      toggleAll(window.pageYOffset > getThreshold());
    }, { passive: true });

    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
};
// ==========================================
// CERT COUNTER (auto)
// ==========================================
const CertCounter = {
  init() {
    document.querySelectorAll('.cert-group').forEach(group => {
      const pills = group.querySelectorAll('.cert-pill');
      const countEl = group.querySelector('.cert-group__count');
      if (!countEl) return;

      const n = pills.length;
      countEl.textContent = `${n} ${n === 1 ? 'credencial' : 'credenciales'}`;
    });
  }
};
// ==========================================
// YEAR
// ==========================================
const UpdateYear = {
  init() {
    const year = new Date().getFullYear();
    document.querySelectorAll('[data-year]').forEach(el => el.textContent = year);
  }
};

// ==========================================
// AUTO SCROLL (botón hero)
// ==========================================
const AutoScroll = {
  init() {
    document.querySelectorAll('[data-scroll-to]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-scroll-to');
        const target = document.getElementById(targetId);
        if (!target) return;
        e.preventDefault();
        const header = document.querySelector('[data-header]');
        const offset = header ? header.offsetHeight : 70;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
        history.pushState(null, '', `#${targetId}`);
      });
    });
  }
};

// ==========================================
// FAQ (una abierta a la vez)
// ==========================================
const FAQ = {
  init() {
    const items = document.querySelectorAll('.faq__item');
    items.forEach(item => {
      item.addEventListener('toggle', () => {
        if (item.open) {
          items.forEach(other => {
            if (other !== item) other.open = false;
          });
        }
      });
    });
  }
};

// ==========================================
// CONTACT FORM
// ==========================================
const ContactForm = {
  init() {
    const form = document.getElementById('contactForm');
    const responseEl = document.getElementById('formResponse');
    const submitBtn = document.getElementById('submitBtn');
    if (!form || !responseEl || !submitBtn) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      responseEl.textContent = '';
      responseEl.className = 'form-response';

      const nombre = document.getElementById('contact-name').value.trim();
      const telefono = document.getElementById('contact-phone').value.trim();
      const correo = document.getElementById('contact-email').value.trim();
      const mensaje = document.getElementById('contact-message').value.trim();
      const files = document.getElementById('contact-files').files;

      if (!nombre || !telefono || !correo) {
        responseEl.textContent = '❌ Todos los campos son obligatorios (excepto mensaje y archivos).';
        responseEl.classList.add('error');
        return;
      }

      if (mensaje.length < 30 && files.length === 0) {
        responseEl.textContent = '❌ Escribe un mensaje (mín. 30 caracteres) o adjunta un archivo.';
        responseEl.classList.add('error');
        return;
      }

      if (files.length > 5) {
        responseEl.textContent = '❌ Máximo 5 archivos permitidos.';
        responseEl.classList.add('error');
        return;
      }

      const totalSize = Array.from(files).reduce((a, f) => a + f.size, 0);
      if (totalSize > 5 * 1024 * 1024) {
        responseEl.textContent = '❌ El total de archivos no debe superar 5 MB.';
        responseEl.classList.add('error');
        return;
      }

      submitBtn.disabled = true;
      const btnText = submitBtn.querySelector('.cyber-btn__text');
      if (btnText) btnText.textContent = 'ENVIANDO...';

      const formData = new FormData(form);

      fetch(form.action, { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
          responseEl.textContent = data.message || '✅ Mensaje enviado con éxito';
          responseEl.classList.add('ok');
          form.reset();
          Toast.show('Mensaje enviado correctamente', 'success');
        })
        .catch(err => {
          console.error(err);
          responseEl.textContent = '❌ Error al enviar. Intenta de nuevo.';
          responseEl.classList.add('error');
          Toast.show('Error al enviar el mensaje', 'error');
        })
        .finally(() => {
          submitBtn.disabled = false;
          if (btnText) btnText.textContent = 'ENVIAR MENSAJE';
          setTimeout(() => {
            responseEl.textContent = '';
            responseEl.className = 'form-response';
          }, 15000);
        });
    });
  }
};


// ==========================================
// CONTADOR DE ESTADÍSTICAS
// ==========================================
const StatsCounter = {
  init() {
    const stats = document.querySelectorAll('.stat[data-count]');
    if (!stats.length) return;

    if (CONFIG.reducedMotion) {
      stats.forEach(stat => {
        const num = stat.querySelector('.stat__number');
        const target = parseInt(stat.dataset.count, 10);
        if (num) num.textContent = target.toLocaleString('es-DO');
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.counted) {
          entry.target.dataset.counted = '1';
          this.animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    stats.forEach(stat => observer.observe(stat));
  },

  animate(stat) {
    const numEl = stat.querySelector('.stat__number');
    const suffixEl = stat.querySelector('.stat__suffix');
    const target = parseInt(stat.dataset.count, 10);
    const duration = 2000;
    const start = performance.now();

    // Guardar sufijo si existe
    if (suffixEl && !suffixEl.textContent) {
      suffixEl.textContent = stat.dataset.suffix || '';
    }

    const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = Math.floor(eased * target);
      numEl.textContent = current.toLocaleString('es-DO');

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        numEl.textContent = target.toLocaleString('es-DO');
      }
    };

    requestAnimationFrame(tick);
  }
};
// ==========================================
// BARRA DE PROGRESO DE SCROLL
// ==========================================
const ScrollProgress = {
  bar: null,
  init() {
    this.bar = document.getElementById('scrollProgressBar');
    if (!this.bar) return;

    let ticking = false;
    const update = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      this.bar.style.width = Math.min(100, Math.max(0, percent)) + '%';
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    window.addEventListener('resize', update, { passive: true });
    update();
  }
};

// ==========================================
// CURSOR PERSONALIZADO
// ==========================================
const CustomCursor = {
  dot: null,
  ring: null,
  mouseX: 0,
  mouseY: 0,
  ringX: 0,
  ringY: 0,
  rafId: null,

  init() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (CONFIG.reducedMotion) return;

    this.dot = document.getElementById('cursorDot');
    this.ring = document.getElementById('cursorRing');
    if (!this.dot || !this.ring) return;

    this.bind();
    this.loop();
  },

  bind() {
    // El dot sigue exacto al mouse; el ring con suavizado
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      // El dot va inmediato (sin esperar al RAF)
      this.dot.style.transform = `translate3d(${this.mouseX}px, ${this.mouseY}px, 0)`;
    }, { passive: true });

    const interactiveSelector = 'a, button, input, textarea, select, [role="button"], .term-chip, .cyber-btn, .link-card, .pay-card, .stack-chip';

    let hoveredEl = null;

    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest(interactiveSelector);
      if (el && el !== hoveredEl) {
        hoveredEl = el;
        document.body.classList.add('cursor-hover');
      }
    });

    document.addEventListener('mouseout', (e) => {
      const el = e.target.closest(interactiveSelector);
      const next = e.relatedTarget && e.relatedTarget.closest
        ? e.relatedTarget.closest(interactiveSelector)
        : null;
      if (el === hoveredEl && !next) {
        hoveredEl = null;
        document.body.classList.remove('cursor-hover');
      }
    });

    window.addEventListener('mousedown', () => document.body.classList.add('cursor-click'), { passive: true });
    window.addEventListener('mouseup',   () => document.body.classList.remove('cursor-click'), { passive: true });

    document.addEventListener('mouseleave', () => document.body.classList.add('cursor-hidden'));
    document.addEventListener('mouseenter', () => document.body.classList.remove('cursor-hidden'));

    window.addEventListener('blur',  () => document.body.classList.add('cursor-hidden'));
    window.addEventListener('focus', () => document.body.classList.remove('cursor-hidden'));
  },

  loop() {
    // El ring sigue con suavizado, el dot ya va directo
    this.ringX += (this.mouseX - this.ringX) * 0.35;   // ⬅️ antes 0.18, ahora más rápido
    this.ringY += (this.mouseY - this.ringY) * 0.35;

    this.ring.style.transform = `translate3d(${this.ringX}px, ${this.ringY}px, 0)`;

    this.rafId = requestAnimationFrame(() => this.loop());
  }
};

// ==========================================
// CALCULADORA DE SUBREDES
// ==========================================
const SubnetCalc = {
  init() {
    const cidrSelect = document.getElementById('subnetCIDR');
    const ipInput = document.getElementById('subnetIP');
    const btn = document.getElementById('subnetCalc');
    const output = document.getElementById('subnetOutput');
    if (!cidrSelect || !ipInput || !btn || !output) return;

    for (let i = 0; i <= 32; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = '/' + i;
      cidrSelect.appendChild(opt);
    }
    cidrSelect.value = '24';

    btn.addEventListener('click', () => this.calculate());
    ipInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.calculate();
    });
  },

  calculate() {
    const ipInput = document.getElementById('subnetIP');
    const cidrSelect = document.getElementById('subnetCIDR');
    const output = document.getElementById('subnetOutput');

    const ip = ipInput.value.trim();
    const cidr = parseInt(cidrSelect.value, 10);

    if (!this.isValidIP(ip)) {
      ipInput.classList.add('invalid');
      setTimeout(() => ipInput.classList.remove('invalid'), 1500);
      return;
    }

    const octets = ip.split('.').map(Number);
    const ipNum = (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3];
    const maskNum = cidr === 0 ? 0 : (-1 << (32 - cidr)) >>> 0;
    const netNum = (ipNum & maskNum) >>> 0;
    const broadcastNum = (netNum | (~maskNum >>> 0)) >>> 0;
    const firstHost = cidr >= 31 ? netNum : netNum + 1;
    const lastHost = cidr >= 31 ? broadcastNum : broadcastNum - 1;
    const hosts = cidr >= 31 ? 0 : Math.pow(2, 32 - cidr) - 2;

    document.getElementById('outIP').textContent = ip;
    document.getElementById('outMask').textContent = this.numToIP(maskNum) + ' /' + cidr;
    document.getElementById('outNet').textContent = this.numToIP(netNum);
    document.getElementById('outBroadcast').textContent = this.numToIP(broadcastNum);
    document.getElementById('outRange').textContent = this.numToIP(firstHost) + '  →  ' + this.numToIP(lastHost);
    document.getElementById('outHosts').textContent = hosts.toLocaleString('es-DO');
    document.getElementById('outClass').textContent = this.getClass(octets[0]);
    document.getElementById('outType').textContent = this.getType(octets);

    output.hidden = false;
  },

  isValidIP(ip) {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
      const n = Number(p);
      return Number.isInteger(n) && n >= 0 && n <= 255 && p === String(n);
    });
  },

  numToIP(num) {
    return [
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255
    ].join('.');
  },

  getClass(first) {
    if (first < 128) return 'A';
    if (first < 192) return 'B';
    if (first < 224) return 'C';
    if (first < 240) return 'D (Multicast)';
    return 'E (Experimental)';
  },

  getType(octets) {
    const [a, b] = octets;
    if (a === 10) return 'Privada (RFC 1918)';
    if (a === 172 && b >= 16 && b <= 31) return 'Privada (RFC 1918)';
    if (a === 192 && b === 168) return 'Privada (RFC 1918)';
    if (a === 127) return 'Loopback';
    if (a === 169 && b === 254) return 'Link-local (APIPA)';
    if (a >= 224 && a <= 239) return 'Multicast';
    return 'Pública';
  }
};

// ==========================================
// CONVERSOR BINARIO / DECIMAL / HEX
// ==========================================
const NumConverter = {
  init() {
    const bin = document.getElementById('convBin');
    const dec = document.getElementById('convDec');
    const hex = document.getElementById('convHex');
    if (!bin || !dec || !hex) return;

    bin.addEventListener('input', () => {
      const v = bin.value.replace(/[^01]/g, '');
      if (bin.value !== v) bin.value = v;
      if (!v) { dec.value = ''; hex.value = ''; return; }
      const n = parseInt(v, 2);
      if (!isNaN(n)) { dec.value = n; hex.value = n.toString(16).toUpperCase(); }
    });

    dec.addEventListener('input', () => {
      const v = dec.value.replace(/[^0-9]/g, '');
      if (dec.value !== v) dec.value = v;
      if (!v) { bin.value = ''; hex.value = ''; return; }
      const n = parseInt(v, 10);
      if (!isNaN(n)) { bin.value = n.toString(2); hex.value = n.toString(16).toUpperCase(); }
    });

    hex.addEventListener('input', () => {
      const v = hex.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
      if (hex.value !== v) hex.value = v;
      if (!v) { bin.value = ''; dec.value = ''; return; }
      const n = parseInt(v, 16);
      if (!isNaN(n)) { bin.value = n.toString(2); dec.value = n; }
    });
  }
};

// ==========================================
// MAPA DE CALOR ACTIVIDAD DOCENTE
// ==========================================
const Heatmap = {
  init() {
    const container = document.getElementById('heatmap');
    if (!container) return;

    const WEEKS = 52;
    const DAYS = 7;
    const total = WEEKS * DAYS;

    const fragment = document.createDocumentFragment();
    const today = new Date();

    for (let i = 0; i < total; i++) {
      const cell = document.createElement('div');
      cell.className = 'heatmap__cell';

      const progress = i / total;
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      const rand = seed - Math.floor(seed);
      const baseLevel = progress * 4;
      let lvl = Math.floor(baseLevel + rand * 2.2 - 0.5);
      lvl = Math.max(0, Math.min(4, lvl));

      cell.dataset.lvl = lvl;

      const dayOffset = total - i - 1;
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
      cell.title = `${dateStr} — ${lvl} ${lvl === 1 ? 'clase' : 'clases'}`;

      fragment.appendChild(cell);
    }

    container.appendChild(fragment);
  }
};

// ==========================================
// SONIDOS SUTILES (Web Audio API)
// ==========================================
const Sounds = {
  enabled: false,
  ctx: null,
  KEY: 'jcdc_sounds',
  toggle: null,

  init() {
    this.toggle = document.getElementById('soundToggle');
    if (!this.toggle) return;

    // Cargar preferencia
    this.enabled = localStorage.getItem(this.KEY) === 'on';
    this.updateUI();

    // Click en el botón → activar/desactivar
    this.toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.enabled = !this.enabled;
      localStorage.setItem(this.KEY, this.enabled ? 'on' : 'off');
      this.updateUI();

      // Reproducir un beep de confirmación al activar
      if (this.enabled) this.playClick();

      if (typeof Toast !== 'undefined') {
        Toast.show(this.enabled ? '🔊 Sonidos activados' : '🔇 Sonidos desactivados', 'info', 1800);
      }
    });

    // Bind: hover en elementos interactivos
    const hoverSelector = 'a, button, .link-card, .pay-card, .stack-chip, .service-card, .curso-card, .cert-pill, .tag, .nav__link';

    document.addEventListener('mouseover', (e) => {
      if (!this.enabled) return;
      if (e.target.closest(hoverSelector)) {
        // No repetir si ya estaba sobre un elemento (evita spam en contenedores)
        if (e.target._soundHovered) return;
        e.target._soundHovered = true;
        this.playHover();
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target._soundHovered) {
        e.target._soundHovered = false;
      }
    });

    // Bind: click
    document.addEventListener('click', (e) => {
      if (!this.enabled) return;
      if (e.target.closest('a, button')) {
        this.playClick();
      }
    }, { passive: true });
  },

  // Crear contexto de audio bajo demanda (los navegadores bloquean hasta gesto del usuario)
  getCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    // Reanudar si está suspendido
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  // Beep genérico
  beep({ frequency = 800, duration = 0.05, volume = 0.08, type = 'sine' } = {}) {
    const ctx = this.getCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  },

  playHover() {
    this.beep({ frequency: 1200, duration: 0.035, volume: 0.04, type: 'sine' });
  },

  playClick() {
    // Doble beep corto para dar sensación "digital"
    this.beep({ frequency: 800, duration: 0.05, volume: 0.07, type: 'square' });
    setTimeout(() => {
      this.beep({ frequency: 1100, duration: 0.04, volume: 0.05, type: 'square' });
    }, 40);
  },

  updateUI() {
    if (!this.toggle) return;
    this.toggle.setAttribute('aria-pressed', this.enabled ? 'true' : 'false');
    const icon = this.toggle.querySelector('i');
    if (icon) {
      icon.className = this.enabled
        ? 'fa-solid fa-volume-high'
        : 'fa-solid fa-volume-xmark';
    }
    const tooltip = document.getElementById('soundTooltip');
    if (tooltip) {
      tooltip.textContent = this.enabled ? 'Desactivar sonidos' : 'Activar sonidos';
    }
  }
};

// ==========================================
// NOTIFICACIONES PUSH
// ==========================================
const Notifications = {
  btn: null,
  tooltip: null,
  KEY: 'jcdc_notif',
  enabled: false,

  init() {
    if (!('Notification' in window)) return;

    this.btn = document.getElementById('notifBtn');
    if (!this.btn) return;
    this.tooltip = this.btn.querySelector('.notif-btn__tooltip');

    // Estado guardado
    const saved = localStorage.getItem(this.KEY);
    this.enabled = saved === 'on' && Notification.permission === 'granted';

    // Detectar iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                      || window.navigator.standalone === true;

    // En iOS solo funciona si la PWA está instalada (iOS 16.4+)
    if (isIOS && !isStandalone) {
      this.btn.hidden = true;
      return;
    }

    // Si está bloqueado por el navegador, ocultar botón
    if (Notification.permission === 'denied') {
      this.btn.hidden = true;
      return;
    }

    // Reflejar estado visual
    this.updateUI();

    // Mostrar botón
    this.btn.hidden = false;

    // Click → toggle
    this.btn.addEventListener('click', () => this.toggle());
  },

  async toggle() {
    if (this.enabled) {
      // DESACTIVAR
      this.enabled = false;
      localStorage.setItem(this.KEY, 'off');
      this.updateUI();
      if (typeof Toast !== 'undefined') {
        Toast.show('🔕 Notificaciones desactivadas', 'info', 2200);
      }
      return;
    }

    // ACTIVAR: pedir permiso si no lo tenemos
    if (Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') {
        this.btn.hidden = true;
        localStorage.setItem(this.KEY, 'dismissed');
        if (typeof Toast !== 'undefined') {
          Toast.show('Notificaciones bloqueadas por el navegador', 'error', 2500);
        }
        return;
      }
    }

    // Ahora sí activar
    this.enabled = true;
    localStorage.setItem(this.KEY, 'on');
    this.updateUI();

    if (typeof Toast !== 'undefined') {
      Toast.show('🔔 Notificaciones activadas', 'success', 2200);
    }

    // Notificación de bienvenida después de un momento
    setTimeout(() => this.sendWelcome(), 1200);
  },

  updateUI() {
    if (!this.btn) return;
    this.btn.classList.toggle('active', this.enabled);
    this.btn.setAttribute('aria-pressed', this.enabled ? 'true' : 'false');
    const icon = this.btn.querySelector('i');
    if (icon) {
      icon.className = this.enabled
        ? 'fa-solid fa-bell'
        : 'fa-solid fa-bell-slash';
    }
    if (this.tooltip) {
      this.tooltip.textContent = this.enabled
        ? 'Desactivar notificaciones'
        : 'Activar notificaciones';
    }
  },

  async sendWelcome() {
    if (!this.enabled || Notification.permission !== 'granted') return;

    const payload = {
      body: 'Recibirás avisos de nuevos cursos, tutoriales y proyectos.',
      icon: './img/icons/icon-192.png',
      badge: './img/icons/icon-192.png',
      tag: 'welcome',
      data: { url: './' }
    };

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          return reg.showNotification('¡Bienvenido a JCDURANCASADO!', payload);
        }
      }
      if (typeof Notification !== 'undefined') {
        new Notification('¡Bienvenido a JCDURANCASADO!', payload);
      }
    } catch (err) {
      console.warn('[Notif] No se pudo mostrar la bienvenida:', err);
    }
  },

  // API pública
  async push(title, body, url) {
    if (!this.enabled || Notification.permission !== 'granted') return;

    const payload = {
      body: body,
      icon: './img/icons/icon-192.png',
      badge: './img/icons/icon-192.png',
      tag: 'custom-' + Date.now(),
      data: { url: url || './' }
    };

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          return reg.showNotification(title, payload);
        }
      }
      if (typeof Notification !== 'undefined') {
        new Notification(title, payload);
      }
    } catch (err) {
      console.warn('[Notif] push falló:', err);
    }
  }
};

// ==========================================
// TOOLKIT · FILTRO POR CATEGORÍA
// ==========================================
const ToolkitFilter = {
  init() {
    const buttons = document.querySelectorAll('.toolkit-filter');
    const cards = document.querySelectorAll('.tool-card[data-category]');
    const filtersBar = document.querySelector('.toolkit-filters--sticky');
    if (!buttons.length) return;

    // Hint de swipe en móvil: se oculta al hacer scroll
    if (filtersBar) {
      const hideHint = () => {
        if (filtersBar.scrollLeft > 5) {
          filtersBar.classList.add('is-scrolled');
          filtersBar.removeEventListener('scroll', hideHint);
        }
      };
      filtersBar.addEventListener('scroll', hideHint, { passive: true });
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        buttons.forEach(b => b.classList.toggle('active', b === btn));

        cards.forEach(card => {
          const show = filter === 'all' || card.dataset.category === filter;
          card.dataset.hidden = show ? 'false' : 'true';
        });
      });
    });
  }
};

// ==========================================
// TOOLKIT · COPIAR AL PORTAPAPELES
// ==========================================
const CopyButtons = {
  init() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.copy-btn');
      if (!btn) return;

      const targetId = btn.dataset.copyTarget;
      const el = document.getElementById(targetId);
      if (!el) return;

      const text = el.textContent.trim();
      if (!text || text === '—') {
        if (typeof Toast !== 'undefined') Toast.show('Nada que copiar', 'info', 1500);
        return;
      }

      const writePromise = navigator.clipboard
        ? navigator.clipboard.writeText(text)
        : Promise.reject();

      writePromise
        .then(() => {
          btn.classList.add('copied');
          const icon = btn.querySelector('i');
          if (icon) icon.className = 'fa-solid fa-check';
          if (typeof Toast !== 'undefined') Toast.show('Copiado: ' + text, 'success', 1600);
          setTimeout(() => {
            btn.classList.remove('copied');
            if (icon) icon.className = 'fa-solid fa-copy';
          }, 1400);
        })
        .catch(() => {
          if (typeof Toast !== 'undefined') Toast.show('No se pudo copiar', 'error');
        });
    });
  }
};

// ==========================================
// TOOLKIT · BOTONES LIMPIAR
// ==========================================
const ToolkitClear = {
  init() {
    // Subredes
    const subnetClear = document.getElementById('subnetClear');
    if (subnetClear) {
      subnetClear.addEventListener('click', () => {
        const ip = document.getElementById('subnetIP');
        const cidr = document.getElementById('subnetCIDR');
        const output = document.getElementById('subnetOutput');
        if (ip) { ip.value = ''; ip.classList.remove('invalid'); ip.focus(); }
        if (cidr) cidr.value = '24';
        if (output) output.hidden = true;
        if (typeof Toast !== 'undefined') Toast.show('Limpiado', 'info', 1200);
      });
    }

    // Conversor
    const convClear = document.getElementById('convClear');
    if (convClear) {
      convClear.addEventListener('click', () => {
        ['convBin', 'convDec', 'convHex'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        const first = document.getElementById('convBin');
        if (first) first.focus();
        if (typeof Toast !== 'undefined') Toast.show('Limpiado', 'info', 1200);
      });
    }
  }
};

// ==========================================
// PWA · SERVICE WORKER + INSTALACIÓN
// ==========================================
const PWA = {
  deferredPrompt: null,

  init() {
    // 1. Registrar service worker (solo en HTTPS)
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('sw.js')
          .then((reg) => console.log('[PWA] SW registrado:', reg.scope))
          .catch((err) => console.warn('[PWA] SW error:', err));
      });
    }

    // 2. Detectar evento de instalación
    const btn = document.getElementById('installBtn');
    if (!btn) return;

    // Si ya está instalada, no mostrar
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone === true) return; // iOS

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      btn.hidden = false;
      // Sincronizar con el scroll actual: si el usuario ya bajó,
      // mostrar; si no, esperar al ScrollTop como los demás.
      const threshold = Math.max(100, window.innerHeight * 0.10);
      if (window.pageYOffset > threshold) {
        btn.classList.add('visible');
      }
    });

    // Click en el botón
    btn.addEventListener('click', async () => {
      if (!this.deferredPrompt) {
        if (typeof Toast !== 'undefined') {
          Toast.show('Usa el menú del navegador → "Instalar app"', 'info', 4000);
        }
        return;
      }
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        btn.hidden = true;
        if (typeof Toast !== 'undefined') Toast.show('¡App instalada!', 'success', 2500);
      }
      this.deferredPrompt = null;
    });

    // Cuando se instala, ocultar
    window.addEventListener('appinstalled', () => {
      btn.hidden = true;
      this.deferredPrompt = null;
      if (typeof Toast !== 'undefined') Toast.show('App añadida a tu pantalla de inicio', 'success', 3000);
    });
  }
};
// ==========================================
// HASH GENERATOR
// ==========================================
const HashGen = {
  async run() {
    const input = document.getElementById('hashInput');
    const output = document.getElementById('hashOutput');
    if (!input || !output) return;

    const text = input.value;
    if (!text) {
      if (typeof Toast !== 'undefined') Toast.show('Escribe algo primero', 'info', 1500);
      return;
    }

    const algos = [
      { id: 'outSHA1',   algo: 'SHA-1' },
      { id: 'outSHA256', algo: 'SHA-256' },
      { id: 'outSHA384', algo: 'SHA-384' },
      { id: 'outSHA512', algo: 'SHA-512' }
    ];

    try {
      for (const { id, algo } of algos) {
        const el = document.getElementById(id);
        if (el) el.textContent = await this.hash(algo, text);
      }
      output.hidden = false;
    } catch (e) {
      if (typeof Toast !== 'undefined') Toast.show('Error generando hash', 'error');
    }
  },
  async hash(algo, text) {
    const buf = new TextEncoder().encode(text);
    const h = await crypto.subtle.digest(algo, buf);
    return Array.from(new Uint8Array(h))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },
  init() {
    const btn = document.getElementById('hashBtn');
    const clear = document.getElementById('hashClear');
    const input = document.getElementById('hashInput');
    if (!btn) return;
    btn.addEventListener('click', () => this.run());
    if (input) input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.run();
    });
    if (clear) clear.addEventListener('click', () => {
      const out = document.getElementById('hashOutput');
      if (input) { input.value = ''; input.focus(); }
      if (out) out.hidden = true;
    });
  }
};

// ==========================================
// PASSWORD GEN + ANALYZER
// ==========================================
const PasswordTool = {
  init() {
    const len = document.getElementById('pwdLength');
    const lenVal = document.getElementById('pwdLengthVal');
    const btn = document.getElementById('pwdGenerate');
    const analyze = document.getElementById('pwdAnalyze');
    if (!btn) return;

    if (len && lenVal) {
      len.addEventListener('input', () => { lenVal.textContent = len.value; });
    }

    btn.addEventListener('click', () => this.generate());

    if (analyze) {
      analyze.addEventListener('input', () => {
        this.updateStrength(analyze.value);
      });
    }

    this.generate();
  },

  generate() {
    const length = parseInt(document.getElementById('pwdLength')?.value || 16, 10);
    const useLower   = document.getElementById('pwdLower')?.checked;
    const useUpper   = document.getElementById('pwdUpper')?.checked;
    const useNumbers = document.getElementById('pwdNumbers')?.checked;
    const useSymbols = document.getElementById('pwdSymbols')?.checked;

    const pools = {
      lower:   'abcdefghijkmnopqrstuvwxyz',
      upper:   'ABCDEFGHJKLMNPQRSTUVWXYZ',
      numbers: '23456789',
      symbols: '!@#$%^&*()-_=+[]{};:,.?'
    };

    let pool = '';
    if (useLower)   pool += pools.lower;
    if (useUpper)   pool += pools.upper;
    if (useNumbers) pool += pools.numbers;
    if (useSymbols) pool += pools.symbols;

    if (!pool) {
      pool = pools.lower + pools.upper + pools.numbers;
      if (typeof Toast !== 'undefined') Toast.show('Selecciona al menos una opción', 'info', 1800);
    }

    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    let out = '';
    for (let i = 0; i < length; i++) out += pool[arr[i] % pool.length];

    const output = document.getElementById('pwdOutput');
    if (output) output.value = out;

    this.updateStrength(out);
  },

  updateStrength(pwd) {
    const wrap  = document.getElementById('pwdStrength');
    const fill  = document.getElementById('pwdStrengthFill');
    const label = document.getElementById('pwdStrengthLabel');
    const entEl = document.getElementById('pwdStrengthEntropy');
    if (!fill || !label || !entEl || !wrap) return;

    if (!pwd) { wrap.hidden = true; return; }
    wrap.hidden = false;

    let poolSize = 0;
    if (/[a-z]/.test(pwd)) poolSize += 26;
    if (/[A-Z]/.test(pwd)) poolSize += 26;
    if (/[0-9]/.test(pwd)) poolSize += 10;
    if (/[^a-zA-Z0-9]/.test(pwd)) poolSize += 32;

    const entropy = poolSize ? pwd.length * Math.log2(poolSize) : 0;

    let level, text, pct;
    if (entropy < 28)       { level = 1; text = 'MUY DÉBIL';  pct = 15; }
    else if (entropy < 40)  { level = 2; text = 'DÉBIL';      pct = 35; }
    else if (entropy < 60)  { level = 3; text = 'MEDIA';      pct = 55; }
    else if (entropy < 128) { level = 4; text = 'FUERTE';     pct = 80; }
    else                    { level = 5; text = 'MUY FUERTE'; pct = 100; }

    fill.dataset.level = level;
    fill.style.width = pct + '%';
    label.textContent = text;
    entEl.textContent = entropy.toFixed(1) + ' bits';
  }
};

// ==========================================
// BANDWIDTH CALCULATOR
// ==========================================
const BandwidthCalc = {
  init() {
    const btn = document.getElementById('bwCalc');
    const clear = document.getElementById('bwClear');
    if (!btn) return;

    btn.addEventListener('click', () => this.calculate());
    if (clear) clear.addEventListener('click', () => {
      ['bwSize', 'bwSpeed'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const out = document.getElementById('bwOutput');
      if (out) out.hidden = true;
    });
  },

  calculate() {
    const size  = parseFloat(document.getElementById('bwSize')?.value);
    const sUnit = parseFloat(document.getElementById('bwSizeUnit')?.value);
    const speed = parseFloat(document.getElementById('bwSpeed')?.value);
    const spUnit = parseFloat(document.getElementById('bwSpeedUnit')?.value);

    if (!size || !speed || size <= 0 || speed <= 0) {
      if (typeof Toast !== 'undefined') Toast.show('Rellena tamaño y velocidad', 'info', 1800);
      return;
    }

    const sizeBytes = size * sUnit;
    const bytesPerSec = (speed * spUnit) / 8;
    const seconds = sizeBytes / bytesPerSec;

    const fmtTime = (s) => {
      if (s < 1) return (s * 1000).toFixed(0) + ' ms';
      if (s < 60) return s.toFixed(2) + ' seg';
      if (s < 3600) return Math.floor(s / 60) + ' min ' + Math.round(s % 60) + ' seg';
      if (s < 86400) return Math.floor(s / 3600) + ' h ' + Math.round((s % 3600) / 60) + ' min';
      return Math.floor(s / 86400) + ' días ' + Math.round((s % 86400) / 3600) + ' h';
    };

    document.getElementById('bwOutSize').textContent =
      size + ' ' + document.getElementById('bwSizeUnit').selectedOptions[0].textContent;
    document.getElementById('bwOutSpeed').textContent =
      speed + ' ' + document.getElementById('bwSpeedUnit').selectedOptions[0].textContent;
    document.getElementById('bwOutTime').textContent = fmtTime(seconds);

    document.getElementById('bwOutput').hidden = false;
  }
};

// ==========================================
// RJ45 COLOR CODES
// ==========================================
const RJ45 = {
  std: {
    B: [
      { n: 'Blanco/Naranja', color: '#FF6B00', stripe: true  },
      { n: 'Naranja',         color: '#FF6B00', stripe: false },
      { n: 'Blanco/Verde',    color: '#00E676', stripe: true  },
      { n: 'Azul',            color: '#0EA5FF', stripe: false },
      { n: 'Blanco/Azul',     color: '#0EA5FF', stripe: true  },
      { n: 'Verde',           color: '#00E676', stripe: false },
      { n: 'Blanco/Marrón',   color: '#A0522D', stripe: true  },
      { n: 'Marrón',          color: '#A0522D', stripe: false }
    ],
    A: [
      { n: 'Blanco/Verde',    color: '#00E676', stripe: true  },
      { n: 'Verde',           color: '#00E676', stripe: false },
      { n: 'Blanco/Naranja',  color: '#FF6B00', stripe: true  },
      { n: 'Azul',            color: '#0EA5FF', stripe: false },
      { n: 'Blanco/Azul',     color: '#0EA5FF', stripe: true  },
      { n: 'Naranja',         color: '#FF6B00', stripe: false },
      { n: 'Blanco/Marrón',   color: '#A0522D', stripe: true  },
      { n: 'Marrón',          color: '#A0522D', stripe: false }
    ]
  },

  init() {
    const container = document.getElementById('rj45Pins');
    if (!container) return;

    document.querySelectorAll('.rj45-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.rj45-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.render(tab.dataset.std);
      });
    });

    this.render('B');
  },

  render(std) {
    const container = document.getElementById('rj45Pins');
    if (!container) return;
    const pins = this.std[std] || this.std.B;

    container.innerHTML = pins.map((pin, i) => {
      let background;
      if (pin.stripe) {
        /* 5px de color + 3px de blanco → más color, más vivo */
        background = `repeating-linear-gradient(90deg, ${pin.color} 0px, ${pin.color} 5px, #f5f5f5 5px, #f5f5f5 8px)`;
      } else {
        background = pin.color;
      }
      const solidClass = pin.stripe ? '' : ' rj45-pin__wire--solid';
      return `
        <div class="rj45-pin">
          <span class="rj45-pin__num">${i + 1}</span>
          <div class="rj45-pin__wire${solidClass}" style="background: ${background};"></div>
          <span class="rj45-pin__name">${pin.n}</span>
        </div>
      `;
    }).join('');
  }
};

// ==========================================
// ANCHO DE BANDA vs LATENCIA
// ==========================================
const BandwidthLatency = {
  // Referencias DOM
  els: {},

  init() {
    const bwSlider = document.getElementById('bwSlider');
    const latSlider = document.getElementById('latSlider');
    if (!bwSlider || !latSlider) return;

    this.els = {
      bwSlider,
      latSlider,
      bwValue: document.getElementById('bwValue'),
      latValue: document.getElementById('latValue'),
      download: {
        value: document.getElementById('bwlatDownload'),
        fill: document.getElementById('bwlatDownloadFill'),
        verdict: document.getElementById('bwlatDownloadVerdict'),
        card: document.querySelector('[data-scenario="download"]')
      },
      video: {
        value: document.getElementById('bwlatVideo'),
        fill: document.getElementById('bwlatVideoFill'),
        verdict: document.getElementById('bwlatVideoVerdict'),
        card: document.querySelector('[data-scenario="video"]')
      },
      game: {
        value: document.getElementById('bwlatGame'),
        fill: document.getElementById('bwlatGameFill'),
        verdict: document.getElementById('bwlatGameVerdict'),
        card: document.querySelector('[data-scenario="game"]')
      },
      stream: {
        value: document.getElementById('bwlatStream'),
        fill: document.getElementById('bwlatStreamFill'),
        verdict: document.getElementById('bwlatStreamVerdict'),
        card: document.querySelector('[data-scenario="stream"]')
      }
    };

    // Listeners
    bwSlider.addEventListener('input', () => this.update());
    latSlider.addEventListener('input', () => this.update());

    // Render inicial
    this.update();
  },

  update() {
    const bw = parseInt(this.els.bwSlider.value, 10);
    const lat = parseInt(this.els.latSlider.value, 10);

    this.els.bwValue.textContent = bw;
    this.els.latValue.textContent = lat;

    this.evalDownload(bw, lat);
    this.evalVideo(bw, lat);
    this.evalGame(bw, lat);
    this.evalStream(bw, lat);
  },

  /* --- Descarga: puro ancho de banda (latencia solo añade overhead mínimo) --- */
  evalDownload(bw, lat) {
    // Tiempo teórico: 1 GB = 8000 Mb (base decimal) → seg = 8000 / bw
    const baseSec = 8000 / bw;
    // Overhead por latencia: +0.3s por cada RTT grande
    const overhead = Math.max(0, (lat - 20)) * 0.005;
    const totalSec = baseSec + overhead;

    let display, status, pct, verdict;
    if (totalSec < 15) {
      status = 'excellent'; pct = 100; verdict = 'Excelente';
    } else if (totalSec < 60) {
      status = 'good'; pct = 75; verdict = 'Aceptable';
    } else if (totalSec < 300) {
      status = 'bad'; pct = 40; verdict = 'Lento';
    } else {
      status = 'terrible'; pct = 15; verdict = 'Muy lento';
    }

    display = this.fmtTime(totalSec);

    this.set(this.els.download, display, pct, status, verdict);
  },

  /* --- Videollamada: requiere latencia baja + mínimo de BW --- */
  evalVideo(bw, lat) {
    // Requisitos: BW ≥ 3 Mbps, latencia < 150 ms
    const bwOk = bw >= 3;
    const latOk = lat <= 150;

    let status, pct, verdict, display;

    if (!bwOk) {
      status = 'terrible'; pct = 10;
      display = 'Imposible';
      verdict = 'Sin ancho de banda';
    } else if (!latOk) {
      status = 'terrible'; pct = 20;
      display = 'Congelada';
      verdict = 'Latencia alta';
    } else if (bw < 8 || lat > 100) {
      status = 'bad'; pct = 45;
      display = 'Con cortes';
      verdict = 'Se congela';
    } else if (bw < 20 || lat > 60) {
      status = 'good'; pct = 75;
      display = '720p OK';
      verdict = 'Aceptable';
    } else {
      status = 'excellent'; pct = 100;
      display = '1080p HD';
      verdict = 'Perfecta';
    }

    this.set(this.els.video, display, pct, status, verdict);
  },

  /* --- Juego: latencia es REINA, BW mínimo 5 Mbps --- */
  evalGame(bw, lat) {
    let status, pct, verdict, display;

    if (bw < 2) {
      status = 'terrible'; pct = 10;
      display = 'Injugable';
      verdict = 'Sin datos';
    } else if (lat > 150) {
      status = 'terrible'; pct = 20;
      display = lat + ' ms';
      verdict = 'Lag brutal';
    } else if (lat > 80) {
      status = 'bad'; pct = 45;
      display = lat + ' ms';
      verdict = 'Lag notable';
    } else if (lat > 40) {
      status = 'good'; pct = 75;
      display = lat + ' ms';
      verdict = 'Jugable';
    } else if (lat > 20) {
      status = 'good'; pct = 88;
      display = lat + ' ms';
      verdict = 'Bien';
    } else {
      status = 'excellent'; pct = 100;
      display = lat + ' ms';
      verdict = 'Competitivo';
    }

    this.set(this.els.game, display, pct, status, verdict);
  },

  /* --- Streaming 4K: BW alto + latencia estable --- */
  evalStream(bw, lat) {
    // Netflix 4K recomendado: 25 Mbps
    // 1080p: 5 Mbps
    // 720p: 3 Mbps

    let status, pct, verdict, display;

    if (bw >= 25) {
      if (lat > 200) {
        status = 'good'; pct = 85;
        display = '2160p · Buffering';
        verdict = 'Se traba al inicio';
      } else {
        status = 'excellent'; pct = 100;
        display = '2160p · Sin cortes';
        verdict = 'Perfecto 4K';
      }
    } else if (bw >= 10) {
      status = 'good'; pct = 80;
      display = '1440p';
      verdict = 'Muy bueno';
    } else if (bw >= 5) {
      status = 'good'; pct = 65;
      display = '1080p HD';
      verdict = 'Bien';
    } else if (bw >= 3) {
      status = 'bad'; pct = 40;
      display = '720p';
      verdict = 'Calidad baja';
    } else {
      status = 'terrible'; pct = 15;
      display = '480p o menos';
      verdict = 'Mala calidad';
    }

    this.set(this.els.stream, display, pct, status, verdict);
  },

  /* --- Helper: aplicar valores al DOM --- */
  set(target, display, pct, status, verdict) {
    if (!target || !target.value) return;
    target.value.textContent = display;
    if (target.fill) target.fill.style.width = pct + '%';
    if (target.verdict) target.verdict.textContent = verdict;
    if (target.card) {
      target.card.dataset.status = status;
      target.card.classList.add('evaluated');
    }
  },

  /* --- Helper: formatear tiempo --- */
  fmtTime(s) {
    if (s < 1) return (s * 1000).toFixed(0) + ' ms';
    if (s < 60) return s.toFixed(1) + ' s';
    if (s < 3600) return Math.floor(s / 60) + ' min ' + Math.round(s % 60) + ' s';
    return Math.floor(s / 3600) + ' h ' + Math.round((s % 3600) / 60) + ' min';
  }
};

// ==========================================
// TABLA DE PUERTOS Y PROTOCOLOS
// ==========================================
const PortsTable = {
  data: [
    // ===== WEB =====
    { port: 80,    proto: 'TCP',      service: 'HTTP',            cat: 'web',   desc: 'Tráfico web sin cifrar' },
    { port: 443,   proto: 'TCP',      service: 'HTTPS',           cat: 'web',   desc: 'Tráfico web cifrado con TLS/SSL' },
    { port: 8080,  proto: 'TCP',      service: 'HTTP-Alt',        cat: 'web',   desc: 'HTTP alternativo / proxies' },
    { port: 8443,  proto: 'TCP',      service: 'HTTPS-Alt',       cat: 'web',   desc: 'HTTPS alternativo' },
    { port: 8000,  proto: 'TCP',      service: 'HTTP-Dev',        cat: 'web',   desc: 'Servidores de desarrollo' },
    { port: 3000,  proto: 'TCP',      service: 'Node.js / Dev',   cat: 'web',   desc: 'Apps de desarrollo (React, Next, etc.)' },
    { port: 5000,  proto: 'TCP',      service: 'Flask / Dev',     cat: 'web',   desc: 'Servidores Python de desarrollo' },

    // ===== EMAIL =====
    { port: 25,    proto: 'TCP',      service: 'SMTP',            cat: 'email', desc: 'Envío de correo (servidor a servidor)' },
    { port: 465,   proto: 'TCP',      service: 'SMTPS',           cat: 'email', desc: 'SMTP sobre SSL (obsoleto pero usado)' },
    { port: 587,   proto: 'TCP',      service: 'SMTP (STARTTLS)', cat: 'email', desc: 'Envío de correo autenticado moderno' },
    { port: 110,   proto: 'TCP',      service: 'POP3',            cat: 'email', desc: 'Descarga de correo (sin cifrar)' },
    { port: 995,   proto: 'TCP',      service: 'POP3S',           cat: 'email', desc: 'POP3 sobre SSL' },
    { port: 143,   proto: 'TCP',      service: 'IMAP',            cat: 'email', desc: 'Sincronización de correo (sin cifrar)' },
    { port: 993,   proto: 'TCP',      service: 'IMAPS',           cat: 'email', desc: 'IMAP sobre SSL' },

    // ===== BASE DE DATOS =====
    { port: 3306,  proto: 'TCP',      service: 'MySQL / MariaDB', cat: 'db',    desc: 'Base de datos relacional MySQL' },
    { port: 5432,  proto: 'TCP',      service: 'PostgreSQL',      cat: 'db',    desc: 'Base de datos relacional PostgreSQL' },
    { port: 1433,  proto: 'TCP',      service: 'SQL Server',      cat: 'db',    desc: 'Microsoft SQL Server' },
    { port: 1521,  proto: 'TCP',      service: 'Oracle DB',       cat: 'db',    desc: 'Listener de Oracle Database' },
    { port: 27017, proto: 'TCP',      service: 'MongoDB',         cat: 'db',    desc: 'Base de datos NoSQL MongoDB' },
    { port: 6379,  proto: 'TCP',      service: 'Redis',           cat: 'db',    desc: 'Cache en memoria / cola de mensajes' },
    { port: 9200,  proto: 'TCP',      service: 'Elasticsearch',   cat: 'db',    desc: 'Motor de búsqueda y logs' },

    // ===== RED =====
    { port: 53,    proto: 'TCP/UDP',  service: 'DNS',             cat: 'net',   desc: 'Resolución de nombres de dominio' },
    { port: 67,    proto: 'UDP',      service: 'DHCP Server',     cat: 'net',   desc: 'Servidor DHCP (asigna IP)' },
    { port: 68,    proto: 'UDP',      service: 'DHCP Client',     cat: 'net',   desc: 'Cliente DHCP' },
    { port: 123,   proto: 'UDP',      service: 'NTP',             cat: 'net',   desc: 'Sincronización de hora por red' },
    { port: 161,   proto: 'UDP',      service: 'SNMP',            cat: 'net',   desc: 'Monitoreo de equipos de red' },
    { port: 162,   proto: 'UDP',      service: 'SNMP Trap',       cat: 'net',   desc: 'Alertas SNMP' },
    { port: 179,   proto: 'TCP',      service: 'BGP',             cat: 'net',   desc: 'Enrutamiento entre sistemas autónomos' },
    { port: 520,   proto: 'UDP',      service: 'RIP',             cat: 'net',   desc: 'Enrutamiento interno (obsoleto)' },
    { port: 1900,  proto: 'UDP',      service: 'SSDP / UPnP',     cat: 'net',   desc: 'Descubrimiento de dispositivos' },
    { port: 5353,  proto: 'UDP',      service: 'mDNS',            cat: 'net',   desc: 'DNS multicast (Bonjour, Chromecast)' },

    // ===== SEGURIDAD / REMOTO =====
    { port: 22,    proto: 'TCP',      service: 'SSH',             cat: 'sec',   desc: 'Acceso remoto seguro (Linux/servidores)' },
    { port: 23,    proto: 'TCP',      service: 'Telnet',          cat: 'sec',   desc: 'Acceso remoto en texto plano (INSEGURO)' },
    { port: 3389,  proto: 'TCP',      service: 'RDP',             cat: 'sec',   desc: 'Escritorio remoto de Windows' },
    { port: 5900,  proto: 'TCP',      service: 'VNC',             cat: 'sec',   desc: 'Escritorio remoto multiplataforma' },
    { port: 1194,  proto: 'UDP',      service: 'OpenVPN',         cat: 'sec',   desc: 'VPN de código abierto' },
    { port: 500,   proto: 'UDP',      service: 'IKE / IPsec',     cat: 'sec',   desc: 'Negociación de VPN IPsec' },
    { port: 4500,  proto: 'UDP',      service: 'IPsec NAT-T',     cat: 'sec',   desc: 'IPsec atravesando NAT' },
    { port: 1723,  proto: 'TCP',      service: 'PPTP',            cat: 'sec',   desc: 'VPN antigua (INSEGURA)' },
    { port: 1701,  proto: 'UDP',      service: 'L2TP',            cat: 'sec',   desc: 'VPN Layer 2 con IPsec' },

    // ===== ARCHIVOS / TRANSFERENCIA =====
    { port: 20,    proto: 'TCP',      service: 'FTP-Datos',       cat: 'file',  desc: 'Transferencia FTP (canal de datos)' },
    { port: 21,    proto: 'TCP',      service: 'FTP-Control',     cat: 'file',  desc: 'Transferencia FTP (canal de control)' },
    { port: 69,    proto: 'UDP',      service: 'TFTP',            cat: 'file',  desc: 'Transferencia trivial (routers/switches)' },
    { port: 445,   proto: 'TCP',      service: 'SMB',             cat: 'file',  desc: 'Recursos compartidos Windows' },
    { port: 139,   proto: 'TCP',      service: 'NetBIOS-SSN',     cat: 'file',  desc: 'Compartición Windows legacy' },
    { port: 137,   proto: 'UDP',      service: 'NetBIOS-NS',      cat: 'file',  desc: 'Resolución de nombres NetBIOS' },
    { port: 138,   proto: 'UDP',      service: 'NetBIOS-DGM',     cat: 'file',  desc: 'Datagramas NetBIOS' },
    { port: 2049,  proto: 'TCP/UDP',  service: 'NFS',             cat: 'file',  desc: 'Sistema de archivos en red (Linux)' },
    { port: 873,   proto: 'TCP',      service: 'Rsync',           cat: 'file',  desc: 'Sincronización de archivos eficiente' }
  ],

  activeCat: 'all',
  searchTerm: '',

  catLabels: {
    web: 'Web',
    email: 'Email',
    db: 'BD',
    net: 'Red',
    sec: 'Seguridad',
    file: 'Archivos'
  },

  init() {
    const tbody = document.getElementById('portsTbody');
    const searchInput = document.getElementById('portsSearch');
    const searchClear = document.getElementById('portsSearchClear');
    const filters = document.querySelectorAll('.ports-filter[data-cat]');
    const emptyEl = document.getElementById('portsEmpty');
    const countEl = document.getElementById('portsCount');
    const totalEl = document.getElementById('portsTotal');

    if (!tbody) return;

    // ✅ Asignar referencias ANTES del primer render
    this.tbody = tbody;
    this.emptyEl = emptyEl;
    this.countEl = countEl;

    // Render inicial
    this.render();
    if (totalEl) totalEl.textContent = this.data.length;

    // Buscador en vivo
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchTerm = searchInput.value.trim().toLowerCase();
        if (searchClear) searchClear.hidden = !this.searchTerm;
        this.render();
      });
    }

    // Botón limpiar búsqueda
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        this.searchTerm = '';
        searchClear.hidden = true;
        searchInput.focus();
        this.render();
      });
    }

    // Filtros por categoría
    filters.forEach(btn => {
      btn.addEventListener('click', () => {
        filters.forEach(b => b.classList.toggle('active', b === btn));
        this.activeCat = btn.dataset.cat;
        this.render();
      });
    });

    // Copiar puerto (delegado)
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.copy-port');
      if (!btn) return;
      const port = btn.dataset.port;
      const text = port;

      const writePromise = navigator.clipboard
        ? navigator.clipboard.writeText(text)
        : Promise.reject();

      writePromise
        .then(() => {
          btn.classList.add('copied');
          const icon = btn.querySelector('i');
          if (icon) icon.className = 'fa-solid fa-check';
          if (typeof Toast !== 'undefined') Toast.show('Copiado: ' + text, 'success', 1400);
          setTimeout(() => {
            btn.classList.remove('copied');
            if (icon) icon.className = 'fa-solid fa-copy';
          }, 1200);
        })
        .catch(() => {
          if (typeof Toast !== 'undefined') Toast.show('No se pudo copiar', 'error');
        });
    });

  },

  render() {
    if (!this.tbody) return;

    const term = this.searchTerm;
    const cat = this.activeCat;

    let visible = 0;
    let html = '';

    this.data.forEach(row => {
      // Filtro por categoría
      if (cat !== 'all' && row.cat !== cat) return;

      // Filtro por búsqueda
      if (term) {
        const haystack = (
          String(row.port) + ' ' +
          row.proto + ' ' +
          row.service + ' ' +
          row.desc + ' ' +
          (this.catLabels[row.cat] || '')
        ).toLowerCase();
        if (!haystack.includes(term)) return;
      }

      visible++;
      html += `
        <tr>
          <td class="col-port">${row.port}</td>
          <td class="col-proto">${row.proto}</td>
          <td class="col-service">${row.service}</td>
          <td class="col-desc">${row.desc}</td>
          <td class="col-cat"><span class="cat-badge" data-cat="${row.cat}">${this.catLabels[row.cat] || row.cat}</span></td>
          <td class="col-copy"><button type="button" class="copy-port" data-port="${row.port}" aria-label="Copiar puerto ${row.port}"><i class="fa-solid fa-copy"></i></button></td>
        </tr>
      `;
    });

    this.tbody.innerHTML = html;

    if (this.countEl) this.countEl.textContent = visible;
    if (this.emptyEl) this.emptyEl.hidden = visible > 0;
  }
};

// ==========================================
// CANALES WiFi (tabs 2.4 / 5 GHz)
// ==========================================
const WiFiChannels = {
  init() {
    const tabs = document.querySelectorAll('.wifi-tab');
    const panels = document.querySelectorAll('.wifi-panel');
    if (!tabs.length || !panels.length) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const band = tab.dataset.band;

        // Tabs activas
        tabs.forEach(t => t.classList.toggle('active', t === tab));

        // Panel visible
        panels.forEach(p => {
          p.hidden = p.dataset.panel !== band;
        });
      });
    });
  }
};

// ==========================================
// MODELO OSI INTERACTIVO
// ==========================================
const OSIModel = {
  init() {
    const layers = document.querySelectorAll('.osi-layer');
    if (!layers.length) return;

    layers.forEach(layer => {
      const head = layer.querySelector('.osi-layer__head');
      if (!head) return;

      head.addEventListener('click', () => {
        const isOpen = layer.classList.contains('open');

        // Cerrar todas
        layers.forEach(l => {
          l.classList.remove('open');
          l.querySelector('.osi-layer__head')?.setAttribute('aria-expanded', 'false');
        });

        // Si no estaba abierta, abrir la actual
        if (!isOpen) {
          layer.classList.add('open');
          head.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }
};

// ==========================================
// HERRAMIENTAS DEV · JSON / UUID / TIMESTAMP / BASE64
// ==========================================
const JSONTool = {
  init() {
    const input = document.getElementById('jsonInput');
    const out = document.getElementById('jsonResult');
    const status = document.getElementById('jsonStatus');
    const wrap = document.getElementById('jsonOutput');
    const btnFormat = document.getElementById('jsonFormat');
    const btnMinify = document.getElementById('jsonMinify');
    const btnClear = document.getElementById('jsonClear');
    const btnCopy = document.getElementById('jsonCopy');
    if (!input) return;

    const setStatus = (msg, type) => {
      status.hidden = false;
      status.className = 'json-status ' + type;
      status.innerHTML = `<i class="fa-solid ${type === 'ok' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${msg}`;
    };

    const process = (minify) => {
      try {
        const parsed = JSON.parse(input.value);
        const result = JSON.stringify(parsed, null, minify ? 0 : 2);
        out.textContent = result;
        wrap.hidden = false;
        setStatus(minify ? 'JSON minificado ✓' : 'JSON válido y formateado ✓', 'ok');
      } catch (e) {
        wrap.hidden = true;
        setStatus('Error: ' + e.message, 'error');
      }
    };

    btnFormat.addEventListener('click', () => process(false));
    btnMinify.addEventListener('click', () => process(true));
    btnClear.addEventListener('click', () => {
      input.value = '';
      wrap.hidden = true;
      status.hidden = true;
      input.focus();
    });
    btnCopy.addEventListener('click', () => {
      if (wrap.hidden) return;
      navigator.clipboard.writeText(out.textContent).then(() => {
        Toast.show('Copiado', 'success', 1400);
      }).catch(() => Toast.show('No se pudo copiar', 'error'));
    });
  }
};

const UUIDTool = {
  init() {
    const btn = document.getElementById('uuidGenerate');
    const btnCopyAll = document.getElementById('uuidCopyAll');
    const list = document.getElementById('uuidList');
    const wrap = document.getElementById('uuidOutput');
    const countInput = document.getElementById('uuidCount');
    const formatInput = document.getElementById('uuidFormat');
    if (!btn) return;

    const generate = () => {
      const count = Math.min(100, Math.max(1, parseInt(countInput.value, 10) || 1));
      const fmt = formatInput.value;

      let html = '';
      const all = [];
      for (let i = 0; i < count; i++) {
        let id = (crypto.randomUUID && crypto.randomUUID()) || this.fallback();
        if (fmt === 'upper') id = id.toUpperCase();
        if (fmt === 'nodash') id = id.replace(/-/g, '');
        all.push(id);
        html += `<div class="uuid-list__row"><span>${id}</span><button type="button" class="uuid-list__copy" data-copy="${id}" aria-label="Copiar"><i class="fa-solid fa-copy"></i></button></div>`;
      }
      list.innerHTML = html;
      wrap.hidden = false;
      list._all = all;
    };

    btn.addEventListener('click', generate);

    btnCopyAll.addEventListener('click', () => {
      if (wrap.hidden) generate();
      const all = (list._all || []).join('\n');
      navigator.clipboard.writeText(all).then(() => Toast.show(`${list._all.length} UUIDs copiados`, 'success', 1600))
        .catch(() => Toast.show('No se pudo copiar', 'error'));
    });

    list.addEventListener('click', (e) => {
      const c = e.target.closest('.uuid-list__copy');
      if (!c) return;
      navigator.clipboard.writeText(c.dataset.copy).then(() => {
        c.classList.add('copied');
        const icon = c.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-check';
        Toast.show('Copiado', 'success', 1200);
        setTimeout(() => {
          c.classList.remove('copied');
          if (icon) icon.className = 'fa-solid fa-copy';
        }, 1200);
      }).catch(() => Toast.show('No se pudo copiar', 'error'));
    });

    generate();
  },

  fallback() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
};

const TimestampTool = {
  init() {
    const input = document.getElementById('tsInput');
    const btn = document.getElementById('tsConvert');
    const btnNow = document.getElementById('tsNow');
    const btnClear = document.getElementById('tsClear');
    const wrap = document.getElementById('tsOutput');
    if (!input || !btn) return;

    const convert = () => {
      const raw = input.value.trim();
      if (!raw) return;
      let ts = parseInt(raw, 10);
      if (isNaN(ts)) return;
      // Auto-detectar milisegundos
      if (raw.length > 10) ts = Math.floor(ts / 1000);

      const d = new Date(ts * 1000);
      if (isNaN(d.getTime())) return;

      document.getElementById('tsUTC').textContent = d.toUTCString();
      document.getElementById('tsLocal').textContent = d.toLocaleString('es-DO', { dateStyle: 'full', timeStyle: 'medium' });
      document.getElementById('tsISO').textContent = d.toISOString();
      document.getElementById('tsRel').textContent = this.relative(d);

      wrap.hidden = false;
    };

    btn.addEventListener('click', convert);
    btnNow.addEventListener('click', () => {
      input.value = Math.floor(Date.now() / 1000);
      convert();
    });
    btnClear.addEventListener('click', () => {
      input.value = '';
      wrap.hidden = true;
      input.focus();
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') convert(); });

    convert();
  },

  relative(d) {
    const diff = Date.now() - d.getTime();
    const abs = Math.abs(diff);
    const sec = Math.floor(abs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    const suffix = diff > 0 ? 'atrás' : 'en el futuro';
    if (sec < 60) return `hace ${sec}s`;
    if (min < 60) return `hace ${min} min`;
    if (hr < 24) return `hace ${hr} h`;
    if (day < 30) return `hace ${day} días`;
    return suffix;
  }
};

const Base64Tool = {
  init() {
    const input = document.getElementById('b64Input');
    const btnEnc = document.getElementById('b64Encode');
    const btnDec = document.getElementById('b64Decode');
    const btnClear = document.getElementById('b64Clear');
    const btnCopy = document.getElementById('b64Copy');
    const status = document.getElementById('b64Status');
    if (!input) return;

    const setStatus = (msg, type) => {
      status.hidden = false;
      status.className = 'json-status ' + type;
      status.innerHTML = `<i class="fa-solid ${type === 'ok' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${msg}`;
    };

    btnEnc.addEventListener('click', () => {
      try {
        const encoded = btoa(unescape(encodeURIComponent(input.value)));
        input.value = encoded;
        setStatus('Texto codificado a Base64 ✓', 'ok');
      } catch (e) {
        setStatus('Error al codificar', 'error');
      }
    });

    btnDec.addEventListener('click', () => {
      try {
        const decoded = decodeURIComponent(escape(atob(input.value.trim())));
        input.value = decoded;
        setStatus('Base64 decodificado ✓', 'ok');
      } catch (e) {
        setStatus('Base64 inválido', 'error');
      }
    });

    btnClear.addEventListener('click', () => {
      input.value = '';
      status.hidden = true;
      input.focus();
    });

    btnCopy.addEventListener('click', () => {
      if (!input.value) return;
      navigator.clipboard.writeText(input.value).then(() => Toast.show('Copiado', 'success', 1200))
        .catch(() => Toast.show('No se pudo copiar', 'error'));
    });
  }
};

// ==========================================
// SOPORTE · INFO DEL SISTEMA
// ==========================================
const SysInfo = {
  init() {
    const btn = document.getElementById('sysDetect');
    const btnCopy = document.getElementById('sysCopy');
    const wrap = document.getElementById('sysOutput');
    if (!btn) return;

    const detect = () => {
      const ua = navigator.userAgent;
      let os = 'Desconocido';
      if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
      else if (/Windows/.test(ua)) os = 'Windows';
      else if (/Mac OS X/.test(ua)) os = 'macOS';
      else if (/Android/.test(ua)) os = 'Android';
      else if (/iPhone|iPad/.test(ua)) os = 'iOS';
      else if (/Linux/.test(ua)) os = 'Linux';

      let browser = 'Desconocido';
      if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
      else if (/OPR\//.test(ua)) browser = 'Opera';
      else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Google Chrome';
      else if (/Firefox\//.test(ua)) browser = 'Mozilla Firefox';
      else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';

      const ram = navigator.deviceMemory ? `~${navigator.deviceMemory} GB` : 'No disponible';
      const conn = navigator.connection
        ? `${navigator.connection.effectiveType || '?'} · ${navigator.connection.downlink || '?'} Mbps`
        : 'No disponible';

      document.getElementById('sysOS').textContent = os;
      document.getElementById('sysBrowser').textContent = browser;
      document.getElementById('sysScreen').textContent = `${screen.width} × ${screen.height} px (${window.devicePixelRatio}x)`;
      document.getElementById('sysViewport').textContent = `${window.innerWidth} × ${window.innerHeight} px`;
      document.getElementById('sysCores').textContent = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} hilos` : 'No disponible';
      document.getElementById('sysRAM').textContent = ram;
      document.getElementById('sysLang').textContent = navigator.language;
      document.getElementById('sysTZ').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
      document.getElementById('sysConn').textContent = conn;
      document.getElementById('sysTouch').textContent = ('ontouchstart' in window) ? 'Sí' : 'No';

      wrap.hidden = false;
    };

    btn.addEventListener('click', detect);

    btnCopy.addEventListener('click', () => {
      if (wrap.hidden) detect();
      const rows = wrap.querySelectorAll('.tool-output__row');
      let text = 'INFO DEL SISTEMA\n─────────────────\n';
      rows.forEach(r => {
        const label = r.querySelector('span').textContent;
        const val = r.querySelector('code').textContent;
        text += `${label.padEnd(15)} ${val}\n`;
      });
      navigator.clipboard.writeText(text)
        .then(() => Toast.show('Info copiada', 'success', 1500))
        .catch(() => Toast.show('No se pudo copiar', 'error'));
    });
  }
};

// ==========================================
// SOPORTE · COMANDOS POR SISTEMA
// ==========================================
const CmdList = {
  data: [
    // LINUX
    { os: 'linux', cmd: 'ip a',                       desc: 'Ver interfaces de red y sus IPs' },
    { os: 'linux', cmd: 'ip route',                   desc: 'Ver tabla de rutas' },
    { os: 'linux', cmd: 'ping -c 4 host',             desc: 'Ping con 4 paquetes' },
    { os: 'linux', cmd: 'ss -tuln',                   desc: 'Puertos TCP/UDP escuchando' },
    { os: 'linux', cmd: 'netstat -tuln',              desc: 'Alternativa a ss (más antiguo)' },
    { os: 'linux', cmd: 'nslookup dominio.com',       desc: 'Consultar DNS' },
    { os: 'linux', cmd: 'dig dominio.com',            desc: 'Consulta DNS detallada' },
    { os: 'linux', cmd: 'traceroute host',            desc: 'Ruta de paquetes al destino' },
    { os: 'linux', cmd: 'curl -I url',                desc: 'Ver cabeceras HTTP de una URL' },
    { os: 'linux', cmd: 'wget url',                   desc: 'Descargar archivo por HTTP/FTP' },
    { os: 'linux', cmd: 'tcpdump -i eth0',            desc: 'Capturar tráfico en interfaz' },
    { os: 'linux', cmd: 'chmod 755 archivo',          desc: 'Permisos: rwxr-xr-x' },
    { os: 'linux', cmd: 'chown user:group archivo',   desc: 'Cambiar propietario y grupo' },
    { os: 'linux', cmd: 'ps aux | grep proceso',      desc: 'Buscar proceso activo' },
    { os: 'linux', cmd: 'systemctl status servicio',  desc: 'Estado de un servicio systemd' },
    { os: 'linux', cmd: 'df -h',                      desc: 'Uso de disco legible' },
    { os: 'linux', cmd: 'du -sh carpeta',             desc: 'Tamaño de una carpeta' },
    { os: 'linux', cmd: 'top / htop',                 desc: 'Monitor de procesos en vivo' },
    { os: 'linux', cmd: 'uname -a',                   desc: 'Info del kernel' },
    { os: 'linux', cmd: 'whoami',                     desc: 'Usuario actual' },
    { os: 'linux', cmd: 'sudo apt update && upgrade', desc: 'Actualizar paquetes (Debian/Ubuntu)' },
    { os: 'linux', cmd: 'ssh user@host',              desc: 'Conectar por SSH' },

    // WINDOWS
    { os: 'windows', cmd: 'ipconfig /all',              desc: 'Info completa de red' },
    { os: 'windows', cmd: 'ipconfig /flushdns',         desc: 'Limpiar caché DNS' },
    { os: 'windows', cmd: 'ping -t host',               desc: 'Ping continuo (Ctrl+C para parar)' },
    { os: 'windows', cmd: 'tracert host',               desc: 'Ruta de paquetes al destino' },
    { os: 'windows', cmd: 'nslookup dominio.com',       desc: 'Consultar DNS' },
    { os: 'windows', cmd: 'netstat -ano',               desc: 'Puertos y PID de procesos' },
    { os: 'windows', cmd: 'arp -a',                     desc: 'Tabla ARP (IP ↔ MAC)' },
    { os: 'windows', cmd: 'route print',                desc: 'Tabla de rutas' },
    { os: 'windows', cmd: 'netsh wlan show profiles',   desc: 'Redes WiFi guardadas' },
    { os: 'windows', cmd: 'net user',                   desc: 'Usuarios locales' },
    { os: 'windows', cmd: 'net share',                  desc: 'Recursos compartidos' },
    { os: 'windows', cmd: 'systeminfo',                 desc: 'Info completa del sistema' },
    { os: 'windows', cmd: 'tasklist',                   desc: 'Procesos activos' },
    { os: 'windows', cmd: 'taskkill /PID xxxx /F',      desc: 'Matar proceso por PID' },
    { os: 'windows', cmd: 'sfc /scannow',               desc: 'Verificar archivos del sistema' },
    { os: 'windows', cmd: 'chkdsk C: /f',               desc: 'Comprobar disco y reparar' },
    { os: 'windows', cmd: 'Get-NetIPAddress',           desc: 'IPs (PowerShell)' },
    { os: 'windows', cmd: 'Test-NetConnection host',    desc: 'Test de conexión (PowerShell)' },

    // CISCO IOS
    { os: 'cisco', cmd: 'enable',                     desc: 'Entrar a modo privilegiado' },
    { os: 'cisco', cmd: 'configure terminal',         desc: 'Modo configuración global' },
    { os: 'cisco', cmd: 'show running-config',        desc: 'Ver configuración actual' },
    { os: 'cisco', cmd: 'show ip interface brief',    desc: 'Estado de interfaces IP' },
    { os: 'cisco', cmd: 'show ip route',              desc: 'Tabla de enrutamiento' },
    { os: 'cisco', cmd: 'show vlan brief',            desc: 'Lista de VLANs configuradas' },
    { os: 'cisco', cmd: 'show mac address-table',     desc: 'Tabla MAC aprendida' },
    { os: 'cisco', cmd: 'show cdp neighbors',         desc: 'Equipos Cisco conectados' },
    { os: 'cisco', cmd: 'show version',               desc: 'Versión de IOS y hardware' },
    { os: 'cisco', cmd: 'interface Gig0/0',           desc: 'Entrar a configurar interfaz' },
    { os: 'cisco', cmd: 'ip address 192.168.1.1 255.255.255.0', desc: 'Asignar IP a interfaz' },
    { os: 'cisco', cmd: 'no shutdown',                desc: 'Activar interfaz' },
    { os: 'cisco', cmd: 'vlan 10',                    desc: 'Crear VLAN' },
    { os: 'cisco', cmd: 'switchport mode access',     desc: 'Modo access del puerto' },
    { os: 'cisco', cmd: 'switchport access vlan 10',  desc: 'Asignar puerto a VLAN' },
    { os: 'cisco', cmd: 'router ospf 1',              desc: 'Activar OSPF proceso 1' },
    { os: 'cisco', cmd: 'write memory',               desc: 'Guardar configuración' },
    { os: 'cisco', cmd: 'copy running-config startup-config', desc: 'Guardar (versión larga)' }
  ],

  activeOs: 'all',
  searchTerm: '',

  init() {
    const list = document.getElementById('cmdList');
    const searchInput = document.getElementById('cmdSearch');
    const searchClear = document.getElementById('cmdSearchClear');
    const filters = document.querySelectorAll('.ports-filter[data-os]');
    const empty = document.getElementById('cmdEmpty');
    const countEl = document.getElementById('cmdCount');
    const totalEl = document.getElementById('cmdTotal');
    if (!list) return;

    this.list = list;
    this.empty = empty;
    this.countEl = countEl;
    if (totalEl) totalEl.textContent = this.data.length;

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchTerm = searchInput.value.trim().toLowerCase();
        if (searchClear) searchClear.hidden = !this.searchTerm;
        this.render();
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        this.searchTerm = '';
        searchClear.hidden = true;
        searchInput.focus();
        this.render();
      });
    }

    filters.forEach(btn => {
      btn.addEventListener('click', () => {
        filters.forEach(b => b.classList.toggle('active', b === btn));
        this.activeOs = btn.dataset.os;
        this.render();
      });
    });

    // Copiar comando (delegado)
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.cmd-item__copy');
      if (!btn) return;
      const cmd = btn.dataset.cmd;
      navigator.clipboard.writeText(cmd)
        .then(() => {
          btn.classList.add('copied');
          const icon = btn.querySelector('i');
          if (icon) icon.className = 'fa-solid fa-check';
          Toast.show('Copiado: ' + cmd, 'success', 1400);
          setTimeout(() => {
            btn.classList.remove('copied');
            if (icon) icon.className = 'fa-solid fa-copy';
          }, 1200);
        })
        .catch(() => Toast.show('No se pudo copiar', 'error'));
    });

    this.render();
  },

  render() {
    if (!this.list) return;
    const term = this.searchTerm;
    const os = this.activeOs;

    let html = '';
    let visible = 0;

    this.data.forEach(item => {
      if (os !== 'all' && item.os !== os) return;
      if (term) {
        const hay = (item.cmd + ' ' + item.desc + ' ' + item.os).toLowerCase();
        if (!hay.includes(term)) return;
      }
      visible++;
      html += `
        <div class="cmd-item">
          <span class="cmd-item__os" data-os="${item.os}">${item.os.toUpperCase()}</span>
          <div class="cmd-item__body">
            <div class="cmd-item__cmd">${item.cmd}</div>
            <div class="cmd-item__desc">${item.desc}</div>
          </div>
          <button type="button" class="cmd-item__copy" data-cmd="${item.cmd.replace(/"/g, '&quot;')}" aria-label="Copiar"><i class="fa-solid fa-copy"></i></button>
        </div>
      `;
    });

    this.list.innerHTML = html;
    if (this.countEl) this.countEl.textContent = visible;
    if (this.empty) this.empty.hidden = visible > 0;
  }
};

// ==========================================
// SOPORTE · CONVERSOR DE COLORES
// ==========================================
const ColorConverter = {
  init() {
    const hexIn = document.getElementById('colorHex');
    const rgbIn = document.getElementById('colorRgb');
    const hslIn = document.getElementById('colorHsl');
    const preview = document.getElementById('colorPreview');
    const previewHex = document.getElementById('colorPreviewHex');
    if (!hexIn) return;

    const update = (source) => {
      let r, g, b;

      try {
        if (source === 'hex') {
          let hex = hexIn.value.replace('#', '').trim();
          if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
          if (!/^[0-9a-f]{6}$/i.test(hex)) return;
          r = parseInt(hex.slice(0,2), 16);
          g = parseInt(hex.slice(2,4), 16);
          b = parseInt(hex.slice(4,6), 16);
        } else if (source === 'rgb') {
          const parts = rgbIn.value.split(',').map(s => parseInt(s.trim(), 10));
          if (parts.length !== 3 || parts.some(n => isNaN(n) || n < 0 || n > 255)) return;
          [r, g, b] = parts;
        } else if (source === 'hsl') {
          const m = hslIn.value.match(/(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/);
          if (!m) return;
          const [h, s, l] = [parseInt(m[1],10), parseInt(m[2],10)/100, parseInt(m[3],10)/100];
          const rgb = this.hslToRgb(h, s, l);
          [r, g, b] = rgb;
        }
      } catch (e) { return; }

      const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
      const rgbStr = `${r}, ${g}, ${b}`;
      const hsl = this.rgbToHsl(r, g, b);
      const hslStr = `${hsl.h}, ${hsl.s}%, ${hsl.l}%`;

      if (source !== 'hex') hexIn.value = hex;
      if (source !== 'rgb') rgbIn.value = rgbStr;
      if (source !== 'hsl') hslIn.value = hslStr;

      preview.style.background = hex;
      previewHex.textContent = hex.toUpperCase();
      // Color de texto según luminosidad
      const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
      previewHex.style.background = lum > 0.6 ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
      previewHex.style.color = lum > 0.6 ? '#fff' : '#000';
    };

    hexIn.addEventListener('input', () => update('hex'));
    rgbIn.addEventListener('input', () => update('rgb'));
    hslIn.addEventListener('input', () => update('hsl'));

    // Aleatorio
    const rnd = document.getElementById('colorRandom');
    if (rnd) {
      rnd.addEventListener('click', () => {
        const h = Math.floor(Math.random() * 360);
        const s = 50 + Math.floor(Math.random() * 50);
        const l = 40 + Math.floor(Math.random() * 30);
        hslIn.value = `${h}, ${s}%, ${l}%`;
        update('hsl');
      });
    }

    // Copiar HEX
    const copyBtn = document.getElementById('colorCopy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(hexIn.value)
          .then(() => Toast.show('Hex copiado: ' + hexIn.value, 'success', 1500))
          .catch(() => Toast.show('No se pudo copiar', 'error'));
      });
    }

    update('hex');
  },

  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h/360 + 1/3);
      g = hue2rgb(p, q, h/360);
      b = hue2rgb(p, q, h/360 - 1/3);
    }
    return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
  },

  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h = Math.round(h * 60);
    }
    return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
  }
};

// ==========================================
// SOPORTE · CÓDIGOS HTTP
// ==========================================
const HTTPCodes = {
  data: [
    { code: 200, cat: '2xx', name: 'OK',                    desc: 'La petición fue exitosa' },
    { code: 201, cat: '2xx', name: 'Created',               desc: 'Recurso creado correctamente' },
    { code: 204, cat: '2xx', name: 'No Content',            desc: 'OK sin cuerpo de respuesta' },
    { code: 301, cat: '3xx', name: 'Moved Permanently',     desc: 'Redirección permanente a otra URL' },
    { code: 302, cat: '3xx', name: 'Found',                 desc: 'Redirección temporal' },
    { code: 304, cat: '3xx', name: 'Not Modified',          desc: 'Usar caché (no cambió)' },
    { code: 400, cat: '4xx', name: 'Bad Request',           desc: 'Petición mal formada' },
    { code: 401, cat: '4xx', name: 'Unauthorized',          desc: 'Falta autenticación' },
    { code: 403, cat: '4xx', name: 'Forbidden',             desc: 'Sin permisos para el recurso' },
    { code: 404, cat: '4xx', name: 'Not Found',             desc: 'Recurso no encontrado' },
    { code: 405, cat: '4xx', name: 'Method Not Allowed',    desc: 'Método HTTP no permitido' },
    { code: 408, cat: '4xx', name: 'Request Timeout',       desc: 'El cliente tardó demasiado' },
    { code: 429, cat: '4xx', name: 'Too Many Requests',     desc: 'Rate limit excedido' },
    { code: 500, cat: '5xx', name: 'Internal Server Error', desc: 'Error en el servidor' },
    { code: 502, cat: '5xx', name: 'Bad Gateway',           desc: 'Gateway/proxy con respuesta inválida' },
    { code: 503, cat: '5xx', name: 'Service Unavailable',   desc: 'Servidor saturado o en mantenimiento' },
    { code: 504, cat: '5xx', name: 'Gateway Timeout',       desc: 'El upstream no respondió a tiempo' }
  ],

  init() {
    const grid = document.getElementById('httpGrid');
    if (!grid) return;

    grid.innerHTML = this.data.map(c => `
      <div class="http-card" data-cat="${c.cat}">
        <div class="http-card__code">${c.code}</div>
        <div class="http-card__name">${c.name}</div>
        <div class="http-card__desc">${c.desc}</div>
      </div>
    `).join('');
  }
};

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  Boot.init();
  Theme.init(); 
  TypeWriter.init();
  Particles.init();
  Nav.init();
  Reveal.init();
  ScrollTop.init();
  UpdateYear.init();
  AutoScroll.init();
  FAQ.init();
  ContactForm.init();
  CertCounter.init();
  StatsCounter.init();
  ScrollProgress.init();
  CustomCursor.init();
  SubnetCalc.init();
  NumConverter.init();
  Heatmap.init();
  ToolkitFilter.init();
  CopyButtons.init();
  ToolkitClear.init();
  HashGen.init();
  PasswordTool.init();
  BandwidthCalc.init();
  RJ45.init();
  OSIModel.init();
  WiFiChannels.init();
  PortsTable.init();
  BandwidthLatency.init();
  JSONTool.init();
  UUIDTool.init();
  TimestampTool.init();
  Base64Tool.init();
  SysInfo.init();
  CmdList.init();
  ColorConverter.init();
  HTTPCodes.init();
  Sounds.init();
  Notifications.init();
  PWA.init();
  console.log('%cJCDURANCASADO · v8.0', 'color: #00f0ff; font-family: Orbitron; font-size: 18px;');
  console.log('%c"No hablo en técnico cuando explico. La tecnología debe servir a las personas, no al revés."', 'color: #b829dd; font-style: italic;');
});
