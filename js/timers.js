// RAF-based timer system. Reads active difficulty settings and feeds the HUD.

let rafId      = null;
let dayStart   = 0;
let pausedAt   = 0;
let visibilityPaused = false;
let lastClockPaint = 0;

globalThis.BankRuntimeMetrics = globalThis.BankRuntimeMetrics || {
  branchFrames: 0,
  branchDraws: 0,
  staticSceneRenders: 0,
  clockPaints: 0,
  canvasPixels: 0,
};

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (rafId !== null) {
        visibilityPaused = true;
        pauseTimers();
      }
      if (typeof saveGame === "function") saveGame();
      return;
    }
    if (visibilityPaused) {
      visibilityPaused = false;
      if (typeof decisionOpen === "undefined" || !decisionOpen) resumeTimers();
    }
  });
}

function startTimers() {
  stopTimers();
  dayStart   = Date.now();
  pausedAt   = 0;
  lastClockPaint = 0;
  rafId = requestAnimationFrame(tick);
}

function stopTimers() {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  pausedAt = 0;
}

function pauseTimers() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
    pausedAt = Date.now();
  }
}

function resumeTimers() {
  if (rafId !== null) return;
  if (pausedAt) {
    const pausedFor = Date.now() - pausedAt;
    dayStart += pausedFor;
    pausedAt = 0;
  }
  rafId = requestAnimationFrame(tick);
}

function resetEventTimer() {
  // Compatibility shim for the old card-clicker flow. Customer decisions no
  // longer have individual timers; only the day clock advances.
}

function tick() {
  const d          = DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
  const dayDuration = effectiveDayDuration(d.dayDuration);
  const now        = Date.now();
  const dayElapsed = (now - dayStart) / 1000;
  const dayShown   = Math.min(dayDuration, dayElapsed);
  const dayPct     = dayShown / dayDuration;

  const dayColour =
    dayPct < 0.7 ? "var(--blue)" : dayPct < 0.9 ? "var(--yellow)" : "var(--red)";

  // The simulation remains RAF-driven, but text/layout work only needs a
  // 10 Hz cadence. This removes dozens of redundant DOM writes per second.
  if (now - lastClockPaint >= 100 || dayElapsed >= dayDuration) {
    lastClockPaint = now;
    BankRuntimeMetrics.clockPaints++;
    const dayFill = document.getElementById("dayTimerFill");
    if (dayFill) {
      dayFill.style.width      = `${dayPct * 100}%`;
      dayFill.style.background = dayColour;
    }

    const timeEl = document.getElementById("dayTime");
    if (timeEl) {
      const m = Math.floor(dayShown / 60);
      const s = Math.floor(dayShown % 60);
      timeEl.textContent = `${m}:${s.toString().padStart(2, "0")}`;
      timeEl.style.color = dayColour;
    }
  }

  if (dayElapsed >= dayDuration) {
    if (branchState) branchState.openForCustomers = false;
    const hasCustomers = branchState?.customers?.some(c => c.state !== "leaving");
    if (hasCustomers || qIdx < queue.length) {
      rafId = requestAnimationFrame(tick);
      return;
    }
    endOfDay();
    return;
  }

  rafId = requestAnimationFrame(tick);
}

function autoResolve(silent = false) {
  if (typeof branchAutoResolve === "function") {
    const ok = branchAutoResolve(silent);
    if (!ok) return false;
    if (!silent) {
      rafId = requestAnimationFrame(tick);
    }
    return true;
  }

  const ev = queue[qIdx];
  const approve = ev.single || ev.eventType !== "Credit Application";
  const res = approve ? ev.onApprove() : ev.onDeny();
  if (!silent) addLog(`Auto: ${res.msg}`, res.kind);
  qIdx++;
  renderStats();
  if (checkLose()) { stopTimers(); return false; }
  if (!silent) {
    if (qIdx >= queue.length) { endOfDay(); return true; }
    renderEvent();
    rafId = requestAnimationFrame(tick);
  }
  return true;
}
