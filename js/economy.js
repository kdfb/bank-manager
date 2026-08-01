// Pure economy helpers shared by the browser game and automated tests.
(function exposeEconomy(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BankEconomy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createEconomy() {
  const POLICY_RULES = Object.freeze({
    conservative: new Set(["low"]),
    balanced: new Set(["low", "medium"]),
    growth: new Set(["low", "medium", "high"]),
  });

  function totalAssets(bank) {
    return bank.cash + bank.loansOut + (bank.branchAssets || 0);
  }

  function netWorth(bank) {
    return totalAssets(bank) - bank.deposits - (bank.debt || 0);
  }

  function canPolicyApproveLoan(policy, risk, availableCash, amount) {
    const permittedRisks = POLICY_RULES[policy] || POLICY_RULES.balanced;
    return permittedRisks.has(risk) && availableCash >= amount;
  }

  function dailyStaffCost(bank) {
    return (bank.staff || []).reduce((sum, member) => sum + member.dailyWage, 0);
  }

  function nextDebtPayment(bank) {
    const interval = bank.debtPaymentInterval || 7;
    const dueInDays = interval - ((bank.day - 1) % interval);
    return {
      dueInDays,
      amount: Math.min(bank.debt || 0, bank.debtPaymentAmount || 100),
    };
  }

  function applyTransactionFee(bank, amount, category) {
    if (amount <= 0) return 0;
    bank.cash += amount;
    bank.profit += amount;
    bank.dayMetrics = bank.dayMetrics || {};
    bank.dayMetrics.fees = (bank.dayMetrics.fees || 0) + amount;
    bank.dayMetrics[category] = (bank.dayMetrics[category] || 0) + amount;
    return amount;
  }

  function resetDayMetrics(bank) {
    bank.dayMetrics = {
      fees: 0,
      interestIncome: 0,
      depositInterest: 0,
      wages: 0,
      rent: 0,
      debtPayment: 0,
      defaults: 0,
      loanPaymentsDue: 0,
      loanPaymentsReceived: 0,
      loanPaymentsMissed: 0,
      newDelinquencies: 0,
      eventCosts: 0,
      expansionCosts: 0,
      branchProfit: 0,
      branchCustomers: 0,
      rivalActions: 0,
      worldEventsResolved: 0,
      segmentResults: {},
      customersServed: 0,
      returningCustomers: 0,
      staffServed: 0,
      customersLost: 0,
      totalWaitSeconds: 0,
      maxQueue: 0,
      servicePoints: 0,
      serviceSteps: 0,
      perfectServices: 0,
      steadyServices: 0,
      rushedServices: 0,
    };
  }

  function migrateBank(bank) {
    bank.debt = Number.isFinite(bank.debt) ? bank.debt : 1_000;
    bank.debtPaymentAmount = bank.debtPaymentAmount || 100;
    bank.debtPaymentInterval = bank.debtPaymentInterval || 7;
    bank.staff = Array.isArray(bank.staff) ? bank.staff : [];
    bank.lendingPolicy = bank.lendingPolicy || "balanced";
    bank.depositPricing = ["margin", "market", "attract"].includes(bank.depositPricing) ? bank.depositPricing : "market";
    bank.feePricing = ["accessible", "standard", "premium"].includes(bank.feePricing) ? bank.feePricing : "standard";
    bank.marketShare = Number.isFinite(bank.marketShare) ? bank.marketShare : 8;
    bank.rivalShare = Number.isFinite(bank.rivalShare) ? bank.rivalShare : 16;
    bank.missedDebtPayment = Boolean(bank.missedDebtPayment);
    bank.dayStartProfit = Number.isFinite(bank.dayStartProfit) ? bank.dayStartProfit : (bank.profit || 0);
    bank.dayStartCash = Number.isFinite(bank.dayStartCash) ? bank.dayStartCash : (bank.cash || 0);
    bank.phase = bank.phase === "report" ? "report" : "operating";
    bank.lastReport = bank.lastReport || null;
    bank.stats = bank.stats || {};
    bank.stats.customersServed = bank.stats.customersServed || 0;
    bank.stats.staffServed = bank.stats.staffServed || 0;
    bank.stats.defaults = bank.stats.defaults || 0;
    bank.stats.delinquencies = bank.stats.delinquencies || 0;
    bank.stats.loansRepaid = bank.stats.loansRepaid || 0;
    bank.stats.worldEventsResolved = bank.stats.worldEventsResolved || 0;
    bank.stats.customersLost = bank.stats.customersLost || 0;
    bank.stats.perfectServices = bank.stats.perfectServices || 0;
    bank.stats.steadyServices = bank.stats.steadyServices || 0;
    bank.stats.rushedServices = bank.stats.rushedServices || 0;
    const existingMetrics = bank.dayMetrics || {};
    resetDayMetrics(bank);
    bank.dayMetrics = { ...bank.dayMetrics, ...existingMetrics };
    return bank;
  }

  return Object.freeze({
    POLICY_RULES,
    totalAssets,
    netWorth,
    canPolicyApproveLoan,
    dailyStaffCost,
    nextDebtPayment,
    applyTransactionFee,
    resetDayMetrics,
    migrateBank,
  });
});
