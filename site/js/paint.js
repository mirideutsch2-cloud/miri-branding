/* מירי דייטש · גרסה ג · שכבת הצבע (WebGL, בלי ספריות).
   canvas אחד קבוע מאחורי הדף, ו-shader אחד שמצייר:
   - כתם צבע שהופך לכתם אחר בכל אזור (data-paint-shape), לפי הגלילה. באמצע המעבר הצבע "נוזל".
   - מרקם מכחול: סיבים, קצוות יבשים, שוליים כהים של פיגמנט וברק של צבע רטוב.
   - משיכה אחרי העכבר שמתייבשת, והתזה בלחיצה. ריחוף על data-paint-attract מושך אליו את הצבע.
   - הכיתובים הגדולים (data-paint-word) מצוירים על אותה שכבה: בהירים על הרקע, כהים איפה שהצבע מתחתם.
     "outline" הוא קו מתאר בלבד, שמתמלא איפה שהצבע עובר.
   - data-paint-shield: הצבע מתעמעם מאחורי טקסט רץ, כדי שיישאר קריא.
   - הפוטר: הצבע מציף אותו מלמטה.
   כל נפילה מדווחת בלוח הטיוטה (MIRI.status). בלי WebGL הדף עובד עם רקע סטטי. */

const MIRI = window.MIRI || { status: console.info, reduce: false };
const root = document.documentElement;
const canvas = document.querySelector(".p-canvas");

const MAX_WORDS = 8, MAX_TRAIL = 20, MAX_SPLASH = 6, MAX_SHIELD = 8;
// כיוון הסיבים של המכחול לכל צורה (רדיאנים)
const ANGLES = [0.6, 1.35, 0.0, 0.35, 0.85, 0.2];

const VERT = `attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime, uShapeA, uShapeB, uMix, uAngle, uSweep, uFlood;
uniform vec4 uBar[3];
uniform vec4 uGhost;
uniform vec3 uTrail[${MAX_TRAIL}];
uniform vec4 uSplash[${MAX_SPLASH}];
uniform vec3 uAttract;
uniform vec4 uShield[${MAX_SHIELD}];
uniform float uShieldCount;
uniform sampler2D uAtlas;
uniform vec4 uWRect[${MAX_WORDS}];
uniform vec4 uWUV[${MAX_WORDS}];
uniform vec2 uWMode[${MAX_WORDS}];
uniform float uWCount;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
vec2 toP(vec2 uv){ return (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0); }

// כתם אורגני: מעגל שהשוליים שלו גלים איטיים
float blob(vec2 p, vec2 c, float r, float s){
  vec2 q = p - c; float a = atan(q.y, q.x);
  float w = 0.09 * sin(a * 3.0 + s + uTime * 0.25) + 0.05 * sin(a * 5.0 - s * 1.7 - uTime * 0.19) + 0.03 * sin(a * 9.0 + s * 3.1);
  return length(q) - r * (1.0 + w);
}

float shape(float id, vec2 p){
  float A = uRes.x / uRes.y;
  float side = A > 1.0 ? -A * 0.2 : 0.0; // בדסקטופ הצבע משמאל, מול הטקסט שמימין
  if (id < 0.5){ // 0 · מסך הפתיחה: כתם גדול וטיפות
    vec2 c = vec2(side, -0.06);
    float d = blob(p, c, A > 1.0 ? 0.36 : 0.3, 1.0);
    d = smin(d, blob(p, c + vec2(0.38, 0.3), 0.06, 3.0), 0.09);
    d = min(d, length(p - c - vec2(-0.36, -0.32)) - 0.03);
    d = min(d, length(p - c - vec2(0.46, -0.24)) - 0.018);
    d = min(d, length(p - c - vec2(-0.2, 0.42)) - 0.022);
    return d;
  }
  if (id < 1.5){ // 1 · כאבים: הכתם נוזל לטפטופים
    vec2 c = vec2(A > 1.0 ? -A * 0.26 : 0.0, -0.18);
    float d = blob(p, c, 0.22, 2.0);
    for (int i = 0; i < 4; i++){
      float fi = float(i);
      vec2 a = c + vec2(-0.15 + fi * 0.1, 0.08);
      float len = 0.16 + 0.22 * fract(sin(fi * 12.3) * 43.7) + 0.03 * sin(uTime * 0.4 + fi);
      vec2 b = a + vec2(0.0, len);
      d = smin(d, sdSeg(p, a, b) - (0.022 - fi * 0.003), 0.05);
      d = smin(d, length(p - b) - 0.032, 0.035);
    }
    return d;
  }
  if (id < 2.5){ // 2 · שלוש משיכות מכחול מאחורי שלוש המילים
    float d = 1e3;
    for (int i = 0; i < 3; i++){
      vec4 r = uBar[i];
      float h = r.w - r.y;
      vec2 a = toP(vec2(r.z + 0.015, r.y + h * 0.56));
      vec2 b = toP(vec2(r.x - 0.03, r.y + h * 0.5));
      d = min(d, sdSeg(p, a, b) - h * 0.3);
    }
    return d;
  }
  if (id < 3.5){ // 3 · מה אני בונה: התזה לכל הכיוונים
    vec2 c = vec2(0.0, 0.02);
    float d = blob(p, c, 0.26, 4.0);
    for (int i = 0; i < 8; i++){
      float fi = float(i);
      float ang = fi * 0.785 + 0.3 + 0.2 * sin(fi * 5.0);
      float dist = 0.4 + 0.16 * fract(sin(fi * 7.1) * 91.3);
      vec2 q = c + vec2(cos(ang), sin(ang)) * dist * vec2(max(A, 1.0), 1.0);
      d = smin(d, sdSeg(p, c, q) - 0.007, 0.07);
      d = smin(d, length(p - q) - (0.025 + 0.025 * fract(sin(fi * 3.7) * 13.1)), 0.04);
    }
    return d;
  }
  if (id < 4.5){ // 4 · פרויקטים: טבעת של משיכת מכחול אחת
    vec2 c = vec2(A > 1.0 ? -A * 0.27 : 0.0, 0.0);
    float a = atan(p.y - c.y, p.x - c.x);
    float r = 0.29 + 0.015 * sin(a * 3.0 + uTime * 0.3);
    float th = 0.045 * (0.55 + 0.45 * smoothstep(-3.1, 2.4, a)); // המשיכה דקה בסוף, כמו מכחול שנגמר לו הצבע
    return abs(length(p - c) - r) - th;
  }
  // 5 · אודות: משיכה ארוכה שעוברת על "שקוף" ככל שגוללים
  vec2 a = toP(vec2(uGhost.z + 0.04, uGhost.y + (uGhost.w - uGhost.y) * 0.62));
  vec2 b0 = toP(vec2(uGhost.x - 0.04, uGhost.y + (uGhost.w - uGhost.y) * 0.42));
  vec2 b = mix(a, b0, clamp(uSweep, 0.0, 1.0));
  return sdSeg(p, a, b) - (uGhost.w - uGhost.y) * 0.34;
}

float rectSd(vec2 px, vec4 r){ // מרחק בפיקסלים ממלבן (r ב-uv)
  vec2 lo = r.xy * uRes, hi = r.zw * uRes;
  vec2 d = max(lo - px, px - hi);
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

void main(){
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y); // y למטה, כמו בדף
  vec2 p = toP(uv);
  float t = uTime;

  // משיכה אל אלמנט בריחוף
  vec2 att = toP(uAttract.xy) - p;
  p += att * uAttract.z * 0.45 * exp(-dot(att, att) * 5.0);

  // נוזליות: עיוות קבוע ועדין, שמתחזק באמצע מעבר בין צורות
  float morph = sin(3.14159 * uMix);
  vec2 w = vec2(fbm(p * 1.7 + vec2(t * 0.05, 0.0)), fbm(p * 1.7 + vec2(5.2, -t * 0.04))) - 0.5;
  vec2 pw = p + w * (0.05 + 0.4 * morph);

  float d = shape(uShapeA, pw);
  if (uMix > 0.001) d = mix(d, shape(uShapeB, pw), smoothstep(0.0, 1.0, uMix));

  // הפוטר: הצבע מציף מלמטה, עם קו עליון גלי וטיפות שעולות
  float fl = (uFlood - uv.y) + 0.018 * sin(uv.x * 11.0 + t * 0.6) + 0.03 * (fbm(vec2(uv.x * 5.0, t * 0.08)) - 0.5);
  d = smin(d, fl, 0.05);

  // משיכה אחרי העכבר
  for (int i = 0; i < ${MAX_TRAIL - 1}; i++){
    vec3 a = uTrail[i], b = uTrail[i + 1];
    if (a.z >= 1.0 || b.z >= 1.0) continue;
    float r = 0.028 * (1.0 - max(a.z, b.z));
    d = smin(d, sdSeg(p, toP(a.xy), toP(b.xy)) - r, 0.045);
  }
  // התזות
  for (int i = 0; i < ${MAX_SPLASH}; i++){
    vec4 s = uSplash[i];
    if (s.z < 0.0) continue;
    float grow = 1.0 - exp(-s.z * 9.0);
    float fade = 1.0 - smoothstep(1.4, 3.0, s.z);
    vec2 c = toP(s.xy);
    d = smin(d, length(p - c) - 0.085 * grow * fade, 0.05);
    for (int j = 0; j < 6; j++){
      float fj = float(j);
      float ang = s.w * 6.2831 + fj * 1.05 + 0.3 * sin(fj * 7.0 + s.w * 40.0);
      float dist = (0.09 + 0.08 * fract(sin(fj * 17.0 + s.w * 91.0) * 43.7)) * grow * 1.5;
      d = smin(d, length(p - c - vec2(cos(ang), sin(ang)) * dist) - 0.017 * fade * grow, 0.03);
    }
  }

  // מרקם מכחול
  float ca = cos(uAngle), sa = sin(uAngle);
  vec2 rp = mat2(ca, -sa, sa, ca) * p;
  float fine = noise(rp * vec2(1.2, 170.0));   // סיבי המכחול, דקים
  float broad = noise(rp * vec2(1.6, 14.0) + 3.0); // פסים רחבים של גוון
  float de = d + (noise(rp * vec2(4.0, 120.0)) - 0.5) * 0.012 + (fbm(p * 22.0) - 0.5) * 0.01; // קצה משונן לכיוון הסיבים
  float aa = 1.2 / uRes.y;
  float m = 1.0 - smoothstep(-aa, aa, de);
  float inner = clamp(-de * 60.0, 0.0, 1.0);
  m *= smoothstep(0.05, 0.3, fine * 0.9 + inner); // קצוות יבשים, רק בפס דק

  // מגן: הצבע מתעמעם מאחורי טקסט רץ
  vec2 px = uv * uRes;
  float shield = 0.0;
  for (int i = 0; i < ${MAX_SHIELD}; i++){
    if (float(i) >= uShieldCount) break;
    shield = max(shield, 1.0 - smoothstep(0.0, 56.0, rectSd(px, uShield[i]) - 18.0));
  }
  float mv = m * mix(1.0, 0.13, shield);

  vec3 bg = vec3(0.055, 0.051, 0.063);
  vec3 fu = vec3(0.925, 0.0, 0.549);
  vec3 deep = vec3(0.78, 0.0, 0.46);
  vec3 light = vec3(1.0, 0.38, 0.72);
  float streak = broad * 0.65 + fine * 0.35;
  streak = mix(streak, 0.62, smoothstep(0.0, 0.1, uv.y - uFlood) * 0.85); // בפוטר הצבע אחיד, כדי שהטקסט עליו ייקרא
  vec3 pc = mix(deep, fu, smoothstep(0.25, 0.75, streak));
  pc = mix(pc, light, smoothstep(0.8, 0.97, streak) * 0.35);
  pc *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.03, -de)); // פיגמנט שמתרכז בשוליים
#ifdef DERIV
  float h = clamp(-de * 14.0, 0.0, 1.0) * (0.6 + 0.4 * streak);
  vec2 g = vec2(dFdx(h), -dFdy(h)) * uRes.y * 0.035;
  vec3 n = normalize(vec3(-g, 1.0));
  pc += pow(max(dot(n, normalize(vec3(-0.45, 0.55, 0.75))), 0.0), 28.0) * 0.28; // ברק של צבע רטוב
#endif
  vec3 col = mix(bg, pc, mv);

  // הכיתובים הגדולים
  vec3 off = vec3(0.953, 0.953, 0.945);
  for (int i = 0; i < ${MAX_WORDS}; i++){
    if (float(i) >= uWCount) break;
    vec4 r = uWRect[i];
    if (uv.x < r.x || uv.x > r.z || uv.y < r.y || uv.y > r.w) continue;
    vec2 l = (uv - r.xy) / (r.zw - r.xy);
    vec4 a = uWUV[i];
    vec4 tx = texture2D(uAtlas, a.xy + l * (a.zw - a.xy));
    float rev = uWMode[i].y; // חשיפה במשיכת מכחול, מימין לשמאל
    float wipe = smoothstep(0.0, 0.05, rev * 1.2 - (1.0 - l.x) - (noise(vec2(l.y * 9.0, float(i) * 3.0)) - 0.5) * 0.14);
    if (uWMode[i].x < 0.5){
      col = mix(col, mix(off, bg, m), tx.r * wipe);
    } else {
      col = mix(col, off, tx.g * wipe * (1.0 - m));
      col = mix(col, bg, tx.r * wipe * m);
    }
  }

  col += (hash(px + fract(t) * 91.0) - 0.5) * 0.035; // גרעין עדין
  gl_FragColor = vec4(col, 1.0);
}`;

const start = () => {
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "high-performance" });
  if (!gl) { MIRI.status("צבע: אין WebGL · מוצג רקע סטטי"); return; }
  const deriv = !!gl.getExtension("OES_standard_derivatives");

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
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, (deriv ? "#extension GL_OES_standard_derivatives : enable\n#define DERIV\n" : "") + FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) {
    console.error(e);
    MIRI.status("צבע: ה-shader לא נבנה · מוצג רקע סטטי");
    return;
  }
  if (!deriv) MIRI.status("צבע: בלי ברק (OES_standard_derivatives חסר)");
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ["uRes", "uTime", "uShapeA", "uShapeB", "uMix", "uAngle", "uSweep", "uFlood", "uBar", "uGhost", "uTrail", "uSplash", "uAttract",
    "uShield", "uShieldCount", "uAtlas", "uWRect", "uWUV", "uWMode", "uWCount"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));

  /* ---------- אטלס הכיתובים: כל מילה נצבעת לקנבס אחד (R = מילוי, G = קו מתאר) ---------- */
  const words = [...document.querySelectorAll("[data-paint-word]")];
  if (words.length > MAX_WORDS) MIRI.status(`צבע: ${words.length} כיתובים, מוצגים ${MAX_WORDS}`);
  const W = words.slice(0, MAX_WORDS).map((el) => ({ el, mode: el.dataset.paintWord === "outline" ? 1 : 0, uv: [0, 0, 0, 0], revealAt: 0 }));
  const atlas = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, atlas);
  [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR));
  [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
  const maxTex = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE));

  const lines = (el) => {
    const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (!node) return [];
    const text = node.textContent, out = [];
    for (const m of text.matchAll(/\S+/g)) {
      const r = document.createRange();
      r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
      const b = r.getBoundingClientRect();
      const last = out[out.length - 1];
      if (last && Math.abs(last.top - b.top) < b.height / 2) { last.end = m.index + m[0].length; last.right = Math.max(last.right, b.right); }
      else out.push({ start: m.index, end: m.index + m[0].length, top: b.top, right: b.right });
    }
    return out.map((l) => ({ ...l, text: text.slice(l.start, l.end) }));
  };

  const buildAtlas = () => {
    const rects = W.map((w) => w.el.getBoundingClientRect());
    const pad = 8;
    const maxW = Math.max(1, ...rects.map((r) => r.width)) + pad * 2;
    const sumH = rects.reduce((s, r) => s + r.height + pad * 2, 0) || 1;
    const k = Math.min(Math.min(devicePixelRatio || 1, 2), maxTex / maxW, maxTex / sumH);
    const c = document.createElement("canvas");
    c.width = Math.ceil(maxW * k); c.height = Math.ceil(sumH * k);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "lighter";
    ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    let y = 0;
    W.forEach((w, i) => {
      const r = rects[i], cs = getComputedStyle(w.el);
      const fs = parseFloat(cs.fontSize);
      ctx.font = `${cs.fontWeight} ${fs * k}px ${cs.fontFamily}`;
      const ox = pad, oy = y + pad;
      for (const l of lines(w.el)) {
        const m = ctx.measureText(l.text);
        const x = (ox + l.right - r.left) * k, yy = (oy + l.top - r.top) * k + m.fontBoundingBoxAscent;
        ctx.fillStyle = "#f00"; ctx.fillText(l.text, x, yy);
        if (w.mode === 1) { ctx.strokeStyle = "#0f0"; ctx.lineWidth = Math.max(1.5, fs * 0.008) * k; ctx.strokeText(l.text, x, yy); }
      }
      w.uv = [ox * k / c.width, oy * k / c.height, (ox + r.width) * k / c.width, (oy + r.height) * k / c.height];
      y += r.height + pad * 2;
    });
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    needs = true;
  };

  /* ---------- קלט: עכבר, נגיעה, ריחוף ---------- */
  const trail = [];
  const splashes = [];
  let attract = { x: 0.5, y: 0.5, s: 0, target: 0 };
  const still = () => MIRI.reduce || root.classList.contains("a11y-motion");
  const interactive = (el) => el.closest("a, button, input, textarea, select, label, summary, .a11y, .p-card");
  addEventListener("pointermove", (e) => {
    if (still()) return;
    const x = e.clientX / innerWidth, y = e.clientY / innerHeight, now = performance.now();
    const last = trail[trail.length - 1];
    if (!last || Math.hypot(x - last.x, y - last.y) > 0.006) { trail.push({ x, y, t: now }); if (trail.length > MAX_TRAIL) trail.shift(); }
    if (attract.target) { attract.x = x; attract.y = y; }
    wake();
  }, { passive: true });
  addEventListener("pointerdown", (e) => {
    if (still() || interactive(e.target)) return;
    splashes.push({ x: e.clientX / innerWidth, y: e.clientY / innerHeight, t: performance.now(), seed: Math.random() });
    if (splashes.length > MAX_SPLASH) splashes.shift();
    wake();
  }, { passive: true });
  document.querySelectorAll("[data-paint-attract]").forEach((el) => {
    el.addEventListener("pointerenter", (e) => { attract.target = 1; attract.x = e.clientX / innerWidth; attract.y = e.clientY / innerHeight; wake(); });
    el.addEventListener("pointerleave", () => { attract.target = 0; wake(); });
  });

  // תצוגה מקדימה שעוקבת אחרי העכבר על שורות הפרויקטים
  const preview = document.querySelector(".p-preview");
  const previewSlot = preview?.querySelector(".slot");
  document.querySelectorAll(".p-row[data-preview]").forEach((row) => {
    row.addEventListener("pointerenter", () => { if (previewSlot) previewSlot.textContent = row.dataset.preview; preview?.classList.add("is-on"); });
    row.addEventListener("pointerleave", () => preview?.classList.remove("is-on"));
    row.addEventListener("pointermove", (e) => { if (preview) preview.style.transform = `translate(${e.clientX - preview.offsetWidth * 1.15}px, ${e.clientY - preview.offsetHeight * 0.5}px)`; });
  });

  /* ---------- מצב הגלילה ---------- */
  const sections = [...document.querySelectorAll("[data-paint-shape]")].map((el) => ({ el, id: +el.dataset.paintShape }));
  const bars = [...document.querySelectorAll("[data-paint-bar]")].slice(0, 3);
  const ghost = document.querySelector('[data-paint-word="outline"]');
  const about = ghost?.closest("section");
  const footer = document.querySelector(".p-footer");
  const shields = [...document.querySelectorAll("[data-paint-shield]")];
  const toUV = (r) => [r.left / innerWidth, r.top / innerHeight, r.right / innerWidth, r.bottom / innerHeight];
  const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);

  /* ---------- ציור ---------- */
  let scale = Math.min(devicePixelRatio || 1, 1.5);
  let running = true, needs = true, raf = 0, t0 = performance.now(), frozenT = 0;
  let slowFrames = 0, frames = 0;
  const wake = () => { needs = true; if (!raf && running) raf = requestAnimationFrame(frame); };

  function frame(now) {
    raf = 0;
    if (!running) return;
    const isStill = still();
    // גודל: רזולוציה מוגבלת לכ-2.2 מיליון פיקסלים
    const cw = innerWidth, ch = innerHeight;
    const k = Math.min(scale, Math.sqrt(2.2e6 / (cw * ch)));
    const w = Math.round(cw * k), h = Math.round(ch * k);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }

    const t = isStill ? frozenT : (now - t0) / 1000;
    if (!isStill) frozenT = t;

    // צורה לפי הגלילה: הצורה של האזור שבמרכז המסך, ומעבר לצורה הבאה ב-40% האחרונים שלו
    const mid = ch * 0.5;
    let kIdx = 0, frac = 0;
    sections.forEach((s, i) => { const r = s.el.getBoundingClientRect(); if (r.top <= mid) { kIdx = i; frac = (mid - r.top) / Math.max(r.height, 1); } });
    const a = sections[kIdx], b = sections[Math.min(kIdx + 1, sections.length - 1)];
    const mix = a === b ? 0 : Math.min(Math.max((frac - 0.6) / 0.4, 0), 1);
    gl.uniform1f(U.uShapeA, a?.id ?? 0);
    gl.uniform1f(U.uShapeB, b?.id ?? 0);
    gl.uniform1f(U.uMix, mix);
    gl.uniform1f(U.uAngle, ANGLES[a?.id ?? 0] * (1 - mix) + ANGLES[b?.id ?? 0] * mix);

    const barData = new Float32Array(12).fill(-2);
    bars.forEach((el, i) => barData.set(toUV(el.getBoundingClientRect()), i * 4));
    gl.uniform4fv(U.uBar, barData);
    gl.uniform4fv(U.uGhost, ghost ? toUV(ghost.getBoundingClientRect()) : [-2, -2, -2, -2]);
    if (about) { const r = about.getBoundingClientRect(); gl.uniform1f(U.uSweep, isStill ? 1 : ease((ch * 0.75 - r.top) / (r.height * 0.55))); }
    const fr = footer?.getBoundingClientRect();
    gl.uniform1f(U.uFlood, fr ? fr.top / ch - 0.05 : 3);

    // עכבר
    const trailData = new Float32Array(MAX_TRAIL * 3).fill(1);
    let alive = false;
    trail.forEach((p, i) => { const age = Math.min((now - p.t) / 1300, 1); if (age < 1) alive = true; trailData.set([p.x, p.y, age], i * 3); });
    gl.uniform3fv(U.uTrail, trailData);
    const splashData = new Float32Array(MAX_SPLASH * 4).fill(-1);
    splashes.forEach((s, i) => { const age = (now - s.t) / 1000; if (age < 3.2) { alive = true; splashData.set([s.x, s.y, age, s.seed], i * 4); } });
    gl.uniform4fv(U.uSplash, splashData);
    attract.s += (attract.target - attract.s) * 0.08;
    if (Math.abs(attract.target - attract.s) > 0.01) alive = true;
    gl.uniform3f(U.uAttract, attract.x, attract.y, attract.s);

    // מגנים: רק אלה שעל המסך
    const sh = [];
    for (const el of shields) {
      if (sh.length >= MAX_SHIELD * 4) break;
      const r = el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > ch + 80 || !r.width) continue;
      sh.push(...toUV(r));
    }
    const shData = new Float32Array(MAX_SHIELD * 4); shData.set(sh);
    gl.uniform4fv(U.uShield, shData);
    gl.uniform1f(U.uShieldCount, sh.length / 4);

    // כיתובים: נחשפים במשיכת מכחול כשהם נכנסים למסך
    const wr = new Float32Array(MAX_WORDS * 4), wu = new Float32Array(MAX_WORDS * 4), wm = new Float32Array(MAX_WORDS * 2);
    W.forEach((wd, i) => {
      const r = wd.el.getBoundingClientRect();
      if (!wd.revealAt && r.top < ch * 0.92 && r.bottom > 0) wd.revealAt = now;
      const rev = isStill ? 1 : wd.revealAt ? ease((now - wd.revealAt) / 1500) : 0;
      if (rev < 1 && wd.revealAt) alive = true;
      wr.set(toUV(r), i * 4); wu.set(wd.uv, i * 4); wm.set([wd.mode, rev], i * 2);
    });
    gl.uniform4fv(U.uWRect, wr); gl.uniform4fv(U.uWUV, wu); gl.uniform2fv(U.uWMode, wm);
    gl.uniform1f(U.uWCount, W.length);

    gl.uniform2f(U.uRes, w, h);
    gl.uniform1f(U.uTime, t);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlas); gl.uniform1i(U.uAtlas, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    needs = false;

    // מכשיר איטי: מורידים רזולוציה פעם אחת, ואומרים את זה
    if (frames < 90) {
      frames++;
      if (frame.last && now - frame.last > 45) slowFrames++;
      if (frames === 90 && slowFrames > 40 && scale > 0.75) { scale = 0.75; MIRI.status("צבע: מכשיר איטי · רזולוציה מופחתת"); }
    }
    frame.last = now;

    // ממשיכים להנפיש כשיש תנועה; במצב בלי תנועה מציירים רק כשמשהו השתנה (גלילה, גודל)
    if (!isStill || alive) raf = requestAnimationFrame(frame);
  }

  addEventListener("scroll", wake, { passive: true });
  addEventListener("resize", () => { clearTimeout(buildAtlas.t); buildAtlas.t = setTimeout(() => { buildAtlas(); wake(); }, 150); });
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) wake(); });
  new MutationObserver(wake).observe(root, { attributes: true, attributeFilter: ["class"] }); // תפריט הנגישות
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); running = false; root.classList.remove("paint-on"); MIRI.status("צבע: הקשר WebGL אבד · רקע סטטי"); });

  MIRI.clothRebuild = () => { buildAtlas(); wake(); }; // תפריט הנגישות (הגדלת טקסט) קורא לזה
  root.classList.add("paint-on");
  buildAtlas();
  MIRI.paintLoaded = true;
  wake();
};

if (document.fonts?.ready) document.fonts.ready.then(start); else start();
