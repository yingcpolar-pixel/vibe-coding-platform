/* =====================================================================
   C-POLAR — NanoFlashing™  motion + interaction
   GSAP + ScrollTrigger · Lenis · Splitting · ECharts
   Includes a real velocity-based spring tooltip for the chart.

   Performance: transform/opacity only · single rAF (Lenis drives GSAP) ·
   lazy chart init · debounced resize · will-change removed after entrance.
   ===================================================================== */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- pollutant data (drives the interactive explorer) ---- */
  const POLLUTANTS = [
    {
      formula: '2,4-D', charge: '−1', name: 'Herbicide anion',
      what: 'A widespread herbicide that dissociates into a singly-charged organic anion.',
      why: 'A carboxylate group sheds a proton — leaving one extra electron and a net −1.',
      where: 'Agricultural runoff and spray drift; persists in both air and water.',
      miss: 'Soluble and mobile — mechanical media let it pass and it keeps regenerating.',
      render: 'Illustrative render',
    },
    {
      formula: 'SO₄<sup>2−</sup>', charge: '−2', name: 'Sulfate',
      what: 'A doubly-charged dissolved ion and a major fine-particle component in air.',
      why: 'Two extra electrons spread over a symmetric cage of oxygens — a strong, stable −2.',
      where: 'Oxidation of sulfur dioxide in air; mineral and industrial sources in water.',
      miss: 'Small, soluble and divalent — poorly caught by mechanical media, and in air it is continuously regenerated.',
      render: 'Measured species',
    },
    {
      formula: 'NO₃<sup>−</sup>', charge: '−1', name: 'Nitrate',
      what: 'A highly soluble ion and a key driver of secondary fine particulate.',
      why: 'A delocalised electron across three oxygens gives a stable single negative charge.',
      where: 'Combustion and fertiliser chemistry; abundant in air and groundwater.',
      miss: 'Tiny and water-loving — slips through filter gaps and re-forms downstream.',
      render: 'Illustrative render',
    },
  ];

  document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);
    initSmoothScroll();
    initTextReveal();
    initFadeAndReveal();
    initParallax();
    initSvgLineDraw();
    initScrollProgress();
    initHeroCharges();
    initExplorer();
    initCounters();
    initChartLazy();
  });

  /* ------------------------------------------------------------------ */
  function initSmoothScroll() {
    if (reduce || typeof Lenis === 'undefined') return;
    const lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const sel = a.getAttribute('href');
        if (sel === '#' || sel === '#top') { e.preventDefault(); lenis.scrollTo(0); return; }
        const t = document.querySelector(sel);
        if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -60 }); }
      });
    });
  }

  function initTextReveal() {
    const targets = document.querySelectorAll('[data-splitting]');
    if (!targets.length) return;
    if (typeof Splitting !== 'undefined') Splitting({ target: targets, by: 'words' });
    targets.forEach((el) => {
      const words = el.querySelectorAll('.word');
      const items = words.length ? words : [el];
      if (reduce) { gsap.set(items, { opacity: 1, y: 0 }); return; }
      gsap.set(items, { display: 'inline-block', willChange: 'transform' });
      gsap.fromTo(items,
        { yPercent: 120, opacity: 0, rotateX: -45 },
        { yPercent: 0, opacity: 1, rotateX: 0, duration: 0.9, ease: 'power3.out', stagger: 0.035,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          onComplete: () => gsap.set(items, { willChange: 'auto' }) });
    });
  }

  function initFadeAndReveal() {
    gsap.utils.toArray('[data-fade]').forEach((el) => {
      gsap.to(el, { opacity: 1, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    const reveals = gsap.utils.toArray('[data-reveal]');
    if (reveals.length) {
      ScrollTrigger.batch(reveals, { start: 'top 90%',
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1, overwrite: true,
          onComplete: () => batch.forEach((b) => (b.style.willChange = 'auto')) }) });
    }
  }

  function initParallax() {
    if (reduce) return;
    gsap.utils.toArray('[data-parallax]').forEach((layer) => {
      const speed = parseFloat(layer.dataset.speed) || 0.15;
      gsap.to(layer, { yPercent: speed * 100, ease: 'none',
        scrollTrigger: { trigger: layer.closest('section') || layer, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  function initSvgLineDraw() {
    document.querySelectorAll('.icon-draw').forEach((svg) => {
      const paths = svg.querySelectorAll('.draw-path');
      paths.forEach((p) => { const len = p.getTotalLength(); gsap.set(p, { strokeDasharray: len, strokeDashoffset: reduce ? 0 : len }); });
      if (reduce) return;
      gsap.to(paths, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut', stagger: 0.12,
        scrollTrigger: { trigger: svg, start: 'top 92%', once: true } });
    });
  }

  function initScrollProgress() {
    const bar = document.querySelector('[data-progress]');
    if (!bar) return;
    gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
  }

  /* ---- floating + / − charges in the hero ---- */
  function initHeroCharges() {
    const host = document.querySelector('[data-charges]');
    if (!host || reduce) return;
    const N = 14;
    for (let i = 0; i < N; i++) {
      const neg = i % 2 === 0;
      const s = document.createElement('span');
      s.className = 'charge ' + (neg ? 'charge--neg' : 'charge--pos');
      s.textContent = neg ? '−' : '+';
      s.style.left = (Math.random() * 100) + '%';
      s.style.top = (Math.random() * 100) + '%';
      s.style.fontSize = (0.8 + Math.random() * 1.6) + 'rem';
      host.appendChild(s);
      gsap.to(s, { y: (Math.random() * 60 - 30), x: (Math.random() * 60 - 30), opacity: 0.25 + Math.random() * 0.5,
        duration: 3 + Math.random() * 3, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: Math.random() * 2 });
    }
  }

  /* ---- interactive pollutant explorer ---- */
  function initExplorer() {
    const root = document.querySelector('[data-explorer]');
    if (!root) return;
    const detail = root.querySelector('[data-explorer-detail]');
    const counter = root.querySelector('[data-explorer-index]');
    const buttons = root.querySelectorAll('.poll');

    function render(i) {
      const p = POLLUTANTS[i];
      counter.textContent = String(i + 1).padStart(2, '0');
      detail.innerHTML = `
        <div class="detail-head">
          <span class="d-formula">${p.formula}</span>
          <span class="d-charge">net charge ${p.charge}</span>
          <span class="d-render">${p.render}</span>
        </div>
        <div class="detail-block"><h4>What it is</h4><p>${p.what}</p></div>
        <div class="detail-block"><h4>Why it's negative</h4><p>${p.why}</p></div>
        <div class="detail-block"><h4>Where it comes from</h4><p>${p.where}</p></div>
        <div class="detail-block"><h4>Why filters miss it</h4><p>${p.miss}</p></div>`;
      if (!reduce) gsap.fromTo(detail.children, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.05 });
    }

    buttons.forEach((b) => b.addEventListener('click', () => {
      buttons.forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      render(parseInt(b.dataset.poll, 10));
    }));
    render(0);
  }

  /* ---- count-up stats ---- */
  function initCounters() {
    gsap.utils.toArray('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const obj = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => {
        if (reduce) { el.textContent = end + suffix; return; }
        gsap.to(obj, { v: end, duration: 1.4, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; } });
      } });
    });
  }

  /* ================================================================
     Velocity-based spring (critically tunable) — integrates toward a
     target each frame using stiffness + damping, carrying velocity.
     ================================================================ */
  function Spring(stiffness, damping) {
    this.k = stiffness; this.d = damping; this.value = 0; this.vel = 0; this.target = 0;
  }
  Spring.prototype.set = function (v) { this.value = v; this.target = v; this.vel = 0; };
  Spring.prototype.to = function (t) { this.target = t; };
  Spring.prototype.step = function () {
    const force = (this.target - this.value) * this.k;
    this.vel = (this.vel + force) * this.d;
    this.value += this.vel;
    return this.value;
  };

  /* ---- ECharts: glow/minimal + spring tooltip ---- */
  function initChartLazy() {
    const el = document.querySelector('[data-chart]');
    if (!el || typeof echarts === 'undefined') return;
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => { if (e.isIntersecting) { renderChart(el); obs.disconnect(); } });
    }, { threshold: 0.3 });
    io.observe(el);
  }

  function renderChart(el) {
    const chart = echarts.init(el, null, { renderer: 'canvas' });
    const weeks = ['W0', 'W1', 'W3', 'W5', 'W7', 'W9', 'W11'];
    const conventional = [85, 78, 68, 60, 53, 49, 45];
    const nanoflashing = [99, 99, 98, 98, 98, 97, 97];

    const glow = (c) => ({ shadowColor: c, shadowBlur: 16 });

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { left: 48, right: 28, top: 48, bottom: 38 },
      legend: { data: ['Conventional media', 'NanoFlashing™'], top: 8, right: 12, textStyle: { color: '#8b979c' }, icon: 'roundRect', itemWidth: 14, itemHeight: 4 },
      textStyle: { fontFamily: 'Inter, sans-serif', color: '#8b979c' },
      tooltip: { show: false }, // we draw our own spring tooltip
      xAxis: { type: 'category', data: weeks, boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } }, axisTick: { show: false } },
      yAxis: { type: 'value', min: 30, max: 100, axisLabel: { formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } }, axisLine: { show: false }, axisTick: { show: false } },
      series: [
        { name: 'Conventional media', type: 'line', data: conventional, smooth: true, symbol: 'circle', symbolSize: 7, showSymbol: false,
          lineStyle: { width: 3, color: '#ff3b46', ...glow('rgba(255,59,70,0.7)') },
          itemStyle: { color: '#ff3b46', borderColor: '#fff', borderWidth: 1.5 },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [ { offset: 0, color: 'rgba(255,59,70,0.28)' }, { offset: 1, color: 'rgba(255,59,70,0)' } ]) } },
        { name: 'NanoFlashing™', type: 'line', data: nanoflashing, smooth: true, symbol: 'circle', symbolSize: 7, showSymbol: false,
          lineStyle: { width: 3, color: '#19f0d4', ...glow('rgba(25,240,212,0.8)') },
          itemStyle: { color: '#19f0d4', borderColor: '#04201c', borderWidth: 1.5 },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [ { offset: 0, color: 'rgba(25,240,212,0.22)' }, { offset: 1, color: 'rgba(25,240,212,0)' } ]) } },
      ],
      animationDuration: 1500,
      animationEasing: 'cubicOut',
      animationDelay: (i) => i * 70,
    });

    setupSpringTooltip(chart, el, { weeks, conventional, nanoflashing });

    let raf = null;
    window.addEventListener('resize', () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => chart.resize());
    }, { passive: true });
  }

  /* ---- the spring tooltip itself ---- */
  function setupSpringTooltip(chart, el, data) {
    const tip = document.querySelector('[data-springtip]');
    const weekEl = tip.querySelector('[data-tip-week]');
    const rowsEl = tip.querySelector('[data-tip-rows]');
    if (!tip) return;

    const sx = new Spring(0.18, 0.72);   // x follow
    const sy = new Spring(0.18, 0.72);   // y follow
    const so = new Spring(0.20, 0.65);   // opacity/scale
    let visible = false, lastIndex = -1, running = false, primed = false;

    function nearestIndex(pixelX) {
      // map pixel x to nearest category index via axis conversion
      const val = chart.convertFromPixel({ xAxisIndex: 0 }, [pixelX, 0]);
      let i = Math.round(val[0]);
      return Math.max(0, Math.min(data.weeks.length - 1, i));
    }

    function fill(i) {
      if (i === lastIndex) return;
      lastIndex = i;
      weekEl.textContent = 'Week ' + data.weeks[i].replace('W', '');
      rowsEl.innerHTML = `
        <div class="tip-row"><span class="dot" style="background:#ff3b46"></span><span class="name">Conventional</span><span class="val" style="color:#ff6a72">${data.conventional[i]}%</span></div>
        <div class="tip-row"><span class="dot" style="background:#19f0d4"></span><span class="name">NanoFlashing™</span><span class="val" style="color:#19f0d4">${data.nanoflashing[i]}%</span></div>`;
    }

    function loop() {
      const x = sx.step(), y = sy.step(), o = so.step();
      const scale = 0.9 + o * 0.1;
      tip.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      tip.style.opacity = o;
      // keep animating until the spring settles (or while visible)
      if (visible || Math.abs(so.target - o) > 0.01 || Math.abs(sx.vel) > 0.05 || Math.abs(sy.vel) > 0.05) {
        requestAnimationFrame(loop);
      } else { running = false; }
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }

    const zr = chart.getZr();
    zr.on('mousemove', (e) => {
      const i = nearestIndex(e.offsetX);
      fill(i);
      // anchor tooltip to the data point of the NanoFlashing line, offset up-right
      const pt = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [i, data.nanoflashing[i]]);
      const rect = el.getBoundingClientRect();
      const tw = tip.offsetWidth || 200, th = tip.offsetHeight || 90;
      let tx = rect.left + pt[0] + 18;
      let ty = rect.top + pt[1] - th - 14;
      // clamp within viewport
      tx = Math.min(tx, window.innerWidth - tw - 12);
      ty = Math.max(ty, 12);
      if (!primed) { sx.set(tx); sy.set(ty); primed = true; } // avoid fly-in from origin
      sx.to(tx); sy.to(ty); so.to(1);
      visible = true; kick();
    });
    zr.on('mouseout', () => { visible = false; so.to(0); kick(); });
    zr.on('globalout', () => { visible = false; so.to(0); kick(); });
  }
})();
