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

// ── Auto-save (current session) ───────────────────────────────

function saveGame() {
  try {
    localStorage.setItem('bankSave', JSON.stringify({
      bank,
      settings,
      branch: typeof serializeBranch === 'function' ? serializeBranch() : null,
      floor:  typeof serializeFloor === 'function' ? serializeFloor() : [],
      version: 2,
    }));
  } catch (_) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem('bankSave');
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version !== 1 && data.version !== 2) return false;
    bank     = data.bank;
    settings = { ...DEFAULT_SETTINGS, ...data.settings };
    if (typeof deserializeBranch === 'function') deserializeBranch(data.version === 2 ? data.branch : data.floor);
    else if (typeof deserializeFloor === 'function') deserializeFloor(data.floor || []);
    return true;
  } catch (_) { return false; }
}

function deleteSave() {
  try { localStorage.removeItem('bankSave'); } catch (_) {}
}

// ── Manual save slots ──────────────────────────────────────────

const SLOT_KEYS = ['bankSave_slot1', 'bankSave_slot2', 'bankSave_slot3'];

function saveToSlot(slot) {
  try {
    localStorage.setItem(SLOT_KEYS[slot], JSON.stringify({
      bank,
      settings,
      branch: typeof serializeBranch === 'function' ? serializeBranch() : null,
      floor:   typeof serializeFloor === 'function' ? serializeFloor() : [],
      savedAt: Date.now(),
      version: 2,
    }));
  } catch (_) {}
}

function loadFromSlot(slot) {
  try {
    const raw = localStorage.getItem(SLOT_KEYS[slot]);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version !== 1 && data.version !== 2) return false;
    bank     = data.bank;
    settings = { ...DEFAULT_SETTINGS, ...data.settings };
    if (typeof deserializeBranch === 'function') deserializeBranch(data.version === 2 ? data.branch : data.floor);
    else if (typeof deserializeFloor === 'function') deserializeFloor(data.floor || []);
    return true;
  } catch (_) { return false; }
}

function readSlotMeta(slot) {
  try {
    const raw = localStorage.getItem(SLOT_KEYS[slot]);
    if (!raw) return null;
    const { bank: b, savedAt } = JSON.parse(raw);
    return {
      day:      b.day,
      netWorth: b.cash + b.loansOut - b.deposits,
      savedAt,
    };
  } catch (_) { return null; }
}

function deleteSlot(slot) {
  try { localStorage.removeItem(SLOT_KEYS[slot]); } catch (_) {}
}
