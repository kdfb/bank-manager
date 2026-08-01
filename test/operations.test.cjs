const test = require("node:test");
const assert = require("node:assert/strict");
const Operations = require("../js/operations.js");

function bankFixture(overrides = {}) {
  return {
    staff: [],
    upgrades: {},
    stats: { customersServed: 0 },
    ...overrides,
  };
}

test("waiting-area upgrades extend customer patience", () => {
  assert.equal(Operations.patienceSeconds(bankFixture()), 60);
  assert.equal(Operations.patienceSeconds(bankFixture({ upgrades: { lobby: 2 } })), 84);
});

test("a timed shift begins with a seven-customer service goal", () => {
  assert.equal(Operations.dailyServiceGoal(bankFixture({ day: 1 })), 7);
  assert.equal(Operations.dailyServiceGoal(bankFixture({ day: 7 })), 10);
});

test("queue health reports wait pressure and at-risk customers", () => {
  const bank = bankFixture();
  const customers = [
    { arrivedAt: 0, state: "ready" },
    { arrivedAt: 20_000, state: "queued" },
    { arrivedAt: 1_000, state: "leaving" },
  ];
  const health = Operations.queueHealth(customers, 50_000, bank);
  assert.equal(health.count, 2);
  assert.equal(health.longestWait, 50);
  assert.equal(health.atRisk, 1);
});

test("strategic decisions are tracked separately from the customer queue", () => {
  const bank = bankFixture();
  const health = Operations.queueHealth([
    { arrivedAt: 0, state: "ready", event: { isNarrative: true } },
    { arrivedAt: 10_000, state: "queued", event: {} },
  ], 20_000, bank);
  assert.equal(health.count, 1);
  assert.equal(health.narratives, 1);
  assert.equal(health.longestWait, 10);
});

test("workstations cap active staff while a second teller improves throughput", () => {
  const staff = [
    Operations.normalizeStaffMember({ id: "mara-chen", assignment: "counter" }),
    Operations.normalizeStaffMember({ id: "clara-reyes", assignment: "counter" }),
  ];
  const oneWindow = bankFixture({ staff });
  assert.equal(Operations.activeStaff(oneWindow, "counter").length, 1);
  assert.equal(Operations.serviceIntervalMs(oneWindow), 3_100);

  const twoWindows = bankFixture({ staff, upgrades: { teller_window: 1 } });
  assert.equal(Operations.activeStaff(twoWindows, "counter").length, 2);
  assert.ok(Operations.serviceIntervalMs(twoWindows) < Operations.serviceIntervalMs(oneWindow));
});

test("specialists only handle matching work at an available station", () => {
  const bank = bankFixture({
    staff: [
      Operations.normalizeStaffMember({ id: "mara-chen" }),
      Operations.normalizeStaffMember({ id: "isaac-turner" }),
    ],
  });
  assert.equal(Operations.selectStaffForEvent(bank, "Deposit Proposal").id, "mara-chen");
  assert.equal(Operations.selectStaffForEvent(bank, "Credit Application"), null);

  bank.upgrades.risk_desk = 1;
  assert.equal(Operations.selectStaffForEvent(bank, "Credit Application").id, "isaac-turner");
});

test("delegation removes routine repetition but preserves human decisions", () => {
  const bank = bankFixture({
    staff: [Operations.normalizeStaffMember({ id: "mara-chen" })],
  });
  assert.equal(Operations.selectStaffForEvent(bank, "Deposit Proposal").id, "mara-chen");
  assert.equal(Operations.selectStaffForEvent(bank, "Customer Follow-up"), null);
  assert.equal(Operations.selectStaffForEvent(bank, "Credit Application"), null);
  const normal = Operations.serviceIntervalMs(bank, "Deposit Proposal");
  bank.upgrades.teller_window = 1;
  assert.ok(Operations.serviceIntervalMs(bank, "Deposit Proposal") < normal);
});

test("legacy employees migrate to assigned, trainable roster members", () => {
  const bank = bankFixture({ staff: [{ id: "mara-chen", name: "Mara Chen", dailyWage: 30 }] });
  Operations.migrateRoster(bank);
  assert.equal(bank.staff[0].assignment, "counter");
  assert.equal(bank.staff[0].level, 1);
  assert.equal(Operations.trainingCost(bank.staff[0]), 250);
  bank.staff[0].level = 3;
  assert.equal(Operations.trainingCost(bank.staff[0]), 0);
});

test("branch objectives advance through the operator-to-manager path", () => {
  assert.equal(Operations.currentObjective(bankFixture(), 1_000).step, 1);
  assert.equal(Operations.currentObjective(bankFixture({ stats: { customersServed: 7 } }), 1_000).step, 2);
  assert.equal(Operations.currentObjective(bankFixture({ stats: { customersServed: 7 } }), 1_200).step, 3);
  assert.equal(Operations.currentObjective(bankFixture({
    stats: { customersServed: 14 },
  }), 1_200).step, 4);
  assert.equal(Operations.currentObjective(bankFixture({
    stats: { customersServed: 14 },
    staff: [Operations.normalizeStaffMember({ id: "mara-chen" })],
  }), 1_200).step, 5);
  assert.equal(Operations.currentObjective(bankFixture({
    stats: { customersServed: 14 },
    staff: [Operations.normalizeStaffMember({ id: "mara-chen" })],
    upgrades: { lobby: 1 },
  }), 1_200).step, 6);
  assert.equal(Operations.currentObjective(bankFixture({
    stats: { customersServed: 14 },
    staff: [Operations.normalizeStaffMember({ id: "mara-chen" })],
    upgrades: { lobby: 1 },
    town: { choices: [{ id: "mill-survey", choice: "survey" }], outcome: "cooperative" },
  }), 1_200).complete, true);
});

test("management systems unlock in a teller-to-executive sequence", () => {
  const teller = Operations.featureAvailability(bankFixture({
    day: 1, cash: 5_000, deposits: 3_000, prestigeLevel: 0,
  }));
  assert.equal(teller.stage, "Teller");
  assert.equal(teller.staffing, false);
  assert.equal(teller.building, false);
  assert.equal(teller.credit, false);
  assert.equal(teller.pricing, false);
  assert.equal(teller.regional, false);

  const operator = Operations.featureAvailability(bankFixture({
    day: 2, cash: 5_000, deposits: 3_000, prestigeLevel: 0,
    stats: { customersServed: 10, loansApproved: 1 },
  }));
  assert.equal(operator.stage, "Operator");
  assert.equal(operator.staffing, true);
  assert.equal(operator.building, true);
  assert.equal(operator.credit, true);
  assert.equal(operator.pricing, false);

  const executive = Operations.featureAvailability(bankFixture({
    day: 6, cash: 5_000, deposits: 3_000, prestigeLevel: 1,
    stats: { customersServed: 12 }, staff: [{ id: "mara-chen" }],
    campaign: { branches: [{}, {}] },
  }));
  assert.equal(executive.stage, "Executive");
  assert.equal(executive.market, true);
  assert.equal(executive.world, true);
  assert.equal(executive.pricing, true);
  assert.equal(executive.regional, true);
});

test("liquidity recovery appears from cash or reserve pressure", () => {
  assert.equal(Operations.featureAvailability(bankFixture({ cash: 700, deposits: 0 })).recovery, true);
  assert.equal(Operations.featureAvailability(bankFixture({ cash: 1_000, deposits: 10_000 })).recovery, true);
  assert.equal(Operations.featureAvailability(bankFixture({ cash: 5_000, deposits: 3_000 })).recovery, false);
});
