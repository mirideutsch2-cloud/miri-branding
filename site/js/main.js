/* מירי דייטש · מסך הפתיחה · ניווט, לוח טיוטה ונפילות לברירת מחדל.
   כל נפילה לברירת מחדל מדווחת בלוח הטיוטה, לא בשקט. */
(() => {
  const CONFIG = {
    whatsappNumber: "", // [להשלמה] בפורמט בינלאומי, למשל 9725XXXXXXXX
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  /* ---------- תפריט נגישות: הבחירות נשמרות בדפדפן ומוחלות על <html> לפני כל השאר ---------- */
  const A11Y_KEY = "miri-a11y";
  const a11yRead = () => { try { return JSON.parse(localStorage.getItem(A11Y_KEY)) || {}; } catch { return {}; } };
  const a11y = a11yRead();
  Object.keys(a11y).forEach((k) => a11y[k] && document.documentElement.classList.add(`a11y-${k}`));

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || !!a11y.motion;

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

  /* ---------- תפריט: המבורגר שפותח תפריט מסך מלא ---------- */
  const menuBtn = $(".menu-btn");
  const menu = $("#site-menu");
  const setMenu = (open) => {
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "סגירת התפריט" : "תפריט");
    menu.classList.toggle("is-open", open);
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (open) $("a", menu)?.focus();
  };
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
    $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); }
    });
  }

  /* ---------- קישורים למסכים שעוד לא נבנו ---------- */
  $$("[data-pending]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    showToast(`"${a.textContent.trim()}": המסך הזה עוד לא נבנה.`);
  }));
  if ($("[data-pending]")) status("ניווט: המסכים הבאים עוד לא נבנו · לחיצה מציגה הודעה");

  /* ---------- בדיקת פונטים: פונט חסר מדווח בגלוי ---------- */
  // בודקים רק פונטים שהדף משתמש בהם (בגרסה ב התוויות ב-Sprinter, בלי Pompei)
  const labelFont = getComputedStyle(document.documentElement).getPropertyValue("--font-label");
  const FONTS = [
    ["800 1em Nostela", "Nostela"],
    ["400 1em Sprinter", "Sprinter"],
    ...(labelFont.includes("Pompei") ? [["700 1em 'Pompei Narrow'", "Pompei Narrow"]] : []),
  ];
  FONTS.forEach(([spec, name]) =>
    document.fonts.load(spec, "אבג MIRI").then(
      (faces) => { if (!faces.length) status(`פונט חסר: ${name} · מוצג פונט גיבוי`); },
      () => status(`פונט חסר: ${name} · מוצג פונט גיבוי`)
    )
  );

  /* ---------- וואטסאפ ---------- */
  // כפתור צף וקישור בפוטר: אותו מספר לכולם
  const was = $$("[data-wa]");
  if (was.length && CONFIG.whatsappNumber) {
    was.forEach((wa) => {
      wa.href = `https://wa.me/${CONFIG.whatsappNumber}`;
      wa.target = "_blank";
      wa.rel = "noopener";
    });
  } else if (was.length) {
    status("וואטסאפ: אין מספר [להשלמה]");
    was.forEach((wa) => wa.addEventListener("click", (e) => {
      e.preventDefault();
      showToast("מספר הוואטסאפ עוד לא הוגדר [להשלמה].");
    }));
  }

  // cloth.js הוא מודול שמייבא את Three.js. אם הייבוא נכשל, המודול לא רץ בכלל, אז בודקים מכאן
  addEventListener("load", () => setTimeout(() => {
    if (!window.MIRI.clothLoaded) status("וילון: Three.js לא נטען · מוצגת תמונה סטטית");
  }, 4000));

  /* ---------- טופס ---------- */
  const form = $(".form");
  if (form) status("טופס: לא מחובר לשליחה [להשלמה]");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const out = $(".form__status", form);
    if (!form.name.value.trim() || !form.phone.value.trim()) {
      out.textContent = "צריך למלא שם וטלפון.";
      return;
    }
    out.textContent = "הטופס עוד לא מחובר לשום מערכת [להשלמה], ולכן הפרטים לא נשלחו.";
  });

  /* ---------- הדר דביק: שקוף מעל מסך הפתיחה, ומקבל רקע אחריו (ובעמודים בלי מסך פתיחה, תמיד) ---------- */
  const headerB = $(".site-header--b");
  const top = $("#top");
  if (headerB && top && "IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => headerB.classList.toggle("is-past", !en.isIntersecting), { rootMargin: `-${headerB.offsetHeight}px 0px 0px 0px` }).observe(top);
  } else headerB?.classList.add("is-past");

  /* ---------- תפריט נגישות ---------- */
  const motionStops = []; // מה שעוצר את האנימציות של GSAP, כשבוחרים "עצירת אנימציות"
  const a11yBtn = $(".a11y__btn");
  const a11yPanel = $("#a11y-panel");
  if (a11yBtn && a11yPanel) {
    const setPanel = (open) => {
      a11yBtn.setAttribute("aria-expanded", String(open));
      a11yPanel.hidden = !open;
    };
    const save = () => { try { localStorage.setItem(A11Y_KEY, JSON.stringify(a11y)); } catch { /* בלי אחסון: הבחירה תקפה עד רענון */ } };
    const apply = (k, on) => {
      a11y[k] = on;
      document.documentElement.classList.toggle(`a11y-${k}`, on);
      $(`[data-a11y="${k}"]`, a11yPanel)?.setAttribute("aria-pressed", String(on));
      if (k === "text") window.MIRI.clothRebuild?.(); // המשפט על הבד מצויר מחדש בגודל החדש
      if (k === "motion" && on) motionStops.splice(0).forEach((stop) => stop());
    };
    $$("[data-a11y]", a11yPanel).forEach((b) => {
      const k = b.dataset.a11y;
      b.setAttribute("aria-pressed", String(!!a11y[k]));
      b.addEventListener("click", () => { apply(k, !a11y[k]); save(); });
    });
    $("[data-a11y-reset]", a11yPanel)?.addEventListener("click", () => {
      Object.keys(a11y).forEach((k) => apply(k, false));
      save();
    });
    a11yBtn.addEventListener("click", () => setPanel(a11yPanel.hidden));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && !a11yPanel.hidden) { setPanel(false); a11yBtn.focus(); } });
    document.addEventListener("click", (e) => { if (!a11yPanel.hidden && !e.target.closest(".a11y")) setPanel(false); });
  }

  /* ---------- פוטר: הכסא השני מקבל אור ---------- */
  const chair = $(".footer__chair");
  if (chair) {
    if (reduce || !("IntersectionObserver" in window)) chair.classList.add("is-lit");
    else {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((en) => en.isIntersecting)) { chair.classList.add("is-lit"); io.disconnect(); }
      }, { threshold: 0.45 });
      io.observe(chair);
    }
  }

  /* ---------- מכאן: תנועה עם GSAP (המסכים שאחרי מסך הפתיחה, גרסה ב) ---------- */
  if (!$(".set__img, .sticker, .clapper__stick")) return; // עמוד בלי תנועה (עמודי המידע)
  if (!window.gsap || !window.ScrollTrigger) { status("GSAP לא נטען · מוצג מצב סופי בלי תנועה"); return; }
  gsap.registerPlugin(ScrollTrigger);
  const needsFlip = !!$(".sticker");
  if (needsFlip && !window.Flip) status("Flip לא נטען · הדפים נפתחים לגריד בלי אנימציה");
  if (window.Flip) gsap.registerPlugin(Flip);
  const EASE = window.MIRI.ease;
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  /* מסך 2 · קלוז-אפ ← התרחקות */
  const setImg = $(".set__img");
  if (setImg && !reduce) {
    const mm = gsap.matchMedia();
    motionStops.push(() => mm.revert());
    mm.add("(min-width: 1024px) and (min-height: 700px)", () => {
      gsap.fromTo(setImg, { scale: 3.2 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: ".set", start: "top top", end: "+=110%", scrub: 0.6, pin: true, anticipatePin: 1 },
      });
    });
    mm.add("(max-width: 1023px), (max-height: 699px)", () => {
      gsap.fromTo(setImg, { scale: 3.2 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: ".set__frame", start: "top 90%", end: "bottom 35%", scrub: 0.6 },
      });
    });
  }

  /* מסך 3 · הדפים עפים ונפתחים לגריד */
  const scripts = $(".scripts");
  const sticker = $(".sticker");
  sticker?.addEventListener("click", () => {
    const toGrid = scripts.dataset.state !== "grid";
    const state = window.Flip ? Flip.getState(".page, .sticker") : null;
    scripts.dataset.state = toGrid ? "grid" : "stack";
    sticker.setAttribute("aria-expanded", String(toGrid));
    if (reduce || a11y.motion || !window.Flip) { ScrollTrigger.refresh(); return; }
    if (!toGrid) gsap.fromTo(".scripts__chair", { opacity: 0 }, { opacity: 0.95, duration: 0.8, ease: EASE });
    Flip.from(state, {
      duration: 1.1, ease: EASE, stagger: 0.07, absolute: true,
      onComplete: () => ScrollTrigger.refresh(),
    });
  });

  /* מסך 4 · הקלאפר נסגר פעם אחת, ואז הטקסט נחשף בשורות */
  const splitLines = (p) => {
    const original = p.textContent;
    p.textContent = "";
    const words = original.trim().split(/\s+/).map((w) => {
      const s = document.createElement("span");
      s.textContent = w + " ";
      p.append(s);
      return s;
    });
    const lines = [];
    let top = null;
    words.forEach((w) => {
      if (w.offsetTop !== top) { lines.push([]); top = w.offsetTop; }
      lines[lines.length - 1].push(w.textContent);
    });
    p.textContent = "";
    lines.forEach((l) => {
      const s = document.createElement("span");
      s.className = "line";
      s.textContent = l.join("");
      p.append(s);
    });
    return () => { p.textContent = original; };
  };

  const stick = $(".clapper__stick");
  const lineBlocks = $$("[data-lines]");
  if (!reduce && stick) {
    gsap.set(stick, { rotation: -24, svgOrigin: "26 92" });
    fontsReady.then(() => {
      const restores = [];
      lineBlocks.forEach((b) => {
        $$("p", b).forEach((p) => restores.push(splitLines(p)));
        b.classList.add("line-reveal");
      });
      const lines = $$(".line-reveal .line");
      const tl = gsap.timeline({
        paused: true,
        onComplete: () => {
          // אחרי החשיפה מחזירים את הטקסט המקורי, כדי ששינוי רוחב לא ישבור שורות
          restores.forEach((r) => r());
          lineBlocks.forEach((b) => b.classList.remove("line-reveal"));
        },
      });
      tl.to(stick, { rotation: 0, duration: 0.5, ease: EASE })
        .to(lines, { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.05 }, "+=0.1");
      const st = ScrollTrigger.create({ trigger: ".about", start: "top 65%", once: true, onEnter: () => tl.play() });
      motionStops.push(() => { st.kill(); tl.progress(1); }); // קופץ למצב הסופי
    });
  }
})();
