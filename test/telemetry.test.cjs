const test = require("node:test");
const assert = require("node:assert/strict");
const Telemetry = require("../js/telemetry.js");

function bankFixture(overrides = {}) {
  return {
    day: 1,
    locationId: "silver_creek",
    lendingPolicy: "balanced",
    prestigeLevel: 0,
    cash: 1_100,
    dayStartCash: 1_000,
    deposits: 3_000,
    loansOut: 800,
    debt: 1_000,
    marketShare: 8,
    campaign: { branches: [{ id: "hq", active: true, focus: "general" }] },
    dayMetrics: {
      fees: 30, interestIncome: 20, depositInterest: 4, wages: 15, rent: 12,
      defaults: 0, eventCosts: 0, expansionCosts: 0, debtPayment: 0,
      customersServed: 8, staffServed: 4, customersLost: 2,
      totalWaitSeconds: 96, maxQueue: 3, loanPaymentsMissed: 1,
      newDelinquencies: 1, worldEventsResolved: 1, rivalActions: 0,
      segmentResults: { households: { served: 5, lost: 1, value: 300 } },
    },
    ...overrides,
  };
}

function reportFixture(overrides = {}) {
  return {
    cashChange: 100,
    dayDelta: 19,
    portfolio: { expectedLoss: 48 },
    campaignProgress: { step: 1, complete: false },
    world: { conditionsToday: [{ id: "test" }] },
    ...overrides,
  };
}

function contextFixture(overrides = {}) {
  return {
    difficulty: "normal",
    activeBranch: { focus: "general" },
    networkCash: 1_100,
    networkDeposits: 3_000,
    networkLoans: 800,
    netCapital: -2_100,
    networkShare: 8,
    ...overrides,
  };
}

test("legacy saves receive local-only telemetry defaults", () => {
  const bank = bankFixture();
  const telemetry = Telemetry.migrate(bank);
  assert.equal(telemetry.version, 1);
  assert.equal(telemetry.consent, "local-only");
  assert.deepEqual(telemetry.days, []);
});

test("daily telemetry captures consolidated economy, service, and risk metrics", () => {
  const bank = bankFixture();
  const day = Telemetry.recordDay(bank, reportFixture(), contextFixture());
  assert.equal(day.day, 1);
  assert.equal(day.dayProfit, 19);
  assert.equal(day.networkCash, 1_100);
  assert.equal(day.netCapital, -2_100);
  assert.equal(day.averageWait, 12);
  assert.equal(day.reserveCoverage, 0.37);
  assert.equal(day.expectedLoss, 48);
  assert.equal(day.customersServed, 8);
  assert.deepEqual(day.segments.households, { served: 5, lost: 1, value: 300 });
});

test("recording a resumed report is idempotent and retention is bounded", () => {
  const bank = bankFixture();
  Telemetry.recordDay(bank, reportFixture(), contextFixture());
  Telemetry.recordDay(bank, reportFixture({ dayDelta: 25 }), contextFixture());
  assert.equal(bank.telemetry.days.length, 1);
  assert.equal(bank.telemetry.days[0].dayProfit, 25);
  for (let day = 2; day <= 190; day += 1) {
    bank.day = day;
    Telemetry.recordDay(bank, reportFixture(), contextFixture());
  }
  assert.equal(bank.telemetry.days.length, Telemetry.MAX_DAYS);
  assert.equal(bank.telemetry.days[0].day, 11);
  assert.equal(bank.telemetry.days.at(-1).day, 190);
});

test("balance summary identifies service, profitability, liquidity, and credit pressure", () => {
  const bank = bankFixture();
  for (let day = 1; day <= 4; day += 1) {
    bank.day = day;
    bank.dayMetrics.customersServed = 3;
    bank.dayMetrics.customersLost = 2;
    Telemetry.recordDay(bank, reportFixture({ dayDelta: day === 1 ? 5 : -20 }), contextFixture({ networkCash: 300, networkLoans: 800 }));
  }
  const summary = Telemetry.summarize(bank);
  assert.equal(summary.days, 4);
  assert.equal(summary.serviceRate, 0.6);
  assert.equal(summary.stressDays, 4);
  assert.ok(summary.signals.some(signal => signal.title === "Service bottleneck"));
  assert.ok(summary.signals.some(signal => signal.title === "Profitability pressure"));
  assert.ok(summary.signals.some(signal => signal.title === "Liquidity pressure"));
});

test("export contains balance data and an explicit privacy contract", () => {
  const bank = bankFixture();
  Telemetry.recordDay(bank, reportFixture(), contextFixture());
  const exported = Telemetry.exportSnapshot(bank, "2026-07-24T00:00:00.000Z");
  assert.equal(exported.format, "bank-manager-balance-telemetry");
  assert.match(exported.privacy, /No player identity or device data/);
  assert.equal(exported.days.length, 1);
  assert.equal(exported.generatedAt, "2026-07-24T00:00:00.000Z");
  assert.equal(JSON.stringify(exported).includes("localStorage"), false);
});
