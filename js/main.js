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

    // Cargar tema guardado o preferencia del sistema
    const saved = localStorage.getItem('jcdc_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'dark'); // default dark
    html.setAttribute('data-theme', theme);

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

    if (CONFIG.reducedMotion) {
      screen.classList.add('booted');
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
    if (CONFIG.reducedMotion || !CONFIG.hasHover) return;
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
    const count = window.innerWidth < 768 ? 22 : 45;
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

      for (let j = i + 1; j < this.particles.length; j++) {
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
            l.classList.toggle('nav__link--active', l.getAttribute('href') === `#${id}`);
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
// CURSOS RECOMENDADOS
// ==========================================
const CursosRecomendados = {
  init() {
    const banner = document.querySelector('.cursos-banner');
    if (!banner) return;

    if ('IntersectionObserver' in window && !CONFIG.reducedMotion) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !banner.dataset.seen) {
            banner.dataset.seen = '1';
            Toast.show('🎓 Cursos gratis te esperan abajo', 'info', 4000);
            observer.disconnect();
          }
        });
      }, { threshold: 0.4 });
      observer.observe(banner);
    }

    document.querySelectorAll('.cursos-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('href');
        if (!targetId || !targetId.startsWith('#')) return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        const header = document.querySelector('[data-header]');
        const offset = header ? header.offsetHeight : 70;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset - 20;
        window.scrollTo({ top, behavior: 'smooth' });
        history.pushState(null, '', targetId);
        target.style.transition = 'box-shadow 0.5s ease';
        target.style.boxShadow = '0 0 0 2px var(--neon-cyan), 0 0 40px rgba(0,240,255,0.5)';
        setTimeout(() => { target.style.boxShadow = ''; }, 1600);
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

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactiveSelector)) {
        document.body.classList.add('cursor-hover');
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactiveSelector)) {
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

  sendWelcome() {
    if (!this.enabled || Notification.permission !== 'granted') return;
    const notif = new Notification('¡Bienvenido a JCDurán!', {
      body: 'Recibirás avisos de nuevos cursos, tutoriales y proyectos.',
      icon: '/img/icons/icon-192.png',
      tag: 'welcome',
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  },

  // API pública
  push(title, body, url) {
    if (!this.enabled || Notification.permission !== 'granted') return;
    const notif = new Notification(title, {
      body: body,
      icon: '/img/icons/icon-192.png',
      tag: 'custom-' + Date.now(),
    });
    notif.onclick = () => {
      window.focus();
      if (url) window.location.href = url;
      notif.close();
    };
  }
};

// ==========================================
// TOOLKIT · FILTRO POR CATEGORÍA
// ==========================================
const ToolkitFilter = {
  init() {
    const buttons = document.querySelectorAll('.toolkit-filter');
    const cards = document.querySelectorAll('.tool-card[data-category]');
    if (!buttons.length) return;

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
      // Aparece con el mismo delay que los flotantes
      setTimeout(() => btn.classList.add('visible'), 400);
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
  CursosRecomendados.init();
  SubnetCalc.init();
  NumConverter.init();
  Heatmap.init();
  ToolkitFilter.init();
  CopyButtons.init();
  ToolkitClear.init();
  Sounds.init();
  Notifications.init();
  PWA.init();
  console.log('%cJCDURANCASADO · v8.0', 'color: #00f0ff; font-family: Orbitron; font-size: 18px;');
  console.log('%c"No hablo en técnico cuando explico. La tecnología debe servir a las personas, no al revés."', 'color: #b829dd; font-style: italic;');
});

// ==========================================
// FIX OVERFLOW
// ==========================================
document.body.style.overflowX = 'hidden';

