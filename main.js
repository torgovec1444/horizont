/* Horizont: поведінка сторінки. Без бібліотек. */
(function () {
  'use strict';
  var CONFIG = {
    GA_MEASUREMENT_ID: 'GA_MEASUREMENT_ID', // замінити на справжній ідентифікатор (G-XXXXXXX)
    mobileGlow: true,                        // м'яка підсвітка цілей на телефоні й планшеті
    idlePokes: 3                             // скільки разів рука "тицяє" в шапці до першої прокрутки
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');

  /* ---------- Глави (зміст) ---------- */
  var tocBtn = $('#toc-btn'), toc = $('#toc');
  function tocOpen(v) {
    if (!toc) return;
    toc.hidden = !v; tocBtn.setAttribute('aria-expanded', String(v));
  }
  if (tocBtn) {
    tocBtn.addEventListener('click', function () { tocOpen(toc.hidden); });
    toc.addEventListener('click', function (e) { if (e.target.closest('a')) tocOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !toc.hidden) { tocOpen(false); tocBtn.focus(); } });
    document.addEventListener('click', function (e) { if (!toc.hidden && !e.target.closest('.head')) tocOpen(false); });
  }
  if ('IntersectionObserver' in window && toc) {
    var links = {};
    $$('a', toc).forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var cur = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].removeAttribute('aria-current'); });
        var a = links[e.target.id]; if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var el = document.getElementById(id); if (el) cur.observe(el); });
  }

  /* ---------- Один контакт: пошта, телефон або Telegram ---------- */
  var KINDS = {
    email: { label: 'Твоя пошта', type: 'email', ac: 'email', im: 'email', ph: 'name@example.com',
      ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
      err: 'Напиши пошту у форматі name@example.com.' },
    tel: { label: 'Твій номер телефону', type: 'tel', ac: 'tel', im: 'tel', ph: '+380 67 123 45 67',
      ok: function (v) { var d = v.replace(/[\s()-]/g, ''); return /^\+\d{10,15}$/.test(d); },
      err: 'Напиши номер у міжнародному форматі, наприклад +380 67 123 45 67.' },
    tg: { label: 'Твій нік у Telegram', type: 'text', ac: 'off', im: 'text', ph: '@nick',
      ok: function (v) { return /^@?[A-Za-z0-9_]{5,32}$/.test(v); },
      err: 'Напиши нік у Telegram, наприклад @nick (від 5 символів).' }
  };
  function contactKind(set) { var r = $('input[type=radio]:checked', set); return KINDS[r ? r.value : 'email']; }
  $$('[data-contact]').forEach(function (set) {
    var input = $('input[name=contact]', set), label = $('[data-contact-label]', set);
    set.addEventListener('change', function (e) {
      if (e.target.type !== 'radio') return;
      var k = contactKind(set);
      label.textContent = k.label; input.type = k.type; input.autocomplete = k.ac;
      input.setAttribute('inputmode', k.im); input.placeholder = k.ph;
      setErr(input, '');
    });
  });
  function setErr(input, msg) {
    var box = document.getElementById(input.getAttribute('aria-describedby'));
    if (box) box.textContent = msg;
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }

  /* ---------- Самооцінка ---------- */
  var ORDER = ['A1', 'A2', 'B1', 'B2'];
  var check = $('#check'), result = $('#result'), planLink = $('#plan-link');
  var level = 'A1', reached = false;
  function assess() {
    level = 'A1'; reached = false;
    for (var i = 0; i < ORDER.length; i++) {
      var fs = $('fieldset[data-level="' + ORDER[i] + '"]', check);
      if ($$('input:checked', fs).length >= 4) { level = ORDER[i]; reached = true; } else break;
    }
    var head = reached ? 'Твій орієнтир: ' + level + '.' : 'Починай з A1.';
    result.innerHTML = head + '<small>Це орієнтир. Точний рівень підтвердить викладач на пробному.</small>';
    if (planLink) {
      planLink.href = 'assets/pdf/plan-' + level + '.pdf';
      planLink.textContent = 'Завантажити план для рівня ' + level + ' (PDF)';
    }
  }
  if (check) { check.addEventListener('change', assess); check.addEventListener('submit', function (e) { e.preventDefault(); }); assess(); }

  /* ---------- Форми (нічого не надсилають) ---------- */
  $$('.js-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = null;
      var name = $('input[name=name]', form);
      if (name) {
        var nv = name.value.trim();
        setErr(name, nv ? '' : 'Напиши ім\'я, щоб ми знали, як до тебе звертатися.');
        if (!nv) first = name;
      }
      var set = $('[data-contact]', form), c = $('input[name=contact]', form), k = contactKind(set), cv = c.value.trim();
      var bad = !k.ok(cv);
      setErr(c, bad ? k.err : '');
      if (bad && !first) first = c;
      var done = $('.done', form);
      if (first) { done.hidden = true; first.focus(); return; }
      done.hidden = false; done.focus();
      if (form.getAttribute('data-kind') === 'plan' && planLink) { try { planLink.click(); } catch (x) {} }
    });
    form.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid')) setErr(e.target, ''); });
  });

  /* ---------- Cookie та аналітика ---------- */
  var KEY = 'horizont-cookie', bar = $('#cookie');
  function readChoice() { try { return window.localStorage.getItem(KEY); } catch (x) { return null; } }
  function saveChoice(v) { try { window.localStorage.setItem(KEY, v); } catch (x) {} }
  function loadGA() {
    var id = CONFIG.GA_MEASUREMENT_ID;
    if (!/^G-[A-Z0-9]+$/.test(id)) return; // заглушка: без справжнього ID нічого не вантажимо
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', id, { anonymize_ip: true });
  }
  var choice = readChoice();
  if (choice === 'allow') loadGA();
  if (bar) {
    if (!choice) bar.hidden = false;
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cookie]'); if (!b) return;
      var v = b.getAttribute('data-cookie'); saveChoice(v); bar.hidden = true;
      if (v === 'allow') loadGA();
    });
  }
  $$('[data-cookie-reset]').forEach(function (b) {
    b.addEventListener('click', function () {
      try { window.localStorage.removeItem(KEY); } catch (x) {}
      var note = document.getElementById('cookie-reset-note'); if (note) note.hidden = false;
      if (bar) bar.hidden = false;
    });
  });

  /* ---------- Поява карток ---------- */
  if ('IntersectionObserver' in window) {
    var rev = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rev.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    $$('.reveal').forEach(function (el) { rev.observe(el); });
  } else { $$('.reveal').forEach(function (el) { el.classList.add('in'); }); }

  /* ---------- Прокрутка: туман, лінія шляху, Мюнхгаузен ---------- */
  var fogs = $$('.fog'), prog = $('#acts-prog'), acts = $('#acts'), munch = $('#munch');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var vh = window.innerHeight;
    if (acts && prog) {
      var r = acts.getBoundingClientRect();
      var p = (vh * 0.75 - r.top) / r.height; p = Math.max(0, Math.min(1, p));
      prog.style.setProperty('--p', p.toFixed(3));
    }
    if (reduce.matches) return;
    for (var i = 0; i < fogs.length; i++) {
      var fr = fogs[i].getBoundingClientRect();
      if (fr.bottom < -50 || fr.top > vh + 50) continue;
      var t = (fr.top + fr.height / 2 - vh / 2) / vh; // -0.5..0.5
      fogs[i].style.setProperty('--fa', (t * 90).toFixed(1) + 'px');
      fogs[i].style.setProperty('--fb', (-t * 150).toFixed(1) + 'px');
      fogs[i].style.setProperty('--fc', (t * 50).toFixed(1) + 'px');
    }
    if (munch && desktop.matches) {
      var mr = munch.getBoundingClientRect();
      if (mr.bottom > -100 && mr.top < vh + 100) {
        var m = (mr.top + mr.height / 2 - vh / 2) / vh;
        munch.style.setProperty('--m1', (m * 46).toFixed(1) + 'px');
        munch.style.setProperty('--m2', (-m * 90).toFixed(1) + 'px');
        munch.style.setProperty('--m3', (m * 120).toFixed(1) + 'px');
        munch.style.setProperty('--mr', (m * 28).toFixed(1) + 'deg');
      }
    }
  }
  function reqScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', reqScroll, { passive: true });
  window.addEventListener('resize', reqScroll);
  onScroll();

  /* ---------- Манікула: точки уваги ---------- */
  var hand = $('#hand'), logo = $('.logo'), logoHand = $('.logo__hand');
  var points = $$('[data-point]'), busy = false, scrolled = false;

  // легкий "тичок" у шапці до першої прокрутки, не більше CONFIG.idlePokes разів
  if (logoHand && !reduce.matches) {
    var pokes = 0;
    var idle = window.setInterval(function () {
      if (scrolled || pokes >= CONFIG.idlePokes || busy) { window.clearInterval(idle); return; }
      pokes++; logoHand.classList.remove('is-poke'); void logoHand.offsetWidth; logoHand.classList.add('is-poke');
    }, 4200);
    window.addEventListener('scroll', function () { scrolled = true; }, { passive: true, once: true });
  }

  function blocked() { return (bar && !bar.hidden) || (toc && !toc.hidden); }

  function fly(target) {
    if (busy || blocked() || !hand || !logoHand) return false;
    var s = logoHand.getBoundingClientRect(), t = target.getBoundingClientRect();
    var W = 74, H = 41, sx = window.scrollX, sy = window.scrollY;
    var x0 = s.left + sx, y0 = s.top + sy - 4;
    var x1 = t.left - W - 12, y1 = t.top + t.height / 2 - H / 2, rot = 0, flip = 1;
    if (x1 < 8) { // ліворуч місця немає: стаємо знизу й дивимося вгору
      x1 = t.left + Math.min(t.width / 2, 70) - W / 2; y1 = t.bottom + 12; rot = -90;
    }
    if (y1 < 70 || y1 > window.innerHeight - 60) return false; // ціль під шапкою або біля краю вікна
    x1 += sx; y1 += sy;
    var dx = x1 - x0, dy = y1 - y0, ang = Math.atan2(dy, dx) * 180 / Math.PI;
    var mx = x0 + dx * 0.5 + dy * 0.18, my = y0 + dy * 0.5 - Math.abs(dx) * 0.18 - 30;
    busy = true; logo.classList.add('is-away'); hand.classList.add('is-on');
    hand.classList.toggle('is-light', !!target.closest('.cover'));
    var anim = hand.animate([
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px) rotate(-6deg) scale(.73)' },
      { transform: 'translate(' + mx + 'px,' + my + 'px) rotate(' + ang + 'deg) scale(.95)', offset: 0.5 },
      { transform: 'translate(' + (x1 + (rot ? 0 : 10)) + 'px,' + (y1 - (rot ? 10 : 0)) + 'px) rotate(' + rot + 'deg) scale(1.04)', offset: 0.88 },
      { transform: 'translate(' + x1 + 'px,' + y1 + 'px) rotate(' + rot + 'deg) scale(1)' }
    ], { duration: 950, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' });
    anim.onfinish = function () {
      hand.classList.add('is-bob'); target.classList.add('is-pointed');
      window.setTimeout(function () {
        var out = hand.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: 'forwards' });
        out.onfinish = function () {
          anim.cancel(); out.cancel();
          hand.classList.remove('is-on', 'is-bob', 'is-light'); target.classList.remove('is-pointed');
          logo.classList.remove('is-away'); busy = false;
        };
      }, 2700);
    };
    return true;
  }

  if (points.length && 'IntersectionObserver' in window) {
    var timers = new Map();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var el = e.target;
        if (e.isIntersecting) {
          if (el.dataset.shown) return;
          var tries = 0;
          var attempt = function () {
            if (el.dataset.shown) return;
            if (desktop.matches && !reduce.matches) {
              if (fly(el)) { el.dataset.shown = '1'; io.unobserve(el); }
              else if (++tries < 6) timers.set(el, window.setTimeout(attempt, 1500)); // зайнято або відкрито банер: пробуємо пізніше
            } else if (CONFIG.mobileGlow || desktop.matches) {
              el.dataset.shown = '1'; io.unobserve(el);
              el.classList.add('is-glow');
              window.setTimeout(function () { el.classList.remove('is-glow'); }, 2600);
            }
          };
          timers.set(el, window.setTimeout(attempt, 1000));
        } else if (timers.has(el)) { window.clearTimeout(timers.get(el)); timers.delete(el); }
      });
    }, { threshold: 0.9, rootMargin: '-70px 0px -60px 0px' });
    points.forEach(function (p) { io.observe(p); });
  }
})();
