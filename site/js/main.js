/* מירי דייטש · מסך הפתיחה · ניווט, לוח טיוטה ונפילות לברירת מחדל.
   כל נפילה לברירת מחדל מדווחת בלוח הטיוטה, לא בשקט. */
(() => {
  const CONFIG = {
    whatsappNumber: "", // [להשלמה] בפורמט בינלאומי, למשל 9725XXXXXXXX
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // לוח הטיוטה: כל נפילה לברירת מחדל נרשמת כאן
  const statusList = $("[data-status]");
  const status = (msg) => {
    console.info("[טיוטה]", msg);
    if (!statusList) return;
    const li = document.createElement("li");
    li.textContent = msg;
    statusList.append(li);
  };

  // easing מהבריף: cubic-bezier(.22,1,.36,1)
  const bezier = (x1, y1, x2, y2) => {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 28; i++) {
        if (sx(t) < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return sy(t);
    };
  };
  window.MIRI = { status, reduce, ease: bezier(0.22, 1, 0.36, 1) };

  /* ---------- הודעה קופצת ---------- */
  const toast = $(".toast");
  let toastTimer;
  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 5000);
  };

  /* ---------- תפריט נייד ---------- */
  const toggle = $(".menu-toggle");
  const nav = $("#site-nav");
  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });
  $$("a", nav).forEach((a) => a.addEventListener("click", () => {
    toggle?.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  }));

  /* ---------- קישורים למסכים שעוד לא נבנו ---------- */
  $$("[data-pending]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    showToast(`"${a.textContent.trim()}": המסך הזה עוד לא נבנה.`);
  }));
  status("ניווט וכפתורים: המסכים הבאים עוד לא נבנו · לחיצה מציגה הודעה");

  /* ---------- הלוגו בהדר מוסתר כל עוד הלוגו הגדול גלוי ---------- */
  const header = $(".site-header");
  const heroLogo = $(".hero__logo");
  if (header && heroLogo && "IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => header.classList.toggle("hero-logo-visible", en.isIntersecting))
      .observe(heroLogo);
  }

  /* ---------- לוח טיוטה: Hangar מול Nostela ---------- */
  const fontButtons = $$("[data-font]");
  const setDisplay = (name) => {
    document.documentElement.dataset.display = name;
    fontButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.font === name)));
    try { localStorage.setItem("miri-display-font", name); } catch (e) { /* לא קריטי */ }
  };
  fontButtons.forEach((b) => b.addEventListener("click", () => setDisplay(b.dataset.font)));
  try {
    const saved = localStorage.getItem("miri-display-font");
    if (saved === "hangar" || saved === "nostela") setDisplay(saved);
  } catch (e) { /* לא קריטי */ }

  /* ---------- בדיקת פונטים: פונט חסר מדווח בגלוי ---------- */
  const FONTS = [
    ["800 1em Hangar", "Hangar"],
    ["800 1em Nostela", "Nostela"],
    ["400 1em Sprinter", "Sprinter"],
    ["700 1em 'Pompei Narrow'", "Pompei Narrow"],
    ["800 1em 'Miri Block'", "Miri Block"],
    ["800 1em 'Miri Script'", "Miri Script"],
  ];
  FONTS.forEach(([spec, name]) =>
    document.fonts.load(spec, "אבג MIRI").then(
      (faces) => { if (!faces.length) status(`פונט חסר: ${name} · מוצג פונט גיבוי`); },
      () => status(`פונט חסר: ${name} · מוצג פונט גיבוי`)
    )
  );

  /* ---------- וואטסאפ ---------- */
  const wa = $("[data-wa]");
  if (CONFIG.whatsappNumber) {
    wa.href = `https://wa.me/${CONFIG.whatsappNumber}`;
    wa.target = "_blank";
    wa.rel = "noopener";
  } else {
    status("וואטסאפ: אין מספר [להשלמה]");
    wa.addEventListener("click", (e) => {
      e.preventDefault();
      showToast("מספר הוואטסאפ עוד לא הוגדר [להשלמה].");
    });
  }

  if (!window.gsap || !window.ScrollTrigger) status("GSAP לא נטען · מוצג מצב סופי בלי תנועה");
  else gsap.registerPlugin(ScrollTrigger);
})();
