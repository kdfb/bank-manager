// Game loop: event queue, day lifecycle, win/lose, restart, boot.

let queue = [];
let qIdx  = 0;

// ── Build a day's event queue ──────────────────────────────────
function buildDay() {
  queue = [];
  qIdx  = 0;
}

function makeCustomerEvent() {
  const roll = Math.random();
  if (roll < 0.42) return makeLoanEvent();
  if (roll < 0.68) return makeDepositEvent();
  if (roll < 0.9) return makeWithdrawalEvent();
  return makeRandomEvent();
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
}

// ── Phase 2: player confirms, next day begins ──────────────────
function startNextDay() {
  document.getElementById("decisionLayer")?.classList.remove("show");
  decisionOpen = false;
  addLog(`${gameDate(bank.day)} concluded.`, "neutral");
  bank.day++;

  if (checkLose()) { saveGame(); return; }

  buildDay();
  startBranchDay();
  renderStats();
  saveGame();
  startTimers();
}

// ── Lose check ─────────────────────────────────────────────────
function checkLose() {
  if (bank.cash <= 0) {
    showOverlay(
      "lose", "💸", "Bankrupt!",
      "The vault is empty. Creditors have seized the bank.",
      `<div class="overlay-stat">${gameDate(1)} — ${gameDate(bank.day)}</div>
       <div class="overlay-stat">Final assets: <strong>${fmt(totalAssets())}</strong></div>
       <div class="overlay-stat">Loans approved: <strong>${bank.stats.loansApproved}</strong></div>`
    );
    deleteSave();
    return true;
  }
  if (bank.rep <= 15) {
    showOverlay(
      "lose", "🏃", "Bank Run!",
      "Depositors lost confidence and withdrew their funds. The bank has closed its doors.",
      `<div class="overlay-stat">${gameDate(1)} — ${gameDate(bank.day)}</div>
       <div class="overlay-stat">Final standing: <strong>${bank.rep}/100</strong></div>
       <div class="overlay-stat">Loans approved: <strong>${bank.stats.loansApproved}</strong></div>`
    );
    deleteSave();
    return true;
  }
  return false;
}

// ── Menu ───────────────────────────────────────────────────────
function openMenu() {
  pauseTimers();
  decisionOpen = true;
  renderMenuSlots();
  document.getElementById("menuOverlay").classList.add("show");
}

function closeMenu() {
  document.getElementById("menuOverlay").classList.remove("show");
  decisionOpen = false;
  document.getElementById("restartArea").innerHTML =
    `<button class="btn btn-dark menu-full-btn" onclick="confirmRestart()">🔄 Restart New Game</button>`;
  if (!document.getElementById("decisionLayer")?.classList.contains("show")) resumeTimers();
}

function menuSaveToSlot(slot) {
  saveToSlot(slot);
  renderMenuSlots();
}

function menuLoadFromSlot(slot) {
  if (!loadFromSlot(slot)) return;
  document.getElementById("menuOverlay").classList.remove("show");
  decisionOpen = false;
  document.getElementById("logList").innerHTML = "";
  stopTimers();
  buildDay();
  startBranchDay();
  renderStats();
  renderShop();
  startTimers();
}

function menuDeleteSlot(slot) {
  deleteSlot(slot);
  renderMenuSlots();
}

function confirmRestart() {
  document.getElementById("restartArea").innerHTML = `
    <div class="restart-confirm">
      <p>Start a brand new game? Current progress will be lost.</p>
      <div class="restart-confirm-btns">
        <button class="btn btn-dark"  onclick="closeMenu()">Cancel</button>
        <button class="btn btn-green" onclick="doRestart()">Yes, Restart</button>
      </div>
    </div>`;
}

function doRestart() {
  document.getElementById("menuOverlay").classList.remove("show");
  decisionOpen = false;
  restartGame();
}

// ── Restart ────────────────────────────────────────────────────
function restartGame() {
  stopTimers();
  decisionOpen = false;
  deleteSave();
  document.getElementById("overlay").classList.remove("show");
  document.getElementById("logList").innerHTML = "";
  initBank();
  branchState = defaultBranchState();
  loadBranchImages();
  buildDay();
  startBranchDay();
  renderStats();
  renderShop();
  startTimers();
}

// ── Boot ───────────────────────────────────────────────────────
(function boot() {
  loadSettings();
  const resumed = loadGame();
  if (!resumed) initBank();
  buildDay();
  initBranch();
  startBranchDay();
  renderStats();
  renderShop();
  startTimers();

  // Wire the menu button with touchend so it works reliably on iOS Safari,
  // where click events on buttons inside sticky headers can silently fail.
  const menuBtn = document.getElementById("menuBtn");
  menuBtn.addEventListener("touchend", function (e) {
    e.preventDefault();
    openMenu();
  }, { passive: false });
  menuBtn.addEventListener("click", openMenu);
})();
