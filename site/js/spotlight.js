/* גרסה ה (spotlight.html) · "אור על המוצר": מסך הפתיחה, ההדגמה, והאור שעולה על כל אזור.
   נטען אחרי main.js (window.MIRI: לוח הטיוטה, reduce, easing). כל נפילה למצב סופי בלי תנועה מדווחת בלוח הטיוטה. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const M = window.MIRI || { status: () => {}, reduce: false, ease: (t) => t };
  const root = document.documentElement;
  const motionOff = () => M.reduce || root.classList.contains("a11y-motion");
  const stops = []; // מה שקופץ למצב הסופי כשבוחרים "עצירת אנימציות"

  M.status("תוויות 'החזיקי כדי להדליק את האור' ו'או דלגי', ושמות השלבים בהדגמה: הצעה · טיוטה");
  M.status("הדגמת החנות: ההתראות והשמות בה הם דוגמה");

  /* ---------- 1 · מסך הפתיחה: אלומה שחושפת את הבמה המוארת, והחזקה שמדליקה את האור ---------- */
  const hero = $(".sp-hero");
  const lit = $(".sp-hero__lit", hero);
  const holdBtn = $(".sp-hold", hero);
  let done = false;
  let raf = 0;
  const light = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    hero.dataset.state = "lit";
    lit.removeAttribute("style");
    navigator.vibrate?.(12);
  };
  stops.push(light);

  if (motionOff()) light();
  else {
    let p = 0;          // כמה האור דלוק, 0 עד 1
    let holding = false;
    let auto = false;   // דילוג, גלילה או פוקוס: האור נדלק לבד עד הסוף
    const box = () => hero.getBoundingClientRect();
    let { width: w, height: h } = box();
    let x = w * 0.5, y = h * 0.45, tx = x, ty = y;
    let lastAim = -Infinity;
    const t0 = performance.now();
    const aim = (cx, cy) => { const r = box(); tx = cx - r.left; ty = cy - r.top; lastAim = performance.now(); };

    hero.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") aim(e.clientX, e.clientY); });
    hero.addEventListener("pointerdown", (e) => { if (!e.target.closest(".sp-hero__controls")) aim(e.clientX, e.clientY); });

    const start = () => {
      if (done) return;
      holding = true;
      holdBtn.classList.add("is-holding");
      const b = holdBtn.getBoundingClientRect();
      aim(b.left + b.width / 2, b.top + b.height / 2); // האור נפתח מהכפתור
    };
    const stop = () => { holding = false; holdBtn.classList.remove("is-holding"); };
    holdBtn.addEventListener("pointerdown", (e) => { holdBtn.setPointerCapture?.(e.pointerId); start(); });
    ["pointerup", "pointercancel", "lostpointercapture", "blur"].forEach((ev) => holdBtn.addEventListener(ev, stop));
    holdBtn.addEventListener("contextmenu", (e) => e.preventDefault());
    holdBtn.addEventListener("keydown", (e) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      if (!e.repeat) start();
    });
    holdBtn.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") stop(); });
    // לחיצה של קורא מסך (בלי מצביע, detail = 0) לא יכולה להחזיק: מדליקים מיד
    holdBtn.addEventListener("click", (e) => { if (e.detail === 0 && !holding) auto = true; });
    $(".sp-skip", hero).addEventListener("click", () => { auto = true; });
    lit.addEventListener("focusin", () => { auto = true; });
    addEventListener("scroll", () => { if (!done && scrollY > hero.offsetHeight * 0.2) auto = true; }, { passive: true });
    addEventListener("resize", () => ({ width: w, height: h } = box()));

    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (auto) p = Math.min(1, p + dt / 0.9);
      else if (holding) p = Math.min(1, p + dt / 1.2);
      else p = Math.max(0, p - dt / 0.6);

      // בלי עכבר (טלפון), או כשהעכבר לא זז: האלומה משוטטת לאט על הבמה
      if (!holding && !auto && now - lastAim > 2600) {
        const t = (now - t0) / 1000;
        tx = w * (0.5 + 0.3 * Math.sin(t * 0.42));
        ty = h * (0.42 + 0.14 * Math.sin(t * 0.67 + 1));
      }
      const k = Math.min(1, dt * 6);
      x += (tx - x) * k;
      y += (ty - y) * k;

      const e = auto ? M.ease(p) : Math.pow(p, 2.4); // בהחזקה האור מצטבר לאט, וממלא את הבמה רק בסוף
      const intro = M.ease(Math.min(1, (now - t0) / 1100)); // בטעינה האלומה נדלקת מאפס
      const base = Math.max(72, Math.min(180, w * 0.12)) * intro;
      const cover = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
      const r = base + (cover - base) * e;
      lit.style.setProperty("--x", `${x.toFixed(1)}px`);
      lit.style.setProperty("--y", `${y.toFixed(1)}px`);
      lit.style.setProperty("--r", `${r.toFixed(1)}px`);
      lit.style.setProperty("--f", `${(base * 0.5 * (1 - e) + 1).toFixed(1)}px`);
      holdBtn.style.setProperty("--p", p.toFixed(3));
      if (p >= 1) { light(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // מסך הפתיחה מחוץ למסך: עוצרים את הלולאה
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => {
        if (done) return;
        cancelAnimationFrame(raf);
        if (en.isIntersecting) { last = performance.now(); raf = requestAnimationFrame(frame); }
      }).observe(hero);
    }
  }

  /* ---------- חשיפות (כאבים, כותרות, כרטיסים) ---------- */
  const reveal = $$(".sp-rv, .sp-pain");
  if (motionOff() || !("IntersectionObserver" in window)) reveal.forEach((el) => el.classList.add("is-in"));
  else {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-in");
      io.unobserve(en.target);
    }), { rootMargin: "0px 0px -12% 0px" });
    reveal.forEach((el) => io.observe(el));
    stops.push(() => reveal.forEach((el) => el.classList.add("is-in")));
  }

  /* ---------- מונה: מספר אמיתי בלבד, מתמלא כשמגיעים אליו ---------- */
  $$("[data-count]").forEach((el) => {
    const n = +el.dataset.count;
    if (motionOff() || !("IntersectionObserver" in window)) return;
    el.textContent = "0";
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now) => {
        const q = Math.min(1, (now - t0) / 1200);
        el.textContent = String(Math.round(n * M.ease(q)));
        if (q < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 1 });
    io.observe(el);
    stops.push(() => { io.disconnect(); el.textContent = String(n); });
  });

  /* ---------- פוטר: האור נדלק על הבמה הריקה ---------- */
  const stage = $(".sp-stage");
  if (stage) {
    if (motionOff() || !("IntersectionObserver" in window)) stage.classList.add("is-lit");
    else {
      const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { stage.classList.add("is-lit"); io.disconnect(); } }, { threshold: 0.45 });
      io.observe(stage);
      stops.push(() => stage.classList.add("is-lit"));
    }
  }

  /* ---------- אור בריחוף על כרטיסי החבילות ---------- */
  $$(".sp-service").forEach((card) => card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  }));

  /* ---------- גלילה עם GSAP: ההדגמה הנעוצה, הפרויקטים שעולים לאור, והמילה "שקוף" ---------- */
  const demo = $(".sp-demo");
  const clear = $(".sp-clear");
  const toFinal = () => {
    demo?.classList.add("sp-demo--static");
    if (demo) demo.dataset.step = "3";
    $$(".sp-step", demo).forEach((s) => s.style.removeProperty("--p"));
    clear?.style.setProperty("--fill", "100%");
    $$(".sp-project").forEach((el) => el.style.setProperty("--lit", "1"));
  };

  const scrollScenes = () => {
    if (motionOff()) { toFinal(); return; }
    if (!window.gsap || !window.ScrollTrigger) { M.status("GSAP לא נטען · ההדגמה מוצגת במצב הסופי"); toFinal(); return; }
    gsap.registerPlugin(ScrollTrigger);
    const header = $(".site-header--b");
    const headerH = () => header?.offsetHeight || 0;
    const mm = gsap.matchMedia();

    // הסצנה הנעוצה היחידה: החנות נבנית בשלושה שלבים. במסך נמוך מדי: מצב סופי, בלי נעיצה
    mm.add("(min-height: 560px)", () => {
      const steps = $$(".sp-step", demo);
      demo.classList.remove("sp-demo--static");
      demo.dataset.step = "1";
      const st = ScrollTrigger.create({
        trigger: demo,
        start: () => `top ${headerH()}px`,
        end: () => `+=${innerHeight * 2.2}`,
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const q = self.progress;
          demo.dataset.step = String(q < 0.34 ? 1 : q < 0.67 ? 2 : 3);
          steps.forEach((s, i) => s.style.setProperty("--p", Math.min(1, Math.max(0, q * 3 - i)).toFixed(3)));
        },
      });
      return () => { st.kill(); toFinal(); };
    });
    mm.add("(max-height: 559px)", () => { toFinal(); });

    mm.add("all", () => {
      $$(".sp-project").forEach((el) => {
        gsap.fromTo(el, { "--lit": 0 }, {
          "--lit": 1, ease: "none",
          scrollTrigger: { trigger: el, start: "top 88%", end: "center 55%", scrub: 0.4 },
        });
      });
      if (clear) {
        gsap.fromTo(clear, { "--fill": "0%" }, {
          "--fill": "100%", ease: "none",
          scrollTrigger: { trigger: ".sp-belief", start: "top 78%", end: "bottom 45%", scrub: 0.4 },
        });
      }
    });
    stops.push(() => { mm.revert(); toFinal(); });
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(scrollScenes);

  /* ---------- "עצירת אנימציות" בתפריט הנגישות: הכול קופץ למצב הסופי ---------- */
  new MutationObserver(() => {
    if (root.classList.contains("a11y-motion")) stops.splice(0).forEach((stop) => stop());
  }).observe(root, { attributes: true, attributeFilter: ["class"] });
})();
