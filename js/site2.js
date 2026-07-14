(() => {
  'use strict';

  // ====== Интеграция с CRM ===========================================
  // Режимы (CRM.mode): 'json' | 'bitrix' | 'telegram'
  //   json     — JSON на вебхук (Make / n8n / Zapier / свой API)
  //   bitrix   — прямая запись лида в Bitrix24 (crm.lead.add)
  //   telegram — сообщение в Telegram через ваш бэкенд-прокси
  // Если endpoint не задан — форма работает в демо-режиме (локальный успех).
  const CRM = {
    mode: 'bitrix',
    // Прямая запись лида в Bitrix24 через вебхук (crm.lead.add)
    endpoint: 'https://b24-fbicjs.bitrix24.ru/rest/1/71l4iqta2fi6xkzp/crm.lead.add.json',
    source: 'reshenie-kommunikatsii-site',
    title: 'Заявка с сайта Решение и Коммуникации',
    // Кастомное поле для специальности. Создайте в Б24
    // (Настройки → CRM → Лид → Пользовательские поля) и впишите код,
    // напр. 'UF_CRM_123456'. Пока пусто — специальность дублируется в COMMENTS.
    bitrix: { ufSpecialty: '' },
    telegram: { proxy: '', chatId: '' }
  };

  const SPEC_LABELS = {
    chargeback: 'Возврат навязанных банковских услуг',
    bankruptcy: 'Банкротство физических и юридических лиц',
    debt: 'Взыскание задолженности',
    labor: 'Трудовые споры',
    family: 'Семейные споры',
    'legal-support': 'Юридическое сопровождение компаний',
    accounting: 'Бухгалтерское сопровождение компаний'
  };

  const getUtm = () => {
    const p = new URLSearchParams(location.search);
    const out = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']
      .forEach(k => { if (p.has(k)) out[k] = p.get(k); });
    return out;
  };

  const normalizePhone = (v) => {
    let d = (v || '').replace(/\D/g, '');
    if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
    if (d.length === 10) d = '7' + d;
    if (d && d[0] !== '7') d = '7' + d;
    return d ? '+' + d : '';
  };

  const splitName = (full) => {
    const parts = (full || '').trim().split(/\s+/).filter(Boolean);
    return { first: parts[0] || '', last: parts.slice(1).join(' ') };
  };

  const buildLead = (form) => {
    const data = Object.fromEntries(new FormData(form).entries());
    return {
      name: (data.name || '').trim(),
      phone: (data.phone || '').trim(),
      email: (data.email || '').trim(),
      city: (data.city || '').trim(),
      specialty: data.specialty || '',
      specialtyLabel: SPEC_LABELS[data.specialty] || data.specialty || '—',
      consent: data.consent === 'on' || data.consent === true,
      source: CRM.source,
      page: location.href,
      sentAt: new Date().toISOString(),
      utm: getUtm()
    };
  };

  const toBitrix = (lead) => {
    const { first, last } = splitName(lead.name);
    const phone = normalizePhone(lead.phone);
    const utm = lead.utm || {};
    const comments = [
      'Специальность: ' + lead.specialtyLabel,
      'Город: ' + lead.city,
      'Источник: ' + lead.source,
      'Страница: ' + lead.page,
      'UTM: ' + Object.keys(utm).map(k => k + '=' + utm[k]).join(', ')
    ].join('\n');

    const fields = {
      TITLE: CRM.title + ': ' + (lead.name || '—') + ', ' + lead.specialtyLabel,
      NAME: first,
      LAST_NAME: last,
      PHONE: phone ? [{ VALUE: phone, VALUE_TYPE: 'WORK' }] : [],
      COMMENTS: comments
    };

    if (lead.email) fields.EMAIL = [{ VALUE: lead.email, VALUE_TYPE: 'WORK' }];
    if (lead.city) fields.ADDRESS_CITY = lead.city;
    if (CRM.bitrix.ufSpecialty) fields[CRM.bitrix.ufSpecialty] = lead.specialtyLabel;
    if (utm.utm_source)   fields.UTM_SOURCE   = utm.utm_source;
    if (utm.utm_medium)   fields.UTM_MEDIUM   = utm.utm_medium;
    if (utm.utm_campaign) fields.UTM_CAMPAIGN = utm.utm_campaign;
    if (utm.utm_term)     fields.UTM_TERM     = utm.utm_term;
    if (utm.utm_content)  fields.UTM_CONTENT  = utm.utm_content;

    return { fields };
  };

  const submitToCRM = async (lead) => {
    if (CRM.mode === 'bitrix' && CRM.endpoint) {
      const res = await fetch(CRM.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBitrix(lead))
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || (body && body.error)) {
        throw new Error('bitrix ' + res.status + (body && body.error ? ' ' + body.error : ''));
      }
      return res;
    }
    if (CRM.mode === 'telegram' && CRM.telegram.proxy) {
      const text =
        '🔔 ' + CRM.title + '\n👤 ' + lead.name +
        '\n📞 ' + lead.phone + '\n🏙 ' + lead.city +
        '\n💼 ' + lead.specialtyLabel + '\n🔗 ' + lead.page;
      const res = await fetch(CRM.telegram.proxy, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CRM.telegram.chatId, text })
      });
      if (!res.ok) throw new Error('telegram ' + res.status);
      return res;
    }
    const res = await fetch(CRM.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(lead)
    });
    if (!res.ok) throw new Error('crm ' + res.status);
    return res;
  };

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

  const initFaq = () => {
    $$('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const answer = item.querySelector('.faq-answer');
        const open = item.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
        if (answer) answer.style.maxHeight = open ? answer.scrollHeight + 'px' : '0px';
      });
    });
    $$('.faq .faq-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.faq .faq-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const id = tab.dataset.tab;
        $$('.faq .faq-panel').forEach(p => p.classList.toggle('active', p.id === id));
      });
    });
  };

  const initProcessTabs = () => {
    const tabs = $$('#process .faq-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const id = tab.dataset.panel;
        $$('#process .faq-panel').forEach(p => p.classList.toggle('active', p.id === id));
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
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('animate-in'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08 });
    $$('.section-title, .payment-card, .benefit-card, .vacancy-card, .requirement-card, .faq-item, .contact-card, .review-card').forEach(el => observer.observe(el));
  };

  const initHeaderScroll = () => {
    const header = $('#header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
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
    if (localStorage.getItem('cookiesAccepted')) { banner.style.display = 'none'; return; }
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
    const closeModal = () => { modal.classList.remove('active'); document.body.style.overflow = ''; };
    $('#headerApplyBtn')?.addEventListener('click', openModal);
    $('#heroApplyBtn')?.addEventListener('click', openModal);
    $$('.apply-trigger').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); openModal(); }));
    $('#modalClose')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  };

  const initForm = () => {
    const form = $('#modalForm');
    if (!form) return;
    const success = $('#modalSuccess');
    const errorEl = $('#formError');
    const submitBtn = $('#fSubmit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const lead = buildLead(form);
      const configured =
        (CRM.mode === 'json' && CRM.endpoint) ||
        (CRM.mode === 'bitrix' && CRM.endpoint) ||
        (CRM.mode === 'telegram' && CRM.telegram.proxy);

      // Демо-режим (CRM не настроена): локальный успех.
      if (!configured) {
        form.style.display = 'none';
        if (success) success.style.display = 'block';
        return;
      }

      const original = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Отправка…'; }
      errorEl && (errorEl.hidden = true);
      try {
        await submitToCRM(lead);
        form.style.display = 'none';
        if (success) success.style.display = 'block';
      } catch (err) {
        console.error('CRM submit failed:', err);
        if (errorEl) errorEl.hidden = false;
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = original; }
      }
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
  };

  document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initFaq();
    initProcessTabs();
    initVacancyFilter();
    initScrollAnimations();
    initHeaderScroll();
    initCarousel();
    initCookieBanner();
    initModal();
    initForm();
    initGsapAnimations();
  });
})();
