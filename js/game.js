// Game loop: event queue, day lifecycle, win/lose, restart, boot.

let queue = [];
let qIdx  = 0;

// ── Build a day's event queue ──────────────────────────────────
function buildDay() {
  const events = [];
  if (Math.random() < 0.85) events.push(makeLoanEvent());
  if (Math.random() < 0.60) events.push(makeLoanEvent());
  if (Math.random() < 0.65) events.push(makeDepositEvent());
  events.push(makeWithdrawalEvent());
  if (Math.random() < 0.45) events.push(makeRandomEvent());
  queue = events.sort(() => Math.random() - 0.5);
  qIdx  = 0;
}

// ── Player action ──────────────────────────────────────────────
function act(choice) {
  const ev  = queue[qIdx];
  const res = choice === "approve" ? ev.onApprove() : ev.onDeny();
  addLog(res.msg, res.kind);
  qIdx++;
  renderStats();
  resetEventTimer();
  if (checkLose()) { stopTimers(); return; }
  if (qIdx >= queue.length) { endOfDay(); return; }
  renderEvent();
  saveGame();
}

// ── Phase 1: process EOD math, show summary, pause timers ─────
function endOfDay() {
  stopTimers();
  const profitBefore = bank.profit;
  let loanIncome = 0;

  bank.loanBook = bank.loanBook.filter(loan => {
    const repayment = loan.principal / loan.termDays;
    bank.cash     += loan.dailyPay;
    bank.loansOut -= repayment;
    bank.profit   += loan.dailyPay - repayment;
    loanIncome    += loan.dailyPay;
    loan.daysLeft--;
    return loan.daysLeft > 0;
  });

  bank.loansOut = Math.max(0, bank.loansOut);

  const d      = DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
  const depInt = bank.deposits * 0.000055;
  bank.cash   -= depInt + d.dailyOverhead;
  bank.profit -= depInt + d.dailyOverhead;

  const dayDelta = bank.profit - profitBefore;
  if (dayDelta > bank.stats.bestDay)  bank.stats.bestDay  = dayDelta;
  if (dayDelta < bank.stats.worstDay) bank.stats.worstDay = dayDelta;

  renderStats();
  renderEndOfDay(loanIncome, depInt, d.dailyOverhead, dayDelta);
  saveGame();

  document.getElementById("eventCard").scrollIntoView({ behavior:"smooth", block:"nearest" });
}

// ── Phase 2: player confirms, next day begins ──────────────────
function startNextDay() {
  addLog(`Day ${bank.day} closed. Starting day ${bank.day + 1}.`, "neutral");
  bank.day++;

  if (checkLose()) { saveGame(); return; }

  buildDay();
  renderStats();
  renderEvent();
  saveGame();
  startTimers();

  document.getElementById("eventCard").scrollIntoView({ behavior:"smooth", block:"nearest" });
}

// ── Lose check ─────────────────────────────────────────────────
function checkLose() {
  if (bank.cash <= 0) {
    showOverlay(
      "lose", "💸", "Bankrupt!",
      "Your cash reserves hit zero. The regulators have taken over.",
      `<div class="overlay-stat">Survived <strong>${bank.day} days</strong></div>
       <div class="overlay-stat">Final assets: <strong>${fmt(totalAssets())}</strong></div>
       <div class="overlay-stat">Loans approved: <strong>${bank.stats.loansApproved}</strong></div>`
    );
    deleteSave();
    return true;
  }
  if (bank.rep <= 15) {
    showOverlay(
      "lose", "🏃", "Bank Run!",
      "Customers lost faith and withdrew everything. The bank is finished.",
      `<div class="overlay-stat">Survived <strong>${bank.day} days</strong></div>
       <div class="overlay-stat">Final reputation: <strong>${bank.rep}/100</strong></div>
       <div class="overlay-stat">Loans approved: <strong>${bank.stats.loansApproved}</strong></div>`
    );
    deleteSave();
    return true;
  }
  return false;
}

// ── Restart ────────────────────────────────────────────────────
function restartGame() {
  stopTimers();
  deleteSave();
  document.getElementById("overlay").classList.remove("show");
  document.getElementById("logList").innerHTML = "";
  initBank();
  initFloor();
  buildDay();
  renderStats();
  renderEvent();
  renderFloor();
  renderShop();
  updateFloorHint();
  startTimers();
}

// ── Boot ───────────────────────────────────────────────────────
(function boot() {
  loadSettings();
  const resumed = loadGame();
  if (!resumed) initBank();
  initFloor();
  buildDay();
  renderStats();
  renderEvent();
  renderFloor();
  renderShop();
  updateFloorHint();
  startTimers();
})();
