/* גרסה ו · כיסא הבמאי: הסרט של הפתיחה, ב-WebGL אחד.
   שכבה 1: וילון סאטן בפוקסיה (שיידר), עם קפלים, ברק, אלומת אור ואדווה מהעכבר.
   שכבה 2: הסט בתלת-ממד: כיסא במאי, קלאפר ודפי תסריט על בטון, באור קשה וצללים ארוכים.
   הגלילה: חצי לוגו נעלם (המסך נפתח) ← הווילון נאסף לצדדים ← המצלמה יורדת ממבט-על עד הרצפה.
   כל הנפילות לברירת מחדל נכתבות בלוח הטיוטה. */
import * as THREE from "../vendor/three.module.min.js";

const M = window.MIRI || { status() {}, reduce: false };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const film = $(".dr-film");
const canvas = $(".dr-gl");
if (film && canvas) {
  if (M.reduce) M.status("תנועה מופחתת: הפתיחה והסט מוצגים בלי גלילה נעוצה");
  else start();
}

/* ====================================================================== */
function start() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch {
    M.status("WebGL לא זמין · הפתיחה והסט מוצגים כתמונה");
    return;
  }
  M.directorLoaded = true;
  root.classList.add("dr-live");

  const sticky = $(".dr-film__sticky");
  const hero = $(".dr-hero");
  const setEl = $(".dr-set");
  const header = $(".dr-header");
  const flash = $(".dr-flash");
  const tc = $("[data-tc]");
  const spots = Object.fromEntries($$(".dr-spot").map((b) => [b.dataset.spot, b]));
  const spotList = $(".dr-hotspots");

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;
  const BG = new THREE.Color("#D9D9D6");
  renderer.setClearColor(BG);

  /* ---------------- הסט ---------------- */
  const scene = new THREE.Scene();
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 4.5, 11);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.02, 40);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (c, srgb = true) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  };
  const cnv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  // מספר פסאודו-אקראי קבוע, כדי שהבטון והפיזור ייראו אותו דבר בכל טעינה
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // בטון: כתמים, גרגר ומישקים בין לוחות
  const concrete = (() => {
    const c = cnv(1024, 1024), x = c.getContext("2d");
    x.fillStyle = "#d3d3cf"; x.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 260; i++) {
      const r = 30 + rnd() * 140, px = rnd() * 1024, py = rnd() * 1024;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      const v = rnd() > 0.5 ? 255 : 90;
      g.addColorStop(0, `rgba(${v},${v},${v - 4},${0.035 + rnd() * 0.04})`);
      g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
    }
    for (let i = 0; i < 26000; i++) {
      const v = rnd() > 0.5 ? 255 : 60;
      x.fillStyle = `rgba(${v},${v},${v},${0.05 + rnd() * 0.08})`;
      x.fillRect(rnd() * 1024, rnd() * 1024, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
    }
    x.fillStyle = "rgba(40,40,40,.11)";
    for (let k = 0; k <= 4; k++) { x.fillRect(k * 256 - 1, 0, 2, 1024); x.fillRect(0, k * 256 - 1, 1024, 2); }
    const t = tex(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(20, 20);
    return t;
  })();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.93, metalness: 0 })
  );
  floor.receiveShadow = true;
  scene.add(floor);

  // אריג הבד: מבליט עדין
  const weave = (() => {
    const c = cnv(64, 64), x = c.getContext("2d");
    x.fillStyle = "#808080"; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 4) {
      x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(0, i, 64, 2);
      x.fillStyle = "rgba(0,0,0,.25)"; x.fillRect(i, 0, 2, 64);
    }
    const t = tex(c, false);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(26, 20);
    return t;
  })();

  const FUCHSIA = new THREE.Color("#EC008C");
  const fabric = new THREE.MeshPhysicalMaterial({
    color: FUCHSIA, roughness: 0.66, sheen: 1, sheenColor: new THREE.Color("#ff9fd6"), sheenRoughness: 0.42,
    bumpMap: weave, bumpScale: 0.5, side: THREE.DoubleSide,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: "#1c1c1f", roughness: 0.36, metalness: 0.05 });
  const metal = new THREE.MeshStandardMaterial({ color: "#c9c9cc", roughness: 0.25, metalness: 1 });
  const paper = new THREE.MeshStandardMaterial({ color: "#fbfbf9", roughness: 0.88, side: THREE.DoubleSide });

  const shadowy = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const UP = new THREE.Vector3(0, 1, 0);
  const bar = (a, b, t, mat) => {
    const d = b.clone().sub(a);
    const m = shadowy(new THREE.Mesh(new THREE.BoxGeometry(t, d.length(), t), mat));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
    return m;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  /* כיסא במאי גבוה (כמו בסט): מושב בגובה 77 ס"מ, משענת רגליים, X מתחת למושב */
  const chair = new THREE.Group();
  const FX = 0.27, ZF = 0.21, ZB = -0.21, ARM_Y = 1.01;
  for (const s of [-1, 1]) {
    chair.add(bar(V(s * FX, 0, ZF), V(s * FX, ARM_Y - 0.012, ZF), 0.038, frameMat)); // רגל קדמית, עד הידית
    chair.add(bar(V(s * FX, 0, ZB), V(s * FX, 1.33, ZB), 0.038, frameMat));          // רגל אחורית, עד המשענת
    chair.add(bar(V(s * FX, 0.755, ZB), V(s * FX, 0.755, ZF), 0.036, frameMat));     // מסילת המושב
    chair.add(bar(V(s * FX, 0.2, ZB), V(s * FX, 0.2, ZF), 0.03, frameMat));          // מסילה תחתונה
    const arm = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.028, 0.54), frameMat));
    arm.position.set(s * FX, ARM_Y, -0.005);
    chair.add(arm);
  }
  chair.add(bar(V(-FX, 0.36, ZF + 0.02), V(FX, 0.36, ZF + 0.02), 0.036, frameMat)); // משענת רגליים
  chair.add(bar(V(-FX, 0.36, ZB), V(FX, 0.36, ZB), 0.03, frameMat));
  for (const z of [ZF, ZB]) { // ה-X מתחת למושב, מלפנים ומאחור
    chair.add(bar(V(-FX, 0.4, z + 0.012), V(FX, 0.74, z + 0.012), 0.028, frameMat));
    chair.add(bar(V(FX, 0.4, z - 0.006), V(-FX, 0.74, z - 0.006), 0.028, frameMat));
    const bolt = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.05, 12).rotateX(Math.PI / 2), metal));
    bolt.position.set(0, 0.57, z + 0.003);
    chair.add(bolt);
  }
  const SEAT_Y = 0.772, SAG = 0.028;
  const seatY = (x) => SEAT_Y - SAG * (1 - clamp((x / 0.26) ** 2));
  const seatGeo = new THREE.PlaneGeometry(0.52, 0.42, 26, 12).rotateX(-Math.PI / 2);
  { const p = seatGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, seatY(p.getX(i)) - SEAT_Y); seatGeo.computeVertexNormals(); }
  const seat = shadowy(new THREE.Mesh(seatGeo, fabric));
  seat.position.y = SEAT_Y;
  chair.add(seat);

  // המשענת: עליה MIRI בלבן, כמו כיסא של במאית
  const backCanvas = cnv(1024, 384);
  const backTex = tex(backCanvas);
  const drawBack = () => {
    const x = backCanvas.getContext("2d");
    x.fillStyle = "#EC008C"; x.fillRect(0, 0, 1024, 384);
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "800 190px Nostela, 'Arial Black', Arial, sans-serif";
    x.fillText("MIRI", 512, 200);
    backTex.needsUpdate = true;
  };
  drawBack();
  const backGeo = new THREE.PlaneGeometry(0.56, 0.21, 28, 2);
  { const p = backGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -0.03 * (1 - (p.getX(i) / 0.28) ** 2)); backGeo.computeVertexNormals(); }
  const back = shadowy(new THREE.Mesh(backGeo, new THREE.MeshPhysicalMaterial({
    map: backTex, roughness: 0.66, sheen: 1, sheenColor: new THREE.Color("#ff9fd6"), sheenRoughness: 0.42,
    bumpMap: weave, bumpScale: 0.5, side: THREE.DoubleSide,
  })));
  back.position.set(0, 1.205, ZB - 0.004);
  chair.add(back);
  scene.add(chair);

  /* דפי התסריט: ערימה על המושב (מתכופפת עם הבד), ועוד שניים שנפלו לרצפה */
  const scriptCanvas = (title) => {
    const c = cnv(512, 724);
    const draw = () => {
      const x = c.getContext("2d");
      x.fillStyle = "#fbfbf9"; x.fillRect(0, 0, 512, 724);
      x.direction = "rtl"; x.fillStyle = "#161618";
      if (title) {
        x.textAlign = "center";
        x.font = "800 92px Nostela, 'Arial Black', sans-serif"; x.fillText("במה", 256, 320);
        x.font = "400 26px Sprinter, Arial, sans-serif"; x.fillText("תסריט: מירי דייטש", 256, 380);
        x.fillStyle = "#EC008C"; x.fillRect(226, 412, 60, 4);
        x.fillStyle = "#2B3BFF"; x.font = "700 20px Sprinter, Arial, sans-serif"; x.fillText("SCENE 01", 256, 660);
      } else {
        x.textAlign = "right";
        x.font = "700 22px Sprinter, Arial, sans-serif"; x.fillText("סצנה 1. פנים. הסט. יום", 452, 90);
        let y = 132;
        const rows = [[1, 0.92], [1, 0.7], [0, 0], [2, 0.3], [3, 0.6], [3, 0.5], [0, 0], [1, 0.95], [1, 0.8], [1, 0.4], [0, 0], [2, 0.26], [3, 0.62], [3, 0.44], [0, 0], [1, 0.9], [1, 0.62]];
        for (const [k, w] of rows) {
          if (k === 1) { x.fillStyle = "rgba(22,22,24,.32)"; x.fillRect(452 - 392 * w, y, 392 * w, 9); }
          if (k === 2) { x.fillStyle = "rgba(22,22,24,.7)"; x.fillRect(256 - 70 * w * 3, y, 140 * w * 3, 10); }
          if (k === 3) { x.fillStyle = "rgba(22,22,24,.3)"; x.fillRect(366 - 230 * w, y, 230 * w, 9); }
          y += k ? 26 : 22;
        }
        x.fillStyle = "rgba(22,22,24,.5)"; x.font = "400 18px Sprinter, Arial, sans-serif"; x.textAlign = "left"; x.fillText("1.", 60, 50);
      }
    };
    draw();
    return [c, draw];
  };
  const [titleC, drawTitle] = scriptCanvas(true);
  const [pageC, drawPage] = scriptCanvas(false);
  const titleTex = tex(titleC), pageTex = tex(pageC);
  const titleMat = paper.clone(); titleMat.map = titleTex;
  const pageMat = paper.clone(); pageMat.map = pageTex;

  const pages = new THREE.Group();
  const PW = 0.17, PH = 0.24;
  const stack = [[-0.1, 0.045, -0.36], [-0.095, 0.04, -0.2], [-0.104, 0.05, -0.06], [-0.09, 0.036, 0.08], [-0.098, 0.044, -0.24]];
  stack.forEach(([px, pz, a], i) => {
    const g = new THREE.PlaneGeometry(PW, PH, 10, 14).rotateX(-Math.PI / 2);
    const p = g.attributes.position, ca = Math.cos(a), sa = Math.sin(a);
    for (let k = 0; k < p.count; k++) {
      const wx = px + p.getX(k) * ca + p.getZ(k) * sa;
      p.setY(k, seatY(wx) + 0.003 + i * 0.0018);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, i === stack.length - 1 ? titleMat : pageMat);
    m.castShadow = true; m.receiveShadow = true;
    m.position.set(px, 0, pz); m.rotation.y = a;
    pages.add(m);
  });
  for (const [px, pz, a] of [[0.52, 0.42, 0.95], [-0.46, -0.5, -0.5]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH).rotateX(-Math.PI / 2), pageMat);
    m.receiveShadow = true; m.castShadow = true;
    m.position.set(px, 0.003, pz); m.rotation.y = a;
    pages.add(m);
  }
  pages.children.forEach((m) => { m.userData.base = { p: m.position.clone(), r: m.rotation.clone() }; });
  scene.add(pages);

  /* הקלאפר: שוכב על הדפים, המקל העליון פתוח */
  const slateCanvas = cnv(1024, 800);
  const slateTex = tex(slateCanvas);
  const drawSlate = () => {
    const x = slateCanvas.getContext("2d");
    x.fillStyle = "#141416"; x.fillRect(0, 0, 1024, 800);
    x.strokeStyle = "#F4F4F2"; x.lineWidth = 6;
    x.strokeRect(24, 24, 976, 752);
    [[24, 270, 1000, 270], [24, 520, 1000, 520], [360, 270, 360, 520], [690, 270, 690, 520]].forEach(([a, b, c2, d]) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.stroke(); });
    x.fillStyle = "#9A9AA0"; x.font = "700 34px Sprinter, Arial, sans-serif"; x.textAlign = "left";
    x.fillText("PROD.", 56, 84); x.fillText("ROLL", 56, 320); x.fillText("SCENE", 392, 320); x.fillText("TAKE", 722, 320); x.fillText("DIRECTOR", 56, 570);
    x.fillStyle = "#F4F4F2"; x.font = "800 104px Nostela, 'Arial Black', sans-serif";
    x.fillText("MIRI DEUTSCH", 56, 210);
    x.font = "800 120px Nostela, 'Arial Black', sans-serif";
    x.fillText("A", 120, 470); x.fillText("01", 440, 470);
    x.fillStyle = "#EC008C"; x.fillText("1", 800, 470);
    x.fillStyle = "#F4F4F2"; x.font = "800 80px Nostela, 'Arial Black', sans-serif"; x.fillText("MIRI", 56, 690);
    slateTex.needsUpdate = true;
  };
  drawSlate();
  const stripes = (accent) => {
    const c = cnv(1024, 144), x = c.getContext("2d");
    x.fillStyle = "#F4F4F2"; x.fillRect(0, 0, 1024, 144);
    for (let i = -1; i < 9; i++) {
      x.fillStyle = i === 4 ? accent : "#141416";
      x.beginPath(); x.moveTo(i * 128 + 64, 0); x.lineTo(i * 128 + 128, 0); x.lineTo(i * 128 + 64 + 40, 144); x.lineTo(i * 128 + 40, 144); x.closePath(); x.fill();
    }
    return tex(c);
  };
  const ink = new THREE.MeshStandardMaterial({ color: "#141416", roughness: 0.5 });
  const slateTop = new THREE.MeshStandardMaterial({ map: slateTex, roughness: 0.55 });
  const stickTopA = new THREE.MeshStandardMaterial({ map: stripes("#EC008C"), roughness: 0.4 });
  const stickTopB = new THREE.MeshStandardMaterial({ map: stripes("#2B3BFF"), roughness: 0.4 });
  const clapper = new THREE.Group();
  const board = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.2), [ink, ink, slateTop, ink, ink, ink]));
  clapper.add(board);
  const lower = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.036), [ink, ink, stickTopB, ink, ink, ink]));
  lower.position.set(0, 0, -0.119);
  clapper.add(lower);
  const hinge = new THREE.Object3D();
  hinge.position.set(-0.13, 0.013, -0.119);
  const upper = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.036), [ink, ink, stickTopA, ink, ink, ink]));
  upper.position.set(0.13, 0, 0);
  hinge.add(upper);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 12), metal);
  pin.position.set(0.006, 0, 0);
  hinge.add(pin);
  clapper.add(hinge);
  const OPEN = 0.42;
  hinge.rotation.y = OPEN;
  // על הידית הימנית, לאורכה, והמקלות פונים החוצה
  const CLAP_BASE = { p: V(FX + 0.012, ARM_Y + 0.02, 0.0), r: -Math.PI / 2 + 0.1 };
  clapper.position.copy(CLAP_BASE.p);
  clapper.rotation.y = CLAP_BASE.r;
  scene.add(clapper);

  /* אור: אלומת שמש קשה ונמוכה (צללים ארוכים באלכסון), מילוי רך, והחזר פוקסיה מתחת למושב */
  scene.add(new THREE.HemisphereLight("#ffffff", "#b9b9b4", 1.15));
  const sun = new THREE.DirectionalLight("#fff6ee", 3.4);
  sun.position.set(-4.3, 3.9, 2.8);
  sun.target.position.set(0.2, 0.3, -0.15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 1, far: 12 });
  scene.add(sun, sun.target);
  const bounce = new THREE.PointLight("#ff2fa0", 2.2, 1.4, 2);
  bounce.position.set(0.05, 0.5, 0.02);
  scene.add(bounce);

  // הטקסטורות עם טקסט מצוירות שוב כשהפונטים מוכנים
  document.fonts?.ready.then(() => {
    drawBack(); drawSlate(); drawTitle(); drawPage();
    titleTex.needsUpdate = true; pageTex.needsUpdate = true;
  });

  /* ---------------- המצלמה: זווית לכל סצנה (מיקום, נקודת מבט, הטיה) ---------------- */
  const K = (p, t, r) => ({ p, t, r });
  const KEYS = {
    top: K(V(0.25, 3.0, 0.42), V(0, 0.75, 0), 0.55),          // מבט-על, מעט עקום
    set: K(V(1.75, 2.0, 1.45), V(0, 0.82, 0), 0.14),
    pain: K(V(-1.95, 0.42, 1.15), V(0, 0.95, 0), -0.12),       // מלמטה, מהצד
    how: K(V(-0.3, 2.7, -0.6), V(0, 0.75, 0), -0.9),           // מלמעלה, מאחור
    services: K(V(2.3, 1.7, -1.05), V(0, 0.75, 0), 0.08),
    projects: K(V(-0.35, 3.6, 0.7), V(0, 0.7, 0), 0.35),    // גבוה מעל הכיסא, כשהדפים עפים
    about: K(V(0.95, 1.5, 0.62), V(0.27, 1.02, 0), 0.22),       // קרוב על הקלאפר
    contact: K(V(1.4, 0.18, 1.8), V(0, 1.02, -0.06), -0.07),    // מהרצפה כלפי מעלה
  };
  /* ---------------- הווילון: שיידר על כל המסך ---------------- */
  const satin = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uOpen: { value: 0 }, uIntro: { value: 1 },
      uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector3(0.25, 0.5, 0) },
    },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpen, uIntro;
      uniform vec2 uRes;
      uniform vec3 uMouse;
      varying vec2 vUv;

      // חצי הרוחב של כל וילון. הוא נאסף מלמטה קודם, כמו וילון קשור
      float edgeW(float y){ return 0.5 * pow(1.0 - clamp(uOpen, 0.0, 1.0), mix(1.75, 0.62, y)); }

      float cloth(vec2 p, out float u){
        float e = max(edgeW(p.y), 1e-4);
        float side = step(0.5, p.x);
        float x = mix(p.x, 1.0 - p.x, side);
        u = x / e;
        float asp = uRes.x / uRes.y, t = uTime;
        float sway = (0.8 + 1.8 * uIntro) * sin(p.y * 2.2 + t * 0.42 + side * 2.1) + 0.55 * sin(p.y * 4.7 - t * 0.75 + u * 1.7);
        sway += p.y * (1.1 + 0.6 * sin(t * 0.17 + side * 3.0)); // הקפלים נוטים מעט באלכסון
        float ph = u * 5.5 * 6.2831853 + sway;
        float folds = sin(ph) + 0.38 * sin(2.0 * ph + 1.1) + 0.12 * sin(5.0 * ph + 0.4);
        float h = folds * 0.0105 * pow(e / 0.5, 0.55);
        // גלים רחבים ורכים שעוברים על הבד: הברק "זורם"
        h += 0.022 * sin(u * 1.7 * 6.2831853 + p.y * 1.4 + t * 0.33 + side * 1.3) * pow(e / 0.5, 0.8);
        h += 0.0024 * sin(p.y * 17.0 - t * 1.5 + u * 3.0) * (0.35 + 0.9 * uIntro);
        vec2 q = vec2(p.x * asp, p.y), m = vec2(uMouse.x * asp, uMouse.y);
        float d = distance(q, m);
        h += uMouse.z * 0.005 * sin(d * 46.0 - t * 6.5) * exp(-d * 5.5);
        return h;
      }

      void main(){
        vec2 p = vUv;
        float asp = uRes.x / uRes.y;
        float u;
        float h = cloth(p, u);
        float e = edgeW(p.y);
        float aa = 1.6 / max(e * uRes.x, 1.0);
        if (u > 1.0) {
          float x = mix(p.x, 1.0 - p.x, step(0.5, p.x));
          float dx = (x - e) * asp;
          gl_FragColor = vec4(0.07, 0.0, 0.05, 0.45 * exp(-dx * 26.0) * smoothstep(0.0, 0.03, uOpen));
          return;
        }
        float uu;
        vec2 ex = vec2(1.5 / uRes.x, 0.0), ey = vec2(0.0, 1.5 / uRes.y);
        float hx = cloth(p + ex, uu) - h;
        float hy = cloth(p + ey, uu) - h;
        vec3 n = normalize(vec3(-hx / (ex.x * asp), -hy / ey.y, 1.0));

        vec3 L = normalize(vec3(-0.5, 0.55, 0.65));
        vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
        float diff = max(dot(n, L), 0.0), nh = max(dot(n, H), 0.0);
        float shaft = smoothstep(0.26, 0.0, abs(p.x * asp * 0.55 + p.y - 1.05 - 0.08 * sin(uTime * 0.18)));

        vec3 L2 = normalize(vec3(0.62, -0.18, 0.76));
        vec3 H2 = normalize(L2 + vec3(0.0, 0.0, 1.0));
        float nh2 = max(dot(n, H2), 0.0);

        vec3 col = mix(vec3(0.11, 0.0, 0.085), vec3(0.93, 0.0, 0.55), smoothstep(0.0, 1.0, diff));
        col = mix(col, vec3(1.0, 0.18, 0.66), smoothstep(0.82, 1.0, diff) * 0.55);
        col *= 0.78 + 0.45 * shaft;
        col += vec3(1.0, 0.9, 0.97) * pow(nh, 160.0) * (1.1 + 0.8 * shaft);   // ברק חד, כמו סאטן
        col += vec3(1.0, 0.45, 0.8) * pow(nh, 18.0) * 0.32;
        col += vec3(0.82, 0.86, 1.0) * pow(nh2, 220.0) * 0.55;                // הבזק קר מהצד
        float fres = pow(1.0 - n.z, 1.4);
        col = mix(col, vec3(0.74, 0.72, 0.8), clamp(fres * 0.8, 0.0, 0.38));
        col *= mix(1.0, 0.5, smoothstep(0.9, 1.0, u) * smoothstep(0.0, 0.03, uOpen));
        col *= 0.84 + 0.16 * smoothstep(0.0, 0.25, p.y);
        col *= 1.0 - 0.2 * smoothstep(0.7, 1.0, p.y);
        float g = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 91.0, vec2(12.9898, 78.233))) * 43758.5453);
        col += (g - 0.5) * 0.035;
        gl_FragColor = vec4(col, 1.0 - smoothstep(1.0 - aa, 1.0, u) * smoothstep(0.0, 0.03, uOpen));
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), satin);
  quad.frustumCulled = false;
  const satinScene = new THREE.Scene();
  satinScene.add(quad);
  const flat = new THREE.Camera();


  const frozen = () => root.classList.contains("a11y-motion");

  /* ---------------- הסצנות: אורך כל אחת ביחידות של גובה מסך ---------------- */
  const SC = [
    { id: "hero", len: 0.6 }, { id: "curtain", len: 0.9 },
    { id: "set", len: 1.2 }, { id: "pain", len: 1.4 }, { id: "how", len: 1.2 }, { id: "services", len: 1.3 },
    { id: "projects", len: 2.8 }, { id: "about", len: 1.5 }, { id: "contact", len: 1.8 },
  ];
  let acc = 0;
  SC.forEach((c, i) => {
    c.i = i; c.start = acc; acc += c.len;
    c.el = $(`[data-scene="${c.id}"]`);
    c.inner = c.el?.querySelector(":scope > .dr-wrap, :scope > .dr-footer__in");
    c.ins = c.el ? [...c.el.querySelectorAll("[data-in]"), ...(c.el.matches("[data-in]") ? [c.el] : [])] : [];
    c.on = false;
  });
  const TOTAL = acc;
  const byId = Object.fromEntries(SC.map((c) => [c.id, c]));
  const panels = SC.filter((c) => c.el && c.id !== "set");
  const seatTag = $(".dr-seat-tag");

  /* ---------------- מידות ---------------- */
  let W = 1, H = 1, aspect = 1, distK = 1;
  const size = () => {
    W = sticky.clientWidth; H = sticky.clientHeight;
    aspect = W / H;
    film.style.height = `${Math.round((TOTAL + 1) * innerHeight)}px`;
    renderer.setPixelRatio(Math.min(devicePixelRatio, aspect < 1 ? 1.5 : 1.75));
    renderer.setSize(W, H, false);
    camera.aspect = aspect;
    camera.fov = aspect < 1 ? 58 : 50;
    distK = aspect < 1 ? clamp(1.05 / aspect, 1, 2.05) : 1;
    // מזיזים את הכיסא הצידה (בדסקטופ) או למעלה (בטלפון), כדי לפנות מקום לדף
    if (aspect >= 1) camera.setViewOffset(W, H, W * 0.19, 0, W, H);
    else camera.setViewOffset(W, H, 0, H * 0.24, W, H);
    camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(satin.uniforms.uRes.value);
  };
  size();
  addEventListener("resize", size);

  /* ---------------- גלילה: איפה אנחנו בסרט (ביחידות מסך) ---------------- */
  let sT = 0, sS = 0;
  const readScroll = () => {
    const r = film.getBoundingClientRect();
    sT = clamp(-r.top / innerHeight, 0, TOTAL);
  };
  readScroll();
  sS = sT;
  addEventListener("scroll", readScroll, { passive: true });

  // מעבר לסצנה (תפריט, כפתורים, קישורים פנימיים): גוללים לנקודה שבה הדף שלה כבר פתוח
  const sceneTop = (c, at) => film.getBoundingClientRect().top + scrollY + (c.start + at * c.len) * innerHeight;
  const goScene = (c, at = c.id === "projects" ? 0.32 : c.id === "hero" ? 0 : 0.45, smoothly = true) => {
    scrollTo({ top: sceneTop(c, at), behavior: smoothly && !frozen() ? "smooth" : "auto" });
  };
  M.goScene = (sel) => {
    const c = SC.find((x) => x.el && `#${x.el.id}` === sel);
    if (c) goScene(c);
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    const c = id === "#top" ? SC[0] : SC.find((x) => x.el && `#${x.el.id}` === id);
    if (!c) return;
    e.preventDefault();
    goScene(c);
  }, true);
  // הגלריה: לחיצה על כרטיס מסובבת אותו קדימה
  M.director = { ringGo: (rp) => scrollTo({ top: sceneTop(byId.projects, 0.2 + rp * 0.74), behavior: frozen() ? "auto" : "smooth" }) };

  /* ---------------- עכבר: אדווה על הסאטן, ריחוף ובחירה על הסט ---------------- */
  const mouse = new THREE.Vector2(0.25, 0.5), ndc = new THREE.Vector2(-9, -9);
  let mouseK = 0, hovered = null;
  const ray = new THREE.Raycaster();
  const pickables = [["pages", pages], ["clapper", clapper], ["chair", chair]];
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    ndc.set(mouse.x * 2 - 1, mouse.y * 2 - 1);
    mouseK = 1;
  });
  canvas.addEventListener("pointerleave", () => { ndc.set(-9, -9); });
  canvas.addEventListener("click", () => { if (hovered) spots[hovered]?.click(); });

  /* ---------------- פעולות מהכפתורים על הסט ---------------- */
  let clapAt = -1, pulseAt = -1;
  M.director.act = (kind) => {
    const now = performance.now();
    if (kind === "clapper") { clapAt = now; return 650; }
    if (kind === "chair") { pulseAt = now; return 520; }
    return 120; // הדפים עפים בעצמם כשהגלילה מגיעה לפרויקטים
  };

  /* ---------------- הלולאה ---------------- */
  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), anchor = new THREE.Vector3();
  const anchors = { pages: V(-0.15, SEAT_Y + 0.012, 0.1), clapper: V(0, 0, 0), chair: V(0, 1.27, -0.23) };
  const seatPoint = V(0, SEAT_Y - 0.01, 0.03);
  let running = false, last = performance.now(), solid = false, lastTc = "";
  const hoverLift = { pages: 0, clapper: 0, chair: 0 };
  const t0 = performance.now();
  let time = 0, clapLocal = 0, flashed = false;
  const fire = () => { flash.classList.remove("is-on"); void flash.offsetWidth; flash.classList.add("is-on"); };

  const blendKey = (a, b, f, lift) => {
    tmpP.lerpVectors(a.p, b.p, f); tmpT.lerpVectors(a.t, b.t, f);
    tmpP.y += Math.sin(Math.PI * f) * lift;
    return lerp(a.r, b.r, f);
  };

  const frame = (now) => {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!frozen()) time += dt;

    sS += (sT - sS) * Math.min(1, dt * 7);
    if (Math.abs(sT - sS) < 1e-4) sS = sT;
    const s = sS;
    let cur = SC[SC.length - 1];
    for (const c of SC) if (s >= c.start) cur = c;
    const lt = clamp((s - cur.start) / cur.len);

    const A = smooth(0, byId.hero.len, s);                                  // המסך נפתח: חצי הלוגו יוצא
    const O = inOut(clamp((s - 0.5) / 1.0));                               // הווילון נאסף
    hero.style.setProperty("--a", A.toFixed(4));
    hero.style.setProperty("--o", O.toFixed(4));
    if ((A > 0.97) !== solid) { solid = A > 0.97; header?.classList.toggle("dr-solid", solid); }

    // הסט: הטקסט והכפתורים רק בסצנה שלו
    const setT = clamp((s - byId.set.start) / byId.set.len);
    const setV = s < byId.set.start - 0.4 ? 0 : smooth(-0.05, 0.12, (s - byId.set.start) / byId.set.len) * (1 - smooth(0.82, 1, setT));
    setEl.style.setProperty("--c-in", setV.toFixed(3));
    setEl.style.setProperty("--s-in", setV.toFixed(3));
    spotList.classList.toggle("is-off", setV < 0.5);

    // הדפים של הסצנות: נכנסים אחרי שהמצלמה הגיעה, ותוכן ארוך זז בתוך הדף
    for (const c of panels) {
      const t = (s - c.start) / c.len;
      const isLast = c === SC[SC.length - 1];
      const v = t < 0 || t > 1.02 ? 0 : smooth(0.18, 0.36, t) * (isLast ? 1 : 1 - smooth(0.9, 1, t));
      if ((v > 0.01) !== c.on) {
        c.on = v > 0.01;
        c.el.classList.toggle("is-on", c.on);
        if (c.on) c.ins.forEach((el) => el.classList.add("is-in"));
        else c.ins.forEach((el) => el.classList.remove("is-in"));
      }
      if (!c.on) continue;
      c.el.style.setProperty("--v", v.toFixed(3));
      if (c.inner) {
        const over = Math.max(0, c.inner.scrollHeight - c.el.clientHeight);
        c.el.style.setProperty("--scrub", `${(-over * smooth(0.38, 0.9, t)).toFixed(1)}px`);
      }
    }
    // הגלריה בעיגול מסתובבת עם הגלילה
    if (byId.projects.on) M.ring?.set(clamp(((s - byId.projects.start) / byId.projects.len - 0.2) / 0.74));

    // מונה זמן של מצלמה
    if (tc) {
      const sec = (now - t0) / 1000, f = Math.floor((sec % 1) * 25);
      const txt = `00:${String(Math.floor(sec / 60) % 60).padStart(2, "0")}:${String(Math.floor(sec) % 60).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
      if (txt !== lastTc) { tc.textContent = txt; lastTc = txt; }
    }

    renderer.clear();

    /* הסט */
    if (O > 0.001) {
      // המצלמה: מבט-על עד הסט, ומשם זווית לכל סצנה, במעבר רך בתחילת הסצנה
      let roll;
      if (s < byId.set.start) {
        tmpP.copy(KEYS.top.p); tmpT.copy(KEYS.top.t); roll = KEYS.top.r;
        tmpP.y += (1 - O) * 0.8;
      } else if (cur === byId.set) {
        roll = blendKey(KEYS.top, KEYS.set, inOut(lt), 0);
      } else {
        const prev = SC[cur.i - 1];
        roll = blendKey(KEYS[prev.id] || KEYS.set, KEYS[cur.id], inOut(clamp(lt / 0.4)), 0.4);
        // סחרור איטי בזמן שהדף פתוח
        const ang = (lt - 0.5) * 0.18;
        const dx = tmpP.x - tmpT.x, dz = tmpP.z - tmpT.z;
        tmpP.x = tmpT.x + dx * Math.cos(ang) - dz * Math.sin(ang);
        tmpP.z = tmpT.z + dx * Math.sin(ang) + dz * Math.cos(ang);
      }
      tmpP.sub(tmpT).multiplyScalar(distK).add(tmpT);
      const mx = ndc.x > -2 ? ndc.x : 0, my = ndc.y > -2 ? ndc.y : 0;
      tmpP.x += mx * 0.06 + Math.sin(time * 0.3) * 0.015;
      tmpP.z += -my * 0.05;
      camera.position.copy(tmpP);
      camera.up.set(0, 1, 0);
      camera.lookAt(tmpT);
      camera.rotateZ(roll);

      // ריחוף מעל חפץ (רק בסצנת הסט)
      let hit = null;
      if (setV > 0.5 && ndc.x > -2) {
        ray.setFromCamera(ndc, camera);
        let best = Infinity;
        for (const [k, obj] of pickables) {
          const h = ray.intersectObject(obj, true)[0];
          if (h && h.distance < best) { best = h.distance; hit = k; }
        }
      }
      if (hit !== hovered) {
        if (hovered) spots[hovered]?.classList.remove("is-hover");
        if (hit) spots[hit]?.classList.add("is-hover");
        canvas.classList.toggle("is-hover", !!hit);
        hovered = hit;
      }
      for (const k in hoverLift) hoverLift[k] += ((hovered === k ? 1 : 0) - hoverLift[k]) * Math.min(1, dt * 10);

      // הדפים: מתרוממים בריחוף, ועפים מהכיסא כשמגיעים לפרויקטים (והולכים לגלריה)
      const fly = clamp((s - byId.projects.start) / (byId.projects.len * 0.24));
      pages.children.forEach((m, i) => {
        const b = m.userData.base;
        const ft = clamp((fly * 1.25 - i * 0.05));
        const up = ft * ft * (2.2 + i * 0.3);
        m.position.set(b.p.x + ft * (i - 3) * 0.14, b.p.y + hoverLift.pages * (0.012 + i * 0.004) + up, b.p.z - ft * 0.25);
        m.rotation.set(b.r.x - ft * (1.2 + i * 0.3), b.r.y + ft * (i % 2 ? 1.4 : -1.1), b.r.z + ft * 0.6);
        m.visible = ft < 0.999;
      });

      // הקלאפר: נפתח עוד בריחוף. נסגר בלחיצה, וגם כשהגלילה נכנסת לאודות (עם הבזק)
      let ang = OPEN + hoverLift.clapper * 0.2;
      const aboutT = (s - byId.about.start) / byId.about.len;
      const sc = smooth(0.12, 0.2, aboutT) * (1 - smooth(0.92, 1.0, aboutT));
      if (sc > 0) ang = lerp(ang, 0, sc);
      if (aboutT > 0.2 && aboutT < 0.5 && !flashed) { flashed = true; fire(); }
      if (aboutT < 0.1 || aboutT > 1) flashed = false;
      const cl = clapAt < 0 ? -1 : (now - clapAt) / 1000;
      if (cl >= 0) {
        if (cl < 0.14) ang = lerp(OPEN + 0.2, 0, (cl / 0.14) ** 2);
        else if (cl < 1.0) ang = 0;
        else if (cl < 1.6) ang = lerp(0, OPEN, inOut((cl - 1.0) / 0.6));
        else clapAt = -1;
        if (cl >= 0.14 && clapLocal !== clapAt) { clapLocal = clapAt; fire(); }
      }
      hinge.rotation.y = ang;

      // הכיסא: האור מהבהב בלחיצה, ונדלק חזק יותר על הכיסא הריק בסצנה האחרונה
      const pu = pulseAt < 0 ? -1 : (now - pulseAt) / 1000;
      if (pu > 1.4) pulseAt = -1;
      const flick = pu >= 0 && pu < 0.5 ? (Math.sin(pu * 70) > 0 ? 0.55 : 1) : 1;
      const lastV = byId.contact.on ? +byId.contact.el.style.getPropertyValue("--v") || 0 : 0;
      sun.intensity = 3.4 * flick * (1 + hoverLift.chair * 0.18 + lastV * 0.22 + (pu >= 0.5 ? 0.35 * Math.sin(((pu - 0.5) / 0.9) * Math.PI) : 0));

      renderer.render(scene, camera);

      // הכפתורים על הסט יושבים על החפצים
      const project = (v) => {
        anchor.copy(v).project(camera);
        return [(anchor.x * 0.5 + 0.5) * W, (1 - (anchor.y * 0.5 + 0.5)) * H, anchor.z < 1 && Math.abs(anchor.x) < 1.05 && Math.abs(anchor.y) < 1.05];
      };
      if (setV > 0.001) {
        anchors.clapper.set(0.05, 0.03, -0.02).applyEuler(clapper.rotation).add(clapper.position);
        for (const [k, b] of Object.entries(spots)) {
          let [x, y, vis] = project(anchors[k]);
          const bw = b.offsetWidth, pad = 8; // התווית לא יוצאת מהמסך
          x = b.classList.contains("dr-spot--flip") ? Math.min(x, W - bw + 19.5 - pad) : Math.max(x, bw - 19.5 + pad);
          const li = b.parentElement;
          li.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
          li.style.visibility = vis ? "" : "hidden";
        }
      }
      // "המוצר שלך" על המושב הריק
      if (seatTag) {
        const [x, y] = project(seatPoint);
        seatTag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        seatTag.style.setProperty("--tag", lastV.toFixed(3));
      }
    }

    /* הווילון */
    if (O < 0.999) {
      const u = satin.uniforms;
      u.uTime.value = time;
      u.uOpen.value = O;
      u.uIntro.value = Math.max(0, 1 - (now - t0) / 2600);
      mouseK *= Math.pow(0.35, dt);
      u.uMouse.value.set(lerp(u.uMouse.value.x, mouse.x, Math.min(1, dt * 6)), lerp(u.uMouse.value.y, mouse.y, Math.min(1, dt * 6)), mouseK);
      renderer.render(satinScene, flat);
    }
  };

  // מציירים רק כשהסרט על המסך
  const play = (on) => {
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); requestAnimationFrame(frame); }
  };
  new IntersectionObserver(([en]) => play(en.isIntersecting && !document.hidden)).observe(film);
  document.addEventListener("visibilitychange", () => {
    const r = film.getBoundingClientRect();
    play(!document.hidden && r.bottom > 0 && r.top < innerHeight);
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    M.status("WebGL נעצר (context lost) · רענון הדף מחזיר את הסט");
  });

  // כתובת עם עוגן (למשל #about): מגיעים ישר לסצנה
  const start = SC.find((c) => c.el && location.hash === `#${c.el.id}`);
  if (start) requestAnimationFrame(() => goScene(start, undefined, false));
}
