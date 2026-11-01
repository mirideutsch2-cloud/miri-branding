/* גרסה ו · כיסא הבמאי: אתר כמו משחק, על ויז'ואלים אמיתיים (img/set/, מהיגספילד).
   הגלילה היא סרט: חצי הלוגו יוצא, הווילון נפתח, והמצלמה זזה על תמונת הסט מסצנה לסצנה.
   החפצים אמיתיים (חתוכים מאותה תמונה): נוגעים בקלאפר והוא עף מהידית, מסתובב אל המסך, נסגר (טייק 1)
   ונפתח ללוח של האודות. נוגעים בדפים והם עפים מהמושב ונפתחים לגלריה בעיגול. בסגירה כל חפץ חוזר למקומו.
   לחיצה אף פעם לא גוללת. בלי JS או עם reduced-motion: אזורים רגילים. כל נפילה לברירת מחדל נכתבת בלוח הטיוטה. */
(() => {
  const M = window.MIRI || { status() {}, reduce: false };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const outC = (t) => 1 - (1 - t) ** 3;
  const film = $(".dr-film");
  if (!film) return;
  const frozen = () => root.classList.contains("a11y-motion");

  M.status("ויז'ואלים מהיגספילד (טיוטה): וילון, כיסא ריק, קלאפר ודפים חתוכים, ב-1024px");
  M.status("תוויות חדשות (טיוטה): \"גללי, והמסך נפתח\", \"געי בקלאפר או בדפי התסריט\", \"חזרה לסט\"");

  const ins = $$("[data-in]");
  if (M.reduce) {
    M.status("תנועה מופחתת: האתר מוצג כאזורים רגילים, בלי סרט ובלי מעוף");
    ins.forEach((el) => el.classList.add("is-in"));
    return;
  }
  root.classList.add("dr-live");

  /* ---------------- אלמנטים ---------------- */
  const sticky = $(".dr-film__sticky");
  const frame = $(".dr-frame");
  const curtain = $(".dr-curtain");
  const setEl = $(".dr-set");
  const header = $(".dr-header");
  const flash = $(".dr-flash");
  const tc = $("[data-tc]");
  const closeBtn = $(".dr-close");
  const objs = { projects: $(".dr-obj--pages"), about: $(".dr-obj--clap"), contact: $(".dr-obj--chair") };
  const flyPages = $(".dr-fly__pages");
  const flyClap = $(".dr-fly__clap");
  const flyTop = $(".dr-fly__top");
  const flyFront = $(".dr-fly__front");
  const IMG = { w: 1024, h: 573 };

  /* ---------------- הסצנות (אורך ביחידות של גובה מסך) ---------------- */
  const SC = [
    { id: "hero", len: 0.6 }, { id: "curtain", len: 1.0 }, { id: "set", len: 1.2 },
    { id: "pain", len: 1.4 }, { id: "how", len: 1.2 }, { id: "services", len: 1.3 },
    { id: "projects", len: 2.6 }, { id: "about", len: 1.8 }, { id: "contact", len: 1.8 },
  ];
  let acc = 0;
  SC.forEach((c, i) => {
    c.i = i; c.start = acc; acc += c.len;
    c.el = $(`[data-scene="${c.id}"]`);
    c.inner = c.el?.querySelector(":scope > .dr-wrap, :scope > .dr-footer__in");
    c.ins = c.el ? [...c.el.querySelectorAll("[data-in]")] : [];
    c.on = false;
    if (c.el && c.id !== "set") c.el.tabIndex = -1;
  });
  const TOTAL = acc;
  const byId = Object.fromEntries(SC.map((c) => [c.id, c]));

  /* ---------------- המצלמה על התמונה: נקודת מוקד (בשברים של התמונה), זום, ואיפה היא יושבת במסך ---------------- */
  const CAM = {
    hero: { z: 1.22, f: [0.47, 0.36] },
    set: { z: 1.0, f: [0.5, 0.34] },
    pain: { z: 1.6, f: [0.47, 0.36] },
    how: { z: 1.3, f: [0.62, 0.7] },       // הצל הארוך של הכיסא
    services: { z: 1.95, f: [0.43, 0.15] }, // המשענת
    projects: { z: 1.12, f: [0.47, 0.36] },
    about: { z: 1.4, f: [0.56, 0.27] },    // הידית עם הקלאפר
    contact: { z: 1.8, f: [0.47, 0.37] },  // המושב הריק
  };
  let W = 1, H = 1, fw = 1, fh = 1;
  const anchorOf = (id) => {
    const mob = W < H;
    if (id === "projects" || id === "about") return [0.5, 0.5];
    if (id === "hero" || id === "set") return mob ? [0.5, 0.36] : [0.36, 0.48];
    return mob ? [0.5, 0.24] : [0.3, 0.52];
  };
  const cam = {}, camA = {}, camB = {};
  const camOf = (id, out) => {
    const k = CAM[id] || CAM.set, [ax, ay] = anchorOf(id);
    out.z = k.z; out.fx = k.f[0]; out.fy = k.f[1]; out.ax = ax; out.ay = ay;
    return out;
  };
  const mixCam = (a, b, t) => { for (const k of ["z", "fx", "fy", "ax", "ay"]) cam[k] = lerp(a[k], b[k], t); };

  /* ---------------- הגלריה בעיגול ---------------- */
  const ring = byId.projects.el;
  const list = $(".dr-ring__list", ring);
  const cards = $$(".dr-card", ring);
  const count = $("[data-ring-count] bdi", ring);
  const n = cards.length, step = 360 / n;
  let R = 0, front = -1;
  const tilt = cards.map((_, i) => [(-1) ** i * (5 + i * 3), (i - (n - 1) / 2) * 8, i * 1.5]);
  ring.classList.add("is-3d");
  const measureRing = () => {
    const w = cards[0].offsetWidth || 300;
    R = Math.max(w * 0.95, (w * n) / (2 * Math.PI) * 1.22);
  };
  const drawRing = (s, rp) => {
    const turn = rp * step * (n - 1);
    list.style.transform = `translateZ(${-R * s}px) rotateX(${-7 * s}deg)`;
    let best = 0, bestA = 999;
    cards.forEach((c, i) => {
      const a = i * step - turn, [rz, x, y] = tilt[i], k = 1 - s;
      const sc = lerp(0.55, 1, outC(clamp(s * 3)));
      c.style.transform = `rotateY(${a * s}deg) translateZ(${R * s}px) translate(${x * k}px, ${y * k}px) rotateZ(${rz * k}deg) scale(${sc}) translateZ(${-i * k * 3}px)`;
      const facing = Math.abs(((((a + 180) % 360) + 360) % 360) - 180);
      c.style.setProperty("--dim", String(s < 0.5 ? (i ? 0.25 : 0) : clamp(facing / 90) * 0.55));
      if (facing < bestA) { bestA = facing; best = i; }
    });
    if (best !== front) {
      cards[front]?.classList.remove("is-front");
      cards[best].classList.add("is-front");
      front = best;
      if (count) count.textContent = `${String(best + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
    }
  };

  /* ---------------- מידות ---------------- */
  const size = () => {
    W = sticky.clientWidth; H = sticky.clientHeight;
    const s0 = Math.max(W / IMG.w, H / IMG.h);
    fw = IMG.w * s0; fh = IMG.h * s0;
    film.style.height = `${Math.round((TOTAL + 1) * innerHeight)}px`;
    sticky.style.setProperty("--fw", `${fw}px`);
    sticky.style.setProperty("--fh", `${fh}px`);
    // הווילון: התמונה במלוא המסך, וכל חצי מראה את החצי שלו
    const cx = (W - fw) / 2, cy = (H - fh) / 2;
    curtain.style.setProperty("--cw", `${fw}px`);
    curtain.style.setProperty("--ch", `${fh}px`);
    curtain.style.setProperty("--cx", `${cx}px`);
    curtain.style.setProperty("--cx2", `${cx - W / 2}px`);
    curtain.style.setProperty("--cy", `${cy}px`);
    measureRing();
  };

  /* ---------------- גלילה ---------------- */
  let sT = 0, sS = 0;
  const readScroll = () => { sT = clamp(-film.getBoundingClientRect().top / innerHeight, 0, TOTAL); };

  /* ---------------- פתיחה בלחיצה (כמו במשחק): לא גוללת, הסצנה נפתחת במקום ---------------- */
  let opened = null, openK = 0, openScrub = 0, rpT = 0, rpC = 0, returnFocus = null, pulseAt = -1;
  const click = { about: 0, projects: 0 };
  const open = (id, rp) => {
    const c = byId[id];
    if (!c?.el || id === "set") return;
    if (opened === id) { if (rp != null) rpT = rp; return; }
    if (!opened) returnFocus = document.activeElement;
    opened = id;
    openScrub = 0;
    if (id === "projects") { rpT = rp ?? 0; rpC = rpT; }
    if (id === "contact") pulseAt = performance.now();
    root.classList.add("dr-locked");
    closeBtn.hidden = false;
    setTimeout(() => c.el.focus({ preventScroll: true }), 900);
  };
  const close = () => {
    if (!opened) return;
    opened = null;
    root.classList.remove("dr-locked");
    closeBtn.hidden = true;
    returnFocus?.focus?.({ preventScroll: true });
  };
  M.goScene = (sel) => open(sel.replace("#", ""));
  Object.entries(objs).forEach(([id, b]) => b?.addEventListener("click", () => open(id)));
  closeBtn.addEventListener("click", close);
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    if (id === "top") { e.preventDefault(); close(); scrollTo({ top: 0, behavior: frozen() ? "auto" : "smooth" }); return; }
    if (!byId[id] || ["set", "hero", "curtain"].includes(id)) return;
    e.preventDefault();
    open(id);
  }, true);
  cards.forEach((c, i) => {
    const go = () => { if (opened !== "projects") open("projects", i / (n - 1)); else rpT = i / (n - 1); };
    c.addEventListener("click", (e) => { if (!c.classList.contains("is-front")) { e.preventDefault(); go(); } });
    c.addEventListener("focusin", () => { if (!c.classList.contains("is-front")) go(); });
  });
  // בתוך סצנה פתוחה הגלילה לא מזיזה את הדף: היא מסובבת את הגלריה, או מזיזה את הטקסט בדף
  const nudge = (d) => {
    if (opened === "projects") rpT = clamp(rpT + d * 0.0008);
    else openScrub = Math.max(0, openScrub + d);
  };
  addEventListener("wheel", (e) => { if (!opened) return; e.preventDefault(); nudge(e.deltaY * (e.deltaMode ? 40 : 1)); }, { passive: false });
  let touchY = null;
  addEventListener("touchstart", (e) => { touchY = e.touches[0]?.clientY ?? null; }, { passive: true });
  addEventListener("touchmove", (e) => {
    if (!opened || touchY == null || e.target.closest?.("input, textarea")) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    nudge((touchY - y) * 1.6);
    touchY = y;
  }, { passive: false });
  addEventListener("keydown", (e) => {
    if (!opened) return;
    if (e.key === "Escape") { close(); return; }
    if (e.target.closest?.("input, textarea, select")) return;
    const k = { ArrowDown: 90, PageDown: 300, " ": 300, ArrowUp: -90, PageUp: -300 }[e.key];
    if (k) { e.preventDefault(); nudge(k); }
  });

  /* ---------------- המעוף ---------------- */
  const relRect = (el) => {
    const r = el.getBoundingClientRect(), s = sticky.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  };
  const place = (el, cx, cy, w, h, extra = "") => {
    el.style.width = `${w.toFixed(1)}px`; el.style.height = `${h.toFixed(1)}px`;
    el.style.transform = `translate(${(cx - w / 2).toFixed(1)}px, ${(cy - h / 2).toFixed(1)}px) ${extra}`;
  };
  const FRONT_AR = 713 / 668; // גובה/רוחב של הקלאפר מלפנים
  let flashed = false;
  const fire = () => { flash.classList.remove("is-on"); void flash.offsetWidth; flash.classList.add("is-on"); };

  // הקלאפר: p=0 על הידית, p=1 פתוח ללוח של האודות
  const clapFlight = (p, src) => {
    const vis = p > 0.001;
    objs.about.classList.toggle("is-gone", vis);
    flyClap.style.visibility = vis ? "visible" : "hidden";
    if (!vis) { flashed = false; return; }
    const mob = W < H;
    const tw = mob ? Math.min(W * 0.78, (H * 0.42) / FRONT_AR) : Math.min(W * 0.4, (H * 0.52) / FRONT_AR, 560);
    const th = tw * FRONT_AR, tx = W / 2, ty = H * 0.52;
    const sw = Math.min(208, W * 0.42), shh = sw * FRONT_AR, sx = W / 2, sy = header.offsetHeight + 8 + shh / 2;
    sticky.style.setProperty("--clap-h", `${(shh * 0.36).toFixed(1)}px`);
    const scx = src.x + src.w / 2, scy = src.y + src.h / 2;
    let cx, cy, w, h, ry = 0, rz = 0, faceFront = false, stick = 0, shake = 0;
    if (p < 0.1) { // מתרומם מהידית
      const f = outC(p / 0.1);
      cx = scx; cy = scy - f * src.h * 0.25; w = src.w * (1 + 0.15 * f); h = src.h * (1 + 0.15 * f);
    } else if (p < 0.55) { // עף בקשת אל המסך ומסתובב אליו
      const f = inOut((p - 0.1) / 0.45);
      cx = lerp(scx, tx, f); cy = lerp(scy - src.h * 0.25, ty, f) - Math.sin(Math.PI * f) * H * 0.14;
      w = lerp(src.w * 1.15, tw, f); h = lerp(src.h * 1.15, th, f);
      ry = f < 0.5 ? (f / 0.5) * 90 : -90 + ((f - 0.5) / 0.5) * 90;
      faceFront = f >= 0.5;
      rz = Math.sin(Math.PI * f) * -14;
    } else if (p < 0.68) { // טייק 1: המקל נטרק
      cx = tx; cy = ty; w = tw; h = th; faceFront = true;
      const f = (p - 0.55) / 0.13;
      stick = f < 0.5 ? (f / 0.5) ** 2 * 13 : 13;
      if (f >= 0.5) { shake = Math.sin((f - 0.5) * 40) * (1 - f) * 6; if (!flashed) { flashed = true; fire(); } }
    } else { // עולה למעלה, נפתח, והלוח השחור נגלל מתחתיו
      const f = inOut(clamp((p - 0.68) / 0.18));
      cx = lerp(tx, sx, f); cy = lerp(ty, sy, f); w = lerp(tw, sw, f); h = lerp(th, shh, f);
      faceFront = true; stick = 13 * (1 - f);
    }
    if (p < 0.55) flashed = false;
    flyTop.style.visibility = faceFront ? "hidden" : "visible";
    flyFront.style.visibility = faceFront ? "visible" : "hidden";
    flyClap.style.setProperty("--stick", `${stick.toFixed(2)}deg`);
    place(flyClap, cx, cy + shake, w, h, `rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`);
  };

  // הדפים: p=0 על המושב, p=1 גלריה פתוחה בעיגול
  const pagesFlight = (p, src) => {
    const vis = p > 0.001;
    objs.projects.classList.toggle("is-gone", vis);
    const imgVis = vis && p < 0.52;
    flyPages.style.visibility = imgVis ? "visible" : "hidden";
    if (!imgVis) return;
    const scx = src.x + src.w / 2, scy = src.y + src.h / 2;
    const tw = (cards[0].offsetWidth || 300) * 1.25, th = tw * (src.h / src.w);
    let cx, cy, w, h, rz = 0;
    if (p < 0.1) { const f = outC(p / 0.1); cx = scx; cy = scy - f * src.h * 0.2; w = src.w * (1 + 0.1 * f); h = src.h * (1 + 0.1 * f); }
    else {
      const f = inOut(clamp((p - 0.1) / 0.32));
      cx = lerp(scx, W / 2, f); cy = lerp(scy - src.h * 0.2, H * 0.55, f) - Math.sin(Math.PI * f) * H * 0.12;
      w = lerp(src.w * 1.1, tw, f); h = lerp(src.h * 1.1, th, f); rz = Math.sin(Math.PI * f) * 18;
    }
    flyPages.style.opacity = String(1 - smooth(0.42, 0.52, p));
    place(flyPages, cx, cy, w, h, `rotateZ(${rz.toFixed(2)}deg)`);
  };

  /* ---------------- הלולאה ---------------- */
  let running = false, last = performance.now(), solid = false, lastTc = "";
  const t0 = performance.now();
  const tick = (now) => {
    if (!running) return;
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    sS += (sT - sS) * Math.min(1, dt * 7);
    if (Math.abs(sT - sS) < 1e-4) sS = sT;
    const s = sS;
    let cur = SC[SC.length - 1];
    for (const c of SC) if (s >= c.start) cur = c;
    const lt = clamp((s - cur.start) / cur.len);
    const tOf = (id) => (s - byId[id].start) / byId[id].len;

    // לחיצה: הסצנה הפתוחה נכנסת, והמעוף רץ קדימה או אחורה בזמן
    openK += ((opened ? 1 : 0) - openK) * Math.min(1, dt * 3.2);
    if (!opened && openK < 0.003) openK = 0;
    const ok = inOut(openK);
    for (const id of ["about", "projects"]) {
      const target = opened === id ? 1 : 0, dur = target ? (id === "about" ? 2.1 : 1.6) : 1.3;
      click[id] = target > click[id] ? Math.min(1, click[id] + dt / dur) : Math.max(0, click[id] - dt / dur);
    }

    // המסך נפתח, הווילון נפתח
    const A = Math.max(ok, smooth(0, byId.hero.len, s));
    const O = Math.max(ok, inOut(clamp((s - 0.5) / 1.0)));
    sticky.style.setProperty("--a", A.toFixed(4));
    sticky.style.setProperty("--o", O.toFixed(4));
    curtain.classList.toggle("is-open", O > 0.995);
    if ((A > 0.97) !== solid) { solid = A > 0.97; header?.classList.toggle("dr-solid", solid); }

    // הסט: הטקסט, והתוויות על החפצים
    const setT = tOf("set");
    const setV = smooth(-0.05, 0.15, setT) * (1 - smooth(0.82, 1, setT)) * (1 - ok);
    setEl.style.setProperty("--c-in", setV.toFixed(3));
    frame.style.setProperty("--tags", setV.toFixed(3));

    // המעוף: בגלילה (בסצנה של החפץ) או בלחיצה, מה שגדול יותר
    const tP = tOf("projects"), tA = tOf("about");
    const scrollPages = tP < 0 || tP > 1 ? 0 : smooth(0, 0.38, tP) * (1 - smooth(0.9, 1, tP));
    const scrollClap = tA < 0 || tA > 1 ? 0 : smooth(0, 0.42, tA) * (1 - smooth(0.92, 1, tA));
    const pP = Math.max(scrollPages * (1 - ok), click.projects);
    const pA = Math.max(scrollClap * (1 - ok), click.about);
    const busy = pP > 0 || pA > 0 || ok > 0.05;
    frame.style.setProperty("--hit", O > 0.95 && !busy ? "auto" : "none");

    // המצלמה על התמונה
    if (s < byId.set.start) camOf("hero", cam);
    else if (cur === byId.set) { camOf("hero", camA); camOf("set", camB); mixCam(camA, camB, inOut(lt)); }
    else { camOf(SC[cur.i - 1].id, camA); camOf(cur.id, camB); mixCam(camA, camB, inOut(clamp(lt / 0.4))); }
    if (openK > 0) { Object.assign(camA, cam); camOf(opened || "set", camB); mixCam(camA, camB, ok); }
    const tx = clamp(cam.ax * W - cam.z * cam.fx * fw, W - cam.z * fw, 0);
    const ty = clamp(cam.ay * H - cam.z * cam.fy * fh, H - cam.z * fh, 0);
    frame.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${cam.z.toFixed(4)})`;
    frame.style.setProperty("--inv", (1 / cam.z).toFixed(4));
    const pu = pulseAt < 0 ? -1 : (now - pulseAt) / 1000;
    if (pu > 1.2) pulseAt = -1;
    const flick = pu >= 0 && pu < 0.45 ? (Math.sin(pu * 60) > 0 ? 0.75 : 1.08) : 1;

    // הדפים של הסצנות
    let contactV = 0;
    for (const c of SC) {
      if (!c.el || c.id === "set") continue;
      const t = tOf(c.id);
      let v;
      if (c.id === "about") v = smooth(0.84, 1, pA);
      else if (c.id === "projects") v = smooth(0.32, 0.5, pP);
      else {
        const isLast = c === SC[SC.length - 1];
        v = t < 0 || t > 1.02 ? 0 : smooth(0.18, 0.36, t) * (isLast ? 1 : 1 - smooth(0.9, 1, t));
        v = opened && c.id === opened ? Math.max(v, ok) : v * (1 - ok);
      }
      if (c.id === "contact") contactV = v;
      if ((v > 0.01) !== c.on) {
        c.on = v > 0.01;
        c.el.classList.toggle("is-on", c.on);
        c.ins.forEach((el) => el.classList.toggle("is-in", c.on));
      }
      if (!c.on) continue;
      c.el.style.setProperty("--v", v.toFixed(3));
      if (c.inner) {
        const over = Math.max(0, c.inner.scrollHeight - c.el.clientHeight);
        let target = over * smooth(c.id === "about" ? 0.5 : 0.38, 0.9, t);
        if (c.id === opened) { openScrub = Math.min(openScrub, over); target = openScrub; }
        c.sc = lerp(c.sc ?? target, target, Math.min(1, dt * 9));
        c.el.style.setProperty("--scrub", `${(-c.sc).toFixed(1)}px`);
      }
    }
    frame.style.setProperty("--tag", contactV.toFixed(3));
    frame.style.filter = contactV > 0.01 || flick !== 1 ? `brightness(${(flick * (1 + contactV * 0.12)).toFixed(3)})` : "";

    // הגלריה
    if (pP > 0) {
      rpC += (rpT - rpC) * Math.min(1, dt * 5);
      const rp = click.projects >= scrollPages ? rpC : clamp((tP - 0.42) / 0.46);
      ring.style.setProperty("--head", smooth(0.55, 0.8, pP).toFixed(3));
      drawRing(smooth(0.42, 0.82, pP), rp);
    }
    clapFlight(pA, relRect(objs.about));
    pagesFlight(pP, relRect(objs.projects));

    // מונה זמן של מצלמה
    if (tc) {
      const sec = (now - t0) / 1000, f = Math.floor((sec % 1) * 25);
      const txt = `00:${String(Math.floor(sec / 60) % 60).padStart(2, "0")}:${String(Math.floor(sec) % 60).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
      if (txt !== lastTc) { tc.textContent = txt; lastTc = txt; }
    }
  };

  const play = (on) => {
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); requestAnimationFrame(tick); }
  };
  size();
  readScroll();
  sS = sT;
  addEventListener("resize", size);
  addEventListener("scroll", readScroll, { passive: true });
  new IntersectionObserver(([en]) => play(en.isIntersecting && !document.hidden)).observe(film);
  document.addEventListener("visibilitychange", () => {
    const r = film.getBoundingClientRect();
    play(!document.hidden && r.bottom > 0 && r.top < innerHeight);
  });
  // כתובת עם עוגן (למשל #about): הסצנה נפתחת במקום
  const startId = location.hash.slice(1);
  if (byId[startId] && !["set", "hero", "curtain"].includes(startId)) setTimeout(() => open(startId), 300);
})();
