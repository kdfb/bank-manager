const test = require("node:test");
const assert = require("node:assert/strict");
const Economy = require("../js/economy.js");

function bankFixture(overrides = {}) {
  return {
    cash: 5_000,
    loansOut: 1_500,
    deposits: 3_000,
    debt: 1_000,
    profit: 0,
    day: 1,
    staff: [],
    stats: {},
    ...overrides,
  };
}

test("net worth includes deposits and external debt as liabilities", () => {
  assert.equal(Economy.totalAssets(bankFixture()), 6_500);
  assert.equal(Economy.netWorth(bankFixture()), 2_500);
});

test("lending policies enforce risk appetite and liquidity", () => {
  assert.equal(Economy.canPolicyApproveLoan("conservative", "medium", 500, 100), false);
  assert.equal(Economy.canPolicyApproveLoan("balanced", "medium", 500, 100), true);
  assert.equal(Economy.canPolicyApproveLoan("growth", "high", 50, 100), false);
});

test("transaction fees update cash, profit, and the daily ledger", () => {
  const bank = bankFixture();
  Economy.resetDayMetrics(bank);
  Economy.applyTransactionFee(bank, 12, "accountFees");
  assert.equal(bank.cash, 5_012);
  assert.equal(bank.profit, 12);
  assert.equal(bank.dayMetrics.fees, 12);
  assert.equal(bank.dayMetrics.accountFees, 12);
});

test("staff payroll and debt schedule are derived from reusable state", () => {
  const bank = bankFixture({
    day: 6,
    staff: [{ dailyWage: 30 }, { dailyWage: 45 }],
    debtPaymentInterval: 7,
    debtPaymentAmount: 100,
  });
  assert.equal(Economy.dailyStaffCost(bank), 75);
  assert.deepEqual(Economy.nextDebtPayment(bank), { dueInDays: 2, amount: 100 });
});

test("legacy saves receive all vertical-slice defaults", () => {
  const migrated = Economy.migrateBank({ cash: 100, loansOut: 0, deposits: 0, day: 1, stats: {} });
  assert.equal(migrated.lendingPolicy, "balanced");
  assert.equal(migrated.debt, 1_000);
  assert.deepEqual(migrated.staff, []);
  assert.equal(migrated.dayMetrics.fees, 0);
  assert.equal(migrated.depositPricing, "market");
  assert.equal(migrated.feePricing, "standard");
  assert.equal(migrated.phase, "operating");
});

test("report-phase saves retain the data needed to resume safely", () => {
  const report = { fees: 12, dayDelta: -20 };
  const migrated = Economy.migrateBank(bankFixture({ phase: "report", lastReport: report }));
  assert.equal(migrated.phase, "report");
  assert.equal(migrated.lastReport, report);
});
