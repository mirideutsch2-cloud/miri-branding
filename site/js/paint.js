/* מירי דייטש · גרסה ג · משיכות צבע בתלת-ממד (Three.js). בנייה שלישית, לפי הסרטון של ingrassiadaniel.it ובקשת מירי:
   משיכות מכחול אמיתיות (לא נקודות) שבכל אזור יוצרות צורה אחרת, ומצלמה אחת שמסתובבת סביב הצורה ומשנה זוויות.
   - כל צורה בנויה ממאות משיכות. כל משיכה היא רצועה שפונה למצלמה, עם מרקם של סיבים, קצוות יבשים,
     ועובי שמתחיל מלא ונגמר דק, כמו מכחול שנגמר לו הצבע.
   - הצורות: 0 ה-M · 1 כתם עם טפטופים · 2 שלוש משיכות · 3 כדור עטוף משיכות · 4 רצועה מתפתלת · 5 מערבולת · 6 מסגרת.
     כל צורה יושבת במקום של העוגן שלה בדף (data-paint-shape). בגלילה המשיכות זורמות מצורה לצורה, וכל משיכה בזמן אחר.
   - המצלמה מסתובבת סביב הצורה עם הגלילה ועם הזמן, ונוטה קצת אחרי העכבר. מול המסגרת היא מתיישרת, כדי שהמסגרת תשב בדיוק סביב הטופס.
   - בטעינה המשיכות "נצבעות" על המסך. לחיצה שולחת גל דרך המשיכות.
   כל נפילה מדווחת בלוח הטיוטה. בלי WebGL הדף עובד עם רקע פחם. */
import * as THREE from "../vendor/three.module.min.js";

const MIRI = window.MIRI || { status: console.info, reduce: false };
const root = document.documentElement;
const canvas = document.querySelector(".p-canvas");

const small = innerWidth < 768;
const S = small ? 150 : 260; // משיכות
const K = 40;                // נקודות בכל משיכה
const FOV = 35, DIST = 4.2;
const TAU = Math.PI * 2;

/* ---------- אקראיות עם זרע, כדי שכל צורה תיבנה תמיד אותו דבר ---------- */
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + rand() * (b - a);

// עקומה חלקה (Catmull-Rom) דרך נקודות, בפרמטר 0..1
const spline = (pts) => (t) => {
  const n = pts.length - 1, f = Math.min(Math.max(t, 0), 0.9999) * n, i = Math.floor(f), u = f - i;
  const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, n)];
  return [0, 1, 2].map((d) => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u * u + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u * u * u));
};

/* ---------- הצורות: לכל משיכה פונקציה t → נקודה (בתוך רדיוס ~1) ---------- */
const M_LINE = spline([[-1, -0.6, 0], [-0.82, 0.25, 0], [-0.6, 0.62, 0], [-0.42, 0.2, 0], [-0.18, -0.35, 0], [0.02, 0.15, 0], [0.22, 0.6, 0], [0.42, 0.2, 0], [0.62, -0.35, 0], [0.85, -0.55, 0], [1, -0.4, 0]]);
let frameAspect = [1.4, 1];
const SHAPES = [
  // 0 · ה-M: משיכות לאורך קו ה-M, בשכבות בעומק
  () => { const a = rr(0, 0.45), b = a + rr(0.35, 0.6), off = rr(-0.13, 0.13), z = rr(-0.22, 0.22); return (t) => { const p = M_LINE(a + (b - a) * t), q = M_LINE(Math.min(a + (b - a) * t + 0.01, 1)); const nx = -(q[1] - p[1]), ny = q[0] - p[0], l = Math.hypot(nx, ny) || 1; return [p[0] + nx / l * off, p[1] + ny / l * off, z + 0.05 * Math.sin(t * 6 + off * 20)]; }; },
  // 1 · כתם עם טפטופים
  () => {
    if (rand() < 0.22) { const x = rr(-0.45, 0.45), len = rr(0.35, 0.75), z = rr(-0.1, 0.1); return (t) => [x + 0.02 * Math.sin(t * 5), -0.3 - len * t, z]; }
    const a0 = rr(0, TAU), sweep = rr(0.8, 2.2), r0 = rr(0, 0.12), r1 = rr(0.35, 0.8), z = rr(-0.25, 0.25);
    return (t) => { const a = a0 + sweep * t, r = r0 + (r1 - r0) * Math.sin(t * Math.PI * 0.5 + 0.3); return [Math.cos(a) * r, 0.18 + Math.sin(a) * r * 0.85, z * Math.cos(t * 2)]; };
  },
  // 2 · שלוש משיכות, כל אחת עשויה מעשרות סיבים
  () => { const band = Math.floor(rand() * 3), y = 0.6 - band * 0.6 + rr(-0.12, 0.12), z = rr(-0.2, 0.2), x0 = rr(-1.05, -0.8), x1 = rr(0.55, 1.05), w = rr(0.02, 0.06); return (t) => [x0 + (x1 - x0) * t, y + w * Math.sin(t * 7 + y * 9), z + 0.08 * Math.sin(t * 3)]; },
  // 3 · כדור עטוף משיכות (כמו הכדור ברפרנס)
  () => {
    const ax = new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize();
    const u = new THREE.Vector3(1, 0, 0).cross(ax); if (u.lengthSq() < 1e-3) u.set(0, 1, 0).cross(ax); u.normalize();
    const v = ax.clone().cross(u), a0 = rr(0, TAU), sw = rr(1, 2.4), r = rr(0.9, 1);
    return (t) => { const a = a0 + sw * t; return [(u.x * Math.cos(a) + v.x * Math.sin(a)) * r, (u.y * Math.cos(a) + v.y * Math.sin(a)) * r, (u.z * Math.cos(a) + v.z * Math.sin(a)) * r]; };
  },
  // 4 · רצועה מתפתלת באלכסון (כמו הרצועה ברפרנס)
  () => { const vv = rr(-1, 1), z = rr(-0.05, 0.05); return (t) => { const s = -1.15 + 2.3 * t, tw = s * 1.6, w = 0.32 * (1.15 - 0.55 * t); return [s * 0.9, s * 0.45 + Math.cos(tw) * vv * w, Math.sin(tw) * vv * w + z]; }; },
  // 5 · מערבולת
  () => { const ph = rr(0, TAU), turns = rr(0.6, 1.3), y0 = rr(-0.8, 0.5), dy = rr(0.2, 0.5); return (t) => { const a = ph + turns * TAU * t, r = 0.95 - 0.55 * t + 0.05 * Math.sin(ph * 3); return [Math.cos(a) * r, y0 + dy * t, Math.sin(a) * r * 0.8]; }; },
  // 6 · מסגרת סביב יצירת הקשר (היחס לפי המלבן של הטופס)
  () => {
    const [hw, hh] = frameAspect, per = 4 * (hw + hh), start = rr(0, per), len = rr(0.15, 0.45) * per * 0.35, off = rr(-0.05, 0.05), z = rr(-0.04, 0.04);
    const at = (s) => { s = ((s % per) + per) % per; if (s < 2 * hw) return [-hw + s, hh + off]; s -= 2 * hw; if (s < 2 * hh) return [hw + off, hh - s]; s -= 2 * hh; if (s < 2 * hw) return [hw - s, -hh - off]; s -= 2 * hw; return [-hw - off, -hh + s]; };
    return (t) => { const p = at(start + len * t); return [p[0], p[1], z]; };
  },
];

const buildShape = (id) => {
  seed = 1000 + id * 977;
  const out = new Float32Array(S * K * 3);
  for (let s = 0; s < S; s++) {
    const f = SHAPES[id]();
    for (let k = 0; k < K; k++) out.set(f(k / (K - 1)), (s * K + k) * 3);
  }
  return out;
};

const start = () => {
  if (!canvas) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); }
  catch (e) { MIRI.status("צבע: אין WebGL · רקע פחם בלי משיכות"); return; }
  const stage = getComputedStyle(root).getPropertyValue("--stage").trim() || "#19181D";
  renderer.setClearColor(stage, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);

  /* ---------- הגיאומטריה: כל משיכה היא רצועה של K×2 קודקודים ---------- */
  const anchors = [...document.querySelectorAll("[data-paint-shape]")].map((el) => ({ el, id: +el.dataset.paintShape, sec: el.closest("section, footer") || el }));
  const frameEl = anchors.find((a) => a.id === 6)?.el;
  const setFrameAspect = () => { if (!frameEl) return; const b = frameEl.getBoundingClientRect(), m = Math.min(b.width, b.height) || 1; frameAspect = [b.width / m, b.height / m]; };
  setFrameAspect();
  let shapes = SHAPES.map((_, i) => buildShape(i));

  const V = S * K * 2;
  const pos = new Float32Array(V * 3), tan = new Float32Array(V * 3), off = new Float32Array(V * 2);
  const uv = new Float32Array(V * 2), stroke = new Float32Array(V * 4);
  const idx = [];
  seed = 42;
  const strokeInfo = [];
  for (let s = 0; s < S; s++) {
    const c = rand(), color = c < 0.66 ? 0 : c < 0.93 ? 1 : 2; // אוף-וויט / פוקסיה / פוקסיה כהה
    const info = { width: rr(0.025, 0.075) * (rand() < 0.12 ? 1.8 : 1), seed: rand(), color, delay: rand() };
    strokeInfo.push(info);
    for (let k = 0; k < K; k++) for (let side = 0; side < 2; side++) {
      const v = (s * K + k) * 2 + side;
      uv.set([k / (K - 1), side ? 1 : -1], v * 2);
      stroke.set([info.width, info.seed, info.color, info.delay], v * 4);
    }
    for (let k = 0; k < K - 1; k++) { const a = (s * K + k) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const tanAttr = new THREE.BufferAttribute(tan, 3).setUsage(THREE.DynamicDrawUsage);
  const offAttr = new THREE.BufferAttribute(off, 2).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", posAttr); geo.setAttribute("aTan", tanAttr); geo.setAttribute("aOff", offAttr);
  geo.setAttribute("aUv", new THREE.BufferAttribute(uv, 2)); geo.setAttribute("aStroke", new THREE.BufferAttribute(stroke, 4));
  geo.setIndex(idx);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uScale: { value: 1 }, uIntro: { value: 0 }, uDist: { value: DIST },
      uColors: { value: [new THREE.Color("#F3F3F1"), new THREE.Color("#EC008C"), new THREE.Color("#A8005F")] } },
    vertexShader: `
      attribute vec3 aTan; attribute vec2 aOff; attribute vec2 aUv; attribute vec4 aStroke;
      uniform float uScale, uIntro, uDist;
      varying vec2 vUv; varying vec4 vS; varying float vFade, vReveal;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 tv = (modelViewMatrix * vec4(aTan, 0.0)).xyz;
        vec3 side = normalize(cross(normalize(tv + 1e-6), vec3(0.0, 0.0, 1.0)) + 1e-6);
        float taper = pow(sin(3.14159 * clamp(aUv.x * 0.94 + 0.03, 0.0, 1.0)), 0.45) * (1.0 - 0.45 * aUv.x);
        mv.xyz += side * aUv.y * aStroke.x * uScale * taper;
        vec4 cp = projectionMatrix * mv;
        cp.xy += aOff * cp.w;
        gl_Position = cp;
        vUv = aUv; vS = aStroke;
        vFade = clamp(1.25 - (-mv.z - uDist) * 0.4 / max(uScale, 0.2), 0.62, 1.0);
        vReveal = clamp((uIntro - aStroke.w * 0.55) / 0.45, 0.0, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColors[3];
      varying vec2 vUv; varying vec4 vS; varying float vFade, vReveal;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
      void main(){
        float a = vUv.x, c = vUv.y, sd = vS.y * 97.0;
        if (a > vReveal) discard;                                     // המשיכה נצבעת מההתחלה לסוף
        float fib = noise(vec2(a * 4.0 + sd, c * 9.0 + sd));          // סיבים לאורך המשיכה
        float fine = noise(vec2(a * 1.5 + sd * 1.7, c * 34.0));       // סיבים דקים
        float edge = 1.0 - smoothstep(0.62, 1.0, abs(c) + (fib - 0.5) * 0.5);
        float dry = smoothstep(0.55, 1.0, a);                          // הצבע נגמר לקראת הסוף
        float gaps = smoothstep(0.18 + 0.45 * dry, 0.42 + 0.4 * dry, fine);
        float alpha = edge * mix(1.0, gaps, 0.25 + 0.75 * dry) * smoothstep(0.0, 0.035, a);
        vec3 col = vS.z < 0.5 ? uColors[0] : vS.z < 1.5 ? uColors[1] : uColors[2];
        col *= 0.86 + 0.2 * fine + 0.08 * (1.0 - abs(c));             // גוף מעוגל ופסים של מכחול
        col += pow(fine, 6.0) * 0.18;                                  // ברק רטוב
        gl_FragColor = vec4(col * vFade, alpha * 0.95);
      }`,
  });
  scene.add(new THREE.Mesh(geo, mat));

  /* ---------- קלט ---------- */
  const still = () => MIRI.reduce || root.classList.contains("a11y-motion");
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let wave = null;
  addEventListener("pointermove", (e) => {
    if (still()) return;
    tilt.tx = (e.clientX / innerWidth - 0.5) * 2; tilt.ty = (e.clientY / innerHeight - 0.5) * 2;
    wake();
  }, { passive: true });
  addEventListener("pointerdown", (e) => {
    if (still() || e.target.closest("a, button, input, textarea, select, label, summary, .a11y")) return;
    wave = performance.now(); wake();
  }, { passive: true });

  /* ---------- מיקום: מעוגן במסך לעולם ---------- */
  const pxPerWorld = () => innerHeight / (2 * DIST * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
  const placeOf = (a) => {
    const b = a.el.getBoundingClientRect();
    const ndc = [((b.left + b.right) / 2 / innerWidth) * 2 - 1, -(((b.top + b.bottom) / 2 / innerHeight) * 2 - 1)];
    return { ndc, scale: (Math.min(b.width, b.height) / 2) / pxPerWorld() };
  };

  /* ---------- ציור ---------- */
  let running = true, raf = 0, frozenT = 0, slow = 0, frames = 0, last = 0, drawn = S;
  const t0 = performance.now();
  const introFrom = still() ? -1e9 : t0;
  const wake = () => { if (!raf && running) raf = requestAnimationFrame(frame); };

  function frame(now) {
    raf = 0;
    if (!running) return;
    const isStill = still();
    const W = innerWidth, H = innerHeight;
    const size = renderer.getSize(new THREE.Vector2());
    if (size.x !== W || size.y !== H) { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
    const t = isStill ? frozenT : (now - t0) / 1000;
    if (!isStill) frozenT = t;

    // הצורה של האזור שבמרכז המסך, ומעבר לבאה ב-35% האחרונים שלו
    const mid = H * 0.5;
    let k = 0, f = 0;
    anchors.forEach((a, i) => { const b = a.sec.getBoundingClientRect(); if (b.top <= mid) { k = i; f = (mid - b.top) / Math.max(b.height, 1); } });
    const A = anchors[k], B = anchors[Math.min(k + 1, anchors.length - 1)];
    const mix = A === B ? 0 : Math.min(Math.max((f - 0.65) / 0.35, 0), 1);
    const pa = placeOf(A), pb = placeOf(B);
    const sA = shapes[A.id], sB = shapes[B.id];

    // מצלמה אחת שמסתובבת סביב הצורה: עם הגלילה ועם הזמן, ונוטה אחרי העכבר. מול המסגרת היא מתיישרת
    const frontal = (A.id === 6 ? 1 - mix : 0) + (B.id === 6 ? mix : 0);
    tilt.x += (tilt.tx - tilt.x) * 0.05; tilt.y += (tilt.ty - tilt.y) * 0.05;
    const yaw = (Math.sin(scrollY * 0.0016 + t * 0.12) * 0.95 + tilt.x * 0.22) * (1 - frontal);
    const pitch = (Math.sin(scrollY * 0.0011 + t * 0.09 + 1) * 0.32 - tilt.y * 0.14) * (1 - frontal);
    camera.position.set(DIST * Math.sin(yaw) * Math.cos(pitch), DIST * Math.sin(pitch), DIST * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(0, 0, 0);

    // המשיכות: כל אחת עוברת לצורה הבאה בזמן קצת אחר, ובאמצע המעבר היא נוזלת
    const waveAge = wave ? (now - wave) / 1000 : 9;
    const waveAmp = waveAge < 3 ? 0.12 * Math.exp(-waveAge * 1.6) : 0;
    let alive = waveAmp > 0;
    for (let s = 0; s < drawn; s++) {
      const inf = strokeInfo[s];
      let m = Math.min(Math.max((mix - inf.delay * 0.4) / 0.6, 0), 1); m = m * m * (3 - 2 * m);
      const tr = Math.sin(m * Math.PI);
      const sc = pa.scale + (pb.scale - pa.scale) * m;
      const ox = pa.ndc[0] + (pb.ndc[0] - pa.ndc[0]) * m, oy = pa.ndc[1] + (pb.ndc[1] - pa.ndc[1]) * m;
      const ph = inf.seed * TAU;
      for (let j = 0; j < K; j++) {
        const i3 = (s * K + j) * 3;
        const sw = isStill ? 0 : tr * 0.55 * Math.sin(ph + j * 0.18 + t * 1.3);
        const breathe = isStill ? 0 : 0.012 * Math.sin(t * 1.1 + j * 0.25 + ph);
        const wv = waveAmp * Math.sin(j * 0.45 - waveAge * 10 + ph);
        const x = (sA[i3] + (sB[i3] - sA[i3]) * m + sw * Math.cos(ph) + wv) * sc;
        const y = (sA[i3 + 1] + (sB[i3 + 1] - sA[i3 + 1]) * m + sw * Math.sin(ph * 1.3) + breathe + wv) * sc;
        const z = (sA[i3 + 2] + (sB[i3 + 2] - sA[i3 + 2]) * m + sw * Math.sin(ph)) * sc;
        const v = (s * K + j) * 2;
        pos[v * 3] = pos[v * 3 + 3] = x; pos[v * 3 + 1] = pos[v * 3 + 4] = y; pos[v * 3 + 2] = pos[v * 3 + 5] = z;
        off[v * 2] = off[v * 2 + 2] = ox; off[v * 2 + 1] = off[v * 2 + 3] = oy;
      }
      // כיוון המשיכה בכל נקודה
      for (let j = 0; j < K; j++) {
        const a = (s * K + Math.max(j - 1, 0)) * 2, b = (s * K + Math.min(j + 1, K - 1)) * 2, v = (s * K + j) * 2;
        const dx = pos[b * 3] - pos[a * 3], dy = pos[b * 3 + 1] - pos[a * 3 + 1], dz = pos[b * 3 + 2] - pos[a * 3 + 2];
        tan[v * 3] = tan[v * 3 + 3] = dx; tan[v * 3 + 1] = tan[v * 3 + 4] = dy; tan[v * 3 + 2] = tan[v * 3 + 5] = dz;
      }
    }
    posAttr.needsUpdate = tanAttr.needsUpdate = offAttr.needsUpdate = true;
    geo.setDrawRange(0, (drawn * (K - 1)) * 6);
    mat.uniforms.uScale.value = pa.scale + (pb.scale - pa.scale) * mix;
    const intro = isStill ? 1 : Math.min((now - introFrom) / 2400, 1);
    if (intro < 1) alive = true;
    mat.uniforms.uIntro.value = intro;
    renderer.render(scene, camera);

    // מכשיר איטי: פחות משיכות, פעם אחת, ואומרים את זה
    if (frames < 120 && !isStill) {
      frames++;
      if (last && now - last > 40) slow++;
      if (frames === 120 && slow > 50) { drawn = Math.floor(S * 0.55); MIRI.status("צבע: מכשיר איטי · פחות משיכות"); }
    }
    last = now;
    if (!isStill || alive || Math.abs(tilt.tx - tilt.x) > 0.01) raf = requestAnimationFrame(frame);
  }

  addEventListener("scroll", wake, { passive: true });
  addEventListener("resize", () => { clearTimeout(start.rt); start.rt = setTimeout(() => { setFrameAspect(); shapes[6] = buildShape(6); wake(); }, 150); });
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) wake(); });
  new MutationObserver(wake).observe(root, { attributes: true, attributeFilter: ["class"] }); // תפריט הנגישות
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); running = false; root.classList.remove("paint-on"); MIRI.status("צבע: הקשר WebGL אבד · רקע פחם"); });

  root.classList.add("paint-on");
  MIRI.paintLoaded = true;
  wake();
};

if (document.fonts?.ready) document.fonts.ready.then(start); else start();
