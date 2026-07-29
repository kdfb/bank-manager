// Contextual tutorial progression shared by the UI and automated tests.
(function exposeGuidance(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BankGuidance = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createGuidance() {
  const TIPS = Object.freeze([
    Object.freeze({
      id: "welcome", stage: "Getting started", title: "Five appointments make a day",
      body: "Your wicket is already open. Routine requests take one tap; loan requests ask you to balance the customer's plan against the bank's cash, capital, and standing.",
      action: "teller", actionLabel: "View controls",
      eligible: bank => bank.day === 1 && (bank.stats?.customersServed || 0) === 0,
    }),
    Object.freeze({
      id: "liquidity", stage: "Banking fundamentals", title: "Cash and profit are different",
      body: "A loan reduces cash but creates a loan asset. Deposits add cash but remain money owed to customers. Watch net capital and the next-payment forecast together.",
      action: "ledger", actionLabel: "Open ledger",
      eligible: bank => (bank.stats?.loansApproved || 0) >= 1 || (bank.loansOut || 0) > 0,
    }),
    Object.freeze({
      id: "staffing", stage: "Delegation", title: "Your first hire changes the loop",
      body: "After you know the daily rhythm, hire a teller to handle routine services. Wages continue even on quiet days, so add payroll deliberately.",
      action: "manage", actionLabel: "Open Manage",
      eligible: bank => (bank.stats?.customersServed || 0) >= 10 && !(bank.staff || []).length,
    }),
    Object.freeze({
      id: "workstations", stage: "Delegation", title: "Build capacity before adding payroll",
      body: "Counters and risk desks determine which employees can work. Add only the capacity your current team can use.",
      action: "build", actionLabel: "Enter Build",
      eligible: bank => (bank.staff || []).length > 0 && !Object.keys(bank.upgrades || {}).length,
    }),
    Object.freeze({
      id: "portfolio", stage: "Risk management", title: "Read the repayment schedule",
      body: "Manage shows upcoming principal, interest, arrears, and expected loss. A profitable portfolio can still create a near-term cash shortage.",
      action: "manage", actionLabel: "Review portfolio",
      eligible: bank => (bank.loanBook || []).length > 0,
    }),
    Object.freeze({
      id: "recovery", stage: "Financial pressure", title: "A warning is not a game over",
      body: "Low liquidity is a warning, not a game over. Protect cash by declining optional loans and review the repayment schedule before the next day.",
      action: "manage", actionLabel: "Review recovery tools",
      eligible: bank => (bank.cash || 0) < 800 || ((bank.deposits || 0) > 0 && bank.cash / bank.deposits < 0.15),
    }),
  ]);

  function migrate(bank) {
    const guidance = bank.guidance && typeof bank.guidance === "object" ? bank.guidance : {};
    const validIds = new Set(TIPS.map(tip => tip.id));
    bank.guidance = {
      seen: [...new Set(Array.isArray(guidance.seen) ? guidance.seen : [])].filter(id => validIds.has(id)),
      currentId: validIds.has(guidance.currentId) ? guidance.currentId : null,
    };
    return bank.guidance;
  }

  function available(bank) {
    migrate(bank);
    return TIPS.filter(tip => tip.eligible(bank));
  }

  function next(bank) {
    const state = migrate(bank);
    const current = TIPS.find(tip => tip.id === state.currentId && tip.eligible(bank) && !state.seen.includes(tip.id));
    if (current) return current;
    const tip = available(bank).find(entry => !state.seen.includes(entry.id)) || null;
    state.currentId = tip?.id || null;
    return tip;
  }

  function markSeen(bank, id) {
    const state = migrate(bank);
    if (TIPS.some(tip => tip.id === id) && !state.seen.includes(id)) state.seen.push(id);
    if (state.currentId === id) state.currentId = null;
    return state;
  }

  function reset(bank) {
    bank.guidance = { seen: [], currentId: null };
    return bank.guidance;
  }

  function progress(bank) {
    const state = migrate(bank);
    return { seen: state.seen.length, total: TIPS.length, available: available(bank).length };
  }

  return Object.freeze({ TIPS, migrate, available, next, markSeen, reset, progress });
});
