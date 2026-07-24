// Contextual tutorial progression shared by the UI and automated tests.
(function exposeGuidance(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BankGuidance = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createGuidance() {
  const TIPS = Object.freeze([
    Object.freeze({
      id: "welcome", stage: "Getting started", title: "Open the teller wicket",
      body: "Move to the main counter and press E or controller A. Customers join a live queue, so the first skill is deciding when to serve and when to keep moving.",
      action: "teller", actionLabel: "Show controls",
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
      body: "After serving several customers, hire a teller in Manage. Staff need matching workstations and wages continue even on quiet days.",
      action: "manage", actionLabel: "Open Manage",
      eligible: bank => (bank.stats?.customersServed || 0) >= 3 && !(bank.staff || []).length,
    }),
    Object.freeze({
      id: "workstations", stage: "Delegation", title: "Build capacity before adding payroll",
      body: "Counters and risk desks determine which employees can work. Furnishings belong to the current branch and remain there when you travel.",
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
      id: "prestige", stage: "Growth", title: "Prestige unlocks better demand",
      body: "Standing, customer service, capital, and market share advance prestige. New tiers unlock institutional and enterprise customers.",
      action: "manage", actionLabel: "Review prestige",
      eligible: bank => (bank.prestigeLevel || 0) >= 1,
    }),
    Object.freeze({
      id: "expansion", stage: "Regional strategy", title: "Compare regions before expanding",
      body: "Setup cost is an expense; starting capital is transferred into the new branch. Demand, rent, crime, growth, and rival strength all change the commitment.",
      action: "regions", actionLabel: "Open Regions",
      eligible: bank => (bank.prestigeLevel || 0) >= 1 && (bank.campaign?.branches || []).length === 1,
    }),
    Object.freeze({
      id: "pricing", stage: "Margin management", title: "Pricing is a tradeoff, not an upgrade",
      body: "Deposit terms trade funding cost for deposit growth. Fee strategy trades income per case for demand and share. Start at Market Rate and Standard Fees, then change one lever at a time in Manage.",
      action: "manage", actionLabel: "Review pricing",
      eligible: bank => (bank.prestigeLevel || 0) >= 1,
    }),
    Object.freeze({
      id: "policies", stage: "Regional strategy", title: "Branches need different policies",
      body: "Lending policy controls volume and expected loss. Deposit pricing trades funding cost for deposit flow, while fee strategy trades fee yield for customer demand and market share. Set each branch for its local market.",
      action: "regions", actionLabel: "Compare policies",
      eligible: bank => (bank.campaign?.branches || []).length >= 2,
    }),
    Object.freeze({
      id: "travel", stage: "Executive control", title: "Visit a branch next day",
      body: "Schedule travel in Regions. The destination loads its own cash, deposits, loan book, staff, upgrades, and floor while every other branch simulates in aggregate.",
      action: "regions", actionLabel: "Plan a visit",
      eligible: bank => (bank.campaign?.branches || []).length >= 2,
    }),
    Object.freeze({
      id: "recovery", stage: "Financial pressure", title: "A warning is not a game over",
      body: "Low liquidity can be recovered through capital transfers, loan participation sales, emergency credit, tighter policy, or delayed expansion.",
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
