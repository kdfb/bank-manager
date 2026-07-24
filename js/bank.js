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
    debt:       1_000,
    debtPaymentAmount: 100,
    debtPaymentInterval: 7,
    missedDebtPayment: false,
    staff:      [],
    lendingPolicy: "balanced",
    depositPricing: "market",
    feePricing: "standard",
    marketShare: 8,
    rivalShare: 16,
    phase:      "operating",
    lastReport: null,
    branchAssets: 0,
    rep:        d.startingRep,
    day:        1,
    profit:     0,
    dayStartProfit: 0,
    dayStartCash: d.startingCash,
    // Run-level stats (for end-of-run summary)
    stats: {
      loansApproved: 0,
      loansDenied:   0,
      totalIssued:   0,
      bestDay:       0,   // profit delta in single day
      worstDay:      0,
      customersServed: 0,
      staffServed: 0,
      customersLost: 0,
      defaults: 0,
      delinquencies: 0,
      loansRepaid: 0,
      worldEventsResolved: 0,
    },
  };
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("debugStress") === "1") {
    bank.cash = 700;
    bank.deposits = 0;
    bank.dayStartCash = bank.cash;
  }
  if (typeof location !== "undefined") {
    const debugPrestige = Number(new URLSearchParams(location.search).get("debugPrestige"));
    if (Number.isFinite(debugPrestige) && debugPrestige > 0) {
      bank.prestigeLevel = Math.min(BankMarket.PRESTIGE_TIERS.length - 1, Math.floor(debugPrestige));
    }
  }
  BankWorld.migrateWorld(bank);
  BankMarket.migrateMarket(bank);
  BankCampaign.migrateCampaign(bank);
  BankAchievements.migrate(bank);
  BankGuidance.migrate(bank);
  BankTelemetry.migrate(bank);
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("debugCampaign") === "1") {
    bank.cash = Math.max(bank.cash, 12_000);
    bank.rep = Math.max(bank.rep, 75);
    bank.marketShare = Math.max(bank.marketShare, 15);
    bank.prestigeLevel = 3;
    bank.stats.customersServed = Math.max(bank.stats.customersServed, 55);
    bank.dayStartCash = bank.cash;
  }
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("debugRivals") === "1") {
    const previewDay = bank.day;
    for (let day = 1; day <= 15; day += 1) {
      bank.day = day;
      BankCampaign.simulateRivalDay(bank);
    }
    bank.day = previewDay;
    BankCampaign.migrateCampaign(bank);
  }
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("debugVictory") === "1") {
    bank.cash = Math.max(bank.cash, 50_000);
    bank.rep = Math.max(bank.rep, 82);
    bank.marketShare = Math.max(bank.marketShare, 20);
    bank.prestigeLevel = 3;
    bank.stats.customersServed = Math.max(bank.stats.customersServed, 80);
    bank.stats.worldEventsResolved = Math.max(bank.stats.worldEventsResolved, 12);
    bank.lendingPolicy = "conservative";
    const headquarters = BankCampaign.activeBranch(bank);
    headquarters.policy = "conservative";
    headquarters.focus = "community";
    headquarters.marketShare = bank.marketShare;
    for (const regionId of ["red_mesa", "ironwood", "port_mercy"]) {
      const existing = BankCampaign.regionBranch(bank, regionId);
      const branch = existing || BankCampaign.openBranch(bank, regionId, 2_000).branch;
      branch.cumulativeProfit = Math.max(branch.cumulativeProfit, 1_500);
      branch.marketShare = 18;
      BankCampaign.setBranchPolicy(bank, branch.id, "conservative");
      BankCampaign.setBranchFocus(bank, branch.id, "community");
    }
    BankCampaign.updateProgress(bank, BankCampaign.consolidatedNetCapital(bank));
    bank.dayStartCash = bank.cash;
  }
  BankEconomy.resetDayMetrics(bank);
}

const totalAssets = () => BankEconomy.totalAssets(bank);
const netWorth    = () => BankEconomy.netWorth(bank);
const migrateLoadedBank = savedBank => {
  const migrated = BankCampaign.migrateCampaign(BankOperations.migrateRoster(
    BankMarket.migrateMarket(BankWorld.migrateWorld(BankPortfolio.migrateLoanBook(BankEconomy.migrateBank(savedBank))))
  ));
  BankGuidance.migrate(migrated);
  BankTelemetry.migrate(migrated);
  BankAchievements.migrate(migrated);
  return migrated;
};

// ── Persistence ───────────────────────────────────────────────

// ── Auto-save (current session) ───────────────────────────────

function saveGame() {
  try {
    const branchData = typeof serializeBranch === 'function' ? serializeBranch() : null;
    BankCampaign.captureActiveBranch(bank, branchData);
    BankPlatform.setItem('bankSave', JSON.stringify({
      bank,
      settings,
      branch: branchData,
      floor:  typeof serializeFloor === 'function' ? serializeFloor() : [],
      version: 6,
    }));
  } catch (_) {}
}

function loadGame() {
  try {
    const raw = BankPlatform.getItem('bankSave');
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (![1, 2, 3, 4, 5, 6].includes(data.version)) return false;
    bank     = migrateLoadedBank(data.bank);
    settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    applySettings();
    if (typeof deserializeBranch === 'function') deserializeBranch(data.version >= 2 ? data.branch : data.floor);
    else if (typeof deserializeFloor === 'function') deserializeFloor(data.floor || []);
    return true;
  } catch (_) { return false; }
}

function deleteSave() {
  try { BankPlatform.removeItem('bankSave'); } catch (_) {}
}

// ── Manual save slots ──────────────────────────────────────────

const SLOT_KEYS = ['bankSave_slot1', 'bankSave_slot2', 'bankSave_slot3'];

function saveToSlot(slot) {
  try {
    const branchData = typeof serializeBranch === 'function' ? serializeBranch() : null;
    BankCampaign.captureActiveBranch(bank, branchData);
    BankPlatform.setItem(SLOT_KEYS[slot], JSON.stringify({
      bank,
      settings,
      branch: branchData,
      floor:   typeof serializeFloor === 'function' ? serializeFloor() : [],
      savedAt: Date.now(),
      version: 6,
    }));
  } catch (_) {}
}

function loadFromSlot(slot) {
  try {
    const raw = BankPlatform.getItem(SLOT_KEYS[slot]);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (![1, 2, 3, 4, 5, 6].includes(data.version)) return false;
    bank     = migrateLoadedBank(data.bank);
    settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    applySettings();
    if (typeof deserializeBranch === 'function') deserializeBranch(data.version >= 2 ? data.branch : data.floor);
    else if (typeof deserializeFloor === 'function') deserializeFloor(data.floor || []);
    return true;
  } catch (_) { return false; }
}

function readSlotMeta(slot) {
  try {
    const raw = BankPlatform.getItem(SLOT_KEYS[slot]);
    if (!raw) return null;
    const { bank: b, savedAt } = JSON.parse(raw);
    return {
      day:      b.day,
      netWorth: BankEconomy.netWorth(migrateLoadedBank(b)),
      savedAt,
    };
  } catch (_) { return null; }
}

function deleteSlot(slot) {
  try { BankPlatform.removeItem(SLOT_KEYS[slot]); } catch (_) {}
}
