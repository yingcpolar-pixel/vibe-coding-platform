/* ============================================================================
   C-POLAR — shared WebGL charge-field background (ES module)
   Echoes the immersive homepage: drifting charged particles (cyan = positive,
   red = negative, neutral motes) that react to scroll (parallax dolly) and the
   pointer. Original, lightweight scene — NOT the homepage's bespoke molecule.

   Fail-safe: if WebGL is unavailable or errors, this returns quietly and the 2D
   #bg-canvas fallback in site.js keeps running. Reduced-motion → skipped.
   Perf: DPR capped, additive points (no depth write), paused when tab hidden.
   ============================================================================ */
import * as THREE from 'three';

(function () {
  var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCE) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'field-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { canvas.remove(); return; }       // WebGL missing → 2D fallback stays
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setSize(innerWidth, innerHeight);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 120);
  camera.position.z = 16;

  // particle volume
  var N = Math.min(2600, Math.max(900, Math.floor(innerWidth * innerHeight / 850)));
  var pos = new Float32Array(N * 3), col = new Float32Array(N * 3), siz = new Float32Array(N);
  var cy = new THREE.Color('#34e1ff'), rd = new THREE.Color('#ff5566'), ne = new THREE.Color('#8fa6c8');
  for (var i = 0; i < N; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 46;
    pos[i*3+1] = (Math.random() - 0.5) * 34;
    pos[i*3+2] = (Math.random() - 0.5) * 28;
    var r = Math.random(), c = r < 0.14 ? rd : (r < 0.46 ? cy : ne);
    col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    siz[i] = Math.random() * 2.0 + 0.5;
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));

  var mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPix: { value: renderer.getPixelRatio() } },
    vertexShader:
      'attribute float aSize; attribute vec3 color; varying vec3 vCol; varying float vA;' +
      'uniform float uTime; uniform float uPix;' +
      'void main(){ vCol=color; vec3 p=position;' +
      '  p.x += sin(uTime*0.18 + position.y*0.25)*0.7;' +
      '  p.y += cos(uTime*0.15 + position.x*0.2)*0.6;' +
      '  vec4 mv = modelViewMatrix*vec4(p,1.0); float d=-mv.z;' +
      '  vA = smoothstep(60.0,8.0,d);' +
      '  gl_PointSize = aSize*uPix*(70.0/max(d,1.0));' +
      '  gl_Position = projectionMatrix*mv; }',
    fragmentShader:
      'varying vec3 vCol; varying float vA;' +
      'void main(){ vec2 uv=gl_PointCoord-0.5; float r=length(uv);' +
      '  float a=smoothstep(0.5,0.0,r);' +
      '  gl_FragColor=vec4(vCol, a*vA*0.55); }'
  });
  var points = new THREE.Points(geo, mat);
  scene.add(points);

  // WebGL is live → retire the 2D fallback (site.js loop checks this flag)
  window.__field = true;
  var bg = document.getElementById('bg-canvas'); if (bg) bg.style.display = 'none';

  // interaction state
  var tx = 0, ty = 0, px = 0, py = 0, sY = 0;
  addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  function readScroll() { sY = (window.__lenis && typeof window.__lenis.scroll === 'number') ? window.__lenis.scroll : (window.scrollY || 0); }
  addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  function resize() {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); mat.uniforms.uPix.value = renderer.getPixelRatio();
  }
  addEventListener('resize', resize, { passive: true });

  var clock = new THREE.Clock(), running = true;
  document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) loop(); });

  function loop() {
    if (!running) return;
    var t = clock.getElapsedTime();
    mat.uniforms.uTime.value = t;
    readScroll();
    px += (tx - px) * 0.04; py += (ty - py) * 0.04;
    camera.position.x = px * 3.2;
    camera.position.y = -py * 2.2 - sY * 0.0016;     // scroll dollies the field (parallax)
    points.rotation.y = px * 0.12 + t * 0.012;
    points.rotation.x = py * 0.07;
    camera.lookAt(0, camera.position.y * 0.6, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  resize(); loop();
})();
