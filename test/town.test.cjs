const test = require("node:test");
const assert = require("node:assert/strict");
const Town = require("../js/town.js");

function bankFixture(overrides = {}) {
  return {
    day: 1,
    stats: { loansApproved: 0, loansDenied: 0, customersServed: 0 },
    community: { relationships: {} },
    ...overrides,
  };
}

test("the Silver Creek arc reveals three authored decisions across seven days", () => {
  const bank = bankFixture({ day: 3 });
  assert.equal(Town.nextMoment(bank), null);
  bank.day = 4;
  assert.equal(Town.nextMoment(bank).id, "mill-survey");
  Town.recordChoice(bank, "mill-survey", "survey");
  assert.equal(Town.nextMoment(bank), null);
  bank.day = 6;
  assert.equal(Town.nextMoment(bank).id, "supplier-note");
  Town.recordChoice(bank, "supplier-note", "bridge");
  bank.day = 7;
  assert.equal(Town.nextMoment(bank).id, "mill-finale");
});

test("town choices migrate idempotently and ignore unknown legacy data", () => {
  const bank = bankFixture({
    town: {
      choices: [
        { id: "mill-survey", choice: "survey", day: 4 },
        { id: "mill-survey", choice: "self-fund", day: 5 },
        { id: "unknown", choice: "noise", day: 2 },
      ],
    },
  });
  Town.migrate(bank);
  assert.deepEqual(bank.town.choices, [{ id: "mill-survey", choice: "survey", day: 4 }]);
  Town.migrate(bank);
  assert.equal(bank.town.choices.length, 1);
});

test("the ending reflects both the mill outcome and the bank's operating identity", () => {
  const bank = bankFixture({
    day: 7,
    stats: { loansApproved: 5, loansDenied: 0, customersServed: 26 },
    community: { relationships: { carmen: { visits: 3, trust: 4 }, elena: { visits: 3, trust: 4 }, samir: { visits: 2, trust: 3 } } },
  });
  Town.recordChoice(bank, "mill-survey", "survey");
  Town.recordChoice(bank, "supplier-note", "bridge");
  Town.complete(bank, "cooperative");
  const summary = Town.summary(bank, 2_450);
  assert.equal(summary.identity.id, "neighbor");
  assert.equal(summary.outcome, "cooperative");
  assert.match(summary.headline, /cooperative mill/i);
  assert.equal(summary.metrics.knownCustomers, 3);
});

test("a guarded lending pattern earns the careful steward identity", () => {
  const bank = bankFixture({ day: 7, stats: { loansApproved: 1, loansDenied: 4, customersServed: 20 } });
  Town.recordChoice(bank, "mill-survey", "self-fund");
  Town.recordChoice(bank, "supplier-note", "collateral");
  Town.complete(bank, "repair");
  assert.equal(Town.identity(bank).id, "steward");
});
