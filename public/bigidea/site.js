/* ============================================================================
   C-POLAR — editorial motion engine (shared sub-page enhancement)
   Lenis smooth scroll · GSAP ScrollTrigger · Splitting kinetic type · parallax
   · SVG line-draw · velocity marquee · counters · magnetic/tilt. All additive
   and fail-safe: with JS/CDN off the pages are fully readable; reduced-motion
   shows final states; a 4s failsafe force-reveals everything.
   ============================================================================ */
(function () {
  'use strict';
  var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  root.classList.add('js');
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var canMotion = hasGSAP && !REDUCE;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
  if (canMotion) root.classList.add('is-armed');

  /* ---------- mobile menu (a11y) ---------- */
  function initMenu() {
    var toggle = document.querySelector('.nav-toggle'), nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;
    function set(o){ nav.classList.toggle('open', o); toggle.setAttribute('aria-expanded', o?'true':'false'); }
    toggle.addEventListener('click', function(){ set(toggle.getAttribute('aria-expanded')!=='true'); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){set(false);toggle.focus();} });
    document.addEventListener('click', function(e){ if(nav.classList.contains('open')&&!nav.contains(e.target)&&!toggle.contains(e.target)) set(false); });
    nav.addEventListener('click', function(e){ if(e.target.closest('a')) set(false); });
  }

  function initActiveNav() {
    var here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav a').forEach(function(a){
      var href=(a.getAttribute('href')||'').split('/').pop();
      if(href===here && !a.classList.contains('btn-shop')) a.setAttribute('aria-current','page');
    });
  }

  function initHeader() {
    var h=document.querySelector('.site-header'); if(!h) return;
    var f=function(){ h.classList.toggle('shrink', (window.scrollY||window.pageYOffset)>12); };
    f(); addEventListener('scroll', f, {passive:true});
  }

  /* ---------- Lenis smooth scroll, on the single GSAP ticker ---------- */
  function initLenis() {
    if (!canMotion || !window.Lenis) return;
    var lenis = new Lenis({ duration: 1.15, smoothWheel: true, lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function(t){ lenis.raf(t*1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(e){
        var t=document.querySelector(a.getAttribute('href')); if(t){ e.preventDefault(); lenis.scrollTo(t,{offset:-20}); }
      });
    });
    window.__lenis = lenis;
  }

  /* ---------- kinetic split-text ---------- */
  function initSplit() {
    var targets = document.querySelectorAll('[data-splitting]');
    if (!targets.length) return;
    if (!canMotion || !window.Splitting) { targets.forEach(function(el){ el.style.opacity=1; }); return; }
    Splitting({ target: targets, by: 'chars' });
    targets.forEach(function(el){
      el.style.opacity = 1;
      var chars = el.querySelectorAll('.char');
      gsap.set(chars, { yPercent: 115, opacity: 0 });
      gsap.to(chars, {
        yPercent: 0, opacity: 1, duration: 0.78, ease: 'power3.out', stagger: 0.016, force3D: true,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onStart: function(){ el.style.willChange='transform'; },
        onComplete: function(){ el.style.willChange='auto'; gsap.set(chars,{clearProps:'transform'}); }
      });
    });
  }

  /* ---------- generic reveals ---------- */
  function initReveal() {
    var els = [].slice.call(document.querySelectorAll('.reveal'));
    if (!els.length) return;
    if (!canMotion) { root.classList.remove('is-armed'); els.forEach(function(e){e.style.opacity=1;}); return; }
    els.forEach(function(el){
      gsap.set(el, { opacity:0, y:30 });
      gsap.to(el, { opacity:1, y:0, duration:0.8, ease:'power3.out', delay:(+(el.getAttribute('data-delay')||0))/1000, force3D:true,
        scrollTrigger:{ trigger:el, start:'top 86%', once:true } });
    });
  }

  /* ---------- parallax depth ---------- */
  function initParallax() {
    if (!canMotion) return;
    gsap.utils.toArray('.parallax-layer').forEach(function(layer){
      var s=parseFloat(layer.getAttribute('data-speed'))||0.3;
      gsap.to(layer, { yPercent:-s*100, ease:'none', force3D:true,
        scrollTrigger:{ trigger:layer.closest('.section')||layer, start:'top bottom', end:'bottom top', scrub:true } });
    });
    // subtle parallax drift on elements tagged data-parallax
    gsap.utils.toArray('[data-parallax]').forEach(function(el){
      var s=parseFloat(el.getAttribute('data-parallax'))||0.15;
      gsap.to(el, { yPercent:-s*100, ease:'none',
        scrollTrigger:{ trigger:el, start:'top bottom', end:'bottom top', scrub:true } });
    });
  }

  /* ---------- SVG line-draw icons ---------- */
  function initDraw() {
    document.querySelectorAll('.ico-draw').forEach(function(svg){
      var parts = svg.querySelectorAll('path,circle,rect,line,polyline,polygon');
      parts.forEach(function(p){
        var len = (p.getTotalLength && p.getTotalLength()) || 120;
        p.style.strokeDasharray = len;
        if (!canMotion) { p.style.strokeDashoffset = 0; return; }
        p.style.strokeDashoffset = len;
        gsap.to(p, { strokeDashoffset:0, duration:1.05, ease:'power2.inOut',
          scrollTrigger:{ trigger:svg, start:'top 92%', once:true } });
      });
    });
  }

  /* ---------- velocity-aware marquee ---------- */
  function initMarquee() {
    document.querySelectorAll('.marquee').forEach(function(m){
      var track=m.querySelector('.marquee-track'); if(!track) return;
      // duplicate content for a seamless loop
      track.innerHTML += track.innerHTML;
      if (!canMotion) return;
      var w = track.scrollWidth/2;
      var x = 0, dir = (m.getAttribute('data-dir')==='right')?1:-1, base = 0.5;
      gsap.ticker.add(function(){
        var v = window.__lenis ? Math.min(3, Math.abs(window.__lenis.velocity||0)*0.25) : 0;
        x += dir*(base + v);
        if (x <= -w) x += w; if (x >= 0 && dir>0) x -= w;
        track.style.transform = 'translate3d('+x+'px,0,0)';
      });
    });
  }

  /* ---------- counters ---------- */
  function initCounters() {
    if (!canMotion) { forceCounts(); return; }
    gsap.utils.toArray('[data-count]').forEach(function(el){
      ScrollTrigger.create({ trigger:el, start:'top 95%', once:true, onEnter:function(){ countUp(el); } });
    });
  }
  function countUp(el){
    if (el.dataset.done) return; el.dataset.done='1';
    var end=parseFloat(el.getAttribute('data-count')), suf=el.getAttribute('data-suffix')||'';
    gsap.to({v:0},{v:end,duration:1.3,ease:'power2.out',onUpdate:function(){el.textContent=Math.round(this.targets()[0].v)+suf;}});
  }
  function forceCounts(){ document.querySelectorAll('[data-count]').forEach(function(el){ el.dataset.done='1'; el.textContent=el.getAttribute('data-count')+(el.getAttribute('data-suffix')||''); }); }

  /* ---------- comparison bars ---------- */
  function initBars() {
    var bars = document.querySelectorAll('.bar .fill[data-w]');
    if (!bars.length) return;
    bars.forEach(function(el){
      if (!canMotion){ el.style.width=el.getAttribute('data-w')+'%'; return; }
      ScrollTrigger.create({ trigger:el.closest('.bars')||el, start:'top 85%', once:true,
        onEnter:function(){ gsap.to(el,{width:el.getAttribute('data-w')+'%',duration:1.1,ease:'power3.out'}); } });
    });
  }

  /* ---------- interactions: magnetic + tilt ---------- */
  function initInteractions() {
    if (!canMotion) return;
    gsap.utils.toArray('.btn-primary,.btn-shop').forEach(function(btn){
      btn.addEventListener('pointermove', function(e){ var r=btn.getBoundingClientRect();
        gsap.to(btn,{x:(e.clientX-r.left-r.width/2)*0.3,y:(e.clientY-r.top-r.height/2)*0.45,duration:0.3,ease:'power3.out'}); });
      btn.addEventListener('pointerleave', function(){ gsap.to(btn,{x:0,y:0,duration:0.5,ease:'elastic.out(1,0.4)'}); });
    });
    gsap.utils.toArray('.cell,.chip').forEach(function(card){
      card.addEventListener('pointermove', function(e){ var r=card.getBoundingClientRect();
        gsap.to(card,{rotateY:((e.clientX-r.left)/r.width-0.5)*6,rotateX:-((e.clientY-r.top)/r.height-0.5)*6,
          duration:0.3,transformPerspective:800,ease:'power2.out'}); });
      card.addEventListener('pointerleave', function(){ gsap.to(card,{rotateX:0,rotateY:0,duration:0.6,ease:'elastic.out(1,0.5)'}); });
    });
  }

  /* ---------- ambient charge field (canvas) ---------- */
  function initCanvas() {
    var c=document.getElementById('bg-canvas'); if(!c||REDUCE) return;
    var ctx=c.getContext('2d'), DPR=Math.min(2,devicePixelRatio||1), w,h,pts=[];
    function resize(){ w=c.width=Math.floor(innerWidth*DPR); h=c.height=Math.floor(innerHeight*DPR);
      c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px';
      var n=Math.min(64,Math.floor(innerWidth*innerHeight/28000)); pts=[];
      for(var i=0;i<n;i++) pts.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.1*DPR,vy:(Math.random()-.5)*.1*DPR,r:(Math.random()*1.5+.5)*DPR,neg:Math.random()<.2}); }
    var mx=-1e4,my=-1e4;
    addEventListener('pointermove',function(e){mx=e.clientX*DPR;my=e.clientY*DPR;},{passive:true});
    function frame(){ if(window.__field){ ctx.clearRect(0,0,w,h); return; } ctx.clearRect(0,0,w,h);
      for(var i=0;i<pts.length;i++){ var p=pts[i],dx=mx-p.x,dy=my-p.y;
        if(dx*dx+dy*dy<(150*DPR)*(150*DPR)){p.vx+=dx*.00016;p.vy+=dy*.00016;}
        p.x+=p.vx;p.y+=p.vy;p.vx*=.99;p.vy*=.99;
        if(p.x<0)p.x+=w;if(p.x>w)p.x-=w;if(p.y<0)p.y+=h;if(p.y>h)p.y-=h;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.283);ctx.fillStyle=p.neg?'rgba(255,85,102,.5)':'rgba(150,180,210,.38)';ctx.fill(); }
      requestAnimationFrame(frame); }
    resize(); addEventListener('resize',resize,{passive:true}); requestAnimationFrame(frame);
  }

  /* ---------- contact form ---------- */
  function initForm() {
    var form=document.querySelector('.contact-form'); if(!form) return;
    form.addEventListener('submit', function(e){ e.preventDefault();
      var s=form.querySelector('.form-status'); if(s){s.hidden=false;s.setAttribute('role','status');}
      form.querySelector('button[type="submit"]').textContent='Message sent →'; });
  }

  /* ---------- boot ---------- */
  function init() {
    initMenu(); initActiveNav(); initHeader();
    initLenis(); initSplit(); initReveal(); initParallax(); initDraw();
    initMarquee(); initCounters(); initBars(); initInteractions(); initCanvas(); initForm();
    if (hasGSAP) setTimeout(function(){ ScrollTrigger.refresh(); }, 380);
    // failsafe: never strand content
    setTimeout(function(){
      document.querySelectorAll('[data-splitting] .char,.reveal').forEach(function(n){ n.style.opacity='1'; n.style.transform='none'; });
      forceCounts();
      document.querySelectorAll('.bar .fill[data-w]').forEach(function(el){ if(!el.style.width||el.style.width==='0px') el.style.width=el.getAttribute('data-w')+'%'; });
    }, 4500);
  }
  if (document.readyState==='loading') addEventListener('DOMContentLoaded', init); else init();
})();
