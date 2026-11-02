const LEAD_ENDPOINT = 'https://lead-relay.leestygpt.workers.dev/lead/HBLNN37XQL';

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const motion = root.classList.contains('js');
  const fine = matchMedia('(pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ===== phone mask =====
  $$('input[type="tel"]').forEach(input => {
    input.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (!v.startsWith('7')) v = '7' + v;
      v = v.slice(0, 11);
      let out = '+7';
      if (v.length > 1) out += ' (' + v.slice(1, 4);
      if (v.length >= 4) out += ') ' + v.slice(4, 7);
      if (v.length >= 7) out += '-' + v.slice(7, 9);
      if (v.length >= 9) out += '-' + v.slice(9, 11);
      e.target.value = out;
    });
  });

  // ===== LIVE THING: «Сам справлюсь?» =====
  const tasks = $$('#tasks input');
  const taskText = i => $('.task__t', tasks[i].closest('li')).textContent.trim();
  const resN = $('#resN'), resT = $('#resT'), resS = $('#resS'), resBtn = $('#resBtn'), formCheck = $('#formCheck');
  const WORDS = ['Все девять шагов', 'Один шаг', 'Два шага', 'Три шага', 'Четыре шага', 'Пять шагов', 'Шесть шагов', 'Семь шагов', 'Восемь шагов', 'Все девять шагов'];
  let checkSummary = '';
  let shown = 9;
  const renderCheck = touched => {
    const left = tasks.map((t, i) => (t.checked ? null : i)).filter(v => v !== null);
    const r = left.length;
    if (window.gsap && motion && shown !== r) {
      const o = { v: shown };
      gsap.to(o, { v: r, duration: .7, ease: 'power3.out', overwrite: true, onUpdate: () => { resN.textContent = Math.round(o.v); } });
    } else resN.textContent = r;
    shown = r;
    if (r === 0) {
      resT.textContent = 'Вы справитесь сами. Если захотите сэкономить время, я рядом.';
      resBtn.firstElementChild.textContent = 'Всё равно записаться';
    } else if (r === 9) {
      resT.textContent = 'Все девять шагов можно передать мне.';
      resBtn.firstElementChild.textContent = 'Передать эти шаги Илье';
    } else {
      resT.textContent = WORDS[r] + ' можно передать мне.';
      resBtn.firstElementChild.textContent = 'Передать эти шаги Илье';
    }
    if (r > 0 && r < 9) {
      const names = left.slice(0, 3).map(i => taskText(i).toLowerCase());
      resS.textContent = 'Например: ' + names.join('; ') + (left.length > 3 ? ' и другие.' : '.');
      resS.hidden = false;
    } else resS.hidden = true;
    checkSummary = !touched ? '' :
      r === 0 ? 'Тест «Сам справлюсь?»: отметил(а) все 9 шагов как знакомые.' :
      'Тест «Сам справлюсь?»: не отмечено ' + r + ' из 9 шагов: ' + left.map(i => taskText(i)).join('; ') + '.';
    if (formCheck) {
      formCheck.hidden = !checkSummary;
      if (checkSummary) formCheck.textContent = 'К заявке приложим ваши ответы из проверки.';
    }
  };
  tasks.forEach(t => t.addEventListener('change', () => renderCheck(true)));
  renderCheck(false);

  // ===== FORM -> WORKER -> TELEGRAM =====
  const form = $('#leadForm');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const label = btn.querySelector('span');
    const orig = label.textContent;
    const fd = new FormData(form);
    const p = {}; fd.forEach((v, k) => { p[k] = v; });
    if (p._gotcha) return;
    if (!p.name || !p.phone || p.phone.replace(/\D/g, '').length < 11) { alert('Заполните имя и телефон полностью'); return; }
    if (!form.agree.checked) { alert('Нужно согласие на обработку персональных данных'); return; }
    const payload = {
      name: p.name,
      phone: p.phone,
      comment: ['Что нужно: ' + p.intent, checkSummary].filter(Boolean).join('. '),
    };
    btn.disabled = true; label.textContent = 'Отправляем...';
    try {
      const r = await fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      label.textContent = 'Заявка отправлена';
      form.reset();
    } catch (err) {
      console.error(err);
      label.textContent = 'Ошибка, попробуйте ещё раз';
    } finally {
      setTimeout(() => { label.textContent = orig; btn.disabled = false; }, 3500);
    }
  });

  // ===== BAR: tone follows the chapter beneath it =====
  const bar = $('#bar');
  const hero = $('#top');
  const toned = $$('main [data-tone], footer[data-tone]');
  let lastTone = '';
  const barUpdate = () => {
    const y = scrollY;
    bar.classList.toggle('is-away', y < hero.offsetHeight - 90);
    let tone = 'mist';
    for (const s of toned) {
      const r = s.getBoundingClientRect();
      if (r.top <= 40 && r.bottom > 40) { tone = s.dataset.tone; break; }
    }
    if (tone !== lastTone) { bar.dataset.tone = tone; lastTone = tone; }
  };

  // ===== SCENE: services =====
  const scene = $('#services');
  const stmts = $$('.stmt', scene);
  const pairs = $$('.pair', scene);
  const sceneBg = $('.scene__bg', scene);
  let sceneIdx = -1;
  const sceneUpdate = () => {
    if (!motion) return;
    const r = scene.getBoundingClientRect();
    const span = r.height - innerHeight;
    if (span <= 0) return;
    const p = clamp(-r.top / span, 0, 1);
    const idx = Math.min(stmts.length - 1, Math.floor(p * stmts.length * 0.999));
    if (idx !== sceneIdx) {
      sceneIdx = idx;
      stmts.forEach((s, i) => s.classList.toggle('is-on', i === idx));
      pairs.forEach((s, i) => s.classList.toggle('is-on', i === idx));
    }
    if (sceneBg) sceneBg.style.transform = 'scale(' + (1 + p * 0.1).toFixed(4) + ')';
  };

  // ===== footer uncover =====
  const foot = $('.foot');
  const footFit = () => {
    if (!motion || !foot) return;
    const h = foot.offsetHeight;
    const ok = h <= innerHeight + 1 && innerWidth > 900;
    root.classList.toggle('foot-fixed', ok);
    if (ok) root.style.setProperty('--foot-h', h + 'px');
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { barUpdate(); sceneUpdate(); ticking = false; });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { footFit(); onScroll(); });
  footFit(); barUpdate(); sceneUpdate();

  // smooth in-page anchors (native fallback; Lenis replaces it below)
  const goTo = id => {
    const t = $(id); if (!t) return;
    const top = t.getBoundingClientRect().top + scrollY - (id === '#top' ? 0 : 64);
    if (window.__lenis) window.__lenis.scrollTo(top, { duration: 1.4 });
    else scrollTo({ top, behavior: 'smooth' });
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2 || !$(id)) return;
    e.preventDefault(); goTo(id);
  }));

  // ===== MOTION (GSAP) =====
  if (!motion) return;
  const start = () => {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    if (window.Lenis) {
      const lenis = new Lenis({ duration: 1.1, easing: t => 1 - Math.pow(1 - t, 4), smoothWheel: true });
      window.__lenis = lenis;
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    const once = (trigger, fn, startAt = 'top 90%') =>
      ScrollTrigger.create({ trigger, start: startAt, once: true, onEnter: fn });

    // ---- hero intro
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__panel', { clipPath: 'inset(100% 0 0 0)', duration: 1.5, ease: 'expo.inOut' })
      .from('.hero__img', { scale: 1.3, duration: 2.4 }, 0)
      .from('.hero__brand', { opacity: 0, y: -14, duration: .9 }, .9)
      .from('.hero__h1 .mask__in', { yPercent: 115, duration: 1.4, stagger: .14 }, .85)
      .from('.hero__lead', { opacity: 0, y: 22, duration: 1 }, 1.45)
      .from('.btn--hero', { opacity: 0, y: 22, duration: 1 }, 1.55)
      .from('.swatches a', { xPercent: 100, duration: 1.2, stagger: .09 }, .7);
    gsap.to('.hero__img', { yPercent: 9, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__h1', { yPercent: -14, opacity: .0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: true } });

    // ---- split headings by words
    $$('[data-split]').forEach(h => {
      const words = h.textContent.trim().split(/\s+/);
      h.setAttribute('aria-label', h.textContent.trim());
      h.innerHTML = words.map(w => '<span class="w" aria-hidden="true"><span class="w__in">' + w + '</span></span>').join(' ');
      const ins = $$('.w__in', h);
      gsap.set(ins, { yPercent: 115 });
      once(h, () => gsap.to(ins, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: .07 }), 'top 92%');
    });

    // ---- generic reveals
    $$('[data-reveal]').forEach(el => {
      gsap.set(el, { opacity: 0, y: 30 });
      once(el, () => gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' }), 'top 94%');
    });

    // ---- scene entrance
    gsap.from('.scene__list', { opacity: 0, y: 30, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.scene', start: 'top 70%', once: true } });

    // ---- check
    const rows = $$('#tasks li');
    gsap.set(rows, { opacity: 0, y: 36 });
    once('#tasks', () => gsap.to(rows, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .07 }), 'top 88%');
    gsap.set('.result', { opacity: 0, y: 30 });
    once('.result', () => gsap.to('.result', { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' }), 'top 96%');

    // ---- steps
    $$('.st').forEach(st => {
      const pic = $('.st__pic', st), img = $('img', pic), txt = $('.st__p', st);
      gsap.set(pic, { clipPath: 'inset(100% 0 0 0)' });
      gsap.set(img, { scale: 1.3 });
      once(pic, () => {
        gsap.to(pic, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut' });
        gsap.to(img, { scale: 1.08, duration: 1.8, ease: 'expo.out' });
      }, 'top 88%');
      gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: pic, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // ---- about
    const aImg = $('.about__photo img');
    gsap.set(aImg, { scale: 1.2 });
    gsap.fromTo(aImg, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.about__photo', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.set('.about__note', { opacity: 0, y: 24 });
    once('.about__photo', () => gsap.to('.about__note', { opacity: 1, y: 0, duration: 1.1, delay: .35, ease: 'expo.out' }), 'top 75%');
    gsap.set('.about__tile', { clipPath: 'inset(0 100% 0 0)' });
    gsap.set('.river', { transformBox: 'fill-box', transformOrigin: 'left center', scaleX: 0 });
    gsap.set('.dot, .dot-ring', { opacity: 0 });
    once('.about__tile', () => {
      gsap.to('.about__tile', { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'expo.inOut' });
      gsap.to('.river', { scaleX: 1, duration: 1.6, delay: .3, ease: 'power3.out' });
      gsap.to('.dot, .dot-ring', { opacity: 1, duration: .5, delay: 1.5 });
    }, 'top 88%');
    const facts = $$('.facts > div');
    gsap.set(facts, { opacity: 0, y: 24 });
    once('.facts', () => gsap.to(facts, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .09 }), 'top 92%');

    // ---- faq
    const qs = $$('.qa details');
    gsap.set(qs, { opacity: 0, y: 28 });
    once('.qa', () => gsap.to(qs, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .08 }), 'top 90%');
    gsap.fromTo('.faq__tall img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.faq__tall', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.set('.faq__sq', { clipPath: 'inset(100% 0 0 0)' });
    once('.faq__tall', () => gsap.to('.faq__sq', { clipPath: 'inset(0% 0 0 0)', duration: 1.3, delay: .3, ease: 'expo.inOut' }), 'top 60%');
    qs.forEach(d => d.addEventListener('toggle', () => {
      if (!d.open) return;
      const p = $('p', d);
      gsap.fromTo(p, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: .6, ease: 'expo.out' });
    }));

    // ---- contact
    gsap.set('.contact__bg', { scale: 1.12 });
    gsap.fromTo('.contact__bg', { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.set('.contact__card', { opacity: 0, y: 70 });
    once('.contact', () => gsap.to('.contact__card', { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out' }), 'top 55%');

    // ---- footer
    gsap.set('.foot__word', { yPercent: 40, opacity: 0 });
    gsap.set('.foot__cols ul', { opacity: 0, y: 26 });
    ScrollTrigger.create({ trigger: '.contact', start: 'bottom 85%', once: true, onEnter: () => {
      gsap.to('.foot__word', { yPercent: 0, opacity: 1, duration: 1.6, ease: 'expo.out' });
      gsap.to('.foot__cols ul', { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .1, delay: .15 });
    } });

    // ---- magnetic buttons
    if (fine) {
      $$('.magnet').forEach(el => {
        el.addEventListener('mousemove', e => {
          const r = el.getBoundingClientRect();
          gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .22, y: (e.clientY - r.top - r.height / 2) * .32, duration: .5, ease: 'power3.out' });
        });
        el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1, .45)' }));
      });
    }

    addEventListener('load', () => { footFit(); ScrollTrigger.refresh(); });
  };

  if (document.readyState === 'complete') start();
  else addEventListener('DOMContentLoaded', () => { if (window.gsap) start(); else addEventListener('load', start); });
})();
