/* מסך 1 · החצי התחתון: תמונה שהופכת לווילון (Three.js + Verlet).
   הווילון תלוי לאורך הקו העליון, מתנופף בגלילה ונגרר בעכבר או באצבע.
   גיבוי: בלי WebGL התמונה סטטית ונפתחת הצידה בגלילה. עם reduced-motion: תמונה סטטית בלי תנועה. */
import * as THREE from "../vendor/three.module.min.js";

const MIRI = window.MIRI || { status: (m) => console.info("[טיוטה]", m), reduce: false };
const hero = document.querySelector(".hero");
const canvas = hero?.querySelector(".hero__canvas");
const slot = hero?.querySelector("[data-cloth-slot]");
const img = slot?.querySelector("img");
const hint = hero?.querySelector("[data-cloth-hint]");
const scrollOff = hero?.dataset.clothScroll === "off";

const fallbackSlide = (why) => {
  if (scrollOff) { MIRI.status(`וילון: ${why} · תמונה סטטית`); return; }
  MIRI.status(`וילון: ${why} · תמונה סטטית שנפתחת הצידה`);
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.to(img, {
    xPercent: -45, ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 },
  });
};

const start = () => {
  if (!hero || !canvas || !slot || !img) return;
  MIRI.clothLoaded = true;
  if (MIRI.reduce) { MIRI.status("וילון: reduced-motion · תמונה סטטית"); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    fallbackSlide("אין WebGL");
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const FOV = 30;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 20000);

  // הצללה בגימור סאטן: וילון שטוח = התמונה המקורית בדיוק. בקפלים יש אור וצל רכים,
  // ברק לבן (specular) במקום שהבד מחזיר את האור, וזוהר בקצוות שנוטים מהצופה (sheen).
  // כל רכיב מחושב ביחס למצב השטוח, ולכן כשהבד נח לא נוסף לתמונה שום אור.
  // uvScale/uvOffset = חיתוך "cover", כמו object-fit בתמונה הסטטית.
  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: {
      map: { value: null },
      L: { value: new THREE.Vector3(-0.45, 0.6, 0.66).normalize() },
      uvScale: { value: new THREE.Vector2(1, 1) },
      uvOffset: { value: new THREE.Vector2(0, 0) },
      gloss: { value: 0.75 },
    },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main(){ vUv = uv; vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform sampler2D map; uniform vec3 L; uniform vec2 uvScale; uniform vec2 uvOffset; uniform float gloss;
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main(){
        vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
        vec3 V = normalize(vView);
        vec3 N0 = vec3(0.0, 0.0, 1.0);
        vec3 H = normalize(L + V);
        // אור וצל רכים
        float shade = clamp(1.0 + 1.1 * (dot(n, L) - dot(N0, L)), 0.5, 1.3);
        // ברק: רק מה שמעבר למצב השטוח
        float spec = max(0.0, pow(max(dot(n, H), 0.0), 48.0) - pow(max(dot(N0, H), 0.0), 48.0));
        float spec2 = max(0.0, pow(max(dot(n, H), 0.0), 8.0) - pow(max(dot(N0, H), 0.0), 8.0));
        // זוהר סאטן בקצוות הקפלים
        float sheen = pow(1.0 - clamp(abs(dot(n, V)), 0.0, 1.0), 2.5);
        vec4 c = texture2D(map, uvOffset + vUv * uvScale);
        vec3 col = c.rgb * shade;
        col += vec3(1.0) * (spec * 0.9 + spec2 * 0.25) * gloss;
        col = mix(col, vec3(1.0, 0.94, 0.97), sheen * 0.3 * gloss);
        gl_FragColor = vec4(col, c.a);
      }`,
  });

  let NX = 1, NY = 1;
  let pos, prev, rest, pinned, constraints;
  let geometry, mesh;
  let W = 1, H = 1;

  const idx = (i, j) => j * (NX + 1) + i;

  // ---------- טקסט על הבד (data-cloth-text על מסך הפתיחה) ----------
  // התמונה (cover), הצללה בתחתית והמשפט מצוירים יחד על קנבס אחד שהוא הטקסטורה של הבד.
  // המיקום, הגודל והשבירה לשורות נלקחים מהכותרת האמיתית בדף, שנשארת בדף לנגישות (שקופה כשהבד פעיל).
  // data-cloth-text יכול לכלול כמה סלקטורים (המשפט ושורת ההסבר), וכולם מצוירים על הבד
  const clothTexts = hero.dataset.clothText ? [...hero.querySelectorAll(hero.dataset.clothText)] : [];
  const clothText = clothTexts[0] || null;
  let srcImage = null, composed = null;
  const titleLines = (el) => {
    const node = el.firstChild, text = node.textContent, lines = [];
    for (const m of text.matchAll(/\S+/g)) {
      const r = document.createRange();
      r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
      const b = r.getBoundingClientRect();
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.top - b.top) < b.height / 2) {
        last.end = m.index + m[0].length; last.left = Math.min(last.left, b.left); last.right = Math.max(last.right, b.right);
      } else lines.push({ start: m.index, end: m.index + m[0].length, top: b.top, left: b.left, right: b.right });
    }
    return lines.map((l) => ({ ...l, text: text.slice(l.start, l.end) }));
  };
  const composeTexture = (sr, cw, ch) => {
    const k = Math.min(Math.min(devicePixelRatio || 1, 2), 4096 / Math.max(cw, ch)); // חדות לפי המסך, עד 4096px
    const c = document.createElement("canvas");
    c.width = Math.round(cw * k); c.height = Math.round(ch * k);
    const ctx = c.getContext("2d");
    ctx.scale(k, k);
    // תמונה ב-cover
    const ia = srcImage.width / srcImage.height, sa = cw / ch;
    let dw = cw, dh = ch, dx = 0, dy = 0;
    if (sa > ia) { dh = cw / ia; dy = (ch - dh) / 2; } else { dw = ch * ia; dx = (cw - dw) / 2; }
    ctx.drawImage(srcImage, dx, dy, dw, dh);
    // הצללה בתחתית, כמו ב-CSS של .hero__scrim
    const g = ctx.createLinearGradient(0, ch, 0, 0);
    g.addColorStop(0, "rgba(14,13,16,.75)"); g.addColorStop(.4, "rgba(14,13,16,.5)"); g.addColorStop(.68, "rgba(14,13,16,.25)"); g.addColorStop(.88, "rgba(14,13,16,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    // המשפט, שורה אחרי שורה, בדיוק במקום של הכותרת בדף
    ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    for (const el of clothTexts) {
      const cs = getComputedStyle(el);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      ctx.fillStyle = cs.color;
      for (const l of titleLines(el)) {
        const m = ctx.measureText(l.text);
        ctx.fillText(l.text, l.right - sr.left, l.top - sr.top + m.fontBoundingBoxAscent);
      }
    }
    composed?.dispose();
    composed = new THREE.CanvasTexture(c);
    composed.colorSpace = THREE.NoColorSpace;
    composed.anisotropy = renderer.capabilities.getMaxAnisotropy();
    material.uniforms.map.value = composed;
  };

  const build = () => {
    const hr = hero.getBoundingClientRect();
    const sr = slot.getBoundingClientRect();
    W = hr.width; H = hr.height;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.position.set(0, 0, (H / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    camera.updateProjectionMatrix();

    // רשת לפי היחס של הווילון, תאים קרובים לריבוע
    const cw = sr.width, ch = sr.height;
    // רשת צפופה (תאים של ~18px) כדי שהקפלים והקצוות יהיו חלקים
    NX = Math.round(Math.min(80, Math.max(22, cw / 18)));
    NY = Math.max(12, Math.min(60, Math.round(NX * (ch / cw))));
    const count = (NX + 1) * (NY + 1);
    pos = new Float32Array(count * 3);
    prev = new Float32Array(count * 3);
    rest = new Float32Array(count * 3);
    pinned = new Uint8Array(count);

    if (clothText) {
      // הטקסט מצויר על הבד עצמו, ולכן זז ומתקפל איתו כמקשה אחת
      composeTexture(sr, cw, ch);
      material.uniforms.uvScale.value.set(1, 1);
      material.uniforms.uvOffset.value.set(0, 0);
    } else {
      // חיתוך cover של הטקסטורה, כמו object-fit בתמונה הסטטית
      const tex = material.uniforms.map.value;
      const ia = tex.image.width / tex.image.height, sa = cw / ch;
      if (sa > ia) { material.uniforms.uvScale.value.set(1, ia / sa); material.uniforms.uvOffset.value.set(0, (1 - ia / sa) / 2); }
      else { material.uniforms.uvScale.value.set(sa / ia, 1); material.uniforms.uvOffset.value.set((1 - sa / ia) / 2, 0); }
    }

    // 1 יחידה = 1 פיקסל במישור z=0
    const x0 = sr.left - hr.left - W / 2;
    const y0 = H / 2 - (sr.top - hr.top);
    for (let j = 0; j <= NY; j++) {
      for (let i = 0; i <= NX; i++) {
        const k = idx(i, j) * 3;
        pos[k] = prev[k] = rest[k] = x0 + (i / NX) * cw;
        pos[k + 1] = prev[k + 1] = rest[k + 1] = y0 - (j / NY) * ch;
        pos[k + 2] = prev[k + 2] = rest[k + 2] = 0;
        pinned[idx(i, j)] = j === 0 ? 1 : 0; // הווילון תלוי לאורך הקו העליון
      }
    }
    const list = [];
    const link = (a, b) => list.push(a, b, Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1]));
    for (let j = 0; j <= NY; j++) {
      for (let i = 0; i <= NX; i++) {
        if (i < NX) link(idx(i, j), idx(i + 1, j));
        if (j < NY) link(idx(i, j), idx(i, j + 1));
        if (i < NX && j < NY) { link(idx(i, j), idx(i + 1, j + 1)); link(idx(i + 1, j), idx(i, j + 1)); }
        if (i < NX - 1) link(idx(i, j), idx(i + 2, j));
        if (j < NY - 1) link(idx(i, j), idx(i, j + 2));
      }
    }
    constraints = Float32Array.from(list);

    if (mesh) { scene.remove(mesh); geometry.dispose(); }
    geometry = new THREE.PlaneGeometry(cw, ch, NX, NY);
    geometry.attributes.position.array.set(pos);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    grabbed = -1;
    renderer.render(scene, camera);
    if (!scrollOff) wake(); // עם data-cloth-scroll="off" הבד נשאר שטוח ודומם עד שנוגעים בו
  };

  // ---------- סימולציה ----------
  const GRAVITY = -1400;  // px/s²
  const DAMP = 0.985;
  const ITER = 14;
  const STEP = 1 / 60;
  const RETURN = 0.08;
  let impulse = 0;
  let grabbed = -1;
  const grabTarget = new THREE.Vector3();
  let time = 0;

  const step = () => {
    time += STEP;
    const imp = impulse;
    impulse *= 0.5;
    // עם data-cloth-scroll="off": כשמשחררים, הבד חוזר לשטוח ונעצר (בלי כוח משיכה ועם ריסון חזק יותר)
    const settle = scrollOff && grabbed < 0;
    const damp = settle ? 0.9 : DAMP;
    const gravity = settle ? 0 : GRAVITY;
    for (let j = 1; j <= NY; j++) {
      const fall = j / NY;
      for (let i = 0; i <= NX; i++) {
        const k = idx(i, j) * 3;
        const vx = (pos[k] - prev[k]) * damp;
        const vy = (pos[k + 1] - prev[k + 1]) * damp;
        const vz = (pos[k + 2] - prev[k + 2]) * damp;
        prev[k] = pos[k]; prev[k + 1] = pos[k + 1]; prev[k + 2] = pos[k + 2];
        // רוח מהגלילה: חזקה יותר למטה, עם גל לרוחב, כמו וילון
        const wave = 0.55 + 0.45 * Math.sin(i * 0.6 + time * 3);
        pos[k] += vx + imp * 0.04 * fall * wave;
        pos[k + 1] += vy + gravity * STEP * STEP;
        if (settle) { // חוזר בעדינות למצב השטוח
          pos[k] += (rest[k] - pos[k]) * RETURN;
          pos[k + 1] += (rest[k + 1] - pos[k + 1]) * RETURN;
          pos[k + 2] += (rest[k + 2] - pos[k + 2]) * RETURN;
        }
        pos[k + 2] += vz + imp * 0.6 * fall * wave;
      }
    }
    if (grabbed >= 0) {
      const k = grabbed * 3;
      pos[k] = prev[k] = grabTarget.x;
      pos[k + 1] = prev[k + 1] = grabTarget.y;
      pos[k + 2] = prev[k + 2] = grabTarget.z;
    }
    for (let it = 0; it < ITER; it++) {
      for (let c = 0; c < constraints.length; c += 3) {
        const a = constraints[c], b = constraints[c + 1], r = constraints[c + 2];
        const ka = a * 3, kb = b * 3;
        const dx = pos[kb] - pos[ka], dy = pos[kb + 1] - pos[ka + 1], dz = pos[kb + 2] - pos[ka + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const diff = (dist - r) / dist;
        const lockA = pinned[a] || a === grabbed, lockB = pinned[b] || b === grabbed;
        const fa = lockA ? 0 : (lockB ? 1 : 0.5);
        const fb = lockB ? 0 : (lockA ? 1 : 0.5);
        pos[ka] += dx * diff * fa; pos[ka + 1] += dy * diff * fa; pos[ka + 2] += dz * diff * fa;
        pos[kb] -= dx * diff * fb; pos[kb + 1] -= dy * diff * fb; pos[kb + 2] -= dz * diff * fb;
      }
    }
  };

  // ---------- לולאה (נרדמת כשהווילון נח) ----------
  let running = false, visible = true, quiet = 0, last = 0, acc = 0;
  const frame = (now) => {
    if (!running) return;
    const dt = Math.min((now - (last || now)) / 1000, 0.05);
    last = now;
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 3) { step(); acc -= STEP; n++; }
    // התזוזה הגדולה ביותר של נקודה אחת (סכום של כל הנקודות ברשת צפופה אף פעם לא מגיע לאפס)
    let motion = 0;
    for (let k = 0; k < pos.length; k++) { const d = Math.abs(pos[k] - prev[k]); if (d > motion) motion = d; }
    geometry.attributes.position.array.set(pos);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    renderer.render(scene, camera);
    quiet = motion < 0.03 && grabbed < 0 && Math.abs(impulse) < 0.1 ? quiet + 1 : 0;
    if (quiet > 30) {
      running = false;
      if (scrollOff && grabbed < 0) { // נעצר בדיוק על המצב השטוח
        pos.set(rest); prev.set(rest);
        geometry.attributes.position.array.set(pos);
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        renderer.render(scene, camera);
      }
      return;
    }
    requestAnimationFrame(frame);
  };
  function wake() {
    if (running || !visible || document.hidden || !mesh) return;
    running = true; quiet = 0; last = 0; acc = 0;
    requestAnimationFrame(frame);
  }

  // ---------- גרירה ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const setRay = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const hit = (e) => { setRay(e); return mesh ? ray.intersectObject(mesh)[0] : null; };
  const toPlane = (z) => {
    const o = ray.ray.origin, d = ray.ray.direction;
    const t = (z - o.z) / d.z;
    return new THREE.Vector3(o.x + d.x * t, o.y + d.y * t, z);
  };
  let grabZ = 0;

  canvas.addEventListener("pointerdown", (e) => {
    const h = hit(e);
    if (!h || !h.uv) return;
    const i = Math.min(NX, Math.max(0, Math.round(h.uv.x * NX)));
    const j = Math.min(NY, Math.max(1, Math.round((1 - h.uv.y) * NY)));
    grabbed = idx(i, j);
    grabZ = pos[grabbed * 3 + 2] + 60; // הנקודה נמשכת קצת לכיוון הצופה
    grabTarget.copy(toPlane(grabZ));
    canvas.setPointerCapture(e.pointerId);
    hero.classList.add("cloth-grabbing");
    wake();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (grabbed >= 0) { setRay(e); grabTarget.copy(toPlane(grabZ)); wake(); return; }
    if (e.pointerType === "mouse") hero.classList.toggle("cloth-grab", !!hit(e));
  });
  const release = () => { grabbed = -1; hero.classList.remove("cloth-grabbing"); wake(); };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("lostpointercapture", release);

  // ---------- גלילה = רוח (כבוי עם data-cloth-scroll="off": הבד זז רק כשנוגעים בו) ----------
  if (!scrollOff) {
    let lastY = scrollY;
    addEventListener("scroll", () => {
      const dy = scrollY - lastY;
      lastY = scrollY;
      impulse = Math.max(-60, Math.min(60, impulse + dy));
      wake();
    }, { passive: true });
  }

  // ---------- נראות, שינוי גודל, אובדן הקשר ----------
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) wake(); }).observe(hero);
  document.addEventListener("visibilitychange", wake);
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    running = false;
    hero.classList.remove("cloth-on");
    MIRI.status("וילון: הקשר WebGL אבד · מוצגת התמונה הסטטית");
  });

  new THREE.TextureLoader().load(img.currentSrc || img.src, (tex) => {
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    material.uniforms.map.value = tex;
    srcImage = tex.image;
    build();
    let rt;
    new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(build, 120); }).observe(hero);
    MIRI.clothRebuild = build; // תפריט הנגישות משנה גודל טקסט בלי לשנות את גודל המסך
    hero.classList.add("cloth-on");
    hint?.removeAttribute("hidden");
    MIRI.status("וילון: WebGL פעיל");
  }, undefined, () => fallbackSlide("התמונה לא נטענה כטקסטורה"));
};

if (document.fonts?.ready) document.fonts.ready.then(start); else start();
