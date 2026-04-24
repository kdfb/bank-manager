// Core bank state and persistence.
// All other modules read/write the `bank` global directly.

let bank = {};

function initBank() {
  const d = DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
  bank = {
    cash:       d.startingCash,
    deposits:   d.startingDeposits,
    loansOut:   0,
    loanBook:   [],
    rep:        d.startingRep,
    day:        1,
    profit:     0,
    // Run-level stats (for end-of-run summary)
    stats: {
      loansApproved: 0,
      loansDenied:   0,
      totalIssued:   0,
      bestDay:       0,   // profit delta in single day
      worstDay:      0,
    },
  };
}

const totalAssets = () => bank.cash + bank.loansOut;
const netWorth    = () => totalAssets() - bank.deposits;

// ── Persistence ───────────────────────────────────────────────

function saveGame() {
  try {
    localStorage.setItem('bankSave', JSON.stringify({
      bank,
      settings,
      version: 1,
    }));
  } catch (_) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem('bankSave');
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version !== 1) return false;
    bank     = data.bank;
    settings = { ...DEFAULT_SETTINGS, ...data.settings };
    return true;
  } catch (_) { return false; }
}

function deleteSave() {
  try { localStorage.removeItem('bankSave'); } catch (_) {}
}
