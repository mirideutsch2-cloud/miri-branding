/* גרסה ו · כיסא הבמאי: כל מה שלא צריך WebGL.
   כניסות למסך, הגלריה בעיגול (דפי התסריט), והכפתורים על הסט. רץ גם בלי Three.js. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const M = window.MIRI || { status() {}, reduce: false };
  const root = document.documentElement;
  const still = () => M.reduce || root.classList.contains("a11y-motion");
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  M.status("תוויות חדשות (טיוטה): \"גללי, והמסך נפתח\", שמות הכפתורים על הסט, \"הסצנה הבאה\"");
  M.status("הכסא, הקלאפר ודפי התסריט: מודל בקוד, עד שיהיו תמונות מאושרות");

  /* ---------- כניסה למסך: מוסיפים is-in פעם אחת ---------- */
  const ins = $$("[data-in]");
  if (still() || !("IntersectionObserver" in window)) ins.forEach((el) => el.classList.add("is-in"));
  else {
    // כותרת שחתוכה ב-clip-path נחשבת בכרום "לא נראית", אז עבורה מסתכלים על ההורה
    const watch = new Map(ins.map((el) => [el.classList.contains("dr-in") ? el.parentElement : el, el]));
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      if (root.classList.contains("dr-live") && en.target.closest(".dr-film")) return; // במסך האחד הסצנות מנוהלות ב-director.js
      watch.get(en.target)?.classList.add("is-in");
      io.unobserve(en.target);
    }), { threshold: 0.2, rootMargin: "0px 0px -6% 0px" });
    watch.forEach((_, t) => io.observe(t));
  }

  /* ---------- גלילה לאזור (מהכפתורים על הסט) ---------- */
  const goTo = (sel) => {
    const el = $(sel);
    if (!el) return;
    const top = el.getBoundingClientRect().top + scrollY - (sel === "#projects" ? 0 : 8);
    scrollTo({ top, behavior: still() ? "auto" : "smooth" });
  };
  // הכפתורים על הסט: קודם התנועה בתלת-ממד (אם יש), ואז הגלילה
  $$(".dr-spot").forEach((b) => b.addEventListener("click", () => {
    const wait = M.director?.act?.(b.dataset.spot) || 0;
    setTimeout(() => (M.goScene || goTo)(b.dataset.go), wait);
  }));
  M.goTo = goTo;

  /* ---------- 6 · דפי התסריט: ערימה ← עיגול ← סיבוב ---------- */
  const ring = $(".dr-ring");
  const list = ring && $(".dr-ring__list", ring);
  const cards = ring ? $$(".dr-card", ring) : [];
  if (!ring || !cards.length || still()) return;

  ring.classList.add("is-3d");
  const n = cards.length;
  const step = 360 / n;
  const SPREAD = 0.2; // החלק הראשון של הגלילה: הערימה נפתחת
  const count = $("[data-ring-count] bdi", ring);
  let R = 0, front = -1, p = 0;
  // סיבובים קטנים ואקראיים-קבועים לערימה, כמו דפים שנזרקו על הכסא
  const tilt = cards.map((_, i) => [(-1) ** i * (3 + i * 2.2), (i - (n - 1) / 2) * 9, i * 1.5]);

  const measure = () => {
    const w = cards[0].offsetWidth;
    R = Math.max(w * 0.95, (w * n) / (2 * Math.PI) * 1.22);
  };
  const progress = () => {
    const r = ring.getBoundingClientRect();
    const total = ring.offsetHeight - innerHeight;
    return clamp(-r.top / Math.max(1, total));
  };
  const ease = (t) => 1 - (1 - t) ** 3;

  const draw = () => {
    const s = ease(clamp(p / SPREAD));
    const turn = clamp((p - SPREAD) / (1 - SPREAD - 0.06)) * step * (n - 1);
    list.style.transform = `translateZ(${-R * s}px) rotateX(${-7 * s}deg)`;
    let best = 0, bestA = 999;
    cards.forEach((c, i) => {
      const a = i * step - turn; // כיוון הכרטיס על העיגול
      const [rz, x, y] = tilt[i];
      const k = 1 - s;
      c.style.transform =
        `rotateY(${a * s}deg) translateZ(${R * s}px) translate(${x * k}px, ${y * k}px) rotateZ(${rz * k}deg) translateZ(${-i * k * 3}px)`;
      c.style.zIndex = String(s < 0.5 ? n - i : 0);
      const facing = Math.abs(((((a + 180) % 360) + 360) % 360) - 180); // 0 = מול המצלמה
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

  // לחיצה על כרטיס שלא מקדימה, או מעבר אליו במקלדת: מסובבים אותו קדימה
  const scrollToCard = (i) => {
    const rp = SPREAD + (i / (n - 1)) * (1 - SPREAD - 0.06);
    if (M.director?.ringGo) { M.director.ringGo(rp); return; } // במסך האחד
    const total = ring.offsetHeight - innerHeight;
    const t = SPREAD + (i / (n - 1)) * (1 - SPREAD - 0.06);
    scrollTo({ top: ring.getBoundingClientRect().top + scrollY + t * total + 2, behavior: "smooth" });
  };
  cards.forEach((c, i) => {
    c.addEventListener("click", (e) => {
      if (c.classList.contains("is-front")) return;
      e.preventDefault();
      scrollToCard(i);
    });
    c.addEventListener("focusin", () => { if (!c.classList.contains("is-front")) scrollToCard(i); });
  });

  let raf = 0;
  const tick = () => {
    raf = 0;
    const target = progress();
    p += (target - p) * 0.16;
    if (Math.abs(target - p) < 0.0005) p = target;
    draw();
    if (p !== target) raf = requestAnimationFrame(tick);
  };
  const kick = () => { if (!raf && !root.classList.contains("dr-live")) raf = requestAnimationFrame(tick); };
  // במסך האחד director.js מזיז את הגלריה לפי הסצנה
  M.ring = { set(v) { p = v; draw(); } };
  measure();
  p = progress();
  draw();
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", () => { measure(); kick(); if (root.classList.contains("dr-live")) draw(); });

  // "עצירת אנימציות" באמצע הביקור: הגלריה חוזרת לשורה רגילה
  new MutationObserver(() => {
    if (!root.classList.contains("a11y-motion") || !ring.classList.contains("is-3d")) return;
    ring.classList.remove("is-3d");
    list.style.transform = "";
    cards.forEach((c) => { c.style.transform = ""; c.style.zIndex = ""; c.style.removeProperty("--dim"); });
    removeEventListener("scroll", kick);
  }).observe(root, { attributes: true, attributeFilter: ["class"] });
})();
