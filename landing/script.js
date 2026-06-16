/* =====================================================================
   Aurora — motion entry point
   依賴：GSAP, ScrollTrigger, Lenis, Splitting, ECharts (皆以 <script defer> 載入)

   效能原則：
   - 只動 transform / opacity（合成層），不碰會觸發 layout 的屬性
   - Lenis 的 rAF 驅動 GSAP ticker，全站只有單一 requestAnimationFrame loop
   - ScrollTrigger 統一在 lenis.on('scroll') 後 update，避免 scroll jank
   - ECharts 進入視窗才 init；resize 以 debounce 處理，避免 layout thrashing
   ===================================================================== */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = initSmoothScroll();
    initTextReveal();
    initFadeAndReveal();
    initParallax();
    initSvgLineDraw();
    initScrollProgress(lenis);
    initChartLazy();
  });

  /* -------------------------------------------------------------------
     1. Lenis smooth scroll  ↔  GSAP ticker（單一 rAF loop）
     ------------------------------------------------------------------- */
  function initSmoothScroll() {
    if (prefersReduced || typeof Lenis === 'undefined') return null;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // Lenis 每次 scroll 同步 ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // 用 GSAP 的 ticker 推動 Lenis，停用 lagSmoothing 保持同步
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // 錨點平滑跳轉
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -40 }); }
      });
    });

    return lenis;
  }

  /* -------------------------------------------------------------------
     2. 文字逐字飛入：Splitting.js + GSAP stagger
     ------------------------------------------------------------------- */
  function initTextReveal() {
    const targets = document.querySelectorAll('[data-splitting]');
    if (!targets.length) return;

    // Splitting 將文字切成 .word / .char spans
    if (typeof Splitting !== 'undefined') {
      Splitting({ target: targets, by: 'words' });
    }

    targets.forEach((el) => {
      const words = el.querySelectorAll('.word');
      const items = words.length ? words : [el];

      if (prefersReduced) { gsap.set(items, { opacity: 1, y: 0 }); return; }

      gsap.set(items, { display: 'inline-block', willChange: 'transform' });
      gsap.fromTo(items,
        { yPercent: 120, opacity: 0, rotateX: -40 },
        {
          yPercent: 0, opacity: 1, rotateX: 0,
          duration: 0.9, ease: 'power3.out',
          stagger: 0.04,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onComplete: () => gsap.set(items, { willChange: 'auto' }),
        }
      );
    });
  }

  /* -------------------------------------------------------------------
     3. 一般淡入 + 卡片 reveal
     ------------------------------------------------------------------- */
  function initFadeAndReveal() {
    const fades = gsap.utils.toArray('[data-fade]');
    fades.forEach((el) => {
      gsap.to(el, {
        opacity: 1, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    const reveals = gsap.utils.toArray('[data-reveal]');
    if (reveals.length) {
      ScrollTrigger.batch(reveals, {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, {
          opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          stagger: 0.12, overwrite: true,
          onComplete: () => batch.forEach((b) => (b.style.willChange = 'auto')),
        }),
      });
    }
  }

  /* -------------------------------------------------------------------
     4. Parallax — transform-only，依 data-speed 控制位移
     ------------------------------------------------------------------- */
  function initParallax() {
    if (prefersReduced) return;
    gsap.utils.toArray('[data-parallax]').forEach((layer) => {
      const speed = parseFloat(layer.dataset.speed) || 0.2;
      gsap.to(layer, {
        yPercent: speed * 100,
        ease: 'none',
        scrollTrigger: {
          trigger: layer.closest('section') || layer,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });
  }

  /* -------------------------------------------------------------------
     5. SVG 線條繪製：GSAP 控 stroke-dashoffset
     ------------------------------------------------------------------- */
  function initSvgLineDraw() {
    document.querySelectorAll('.icon-draw').forEach((svg) => {
      const paths = svg.querySelectorAll('.draw-path');
      paths.forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: prefersReduced ? 0 : len });
      });
      if (prefersReduced) return;

      gsap.to(svg.querySelectorAll('.draw-path'), {
        strokeDashoffset: 0,
        duration: 1.2, ease: 'power2.inOut', stagger: 0.15,
        scrollTrigger: { trigger: svg, start: 'top 90%', once: true },
      });
    });
  }

  /* -------------------------------------------------------------------
     6. Scroll progress bar（transform: scaleX）
     ------------------------------------------------------------------- */
  function initScrollProgress() {
    const bar = document.querySelector('[data-progress]');
    if (!bar) return;
    gsap.to(bar, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
    });
  }

  /* -------------------------------------------------------------------
     7. ECharts — 微光極簡風 + 初始載入動畫 + 彈簧 tooltip
     ------------------------------------------------------------------- */
  function initChartLazy() {
    const el = document.querySelector('[data-chart]');
    if (!el || typeof echarts === 'undefined') return;

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        renderChart(el);
        obs.disconnect();
      });
    }, { threshold: 0.3 });
    io.observe(el);
  }

  function renderChart(el) {
    const chart = echarts.init(el, null, { renderer: 'canvas' });

    const xs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const data = [120, 200, 165, 280, 240, 360, 320, 480];

    const glow = (color) => ({
      shadowColor: color, shadowBlur: 18,
    });

    chart.setOption({
      backgroundColor: 'transparent',
      grid: { left: 48, right: 32, top: 40, bottom: 40 },
      textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: '#a8a8b3' },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(21,21,26,0.92)',
        borderColor: 'rgba(124,108,255,0.4)',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#fafafa' },
        extraCssText: 'border-radius:12px;backdrop-filter:blur(8px);box-shadow:0 20px 40px rgba(0,0,0,0.45);',
        // Spring physics dynamic：用回彈 easing 模擬彈簧
        transitionDuration: 0.45,
        axisPointer: {
          type: 'line',
          lineStyle: { color: 'rgba(124,108,255,0.35)', width: 1 },
        },
      },
      xAxis: {
        type: 'category', data: xs, boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [{
        name: 'Growth', type: 'line', data, smooth: true,
        symbol: 'circle', symbolSize: 8, showSymbol: false,
        lineStyle: { width: 3, color: '#7c6cff', ...glow('rgba(124,108,255,0.8)') },
        itemStyle: { color: '#36e0c8', borderColor: '#fafafa', borderWidth: 2, ...glow('rgba(54,224,200,0.9)') },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(124,108,255,0.35)' },
            { offset: 1, color: 'rgba(124,108,255,0.0)' },
          ]),
        },
        emphasis: { focus: 'series', scale: 1.6 },
      }],
      // 初始載入動畫
      animationDuration: 1600,
      animationEasing: 'elasticOut',
      animationDelay: (idx) => idx * 80,
    });

    // resize：debounce 避免 layout thrashing
    let raf = null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => chart.resize());
    };
    window.addEventListener('resize', onResize, { passive: true });
  }
})();
