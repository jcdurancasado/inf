/**
 * JCDURANCASADO SYSTEMS v5.0 - OPTIMIZADO
 * "La tecnología debe servir a las personas, no al revés."
 */

'use strict';

// ==========================================
// CONFIGURACIÓN
// ==========================================
const CONFIG = {
  bootDuration: 2500,
  typingSpeed: 40,
  animations: {
    enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    particles: window.matchMedia('(hover: hover)').matches && 
               !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
};

// ==========================================
// TOAST NOTIFICATIONS
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
  
  show(message, type = 'info', duration = 3000) {
    if (!this.container) this.init();
    
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.info}"></i>
      <span>${message}</span>
    `;
    
    this.container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// ==========================================
// BOOT SEQUENCE
// ==========================================
const BootSequence = {
  lines: [
    'Inicializando kernel JCDURANCASADO v5.0...',
    'Cargando módulos de red... [CCNA][CCNP][CyberOps]',
    'Verificando credenciales... [OK]',
    'Conectando a Cisco Networking Academy... [ESTABLECIDO]',
    'Cargando perfil de instructor... [500+ ESTUDIANTES]',
    'Sincronizando certificaciones... [15 ENCONTRADAS]',
    'Iniciando interfaz holográfica...'
  ],
  
  init() {
    const bootScreen = document.getElementById('boot-sequence');
    const bootLines = document.getElementById('boot-lines');
    const bootBar = document.getElementById('boot-bar');
    const bootStatus = document.getElementById('boot-status');
    
    if (!bootScreen || !CONFIG.animations.enabled) {
      bootScreen?.classList.add('booted');
      return;
    }

    let lineIndex = 0;
    const lineDelay = CONFIG.bootDuration / this.lines.length;

    const addLine = () => {
      if (lineIndex < this.lines.length) {
        const line = document.createElement('div');
        line.className = 'boot-line';
        line.textContent = `[${new Date().toLocaleTimeString()}] ${this.lines[lineIndex]}`;
        line.style.animationDelay = '0s';
        bootLines.appendChild(line);
        
        const progress = ((lineIndex + 1) / this.lines.length) * 100;
        bootBar.style.width = `${progress}%`;
        bootStatus.textContent = `Cargando... ${Math.round(progress)}%`;
        
        lineIndex++;
        setTimeout(addLine, lineDelay);
      } else {
        bootStatus.textContent = 'SISTEMA LISTO';
        setTimeout(() => {
          bootScreen.classList.add('booted');
          Toast.show('Bienvenido al sistema JCDURANCASADO', 'success');
        }, 500);
      }
    };

    setTimeout(addLine, 500);
  }
};

// ==========================================
// CUSTOM CURSOR
// ==========================================
const CustomCursor = {
  cursor: null,
  trail: null,
  mouseX: 0,
  mouseY: 0,
  trailX: 0,
  trailY: 0,

  init() {
    if (!CONFIG.animations.enabled || window.matchMedia('(pointer: coarse)').matches) {
      document.querySelector('.cursor')?.remove();
      document.querySelector('.cursor-trail')?.remove();
      return;
    }

    this.cursor = document.querySelector('.cursor');
    this.trail = document.querySelector('.cursor-trail');
    
    if (!this.cursor || !this.trail) return;

    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.cursor.style.left = `${this.mouseX}px`;
      this.cursor.style.top = `${this.mouseY}px`;
    });

    this.animate();
    this.setupHoverEffects();
  },

  animate() {
    this.trailX += (this.mouseX - this.trailX) * 0.15;
    this.trailY += (this.mouseY - this.trailY) * 0.15;
    this.trail.style.left = `${this.trailX}px`;
    this.trail.style.top = `${this.trailY}px`;
    requestAnimationFrame(() => this.animate());
  },

  setupHoverEffects() {
    const interactives = document.querySelectorAll('a, button, input, textarea, select, [data-cart-toggle]');
    
    interactives.forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
        this.cursor.style.borderColor = 'var(--neon-pink)';
        this.trail.style.background = 'var(--neon-pink)';
      });
      
      el.addEventListener('mouseleave', () => {
        this.cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        this.cursor.style.borderColor = 'var(--neon-cyan)';
        this.trail.style.background = 'var(--neon-cyan)';
      });
    });
  }
};

// ==========================================
// TYPING EFFECT
// ==========================================
const TypeWriter = {
  init() {
    const elements = document.querySelectorAll('.typing-text');
    
    elements.forEach(el => {
      const text = el.dataset.text;
      if (!text) return;
      
      let i = 0;
      el.textContent = '';
      
      const type = () => {
        if (i < text.length) {
          el.textContent += text.charAt(i);
          i++;
          setTimeout(type, CONFIG.typingSpeed + Math.random() * 30);
        }
      };
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setTimeout(type, 500);
            observer.unobserve(entry.target);
          }
        });
      });
      
      observer.observe(el);
    });
  }
};

// ==========================================
// PARTICLES SYSTEM
// ==========================================
const Particles = {
  canvas: null,
  ctx: null,
  particles: [],
  animationId: null,
  isVisible: false,

  init() {
    if (!CONFIG.animations.particles) return;
    
    this.canvas = document.getElementById('particles');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.createParticles();
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.isVisible = true;
          this.animate();
        } else {
          this.isVisible = false;
          cancelAnimationFrame(this.animationId);
        }
      });
    });
    
    observer.observe(this.canvas);
    
    window.addEventListener('resize', () => this.resize(), { passive: true });
  },

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  createParticles() {
    const count = window.innerWidth < 768 ? 25 : 50;
    
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.5 ? '0, 240, 255' : '184, 41, 221'
      });
    }
  },

  animate() {
    if (!this.isVisible) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach((p, i) => {
      p.x += p.speedX;
      p.y += p.speedY;
      
      if (p.x > this.canvas.width) p.x = 0;
      if (p.x < 0) p.x = this.canvas.width;
      if (p.y > this.canvas.height) p.y = 0;
      if (p.y < 0) p.y = this.canvas.height;
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
      this.ctx.fill();
      
      // Conectar partículas cercanas
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 100) {
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(${p.color}, ${0.1 * (1 - dist / 100)})`;
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
const Navigation = {
  header: null,
  nav: null,
  toggle: null,
  lastScroll: 0,

  init() {
    this.header = document.querySelector('[data-header]');
    this.nav = document.querySelector('[data-nav]');
    this.toggle = document.querySelector('[data-nav-toggle]');
    
    if (this.header) this.setupScroll();
    if (this.toggle && this.nav) this.setupMobile();
    this.setupSmoothScroll();
    this.setupActiveLinks();
  },

    setupScroll() {
    window.addEventListener('scroll', () => {
      const current = window.pageYOffset;
      
      this.header.classList.toggle('header--scrolled', current > 50);
      
      this.header.style.transform = 'translateY(0)';
      
      this.lastScroll = current;
    }, { passive: true });
  },

  setupMobile() {
    this.toggle.addEventListener('click', () => {
      const expanded = this.toggle.getAttribute('aria-expanded') === 'true';
      this.toggle.setAttribute('aria-expanded', !expanded);
      this.nav.classList.toggle('active');
      document.body.style.overflow = expanded ? '' : 'hidden';
    });
  },

  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = anchor.getAttribute('href');
        const target = document.querySelector(targetId);
        if (!target) return;
        
        const offset = this.header ? this.header.offsetHeight : 70;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        
        window.scrollTo({ top, behavior: 'smooth' });
        history.pushState(null, null, targetId);
        
        // Cerrar menú móvil
        if (this.nav?.classList.contains('active')) {
          this.toggle.click();
        }
      });
    });
  },

  setupActiveLinks() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('[data-nav-link]');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.classList.remove('nav__link--active');
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('nav__link--active');
            }
          });
        }
      });
    }, { threshold: 0.3 });
    
    sections.forEach(section => observer.observe(section));
  }
};

// ==========================================
// REVEAL ON SCROLL
// ==========================================
const Reveal = {
  init() {
    const elements = document.querySelectorAll('[data-reveal]');
    
    if (!CONFIG.animations.enabled) {
      elements.forEach(el => el.classList.add('revealed'));
      return;
    }
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = parseFloat(entry.target.dataset.revealDelay) || 0;
          setTimeout(() => entry.target.classList.add('revealed'), delay * 1000);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    elements.forEach(el => observer.observe(el));
  }
};

// ==========================================
// ANIMATED COUNTERS
// ==========================================
const Counters = {
  init() {
    const counters = document.querySelectorAll('[data-count]');
    
    if (!CONFIG.animations.enabled) {
      counters.forEach(c => c.textContent = c.dataset.count);
      return;
    }
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    
    counters.forEach(c => observer.observe(c));
  },

  animate(element) {
    const target = parseInt(element.dataset.count);
    const duration = 2000;
    const start = performance.now();
    
    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      element.textContent = Math.floor(easeOut * target);
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = target;
      }
    };
    
    requestAnimationFrame(update);
  }
};

// ==========================================
// SKILL BARS - CORREGIDO
// ==========================================
const SkillBars = {
  init() {
    const bars = document.querySelectorAll('.skill-card__fill');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const width = entry.target.dataset.width;
          if (width) {
            entry.target.style.setProperty('--target-width', `${width}%`);
            entry.target.classList.add('filled');
            // Forzar el ancho directamente para asegurar que se vea
            setTimeout(() => {
              entry.target.style.width = `${width}%`;
            }, 100);
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    
    bars.forEach(bar => observer.observe(bar));
  }
};

// ==========================================
// TIMELINE PROGRESS
// ==========================================
const Timeline = {
  init() {
    const track = document.querySelector('.timeline__progress');
    if (!track) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          track.style.height = '100%';
        }
      });
    });
    
    observer.observe(track.closest('.cyber-timeline'));
    
    // Animar items
    const items = document.querySelectorAll('[data-timeline-item]');
    const itemObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.2 });
    
    items.forEach(item => itemObserver.observe(item));
  }
};

// ==========================================
// THEME TOGGLE
// ==========================================
const Theme = {
  init() {
    const toggle = document.querySelector('[data-theme-toggle]');
    const html = document.documentElement;
    
    const saved = localStorage.getItem('jcdc_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'dark');
    
    html.setAttribute('data-theme', theme);
    
    toggle?.addEventListener('click', () => {
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('jcdc_theme', next);
      Toast.show(`Tema ${next.toUpperCase()} activado`, 'info');
    });
  }
};

// ==========================================
// CART SYSTEM - CORREGIDO
// ==========================================
const Cart = {
  data: [],
  services: {
    'networking': { name: 'Diseño e Implementación de Red', price: 800, icon: 'fa-network-wired' },
    'training': { name: 'Capacitación Tecnológica', price: 150, icon: 'fa-graduation-cap', rate: 'USD/H' },
    'support': { name: 'Soporte Técnico Especializado', price: 50, icon: 'fa-screwdriver-wrench', rate: 'USD/H' }
  },

  init() {
    this.load();
    this.setupListeners();
    this.updateUI();
  },

  load() {
    const saved = localStorage.getItem('jcdc_cart');
    if (saved) this.data = JSON.parse(saved);
  },

  save() {
    localStorage.setItem('jcdc_cart', JSON.stringify(this.data));
  },

  setupListeners() {
    // Toggle sidebar
    document.querySelector('[data-cart-toggle]')?.addEventListener('click', () => this.open());
    document.querySelector('[data-cart-close]')?.addEventListener('click', () => this.close());
    document.querySelector('[data-cart-overlay]')?.addEventListener('click', () => this.close());
    
    // Agregar botones
    document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const service = btn.closest('[data-service]')?.dataset.service;
        if (service) this.add(service);
      });
    });
    
    // Checkout
    document.querySelector('[data-checkout]')?.addEventListener('click', () => {
      if (this.data.length === 0) {
        Toast.show('Carrito vacío. Selecciona servicios primero.', 'error');
        return;
      }
      Modal.open(this.data);
    });
    
    // Tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  },

  add(serviceId) {
    if (this.data.find(item => item.id === serviceId)) {
      Toast.show('Servicio ya en el carrito', 'info');
      return;
    }
    
    const service = this.services[serviceId];
    if (!service) return;
    
    this.data.push({ id: serviceId, ...service });
    this.save();
    this.updateUI();
    Toast.show('Servicio agregado al carrito', 'success');
    
    // Abrir sidebar automáticamente al agregar primer item
    if (this.data.length === 1) {
      this.open();
    }
  },

  remove(index) {
    this.data.splice(index, 1);
    this.save();
    this.updateUI();
    Toast.show('Servicio eliminado', 'info');
  },

  updateUI() {
    const count = document.querySelector('[data-cart-count]');
    const items = document.querySelector('[data-cart-items]');
    const total = document.querySelector('[data-cart-total]');
    
    if (count) count.textContent = this.data.length;
    
    if (items) {
      if (this.data.length === 0) {
        items.innerHTML = `
          <div class="sidebar-empty">
            <div class="empty-icon"><i class="fa-solid fa-cart-shopping"></i></div>
            <p>Carrito vacío.<br>Selecciona servicios para comenzar.</p>
          </div>
        `;
      } else {
        items.innerHTML = this.data.map((item, i) => `
          <div class="cart-item">
            <div class="cart-item__icon"><i class="fa-solid ${item.icon}"></i></div>
            <div class="cart-item__details">
              <h4>${item.name}</h4>
              <p>$${item.price} ${item.rate || 'USD'}</p>
            </div>
            <button class="cart-item__remove" onclick="Cart.remove(${i})" aria-label="Eliminar">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
        `).join('');
      }
    }
    
    if (total) {
      // Solo sumar servicios fijos, no por hora
      const fixedServices = this.data.filter(item => !item.rate);
      const sum = fixedServices.reduce((a, b) => a + b.price, 0);
      total.textContent = `$${sum.toLocaleString()} USD`;
    }
  },

  open() {
    document.querySelector('[data-cart]')?.classList.add('active');
    document.querySelector('[data-cart-overlay]')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  close() {
    document.querySelector('[data-cart]')?.classList.remove('active');
    document.querySelector('[data-cart-overlay]')?.classList.remove('active');
    document.body.style.overflow = '';
  },

  clear() {
    this.data = [];
    this.save();
    this.updateUI();
  }
};

// Hacer disponible globalmente
window.Cart = Cart;

// ==========================================
// MODAL
// ==========================================
const Modal = {
  modal: null,
  
  init() {
    this.modal = document.getElementById('quote-modal');
    
    this.modal?.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', () => this.close());
    });
    
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
    
    document.getElementById('quote-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });
    
    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.getAttribute('aria-hidden') === 'false') {
        this.close();
      }
    });
  },

  open(items) {
    if (!this.modal) return;
    
    // Generar resumen
    const summary = this.modal.querySelector('[data-quote-summary]');
    if (summary) {
      const total = items.reduce((a, b) => a + b.price, 0);
      summary.innerHTML = `
        <div class="quote-summary">
          <h4 class="quote-summary__title">SERVICIOS SELECCIONADOS:</h4>
          <ul class="quote-summary__list">
            ${items.map(item => `
              <li><span>${item.name}</span><span>$${item.price} ${item.rate || 'USD'}</span></li>
            `).join('')}
          </ul>
          <div class="quote-summary__total">
            <span>TOTAL ESTIMADO:</span>
            <span>$${total.toLocaleString()} USD</span>
          </div>
        </div>
      `;
    }
    
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  },

  close() {
    if (!this.modal) return;
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  },

  submit() {
    const form = document.getElementById('quote-form');
    const formData = new FormData(form);
    
    // Simular envío
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ENVIANDO...`;
    
    setTimeout(() => {
      Toast.show('Solicitud enviada correctamente. Te contactaré pronto.', 'success');
      this.close();
      Cart.clear();
      form.reset();
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }, 1500);
  }
};

// ==========================================
// CONTACT FORM - CONECTADO A VERCEL
// ==========================================
const ContactForm = {
  init() {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ENVIANDO...`;
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      try {
        const res = await fetch('https://api-contacto-jcdc.vercel.app/api/contacto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok) {
          Toast.show(result.message || 'Mensaje enviado. Te responderé en 24-48h.', 'success');
          form.reset();
        } else {
          throw new Error(result.message || 'Error al enviar mensaje');
        }
      } catch (error) {
        Toast.show(error.message || 'Error de conexión. Intenta más tarde.', 'error');
        console.error('Error:', error);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
};

// ==========================================
// UPDATE YEAR
// ==========================================
const UpdateYear = {
  init() {
    const yearElements = document.querySelectorAll('[data-year]');
    const currentYear = new Date().getFullYear();
    yearElements.forEach(el => el.textContent = currentYear);
  }
};

// ==========================================
// FIX OVERFLOW
// ==========================================
const FixOverflow = {
  init() {
    // Asegurar que no haya desbordamiento horizontal
    document.body.style.overflowX = 'hidden';
    
    // Corregir elementos que puedan causar scroll horizontal
    const checkOverflow = () => {
      const docWidth = document.documentElement.clientWidth;
      const bodyWidth = document.body.scrollWidth;
      
      if (bodyWidth > docWidth) {
        console.warn('Overflow detectado, corrigiendo...');
        document.querySelectorAll('*').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.right > docWidth) {
            el.style.maxWidth = '100%';
          }
        });
      }
    };
    
    window.addEventListener('resize', checkOverflow, { passive: true });
    checkOverflow();
  }
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  BootSequence.init();
  CustomCursor.init();
  TypeWriter.init();
  Particles.init();
  Navigation.init();
  Reveal.init();
  Counters.init();
  SkillBars.init();
  Timeline.init();
  Theme.init();
  Cart.init();
  Modal.init();
  ContactForm.init();
  UpdateYear.init();
  FixOverflow.init();
  ScrollTop.init();
  
  console.log('%cJCDURANCASADO SYSTEMS v5.0', 'color: #00f0ff; font-family: Orbitron; font-size: 20px;');
  console.log('%c"La tecnología debe servir a las personas, no al revés."', 'color: #b829dd; font-style: italic;');
});

// ==========================================
// SCROLL TO TOP BUTTON
// ==========================================
const ScrollTop = {
  init() {
    const btn = document.getElementById('scrollTop');
    if (!btn) return;
    
    // Mostrar/ocultar según scroll
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 500) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }, { passive: true });
    
    // Click para subir
    btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
};
