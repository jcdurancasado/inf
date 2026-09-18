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
    if (!btn) return;

    const toggleAll = (show) => {
      btn.classList.toggle('visible', show);
      if (payBtn) payBtn.classList.toggle('visible', show);
      if (themeBtn) themeBtn.classList.toggle('visible', show);
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
  console.log('%cJCDURANCASADO · v8.0', 'color: #00f0ff; font-family: Orbitron; font-size: 18px;');
  console.log('%c"No hablo en técnico cuando explico. La tecnología debe servir a las personas, no al revés."', 'color: #b829dd; font-style: italic;');
});

// ==========================================
// FIX OVERFLOW
// ==========================================
document.body.style.overflowX = 'hidden';

