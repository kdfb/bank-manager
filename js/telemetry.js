// Local-only balance telemetry. Records live inside the save and are never transmitted.
(function exposeTelemetry(root, factory) {
  const api = factory();
  if (typeof module === "undefined" || !module.exports) root.BankTelemetry = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTelemetry() {
  const VERSION = 1;
  const MAX_DAYS = 180;

  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const rounded = value => Math.round(number(value) * 100) / 100;
  const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  function normalizeRecord(record) {
    if (!record || !Number.isFinite(Number(record.day))) return null;
    return {
      day: Math.max(1, Math.floor(number(record.day, 1))),
      difficulty: String(record.difficulty || "normal"),
      locationId: String(record.locationId || "silver_creek"),
      lendingPolicy: String(record.lendingPolicy || "balanced"),
      customerFocus: String(record.customerFocus || "general"),
      branchCount: Math.max(1, Math.floor(number(record.branchCount, 1))),
      campaignStep: Math.max(1, Math.floor(number(record.campaignStep, 1))),
      campaignComplete: Boolean(record.campaignComplete),
      prestigeLevel: Math.max(0, Math.floor(number(record.prestigeLevel))),
      cashStart: rounded(record.cashStart), cashEnd: rounded(record.cashEnd), cashChange: rounded(record.cashChange),
      networkCash: rounded(record.networkCash), netCapital: rounded(record.netCapital), deposits: rounded(record.deposits),
      loans: rounded(record.loans), debt: rounded(record.debt), expectedLoss: rounded(record.expectedLoss),
      dayProfit: rounded(record.dayProfit), fees: rounded(record.fees), interestIncome: rounded(record.interestIncome),
      depositInterest: rounded(record.depositInterest), wages: rounded(record.wages), rent: rounded(record.rent),
      defaults: rounded(record.defaults), eventCosts: rounded(record.eventCosts), expansionCosts: rounded(record.expansionCosts),
      debtPayment: rounded(record.debtPayment), customersServed: Math.max(0, Math.floor(number(record.customersServed))),
      staffServed: Math.max(0, Math.floor(number(record.staffServed))), customersLost: Math.max(0, Math.floor(number(record.customersLost))),
      averageWait: rounded(record.averageWait), maxQueue: Math.max(0, Math.floor(number(record.maxQueue))),
      missedPayments: Math.max(0, Math.floor(number(record.missedPayments))), newDelinquencies: Math.max(0, Math.floor(number(record.newDelinquencies))),
      worldEvents: Math.max(0, Math.floor(number(record.worldEvents))), rivalActions: Math.max(0, Math.floor(number(record.rivalActions))),
      marketShare: rounded(record.marketShare), networkShare: rounded(record.networkShare), reserveCoverage: rounded(record.reserveCoverage),
      activeConditions: Math.max(0, Math.floor(number(record.activeConditions))),
      segments: record.segments && typeof record.segments === "object" ? record.segments : {},
    };
  }

  function migrate(bank) {
    const current = bank.telemetry || {};
    const records = Array.isArray(current.days)
      ? current.days.map(normalizeRecord).filter(Boolean).slice(-MAX_DAYS)
      : [];
    bank.telemetry = {
      version: VERSION,
      consent: "local-only",
      days: records,
      startedDay: Math.max(1, Math.floor(number(current.startedDay, records[0]?.day || bank.day || 1))),
    };
    return bank.telemetry;
  }

  function recordDay(bank, report, context = {}) {
    const telemetry = migrate(bank);
    const metrics = bank.dayMetrics || {};
    const served = Math.max(0, number(metrics.customersServed));
    const branch = context.activeBranch || {};
    const portfolio = report?.portfolio || {};
    const campaign = report?.campaignProgress || {};
    const networkCash = number(context.networkCash, bank.cash);
    const deposits = Math.max(0, number(context.networkDeposits, bank.deposits));
    const record = normalizeRecord({
      day: bank.day,
      difficulty: context.difficulty,
      locationId: bank.locationId,
      lendingPolicy: bank.lendingPolicy,
      customerFocus: branch.focus,
      branchCount: bank.campaign?.branches?.length || 1,
      campaignStep: campaign.step,
      campaignComplete: campaign.complete,
      prestigeLevel: bank.prestigeLevel,
      cashStart: bank.dayStartCash,
      cashEnd: bank.cash,
      cashChange: report?.cashChange,
      networkCash,
      netCapital: context.netCapital,
      deposits,
      loans: number(context.networkLoans, bank.loansOut),
      debt: bank.debt,
      expectedLoss: portfolio.expectedLoss,
      dayProfit: report?.dayDelta,
      fees: metrics.fees,
      interestIncome: metrics.interestIncome,
      depositInterest: metrics.depositInterest,
      wages: metrics.wages,
      rent: metrics.rent,
      defaults: metrics.defaults,
      eventCosts: metrics.eventCosts,
      expansionCosts: metrics.expansionCosts,
      debtPayment: metrics.debtPayment,
      customersServed: served,
      staffServed: metrics.staffServed,
      customersLost: metrics.customersLost,
      averageWait: served ? number(metrics.totalWaitSeconds) / served : 0,
      maxQueue: metrics.maxQueue,
      missedPayments: metrics.loanPaymentsMissed,
      newDelinquencies: metrics.newDelinquencies,
      worldEvents: metrics.worldEventsResolved,
      rivalActions: metrics.rivalActions,
      marketShare: bank.marketShare,
      networkShare: context.networkShare,
      reserveCoverage: deposits ? networkCash / deposits : 1,
      activeConditions: report?.world?.conditionsToday?.length,
      segments: metrics.segmentResults,
    });
    const existingIndex = telemetry.days.findIndex(day => day.day === record.day && day.locationId === record.locationId);
    if (existingIndex >= 0) telemetry.days[existingIndex] = record;
    else telemetry.days.push(record);
    telemetry.days = telemetry.days.slice(-MAX_DAYS);
    return record;
  }

  function summarize(bank) {
    const days = migrate(bank).days;
    const served = days.reduce((sum, day) => sum + day.customersServed, 0);
    const lost = days.reduce((sum, day) => sum + day.customersLost, 0);
    const delegated = days.reduce((sum, day) => sum + day.staffServed, 0);
    const loanBalance = days.length ? days[days.length - 1].loans : 0;
    const expectedLoss = days.length ? days[days.length - 1].expectedLoss : 0;
    const stressDays = days.filter(day => day.reserveCoverage < 0.15 || day.networkCash < 500).length;
    const profitableDays = days.filter(day => day.dayProfit > 0).length;
    const summary = {
      days: days.length,
      averageProfit: rounded(average(days.map(day => day.dayProfit))),
      averageCashChange: rounded(average(days.map(day => day.cashChange))),
      profitableRate: days.length ? profitableDays / days.length : 0,
      serviceRate: served + lost ? served / (served + lost) : 1,
      delegationRate: served ? delegated / served : 0,
      averageWait: rounded(average(days.map(day => day.averageWait))),
      peakQueue: days.reduce((peak, day) => Math.max(peak, day.maxQueue), 0),
      stressDays,
      stressRate: days.length ? stressDays / days.length : 0,
      defaults: rounded(days.reduce((sum, day) => sum + day.defaults, 0)),
      missedPayments: days.reduce((sum, day) => sum + day.missedPayments, 0),
      expectedLossRate: loanBalance ? expectedLoss / loanBalance : 0,
      strategicEvents: days.reduce((sum, day) => sum + day.worldEvents, 0),
      rivalActions: days.reduce((sum, day) => sum + day.rivalActions, 0),
      regionsVisited: new Set(days.map(day => day.locationId)).size,
      maximumBranches: days.reduce((peak, day) => Math.max(peak, day.branchCount), 0),
    };
    summary.signals = balanceSignals(summary);
    return summary;
  }

  function balanceSignals(summary) {
    if (summary.days < 3) return [{ level: "info", title: "Collecting baseline", body: "Complete three days to unlock balance signals." }];
    const signals = [];
    if (summary.serviceRate < 0.8) signals.push({ level: "warn", title: "Service bottleneck", body: "More than 20% of queued customers are leaving unserved." });
    else signals.push({ level: "good", title: "Service capacity", body: `${Math.round(summary.serviceRate * 100)}% of customers are being served.` });
    if (summary.profitableRate < 0.5) signals.push({ level: "warn", title: "Profitability pressure", body: "Fewer than half of recorded days are profitable." });
    if (summary.stressRate > 0.25) signals.push({ level: "warn", title: "Liquidity pressure", body: "Low reserve coverage appears on more than one quarter of recorded days." });
    if (summary.expectedLossRate > 0.12) signals.push({ level: "warn", title: "Credit concentration", body: "Expected losses exceed 12% of the current loan book." });
    if (!signals.some(signal => signal.level === "warn")) signals.push({ level: "good", title: "Stable operating range", body: "No major profitability, liquidity, service, or credit warning is active." });
    return signals;
  }

  function exportSnapshot(bank, generatedAt = null) {
    return {
      format: "bank-manager-balance-telemetry",
      version: VERSION,
      generatedAt,
      privacy: "Local playtest metrics only. No player identity or device data is collected.",
      summary: summarize(bank),
      days: migrate(bank).days.map(day => ({ ...day })),
    };
  }

  return Object.freeze({ VERSION, MAX_DAYS, migrate, recordDay, summarize, balanceSignals, exportSnapshot });
});
