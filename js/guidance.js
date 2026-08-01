// Contextual tutorial progression shared by the UI and automated tests.
(function exposeGuidance(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BankGuidance = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createGuidance() {
  const TIPS = Object.freeze([
    Object.freeze({
      id: "welcome", stage: "Opening shift", title: "Serve with rhythm, not panic",
      body: "Your wicket is open for sixty seconds. Start a service, then tap when the moving marker enters the green zone. A miss still progresses; accurate work earns more.",
      action: "teller", actionLabel: "View controls",
      eligible: bank => bank.day === 1 && (bank.stats?.customersServed || 0) === 0,
    }),
    Object.freeze({
      id: "liquidity", stage: "Banking fundamentals", title: "Cash and profit are different",
      body: "Preparing a loan turns cash into a loan asset. A perfect service review improves its underwriting; the loan schedule and expected loss remain visible in Manage.",
      action: "ledger", actionLabel: "Open ledger",
      eligible: bank => (bank.stats?.loansApproved || 0) >= 1 || (bank.loansOut || 0) > 0,
    }),
    Object.freeze({
      id: "staffing", stage: "Delegation", title: "Your first hire changes the loop",
      body: "After you know the shift rhythm, hire Mara to clear routine services automatically while you concentrate on loan files. Wages continue every day.",
      action: "manage", actionLabel: "Open Manage",
      eligible: bank => (bank.stats?.customersServed || 0) >= 10 && !(bank.staff || []).length,
    }),
    Object.freeze({
      id: "workstations", stage: "Improvement", title: "Improve the bottleneck you can feel",
      body: "Manage offers four focused improvements. Choose one when slow service, loan risk, or thin margins becomes a real problem—not just because cash is available.",
      action: "manage", actionLabel: "Review improvements",
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
      body: "Low liquidity is a warning, not a game over. New consultations will structure smaller loans automatically; pause improvements and review upcoming repayments before tomorrow's shift.",
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
