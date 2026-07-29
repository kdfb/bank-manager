(function exposeAchievements(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BankAchievements = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createAchievements() {
  "use strict";

  const DEFINITIONS = Object.freeze([
    Object.freeze({ id: "FIRST_DAY", title: "First Day's Ledger", description: "Complete the first business day.", test: bank => bank.day >= 2 }),
    Object.freeze({ id: "FIRST_CUSTOMER", title: "Open for Business", description: "Serve the first customer personally or through staff.", test: bank => (bank.stats?.customersServed || 0) >= 1 }),
    Object.freeze({ id: "FIRST_LOAN", title: "Capital at Work", description: "Approve the bank's first loan.", test: bank => (bank.stats?.loansApproved || 0) >= 1 }),
    Object.freeze({ id: "FIRST_HIRE", title: "No Longer Alone", description: "Hire the first member of staff.", test: bank => (bank.staff || []).length >= 1 }),
    Object.freeze({ id: "DELEGATION", title: "Trust the Team", description: "Have staff serve ten customers.", test: bank => (bank.stats?.staffServed || 0) >= 10 }),
    Object.freeze({ id: "FURNISHED_BRANCH", title: "Built to Serve", description: "Place three functional branch upgrades.", test: bank => Object.values(bank.upgrades || {}).reduce((sum, count) => sum + Math.max(0, Number(count) || 0), 0) >= 3 }),
    Object.freeze({ id: "COUNTY_BANK", title: "County Institution", description: "Reach County Bank prestige.", test: bank => (bank.prestigeLevel || 0) >= 2 }),
    Object.freeze({ id: "BRANCH_NETWORK", title: "Regional Ambition", description: "Operate at least two branches.", test: bank => (bank.campaign?.branches || []).length >= 2 }),
    Object.freeze({ id: "DEBT_FREE", title: "Clear of Creditors", description: "Repay all external debt.", test: bank => Number(bank.debt) <= 0 }),
    Object.freeze({ id: "BANKING_LEGACY", title: "Silver Creek Legacy", description: "Complete Silver Creek's seven-day story.", test: (_bank, context) => context.campaignComplete === true }),
  ]);
  const BY_ID = Object.freeze(Object.fromEntries(DEFINITIONS.map(definition => [definition.id, definition])));

  function migrate(bank) {
    const saved = bank?.achievements;
    const source = saved?.unlocked && typeof saved.unlocked === "object" && !Array.isArray(saved.unlocked)
      ? saved.unlocked
      : Array.isArray(saved) ? Object.fromEntries(saved.map(id => [id, { day: bank.day || 1 }])) : {};
    const unlocked = {};
    for (const [id, value] of Object.entries(source)) {
      if (!BY_ID[id]) continue;
      const day = Math.max(1, Math.floor(Number(value?.day ?? value) || 1));
      unlocked[id] = { day };
    }
    bank.achievements = { unlocked };
    return bank.achievements;
  }

  function sync(bank, context = {}) {
    const state = migrate(bank);
    const newlyUnlocked = [];
    for (const definition of DEFINITIONS) {
      if (state.unlocked[definition.id] || !definition.test(bank, context)) continue;
      state.unlocked[definition.id] = { day: Math.max(1, Math.floor(Number(bank.day) || 1)) };
      newlyUnlocked.push(definition);
    }
    return newlyUnlocked;
  }

  function unlocked(bank) {
    const state = migrate(bank);
    return DEFINITIONS.filter(definition => Boolean(state.unlocked[definition.id]));
  }

  function summary(bank) {
    const unlockedDefinitions = unlocked(bank);
    return {
      unlocked: unlockedDefinitions.length,
      total: DEFINITIONS.length,
      complete: unlockedDefinitions.length === DEFINITIONS.length,
      definitions: DEFINITIONS.map(definition => ({
        ...definition,
        test: undefined,
        unlocked: Boolean(bank.achievements.unlocked[definition.id]),
        day: bank.achievements.unlocked[definition.id]?.day || null,
      })),
    };
  }

  function presence(bank, context = {}) {
    const branchCount = Math.max(1, (bank.campaign?.branches || []).length);
    const day = Math.max(1, Math.floor(Number(bank.day) || 1));
    const state = context.campaignComplete
      ? "Legacy secured · Open-ended play"
      : branchCount > 1 ? `Managing ${branchCount} regional branches` : `Running ${context.locationLabel || "the first branch"}`;
    const details = `Day ${day} · ${context.prestigeTitle || "Local Banker"}${context.campaignTitle ? ` · ${context.campaignTitle}` : ""}`;
    return { state, details, day, branchCount, campaignComplete: context.campaignComplete === true };
  }

  return Object.freeze({ DEFINITIONS, BY_ID, migrate, sync, unlocked, summary, presence });
});
