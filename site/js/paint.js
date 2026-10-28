/* מירי דייטש · גרסה ג · רסיסי צבע (WebGL, בלי ספריות). בנייה שנייה, לפי הסרטון של ingrassiadaniel.it.
   אלפי רסיסים קטנים (רובם אוף-וויט, מעטים פוקסיה, בגדלים שונים כמו התזה של צבע) על רקע פחם.
   בכל אזור הם מתקבצים לצורת צבע אחרת, במקום של העוגן שלה בדף (data-paint-shape), ועוברים בגלילה לצורה הבאה:
   0 ה-M של הלוגו · 1 כתם עם טפטופים · 2 שלוש משיכות מכחול · 3 התזה עגולה · 4 משיכה אלכסונית · 5 ריסוס · 6 מסגרת.
   כ-12% מהרסיסים הם אבק שנשאר פזור על כל המסך. העכבר והאצבע מזיזים את הרסיסים, ולחיצה מתיזה אותם.
   כל צורה נדגמת פעם אחת מציור בקנבס דו-ממדי, וכל התנועה מחושבת ב-GPU. כל נפילה מדווחת בלוח הטיוטה. */

const MIRI = window.MIRI || { status: console.info, reduce: false };
const root = document.documentElement;
const canvas = document.querySelector(".p-canvas");

// ה-M של הלוגו (מתוך img/logo-miri.svg, הסמל logo, הנתיב בצבע --logo-m)
const M_PATH = "M 202.972656 102.066406 L 202.972656 113.355469 C 199.828125 115.476562 197.0625 117.453125 194.191406 119.265625 C 187.148438 123.671875 179.707031 127.082031 171.183594 127.480469 C 165.605469 127.730469 160.28125 126.972656 155.578125 123.78125 C 148.191406 118.757812 145.285156 110.910156 147.992188 101.210938 C 149.730469 94.925781 152.546875 88.929688 154.875 82.800781 C 155.082031 82.265625 155.328125 81.726562 155.261719 80.871094 C 153.28125 82.644531 151.242188 84.332031 149.3125 86.144531 C 138.511719 96.25 127.78125 106.464844 116.871094 116.460938 C 114.125 118.976562 110.910156 121.113281 107.660156 122.976562 C 99.890625 127.390625 91.515625 126.765625 85.359375 121.652344 C 79.738281 116.976562 77.898438 109.050781 80.714844 100.695312 C 82.960938 93.980469 85.410156 87.359375 88.003906 80.066406 C 86.929688 81.011719 86.195312 81.589844 85.558594 82.234375 C 75.523438 92.371094 65.527344 102.546875 55.492188 112.710938 C 51.402344 116.867188 47.136719 120.816406 41.816406 123.382812 C 36.472656 125.976562 31.09375 126.515625 25.8125 123.171875 C 20.800781 120.03125 18.917969 114.511719 21.097656 109.011719 C 23.078125 104.015625 26.398438 99.871094 30.03125 96.03125 C 46.292969 78.832031 64.253906 63.675781 84.464844 51.234375 C 89.914062 47.882812 95.753906 45.523438 102.160156 44.539062 C 111.140625 43.148438 119.691406 47.632812 122.339844 55.429688 C 123.710938 59.5 123.460938 63.667969 122.390625 67.734375 C 121.144531 72.585938 119.691406 77.429688 118.164062 82.820312 C 120.457031 80.960938 122.449219 79.429688 124.320312 77.800781 C 134.511719 69.035156 144.589844 60.125 154.902344 51.523438 C 160.828125 46.578125 167.226562 42.203125 175.015625 40.5 C 182.027344 38.96875 188.359375 40.203125 193.007812 46.042969 C 197.023438 51.074219 197.074219 57.003906 195.324219 62.859375 C 193.382812 69.355469 190.789062 75.640625 188.71875 82.105469 C 187.277344 86.53125 186.152344 91.066406 185.03125 95.601562 C 184.722656 96.886719 184.792969 98.335938 184.96875 99.640625 C 185.507812 103.261719 187.796875 105.726562 191.382812 105.300781 C 195.292969 104.871094 199.074219 103.390625 202.84375 102.15625 C 202.882812 102.136719 202.933594 102.117188 202.972656 102.066406";
const M_BOX = [18, 38, 206, 129]; // x0 y0 x1 y1 של ה-M ביחידות של ה-SVG

const S = 420; // גודל הקנבס שממנו נדגמות הצורות
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);

/* ---------- ציור הצורות (לבן על שקוף; השקיפות היא הצפיפות) ---------- */
const DRAW = [
  // 0 · ה-M
  (c) => {
    const [x0, y0, x1, y1] = M_BOX, k = (S * 0.96) / (x1 - x0);
    c.save();
    c.translate(S / 2, S / 2); c.scale(k, k); c.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    c.fillStyle = "#fff"; c.fill(new Path2D(M_PATH));
    c.restore();
  },
  // 1 · כתם עם טפטופים
  (c) => {
    c.fillStyle = "#fff";
    c.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const r = 118 * (1 + 0.1 * Math.sin(a * 3 + 1) + 0.06 * Math.sin(a * 7 + 2) + 0.04 * Math.sin(a * 11));
      c.lineTo(S / 2 + Math.cos(a) * r, 165 + Math.sin(a) * r * 0.9);
    }
    c.fill();
    [[150, 120, 9], [192, 175, 11], [238, 95, 8], [268, 140, 7]].forEach(([x, len, w]) => {
      c.fillRect(x - w / 2, 230, w, len);
      c.beginPath(); c.arc(x, 230 + len, w * 1.15, 0, Math.PI * 2); c.fill();
    });
    [[80, 70, 7], [340, 90, 5], [330, 300, 6], [70, 260, 4]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); });
  },
  // 2 · שלוש משיכות מכחול, מסיבים דקים
  (c) => {
    for (let k = 0; k < 3; k++) {
      const yc = 110 + k * 100, x0 = 30 + rnd(0, 30), x1 = 390 - rnd(0, 50);
      for (let i = 0; i < 70; i++) {
        const off = rnd(-30, 30), len = rnd(0.55, 1);
        c.strokeStyle = `rgba(255,255,255,${rnd(0.25, 1)})`;
        c.lineWidth = rnd(0.8, 2.6);
        c.beginPath();
        const xs = x0 + rnd(0, 20), xe = xs + (x1 - xs) * len;
        c.moveTo(xs, yc + off);
        c.bezierCurveTo(xs + (xe - xs) * 0.33, yc + off - 8, xs + (xe - xs) * 0.66, yc + off + 8, xe, yc + off + rnd(-4, 4));
        c.stroke();
      }
    }
  },
  // 3 · התזה עגולה
  (c) => {
    c.fillStyle = "#fff";
    c.beginPath(); c.arc(S / 2, S / 2, 128, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 26; i++) {
      const a = rnd(0, Math.PI * 2), r0 = 120, r1 = rnd(150, 200), w = rnd(0.03, 0.08);
      c.beginPath();
      c.moveTo(S / 2 + Math.cos(a - w) * r0, S / 2 + Math.sin(a - w) * r0);
      c.lineTo(S / 2 + Math.cos(a) * r1, S / 2 + Math.sin(a) * r1);
      c.lineTo(S / 2 + Math.cos(a + w) * r0, S / 2 + Math.sin(a + w) * r0);
      c.fill();
      c.beginPath(); c.arc(S / 2 + Math.cos(a) * (r1 + rnd(6, 16)), S / 2 + Math.sin(a) * (r1 + rnd(6, 16)), rnd(2, 6), 0, Math.PI * 2); c.fill();
    }
  },
  // 4 · משיכה אלכסונית: רחבה בהתחלה ונגמרת בסיבים דקים
  (c) => {
    for (let i = 0; i < 160; i++) {
      const t = rnd(-1, 1);
      c.strokeStyle = `rgba(255,255,255,${rnd(0.2, 1)})`;
      c.lineWidth = rnd(0.8, 2.4);
      c.beginPath();
      const sx = 40 + t * 18, sy = 330 + t * 55;
      const len = rnd(0.6, 1);
      const ex = sx + (360 - sx) * len, ey = sy + (60 + t * 8 - sy) * len;
      c.moveTo(sx, sy); c.quadraticCurveTo(220 + t * 30, 230 + t * 30, ex, ey); c.stroke();
    }
  },
  // 5 · ריסוס: ענן שצפוף במרכז ונפתח החוצה
  (c) => {
    for (let i = 0; i < 2600; i++) {
      const a = rnd(0, Math.PI * 2), r = Math.pow(Math.random(), 0.7) * 200;
      c.fillStyle = `rgba(255,255,255,${rnd(0.3, 1)})`;
      c.fillRect(S / 2 + Math.cos(a) * r * 1.05, S / 2 + Math.sin(a) * r * 0.95, rnd(1, 3), rnd(1, 3));
    }
  },
];

const sample = (draw, n) => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const c = cv.getContext("2d", { willReadFrequently: true });
  draw(c);
  const data = c.getImageData(0, 0, S, S).data;
  const cand = [];
  for (let i = 0; i < S * S; i++) if (data[i * 4 + 3] > 10) cand.push(i);
  const out = new Float32Array(n * 2);
  let ex = 0.001, ey = 0.001;
  if (!cand.length) return { pts: out, ex: 1, ey: 1 };
  for (let j = 0; j < n; j++) {
    let idx = 0;
    for (let tries = 0; tries < 30; tries++) { idx = cand[(Math.random() * cand.length) | 0]; if (Math.random() * 255 < data[idx * 4 + 3]) break; }
    const x = ((idx % S) + Math.random()) / S * 2 - 1, y = -(((idx / S) | 0) + Math.random()) / S * 2 + 1;
    out[j * 2] = x; out[j * 2 + 1] = y;
    ex = Math.max(ex, Math.abs(x)); ey = Math.max(ey, Math.abs(y));
  }
  return { pts: out, ex, ey };
};

const VERT = `
attribute vec4 aS01, aS23, aS45, aRnd;
uniform float uA, uB, uMix, uTime, uIntro, uAspect, uDpr, uMotion;
uniform vec4 uPA, uPB;
uniform vec3 uMouse;
uniform vec4 uSplash;
varying vec4 vCol;
float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
vec2 shapePt(float id){
  if (id < 0.5) return aS01.xy; if (id < 1.5) return aS01.zw;
  if (id < 2.5) return aS23.xy; if (id < 3.5) return aS23.zw;
  if (id < 4.5) return aS45.xy; return aS45.zw;
}
vec2 framePt(vec4 P){ // נקודה על היקף מלבן, ברצועה מוברשת
  float w = P.z, h = P.w, s = fract(aRnd.z * 7.31 + aRnd.y * 3.17) * 4.0 * (w + h);
  vec2 p, n;
  if (s < 2.0 * w){ p = vec2(-w + s, h); n = vec2(0.0, 1.0); }
  else if (s < 2.0 * w + 2.0 * h){ s -= 2.0 * w; p = vec2(w, h - s); n = vec2(1.0, 0.0); }
  else if (s < 4.0 * w + 2.0 * h){ s -= 2.0 * w + 2.0 * h; p = vec2(w - s, -h); n = vec2(0.0, -1.0); }
  else { s -= 4.0 * w + 2.0 * h; p = vec2(-w, -h + s); n = vec2(-1.0, 0.0); }
  float th = 0.022 * (1.0 + 3.0 * pow(h1(aRnd.y * 17.0), 8.0));
  return P.xy + p + n * (h1(aRnd.x * 91.3 + aRnd.z) - 0.5) * th * 2.0;
}
vec2 place(float id, vec4 P){ return id > 5.5 ? framePt(P) : P.xy + shapePt(id) * P.zw; }
void main(){
  float ph = aRnd.z * 6.2831;
  float dust = step(fract(aRnd.y * 31.7), 0.12);
  vec2 dustP = vec2((fract(aRnd.z * 91.7) * 2.0 - 1.0) * uAspect, fract(aRnd.x * 53.3 + aRnd.y * 7.0) * 2.0 - 1.0);
  dustP += 0.03 * vec2(sin(uTime * 0.07 + ph), cos(uTime * 0.05 + ph * 1.3)) * uMotion;
  float m = clamp((uMix - aRnd.w * 0.4) / 0.6, 0.0, 1.0); m = m * m * (3.0 - 2.0 * m);
  vec2 pos = mix(place(uA, uPA), place(uB, uPB), m);
  float trans = sin(m * 3.14159);
  pos += trans * 0.16 * vec2(sin(ph + uTime * 0.8), cos(ph * 1.7 + uTime * 0.6)) * uMotion; // נוזלי באמצע מעבר
  pos += 0.004 * vec2(sin(uTime * 0.9 + ph), cos(uTime * 0.7 + ph * 2.0)) * uMotion;       // נשימה
  float ii = clamp((uIntro - aRnd.w * 0.5) / 0.5, 0.0, 1.0); ii = ii * ii * (3.0 - 2.0 * ii);
  pos = mix(dustP, pos, ii);
  pos = mix(pos, dustP, dust);
  vec2 d = pos - uMouse.xy;
  pos += normalize(d + 1e-5) * uMouse.z * 0.12 * exp(-dot(d, d) / 0.018);
  if (uSplash.w > 0.5){
    vec2 ds = pos - uSplash.xy; float a = uSplash.z;
    pos += normalize(ds + 1e-5) * 0.3 * exp(-a * 2.2) * (1.0 - exp(-a * 30.0)) * exp(-dot(ds, ds) / 0.05);
  }
  gl_Position = vec4(pos.x / uAspect, pos.y, 0.0, 1.0);
  gl_PointSize = (1.1 + pow(aRnd.x, 4.0) * 3.6) * uDpr * (1.0 + 0.5 * trans);
  float pink = step(fract(aRnd.y * 13.7), 0.11);
  vec3 c = mix(vec3(0.953, 0.953, 0.945), vec3(0.925, 0.0, 0.549), pink);
  vCol = vec4(c, (0.35 + 0.6 * fract(aRnd.y * 7.1 + aRnd.x)) * mix(1.0, 0.45, dust));
}`;
const FRAG = `precision mediump float; varying vec4 vCol;
void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vCol.rgb, vCol.a * smoothstep(0.5, 0.3, d)); }`;

const start = () => {
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) { MIRI.status("צבע: אין WebGL · רקע בלי רסיסים"); return; }
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) {
    console.error(e);
    MIRI.status("צבע: ה-shader לא נבנה · רקע בלי רסיסים");
    return;
  }
  gl.useProgram(prog);

  // הרסיסים: מיקום בכל אחת משש הצורות, ומספרים אקראיים (גודל, צבע, מופע, השהיה)
  let N = innerWidth < 768 ? 11000 : 22000;
  const shapes = DRAW.map((d) => sample(d, N));
  const attr = (name, size, data) => {
    const loc = gl.getAttribLocation(prog, name), b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };
  const pair = (a, b) => { const o = new Float32Array(N * 4); for (let i = 0; i < N; i++) o.set([a[i * 2], a[i * 2 + 1], b[i * 2], b[i * 2 + 1]], i * 4); return o; };
  attr("aS01", 4, pair(shapes[0].pts, shapes[1].pts));
  attr("aS23", 4, pair(shapes[2].pts, shapes[3].pts));
  attr("aS45", 4, pair(shapes[4].pts, shapes[5].pts));
  const r = new Float32Array(N * 4); for (let i = 0; i < r.length; i++) r[i] = Math.random();
  attr("aRnd", 4, r);
  const U = {};
  ["uA", "uB", "uMix", "uTime", "uIntro", "uAspect", "uDpr", "uMotion", "uPA", "uPB", "uMouse", "uSplash"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const stage = getComputedStyle(root).getPropertyValue("--stage").trim() || "#19181D";
  const bg = [1, 3, 5].map((i) => parseInt(stage.slice(i, i + 2), 16) / 255);
  gl.clearColor(bg[0], bg[1], bg[2], 1);

  /* ---------- עוגנים: איפה כל צורה יושבת ---------- */
  const anchors = [...document.querySelectorAll("[data-paint-shape]")].map((el) => ({ el, id: +el.dataset.paintShape, sec: el.closest("section, footer") || el }));
  const placeOf = (a, W, H) => {
    const b = a.el.getBoundingClientRect(), u = 2 / H; // יחידת מסך: חצי גובה המסך
    const cx = ((b.left + b.right) / 2 - W / 2) * u, cy = -((b.top + b.bottom) / 2 - H / 2) * u;
    const hw = (b.width / 2) * u, hh = (b.height / 2) * u;
    if (a.id === 6) return [cx, cy, hw, hh];
    const s = Math.min(hw / shapes[a.id].ex, hh / shapes[a.id].ey);
    return [cx, cy, s, s];
  };

  /* ---------- קלט ---------- */
  const still = () => MIRI.reduce || root.classList.contains("a11y-motion");
  const mouse = { x: 0, y: 0, s: 0, target: 0 };
  let splash = null;
  const toView = (e) => [(e.clientX - innerWidth / 2) * 2 / innerHeight, -(e.clientY - innerHeight / 2) * 2 / innerHeight];
  addEventListener("pointermove", (e) => {
    if (still()) return;
    [mouse.x, mouse.y] = toView(e);
    mouse.target = e.pointerType === "mouse" || e.buttons ? 1 : mouse.target;
    wake();
  }, { passive: true });
  addEventListener("pointerdown", (e) => {
    if (still()) return;
    [mouse.x, mouse.y] = toView(e); mouse.target = 1;
    if (!e.target.closest("a, button, input, textarea, select, label, summary, .a11y")) { const [x, y] = toView(e); splash = { x, y, t: performance.now() }; }
    wake();
  }, { passive: true });
  addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") mouse.target = 0; }, { passive: true });
  document.addEventListener("pointerleave", () => { mouse.target = 0; wake(); });

  /* ---------- ציור ---------- */
  let running = true, raf = 0, frozenT = 0, slow = 0, frames = 0, last = 0;
  const t0 = performance.now();
  let introAt = still() ? -1e9 : t0;
  const wake = () => { if (!raf && running) raf = requestAnimationFrame(frame); };

  function frame(now) {
    raf = 0;
    if (!running) return;
    const isStill = still();
    const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(W * dpr), h = Math.round(H * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }

    const t = isStill ? frozenT : (now - t0) / 1000;
    if (!isStill) frozenT = t;

    // הצורה של האזור שבמרכז המסך, ומעבר לבאה ב-30% האחרונים שלו
    const mid = H * 0.5;
    let k = 0, f = 0;
    anchors.forEach((a, i) => { const b = a.sec.getBoundingClientRect(); if (b.top <= mid) { k = i; f = (mid - b.top) / Math.max(b.height, 1); } });
    const A = anchors[k], B = anchors[Math.min(k + 1, anchors.length - 1)];
    const mix = A === B ? 0 : Math.min(Math.max((f - 0.7) / 0.3, 0), 1);
    gl.uniform1f(U.uA, A.id); gl.uniform1f(U.uB, B.id); gl.uniform1f(U.uMix, mix);
    gl.uniform4fv(U.uPA, placeOf(A, W, H)); gl.uniform4fv(U.uPB, placeOf(B, W, H));

    const intro = isStill ? 1 : Math.min((now - introAt) / 2600, 1);
    mouse.s += (mouse.target - mouse.s) * 0.08;
    const splashAge = splash ? (now - splash.t) / 1000 : 9;
    gl.uniform1f(U.uIntro, intro);
    gl.uniform3f(U.uMouse, mouse.x, mouse.y, isStill ? 0 : mouse.s);
    gl.uniform4f(U.uSplash, splash?.x ?? 0, splash?.y ?? 0, splashAge, splash && splashAge < 4 ? 1 : 0);
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uMotion, isStill ? 0 : 1);
    gl.uniform1f(U.uAspect, W / H);
    gl.uniform1f(U.uDpr, dpr);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, N);

    // מכשיר איטי: חצי מהרסיסים, פעם אחת, ואומרים את זה
    if (frames < 120 && !isStill) {
      frames++;
      if (last && now - last > 40) slow++;
      if (frames === 120 && slow > 50) { N = Math.floor(N / 2); MIRI.status("צבע: מכשיר איטי · חצי מהרסיסים"); }
    }
    last = now;

    if (!isStill || Math.abs(mouse.target - mouse.s) > 0.01) raf = requestAnimationFrame(frame);
  }

  addEventListener("scroll", wake, { passive: true });
  addEventListener("resize", wake);
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) wake(); });
  new MutationObserver(wake).observe(root, { attributes: true, attributeFilter: ["class"] }); // תפריט הנגישות
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); running = false; root.classList.remove("paint-on"); MIRI.status("צבע: הקשר WebGL אבד · רקע בלי רסיסים"); });

  root.classList.add("paint-on");
  MIRI.paintLoaded = true;
  wake();
};

if (document.fonts?.ready) document.fonts.ready.then(start); else start();
