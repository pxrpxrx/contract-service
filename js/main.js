(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const initMobileMenu = () => {
    const toggle = $('#mobileToggle');
    const nav = $('#nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('.nav-link').forEach(link => link.addEventListener('click', () => nav.classList.remove('open')));
  };

  const initHeroForm = () => {
    const form = $('#heroForm');
    if (!form) return;
    const success = $('#formSuccess');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        $$(form).forEach(el => el.reportValidity && el.reportValidity());
        return;
      }
      form.style.display = 'none';
      if (success) success.style.display = 'block';
    });
  };

  const initFaq = () => {
    $$('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const open = item.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  };

  const initVacancyFilter = () => {
    const btns = $$('.filter-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        $$('.vacancy-card').forEach(card => {
          const match = filter === 'all' || card.dataset.category === filter;
          card.style.display = match ? '' : 'none';
        });
      });
    });
  };

  const initScrollAnimations = () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    $$('.section-title, .payment-card, .benefit-card, .vacancy-card, .requirement-card, .document-item, .faq-item, .contact-card, .stage-card, .restriction-card, .quick-link').forEach(el => observer.observe(el));
  };

  const initHeaderScroll = () => {
    const header = $('#header');
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  };

  const initCarousel = () => {
    const carousel = $('#vacanciesCarousel');
    const prev = $('#carouselPrev');
    const next = $('#carouselNext');
    if (!carousel || !prev || !next) return;
    const scrollAmount = () => carousel.clientWidth * 0.75;
    prev.addEventListener('click', () => carousel.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
    next.addEventListener('click', () => carousel.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));
  };

  const initCookieBanner = () => {
    const banner = $('#cookieBanner');
    if (!banner) return;
    if (localStorage.getItem('cookiesAccepted')) {
      banner.style.display = 'none';
      return;
    }
    setTimeout(() => banner.classList.add('visible'), 1200);
    $('#cookieAccept')?.addEventListener('click', () => {
      localStorage.setItem('cookiesAccepted', 'true');
      banner.classList.remove('visible');
      setTimeout(() => { banner.style.display = 'none'; }, 300);
    });
  };

  const initModal = () => {
    const modal = $('#applyModal');
    if (!modal) return;
    const openModal = () => {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(modal.querySelector('.modal'), { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'backOut(1.4)' });
      }
    };
    const closeModal = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    };
    $('#headerApplyBtn')?.addEventListener('click', openModal);
    $('#heroApplyBtn')?.addEventListener('click', openModal);
    $$('.apply-trigger').forEach(btn => btn.addEventListener('click', openModal));
    $('#modalClose')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    const form = $('#modalForm');
    const success = $('#modalSuccess');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        $$(form).forEach(el => el.reportValidity && el.reportValidity());
        return;
      }
      form.style.display = 'none';
      if (success) success.style.display = 'block';
    });
  };

  const initGsapAnimations = () => {
    if (typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    heroTl
      .from('.hero-badges', { opacity: 0, y: 20, duration: 0.6 })
      .from('.hero-title', { opacity: 0, y: 30, duration: 0.7 }, '-=0.35')
      .from('.hero-subtitle', { opacity: 0, y: 20, duration: 0.6 }, '-=0.4')
      .from('.hero-stats', { opacity: 0, y: 20, duration: 0.6 }, '-=0.35')
      .from('#heroApplyBtn', { opacity: 0, y: 20, duration: 0.6 }, '-=0.3')
      .from('.hero-note', { opacity: 0, y: 10, duration: 0.5 }, '-=0.2');

    const cards = $$('.payment-card-large, .benefit-card, .vacancy-card, .requirement-card, .stage-card, .restriction-card');
    if (cards.length) {
      gsap.from(cards, {
        scrollTrigger: { trigger: cards[0].closest('.section') || cards[0], start: 'top 85%' },
        opacity: 0, y: 30, duration: 0.7, stagger: 0.08, ease: 'power2.out'
      });
    }

    const salaryRows = $$('.salary-row');
    if (salaryRows.length) {
      gsap.from(salaryRows, {
        scrollTrigger: { trigger: salaryRows[0].closest('.salary-table-wrapper'), start: 'top 85%' },
        opacity: 0, x: -20, duration: 0.5, stagger: 0.06, ease: 'power2.out'
      });
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initFaq();
    initVacancyFilter();
    initScrollAnimations();
    initHeaderScroll();
    initCarousel();
    initModal();
    initCookieBanner();
    initGsapAnimations();
  });
})();
