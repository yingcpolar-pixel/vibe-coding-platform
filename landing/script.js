/* =================================================================
   AURORA — script.js  (ES module)

   Pipeline:
   1. Lenis            -> high-end smooth scroll (RAF-driven)
   2. GSAP ScrollTrigger -> scroll choreography + parallax
   3. Splitting.js     -> char-level text splitting
   4. ECharts          -> glowing interactive chart (lazy)

   Performance rules baked in:
   - Single shared RAF loop (Lenis ticks GSAP, GSAP doesn't lag).
   - Animate transform/opacity only.
   - Reads/writes batched; ScrollTrigger handles measurement.
   - Chart + heavy work deferred until in view.
================================================================= */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import Splitting from 'splitting';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   1. SMOOTH SCROLL (Lenis) bridged into GSAP's ticker
============================================================ */
function initSmoothScroll() {
  if (prefersReduced) return null;

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  // Keep ScrollTrigger in sync with Lenis.
  lenis.on('scroll', ScrollTrigger.update);

  // Drive Lenis from GSAP's ticker => one RAF loop, no jank.
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

/* ============================================================
   2. TEXT — split into chars, stagger fly-in on enter
============================================================ */
function initTextReveals() {
  Splitting({ target: '[data-split]', by: 'chars' });

  document.querySelectorAll('[data-split]').forEach((el) => {
    const chars = el.querySelectorAll('.char');
    if (!chars.length) return;

    gsap.set(chars, { yPercent: 120, opacity: 0 });

    gsap.to(chars, {
      yPercent: 0,
      opacity: 1,
      ease: 'power3.out',
      duration: 0.8,
      stagger: 0.025,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
}

/* ============================================================
   3. GENERIC REVEALS (buttons, cards) — stagger per scene
============================================================ */
function initReveals() {
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      }
    );
  });
}

/* ============================================================
   4. PARALLAX — transform-only, scrubbed to scroll
============================================================ */
function initParallax() {
  if (prefersReduced) return;

  gsap.utils.toArray('[data-parallax]').forEach((layer) => {
    const speed = parseFloat(layer.dataset.speed || '0.2');
    gsap.to(layer, {
      yPercent: speed * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: layer.closest('[data-scene]') || layer,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });
}

/* ============================================================
   5. SVG ICONS — animate stroke-dashoffset (line draw)
============================================================ */
function initSvgDraw() {
  document.querySelectorAll('.icon-draw').forEach((svg) => {
    const paths = svg.querySelectorAll('[data-draw]');
    paths.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });

    gsap.to(svg.querySelectorAll('[data-draw]'), {
      strokeDashoffset: 0,
      duration: 1.2,
      ease: 'power2.inOut',
      stagger: 0.15,
      scrollTrigger: { trigger: svg, start: 'top 90%', once: true },
    });
  });
}

/* ============================================================
   6. SCROLL PROGRESS BAR
============================================================ */
function initProgressBar() {
  const bar = document.querySelector('[data-progress]');
  if (!bar) return;
  gsap.to(bar, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
  });
}

/* ============================================================
   7. ECHARTS — glow + minimal, animated load, spring tooltip
   Lazily initialised via IntersectionObserver so the heavy
   library work happens only when the chart is near the viewport.
============================================================ */
async function initChart() {
  const el = document.querySelector('[data-chart]');
  if (!el) return;

  const echarts = await import('echarts');
  const chart = echarts.init(el, null, { renderer: 'canvas' });

  const x = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
  const series = [820, 932, 901, 1340, 1290, 1530, 1620, 1450, 1720, 1980, 2100, 2450];

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 48, right: 24, top: 32, bottom: 40 },
    xAxis: {
      type: 'category',
      data: x,
      boundaryGap: false,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
      axisLabel: { color: '#8c93a8' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      axisLabel: { color: '#8c93a8' },
    },
    tooltip: {
      trigger: 'axis',
      // Spring-physics feel: short transition + easing on the floating box.
      transitionDuration: 0.4,
      backgroundColor: 'rgba(10,13,22,0.9)',
      borderColor: 'rgba(108,140,255,0.5)',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: '#e9ecf5' },
      extraCssText: 'backdrop-filter: blur(8px); box-shadow: 0 0 30px rgba(108,140,255,0.35); border-radius: 12px;',
      axisPointer: { lineStyle: { color: 'rgba(108,140,255,0.4)' } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: series,
        showSymbol: false,
        lineStyle: {
          width: 3,
          color: '#6c8cff',
          shadowColor: 'rgba(108,140,255,0.8)', // the glow
          shadowBlur: 18,
        },
        itemStyle: {
          color: '#b06cff',
          shadowColor: 'rgba(176,108,255,0.9)',
          shadowBlur: 16,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(108,140,255,0.35)' },
            { offset: 1, color: 'rgba(108,140,255,0)' },
          ]),
        },
        emphasis: {
          scale: 1.6,
          itemStyle: { shadowBlur: 28 },
        },
        // Initial loading animation
        animationDuration: 1600,
        animationEasing: 'cubicOut',
      },
    ],
  });

  // Spring-y emphasis when hovering a data point.
  chart.on('mouseover', { seriesIndex: 0 }, () => {
    chart.setOption({ series: [{ symbolSize: 11 }] }, false);
  });
  chart.on('mouseout', { seriesIndex: 0 }, () => {
    chart.setOption({ series: [{ symbolSize: 8 }] }, false);
  });

  // Debounced resize to avoid layout thrash on rapid window changes.
  let raf;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => chart.resize());
  });
}

function observeChart() {
  const el = document.querySelector('[data-chart]');
  if (!el) return;
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          initChart();
          obs.disconnect();
        }
      });
    },
    { rootMargin: '200px' }
  );
  io.observe(el);
}

/* ============================================================
   BOOT
============================================================ */
function boot() {
  document.documentElement.classList.add('js-ready');
  initSmoothScroll();
  initTextReveals();
  initReveals();
  initParallax();
  initSvgDraw();
  initProgressBar();
  observeChart();

  // Refresh after fonts load so triggers measure correct positions.
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
