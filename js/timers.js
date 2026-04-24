// RAF-based timer system. Reads DAY_DURATION and EVENT_TIMEOUT from the
// active difficulty config rather than bare constants.

let rafId      = null;
let dayStart   = 0;
let eventStart = 0;

function startTimers() {
  stopTimers();
  dayStart   = Date.now();
  eventStart = Date.now();
  rafId = requestAnimationFrame(tick);
}

function stopTimers() {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}

function resetEventTimer() {
  eventStart = Date.now();
}

function tick() {
  const d          = DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
  const speed      = settings.timerSpeed || 1.0;
  const now        = Date.now();
  const dayElapsed = (now - dayStart) / 1000 * speed;
  const evElapsed  = (now - eventStart) / 1000 * speed;
  const dayLeft    = Math.max(0, d.dayDuration - dayElapsed);
  const dayPct     = dayLeft / d.dayDuration;

  const dayColour =
    dayPct > 0.4 ? "var(--blue)" : dayPct > 0.15 ? "var(--yellow)" : "var(--red)";

  const dayFill = document.getElementById("dayTimerFill");
  if (dayFill) {
    dayFill.style.width      = `${dayPct * 100}%`;
    dayFill.style.background = dayColour;
  }

  const timeEl = document.getElementById("dayTime");
  if (timeEl) {
    const m = Math.floor(dayLeft / 60);
    const s = Math.floor(dayLeft % 60);
    timeEl.textContent = `${m}:${s.toString().padStart(2, "0")}`;
    timeEl.style.color = dayColour;
  }

  if (qIdx < queue.length) {
    const evLeft = Math.max(0, d.eventTimeout - evElapsed);
    const evPct  = evLeft / d.eventTimeout;
    const evColour =
      evPct > 0.5 ? "var(--blue)" : evPct > 0.25 ? "var(--yellow)" : "var(--red)";
    const evFill = document.getElementById("evTimerFill");
    if (evFill) {
      evFill.style.width      = `${evPct * 100}%`;
      evFill.style.background = evColour;
    }
  }

  if (qIdx < queue.length && evElapsed >= d.eventTimeout) {
    autoResolve();
    return;
  }

  if (dayElapsed >= d.dayDuration) {
    while (qIdx < queue.length) {
      if (!autoResolve(true)) return;
    }
    endOfDay();
    return;
  }

  rafId = requestAnimationFrame(tick);
}

// Resolve current event automatically.
// silent=true skips logging and RAF scheduling (used during day-drain).
// Returns false if the game ended.
function autoResolve(silent = false) {
  const ev  = queue[qIdx];
  const res = ev.eventType === "Loan Application" ? ev.onDeny() : ev.onApprove();
  if (!silent) addLog(`⏱ Auto: ${res.msg}`, res.kind);
  qIdx++;
  renderStats();
  resetEventTimer();
  if (checkLose()) { stopTimers(); return false; }
  if (!silent) {
    if (qIdx >= queue.length) { endOfDay(); return true; }
    renderEvent();
    rafId = requestAnimationFrame(tick);
  }
  return true;
}
