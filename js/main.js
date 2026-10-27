/* =========================================================
   STACKD. — the page plays like a film.
   Every scene is one scrubbed GSAP timeline that drives:
   video frames + virtual camera + type + chrome, in sync.
   ========================================================= */
(() => {
  const REC = /[?&]rec\b/.test(location.search);
  if (REC) document.documentElement.classList.add('rec');
  gsap.registerPlugin(ScrollTrigger);
  const SCRUB = REC ? true : 1;                       // 1s catch-up = cinematic smoothing
  const M = window.innerWidth < 768;                  // mobile frame set + camera, chosen once
  const pad3 = (i) => String(i + 1).padStart(3, '0');

  /* ---------- split helpers ---------- */
  document.querySelectorAll('[data-letters]').forEach((el) => {
    el.innerHTML = el.textContent.trim().split(' ').map((w, wi) =>
      `<span class="w w${wi}" style="display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.04em">${
        [...w].map((c) => `<span class="ch">${c}</span>`).join('')}</span>`).join('<span style="display:inline-block;width:.25em"></span>');
  });

  /* ---------- sequences ---------- */
  const stackSeq = new FrameSequence({
    canvas: document.getElementById('stackCanvas'), count: M ? 96 : 192, fit: M ? 'contain' : 'cover',
    src: (i) => `assets/frames/${M ? 'stack-m' : 'stack'}/${pad3(i)}.webp`,
  });
  const comboSeq = new FrameSequence({
    canvas: document.getElementById('comboCanvas'), count: M ? 96 : 192, fit: M ? 'contain' : 'cover',
    src: (i) => `assets/frames/${M ? 'combo-m' : 'combo'}/${pad3(i)}.webp`,
  });

  /* ---------- camera keyframes (scale, x, y as fractions of the screen) ---------- */
  const CAM = M ? {
    s0: { scale: 1.0, x: 0, y: -0.2 }, s1: { scale: 1.12, x: 0, y: -0.04 }, s2: { scale: 1.16, x: 0, y: -0.04 },
    s3: { scale: 1.2, x: 0, y: -0.04 }, s4: { scale: 1.05, x: 0, y: 0.04 }, s5: { scale: 2.6, x: 0, y: -0.06 },
    c0: { scale: 1.7, x: 0, y: 0.02 }, c1: { scale: 1.25, x: 0, y: 0.02 }, c2: { scale: 1.3, x: 0, y: 0.04 },
    c3: { scale: 1.38, x: 0, y: 0.06 }, c4: { scale: 1.2, x: 0, y: 0.08 },
  } : {
    s0: { scale: 0.76, x: 0.2, y: 0.04 }, s1: { scale: 0.88, x: 0, y: 0.03 }, s2: { scale: 0.96, x: -0.05, y: 0.02 },
    s3: { scale: 1.0, x: -0.05, y: 0.02 }, s4: { scale: 0.82, x: 0.12, y: 0.03 }, s5: { scale: 2.6, x: 0.12, y: -0.06 },
    c0: { scale: 1.35, x: 0, y: 0.1 }, c1: { scale: 0.8, x: 0, y: 0.1 }, c2: { scale: 0.86, x: 0, y: 0.08 },
    c3: { scale: 0.96, x: 0, y: 0.07 }, c4: { scale: 0.78, x: 0, y: 0.12 },
  };
  const SV = { ...CAM.s0 }, SF = { f: 0 };
  const CV = { ...CAM.c0 }, CF = { f: 0 };
  stackSeq.setView(SV); comboSeq.setView(CV);

  /* ---------- loader + opening shot ---------- */
  document.body.classList.add('loading');
  gsap.set('.hud', { autoAlpha: 0 });
  gsap.set('.hero-copy .mask > span, .scroll-cue', { yPercent: 110 });
  const pct = document.getElementById('loaderPct'), bar = document.getElementById('loaderBar');
  let revealed = false;
  const reveal = () => {
    if (revealed) return; revealed = true;
    document.body.classList.remove('loading');
    const intro = { scale: SV.scale * 1.55 };
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to('.loader-count, .loader-bar, .loader-brand', { yPercent: -40, opacity: 0, duration: 0.6, ease: 'power3.in' })
      .to('#loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.15')
      .set('#loader', { display: 'none' })
      .fromTo(intro, { scale: SV.scale * 1.55 }, { scale: SV.scale, duration: 2.4, ease: 'expo.out',
        onUpdate: () => stackSeq.setView({ ...SV, scale: intro.scale }) }, '-=0.9')
      .fromTo('#stackCanvas', { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' }, '<')
      .to('.bars i', { scaleY: 0, duration: 1.6, ease: 'expo.inOut', transformOrigin: (i) => (i ? 'bottom' : 'top') }, '<+0.6')
      .to('.hero-copy .mask > span', { yPercent: 0, duration: 1.3, stagger: 0.07 }, '<+0.2')
      .to('.scroll-cue', { yPercent: 0, duration: 1 }, '<+0.5')
      .from('.nav', { y: -40, opacity: 0, duration: 1 }, '<')
      .to('.hud', { autoAlpha: 1, duration: 1 }, '<');
    ScrollTrigger.refresh();
  };
  stackSeq.load((p) => {
    gsap.to(bar, { scaleX: p, duration: 0.3, overwrite: true });
    pct.textContent = String(Math.round(p * 100)).padStart(3, '0');
    if (!REC && p >= 0.3) reveal();
  }).then(() => comboSeq.load()).then(() => { window.__ready = true; if (REC) reveal(); });
  setTimeout(reveal, 9000);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!REC && window.Lenis && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lenis = new Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault(); lenis.scrollTo(a.getAttribute('href') === '#top' ? 0 : a.getAttribute('href'), { duration: 2.2 });
    }));
  }

  /* ============ SCENE 01 — THE STACK ============ */
  gsap.set('.stack-word .mask > span, .ingredients .mask > span, .tagline .mask > span', { yPercent: 115 });
  gsap.set('.ingredients b, .ingredients em', { opacity: 0 });
  gsap.set('.stats div', { opacity: 0, y: 60 });
  const counters = [...document.querySelectorAll('[data-count]')].map((el) => ({ el, end: +el.dataset.count, v: +el.textContent }));
  const C = { p: 0 };

  const stack = gsap.timeline({
    defaults: { ease: 'power3.inOut' },
    scrollTrigger: { trigger: '#stack', start: 'top top', end: 'bottom bottom', scrub: SCRUB },
    onUpdate: () => { stackSeq.setProgress(SF.f); stackSeq.setView(SV); },
  });
  stack
    // opening copy leaves the frame, lines split apart
    .to('.scroll-cue', { autoAlpha: 0, duration: 3 }, 0)
    .to('.hero-copy .l1', { xPercent: -40, opacity: 0, duration: 9, ease: 'power2.in' }, 3)
    .to('.hero-copy .l2', { xPercent: 40, opacity: 0, duration: 9, ease: 'power2.in' }, 3)
    .to('.hero-copy .eyebrow, .hero-sub, .hero-ctas', { y: -40, opacity: 0, duration: 6, stagger: 1, ease: 'power2.in' }, 3)
    // camera + frames
    .fromTo(SV, CAM.s0, { ...CAM.s1, duration: 14, immediateRender: false }, 6)
    .to(SF, { f: 1, duration: 47, ease: 'none' }, 8)
    .fromTo(SV, CAM.s1, { ...CAM.s2, immediateRender: false, duration: 35, ease: 'sine.inOut' }, 20)
    .fromTo(SV, CAM.s2, { ...CAM.s3, immediateRender: false, duration: 13, ease: 'none' }, 55)
    // THE STACK
    .to('.stack-word .mask > span', { yPercent: 0, duration: 7, stagger: 2.5, ease: 'expo.out' }, 22)
    .to('.ingredients .mask > span', { yPercent: 0, duration: 5, stagger: 3, ease: 'expo.out' }, 28)
    .to('.ingredients b, .ingredients em', { opacity: 1, duration: 4, stagger: 1.5 }, 29)
    .to('.ingredients li', { '--line': 1, duration: 6, stagger: 3, ease: 'expo.out' }, 29)
    .to('.stack-word .mask > span, .ingredients .mask > span', { yPercent: -115, duration: 5, stagger: 0.4, ease: 'power3.in' }, 62)
    .to('.ingredients b, .ingredients em, .ingredients li', { opacity: 0, '--line': 0, duration: 4 }, 63)
    // stack back up
    .to(SF, { f: 0, duration: 18, ease: 'power2.inOut' }, 68)
    .fromTo(SV, CAM.s3, { ...CAM.s4, immediateRender: false, duration: 18 }, 68)
    .to('.stats div', { opacity: 1, y: 0, duration: 6, stagger: 2, ease: 'expo.out' }, 72)
    .to(C, { p: 1, duration: 10, ease: 'power2.out', onUpdate: () => counters.forEach((c) => {
      const from = c.end === 0 ? 9 : 0; c.el.textContent = Math.round(from + (c.end - from) * C.p);
    }) }, 72)
    .to('.tagline .mask > span', { yPercent: 0, duration: 6, stagger: 2, ease: 'expo.out' }, 76)
    .to('.stats div, .tagline .mask > span', { opacity: 0, y: -40, duration: 4, stagger: 0.5, ease: 'power2.in' }, 88)
    // dive into the burger → black
    .fromTo(SV, CAM.s4, { ...CAM.s5, immediateRender: false, duration: 10, ease: 'power3.in' }, 90)
    .to('#stackCanvas', { opacity: 0, duration: 4, ease: 'none' }, 96)
    .set({}, {}, 100);

  // letterbox closes for the cut between scenes, then opens again
  gsap.timeline({ scrollTrigger: { trigger: '#combo', start: 'top 60%', end: 'top -60%', scrub: SCRUB } })
    .fromTo('.bars i', { scaleY: 0 }, { scaleY: 1, duration: 1, ease: 'power2.inOut', immediateRender: false })
    .to('.bars i', { scaleY: 0, duration: 1, ease: 'power2.inOut' });

  /* ============ SCENE 02 — THE COMBO ============ */
  gsap.set('.combo-title .ch', { yPercent: 115 });
  gsap.set('.combo-head .mask > span, .combo-list .mask > span, .combo-close .mask > span', { yPercent: 115 });
  gsap.set('.combo-list b', { opacity: 0 });
  gsap.set('.price-tag', { scale: 0, rotation: -60 });
  gsap.set('.combo-btn', { autoAlpha: 0, y: 40 });

  gsap.timeline({
    defaults: { ease: 'power3.inOut' },
    scrollTrigger: { trigger: '#combo', start: 'top top', end: 'bottom bottom', scrub: SCRUB },
    onUpdate: () => { comboSeq.setProgress(CF.f); comboSeq.setView(CV); },
  })
    .fromTo('#comboCanvas', { opacity: 0 }, { opacity: 1, duration: 6, ease: 'power1.out' }, 0)
    .fromTo(CV, CAM.c0, { ...CAM.c1, duration: 12, ease: 'expo.out', immediateRender: false }, 0)
    .to('.combo-head .mask > span', { yPercent: 0, duration: 5, ease: 'expo.out' }, 2)
    .to('.combo-title .ch', { yPercent: 0, duration: 6, stagger: 0.35, ease: 'expo.out' }, 3)
    .to('.combo-list .mask > span', { yPercent: 0, duration: 5, stagger: 1.5, ease: 'expo.out' }, 7)
    .to('.combo-list b', { opacity: 1, duration: 3, stagger: 1.5 }, 7)
    .fromTo(CV, CAM.c1, { ...CAM.c2, immediateRender: false, duration: 18, ease: 'sine.inOut' }, 12)
    .to('.combo-title .ch, .combo-head .mask > span, .combo-list .mask > span', { yPercent: -115, duration: 5, stagger: 0.15, ease: 'power3.in' }, 26)
    .to('.combo-list b', { opacity: 0, duration: 3 }, 27)
    // the lid closes
    .to(CF, { f: 1, duration: 45, ease: 'none' }, 30)
    .fromTo(CV, CAM.c2, { ...CAM.c3, immediateRender: false, duration: 45, ease: 'sine.inOut' }, 30)
    .to('.flash', { opacity: 0.22, duration: 1.2, ease: 'power2.out' }, 57.5)
    .to('.flash', { opacity: 0, duration: 4, ease: 'power2.in' }, 58.7)
    .to('.combo-close .mask > span', { yPercent: 0, duration: 6, stagger: 2, ease: 'expo.out' }, 64)
    .to('.price-tag', { scale: 1, rotation: -10, duration: 6, ease: 'back.out(2)' }, 68)
    .to('.combo-btn', { autoAlpha: 1, y: 0, duration: 5, ease: 'expo.out' }, 72)
    .fromTo(CV, CAM.c3, { ...CAM.c4, immediateRender: false, duration: 18 }, 77)
    .to('.to-cream', { scaleY: 1, duration: 10, ease: 'expo.inOut' }, 90)
    .set({}, {}, 100);

  /* ============ SCENE 03 — THE LINEUP (horizontal film strip) ============ */
  const menu = [
    { n: 'Double Stack', p: '11.50', img: 'double-stack', tag: 'Bestseller', d: 'Two smashed patties, double American cheese, pickles, onion, house sauce.' },
    { n: 'Smoke Show', p: '12.90', img: 'smoke-show', tag: 'New', d: 'Hickory BBQ glaze, crispy onion strings, smoked cheddar, lettuce, tomato.' },
    { n: 'Hot Honey Crunch', p: '10.90', img: 'hot-honey', tag: 'Spicy', d: 'Buttermilk fried chicken, hot honey, slaw, dill pickles.' },
    { n: 'Triple Threat', p: '14.50', img: 'triple-threat', tag: 'Big boy', d: 'Three patties. Three cheddars. Zero apologies.' },
    { n: 'Loaded Fries', p: '5.90', img: 'loaded-fries', tag: 'Side', d: 'Skin-on fries, cheese sauce, crispy onions, house seasoning.' },
    { n: 'Cookie Shake', p: '6.50', img: 'cookie-shake', tag: 'Sweet', d: 'Thick vanilla shake, crushed cookies, whipped cream.' },
  ];
  const track = document.getElementById('lineupTrack');
  track.insertAdjacentHTML('beforeend', menu.map((m, i) => `
    <article class="card" data-cursor="Add">
      <div class="card-media"><span class="card-tag">${m.tag}</span><span class="card-num">0${i + 1}</span>
        <img src="assets/img/${m.img}.webp" alt="${m.n}" width="960" height="720" decoding="async"></div>
      <div class="card-body"><h3>${m.n}</h3><span class="price">$${m.p}</span><p>${m.d}</p></div>
    </article>`).join(''));

  const dist = () => track.scrollWidth - window.innerWidth;
  const strip = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '#lineup', start: 'top top', end: () => '+=' + dist() * 1.15, pin: true, scrub: SCRUB, invalidateOnRefresh: true,
      onUpdate: (s) => gsap.set('#lineupBar', { scaleX: s.progress }),
    },
  });
  gsap.set('.lineup-title .ch', { yPercent: 115 });
  gsap.to('.lineup-title .ch', { yPercent: 0, stagger: 0.04, duration: 1, ease: 'expo.out',
    scrollTrigger: { trigger: '#lineup', start: 'top 55%', toggleActions: 'play none none reverse' } });
  gsap.utils.toArray('.card').forEach((card) => {
    gsap.fromTo(card, { yPercent: 18, rotation: 4, opacity: 0.3 }, { yPercent: 0, rotation: 0, opacity: 1, ease: 'power3.out',
      scrollTrigger: { trigger: card, containerAnimation: strip, start: 'left 100%', end: 'left 55%', scrub: true } });
    gsap.fromTo(card.querySelector('img'), { xPercent: -6 }, { xPercent: 6, ease: 'none',
      scrollTrigger: { trigger: card, containerAnimation: strip, start: 'left right', end: 'right left', scrub: true } });
  });

  /* ---------- marquee (speeds up with scroll velocity) ---------- */
  const mq = document.getElementById('marquee');
  const words = ['SMASHED FRESH', 'NEVER FROZEN', 'OPEN LATE', 'DOUBLE OR NOTHING'];
  const chunk = words.map((w, i) => `<span>${w}</span><img src="assets/img/${menu[i].img}.webp" alt="">`).join('');
  mq.innerHTML = chunk + chunk;
  const mqTween = gsap.to(mq, { xPercent: -50, duration: 24, ease: 'none', repeat: -1 });
  ScrollTrigger.create({ onUpdate: (s) => {
    gsap.to(mqTween, { timeScale: 1 + Math.min(5, Math.abs(s.getVelocity()) / 350), duration: 0.2, overwrite: true });
    gsap.to(mqTween, { timeScale: 1, duration: 1.2, delay: 0.2, overwrite: false });
  } });

  /* ============ SCENE 04 — FINALE ============ */
  gsap.fromTo('.finale-title', { backgroundSize: '95%', backgroundPosition: '50% 20%' }, { backgroundSize: '62%', backgroundPosition: '50% 55%', ease: 'none',
    scrollTrigger: { trigger: '.finale', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.from('.finale-title', { y: 160, opacity: 0, ease: 'expo.out',
    scrollTrigger: { trigger: '.finale', start: 'top 90%', end: 'top 45%', scrub: SCRUB } });

  /* ---------- HUD: chapters + timecode, like a video player ---------- */
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  const TOTAL = 48, fill = document.getElementById('hudFill'), time = document.getElementById('hudTime');
  const num = document.getElementById('hudNum'), name = document.getElementById('hudName'), ticks = document.getElementById('hudTicks');
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  document.getElementById('hudTotal').textContent = fmt(TOTAL);
  const drawTicks = () => {
    const max = ScrollTrigger.maxScroll(window) || 1;
    ticks.innerHTML = chapters.slice(1).map((c) => `<i style="left:${(c.getBoundingClientRect().top + scrollY) / max * 100}%"></i>`).join('');
  };
  ScrollTrigger.addEventListener('refresh', drawTicks);
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => {
    fill.style.transform = `scaleX(${s.progress})`;
    time.textContent = fmt(s.progress * TOTAL);
  } });
  chapters.forEach((c, i) => ScrollTrigger.create({
    trigger: c, start: 'top 50%', end: 'bottom 50%',
    onToggle: (s) => { if (s.isActive) { num.textContent = String(i + 1).padStart(2, '0'); name.textContent = c.dataset.chapter; } },
  }));

  /* ---------- cursor + magnetic buttons (desktop) ---------- */
  if (matchMedia('(hover:hover)').matches && !REC) {
    const cur = document.querySelector('.cursor'), label = document.getElementById('cursorLabel');
    const dx = gsap.quickTo('.cursor-dot', 'x', { duration: 0.1 }), dy = gsap.quickTo('.cursor-dot', 'y', { duration: 0.1 });
    const rx = gsap.quickTo('.cursor-ring', 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo('.cursor-ring', 'y', { duration: 0.45, ease: 'power3' });
    window.addEventListener('mousemove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.querySelectorAll('[data-cursor]').forEach((el) => {
      el.addEventListener('mouseenter', () => { cur.classList.add('hover'); label.textContent = el.dataset.cursor; });
      el.addEventListener('mouseleave', () => cur.classList.remove('hover'));
    });
    document.querySelectorAll('.magnetic').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1,0.4)' }), my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1,0.4)' });
      el.addEventListener('mousemove', (e) => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * 0.35); my((e.clientY - r.top - r.height / 2) * 0.35); });
      el.addEventListener('mouseleave', () => { mx(0); my(0); });
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
