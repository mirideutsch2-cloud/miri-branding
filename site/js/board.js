/* מירי דייטש · גרסה ד · לוח יציאות.
   [data-board]: לוח של אותיות מתהפכות. הטקסט נשבר לשורות לפי מספר העמודות (--cols ב-CSS), בלי לשבור מילים,
   וכל לוחית מתהפכת דרך כמה אותיות אקראיות עד שהיא נוחתת על האות שלה. הלוח מתהפך כשהוא נכנס למסך,
   ושמות הפרויקטים מתהפכים שוב בריחוף. גם: שעון ישראל, חשיפה בגלילה (.rv), ותצוגה מקדימה של פרויקט.
   במצב בלי תנועה (הגדרת המכשיר או תפריט הנגישות) האותיות מוצגות ישר במקומן. */
(() => {
  const MIRI = window.MIRI || { status: console.info, reduce: false };
  const root = document.documentElement;
  const still = () => MIRI.reduce || root.classList.contains("a11y-motion");
  const ABC = "אבגדהוזחטיכלמנסעפצקרשת";
  const randChar = () => ABC[(Math.random() * ABC.length) | 0];
  const STEP = 48; // מילישניות לכל חצי היפוך

  /* ---------- לוחית אחת ---------- */
  const half = (cls) => { const h = document.createElement("span"); h.className = `fl__h ${cls}`; h.append(document.createElement("span")); return h; };
  const makeCell = () => {
    const c = document.createElement("span");
    c.className = "fl";
    c.append(half("fl__t"), half("fl__b"), half("fl__t fl__ft"), half("fl__b fl__fb"));
    c._cur = " ";
    return c;
  };
  const show = (c, ch) => { c.children[0].firstChild.textContent = ch; c.children[1].firstChild.textContent = ch; c._cur = ch; };

  // היפוך אחד: החצי העליון של האות הנוכחית נופל, ואז החצי התחתון של הבאה נוחת
  const flipOnce = async (c, next) => {
    const [top, bot, ft, fb] = c.children;
    ft.firstChild.textContent = c._cur; fb.firstChild.textContent = next;
    top.firstChild.textContent = next;
    ft.style.visibility = "visible";
    await ft.animate([{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }], { duration: STEP, easing: "ease-in" }).finished;
    ft.style.visibility = "hidden"; fb.style.visibility = "visible";
    await fb.animate([{ transform: "rotateX(90deg)" }, { transform: "rotateX(0deg)" }], { duration: STEP, easing: "ease-out" }).finished;
    fb.style.visibility = "hidden";
    bot.firstChild.textContent = next; c._cur = next;
  };
  const flipTo = async (c, target, steps) => {
    if (c._busy) { c._next = target; return; }
    c._busy = true;
    for (let i = 0; i < steps; i++) await flipOnce(c, i === steps - 1 ? target : (target === " " && i > steps - 3 ? " " : randChar()));
    c._busy = false;
    if (c._next && c._next !== c._cur) { const n = c._next; c._next = null; flipTo(c, n, 2); }
  };

  /* ---------- לוח ---------- */
  const wrap = (text, cols) => {
    const rows = []; let cur = "";
    for (const w of text.trim().split(/\s+/)) {
      if (!cur) cur = w;
      else if ((cur + " " + w).length <= cols) cur += " " + w;
      else { rows.push(cur); cur = w; }
    }
    if (cur) rows.push(cur);
    return rows.map((r) => r.padEnd(cols, " ")); // השורה מתחילה מימין, והשאר לוחיות ריקות
  };
  const boards = [...document.querySelectorAll("[data-board]")].map((el) => ({ el, text: el.dataset.board, cols: 0, cells: [], played: false }));
  const build = (b) => {
    const cols = parseInt(getComputedStyle(b.el).getPropertyValue("--cols"), 10) || 12;
    if (cols === b.cols) return;
    b.cols = cols;
    const chars = [...wrap(b.text, cols).join("")];
    b.el.textContent = "";
    b.cells = chars.map((ch) => { const c = makeCell(); c._target = ch; show(c, b.played || still() ? ch : " "); b.el.append(c); return c; });
  };
  const play = (b, maxSteps = 9, spread = 26) => {
    if (still()) { b.cells.forEach((c) => show(c, c._target)); return; }
    b.cells.forEach((c, i) => {
      if (c._target === " " && c._cur === " ") return;
      const steps = c._target === " " ? 2 : 3 + ((Math.random() * (maxSteps - 2)) | 0);
      setTimeout(() => flipTo(c, c._target, steps), (i % b.cols) * spread + Math.floor(i / b.cols) * spread * 2 + Math.random() * 90);
    });
  };
  boards.forEach(build);

  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const b = boards.find((x) => x.el === en.target);
      if (b && !b.played) { b.played = true; play(b); }
      if (en.target.classList.contains("rv")) en.target.classList.add("in");
      io.unobserve(en.target);
    });
  }, { threshold: 0.2 }) : null;
  if (io) {
    boards.forEach((b) => io.observe(b.el));
    document.querySelectorAll(".rv").forEach((el) => io.observe(el));
  } else {
    boards.forEach((b) => { b.played = true; play(b); });
    document.querySelectorAll(".rv").forEach((el) => el.classList.add("in"));
    MIRI.status("לוח: אין IntersectionObserver · הכול מוצג מיד");
  }

  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => boards.forEach((b) => { const was = b.cols; build(b); if (b.cols !== was && b.played) b.cells.forEach((c) => show(c, c._target)); }), 150); });

  /* ---------- פרויקטים: השם מתהפך בריחוף, ותצוגה מקדימה עוקבת אחרי העכבר ---------- */
  const preview = document.querySelector(".d-preview");
  const slot = preview?.querySelector(".slot");
  document.querySelectorAll(".dep__row[data-preview]").forEach((row) => {
    const b = boards.find((x) => row.contains(x.el));
    row.addEventListener("pointerenter", (e) => {
      if (b && !still()) b.cells.forEach((c, i) => c._target !== " " && setTimeout(() => flipTo(c, c._target, 3), i * 30));
      if (e.pointerType === "mouse" && preview) { slot.textContent = row.dataset.preview; preview.classList.add("is-on"); }
    });
    row.addEventListener("pointerleave", () => preview?.classList.remove("is-on"));
    row.addEventListener("pointermove", (e) => { if (preview) preview.style.transform = `translate(${Math.max(12, e.clientX - preview.offsetWidth - 24)}px, ${e.clientY - preview.offsetHeight / 2}px)`; });
  });

  /* ---------- שעון ישראל במסך הפתיחה ---------- */
  const clock = document.querySelector(".d-clock");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false });
    const tick = () => { clock.textContent = fmt.format(new Date()); };
    tick(); setInterval(tick, 20000);
  }

  MIRI.status("לוח: תוויות הלוח (יציאות, באוויר, בקרוב, שער, יעד, היציאה הבאה) הן הצעה · טיוטה");
})();
