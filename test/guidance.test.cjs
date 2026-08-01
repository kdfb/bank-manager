const test = require("node:test");
const assert = require("node:assert/strict");
const Guidance = require("../js/guidance.js");

function bankFixture(overrides = {}) {
  return {
    day: 1,
    cash: 5_000,
    deposits: 3_000,
    loansOut: 0,
    loanBook: [],
    staff: [],
    upgrades: {},
    prestigeLevel: 0,
    stats: { customersServed: 0, loansApproved: 0 },
    campaign: { branches: [{ id: "hq" }] },
    ...overrides,
  };
}

test("new banks receive timed-shift contextual guidance", () => {
  const bank = bankFixture();
  assert.equal(Guidance.next(bank).id, "welcome");
  assert.match(Guidance.next(bank).body, /sixty seconds/i);
  Guidance.markSeen(bank, "welcome");
  assert.equal(Guidance.next(bank), null);
});

test("guidance stays focused on finance, staffing, and the loan book", () => {
  const bank = bankFixture({
    day: 5,
    loansOut: 400,
    loanBook: [{ id: "loan" }],
    prestigeLevel: 1,
    stats: { customersServed: 10, loansApproved: 1 },
    campaign: { branches: [{ id: "hq" }, { id: "mesa" }] },
  });
  const ids = Guidance.available(bank).map(tip => tip.id);
  assert.deepEqual(ids, ["liquidity", "staffing", "portfolio"]);
  assert.equal(Guidance.next(bank).id, "liquidity");
  Guidance.markSeen(bank, "liquidity");
  assert.equal(Guidance.next(bank).id, "staffing");
});

test("focused guidance never sends players to the retired build screen", () => {
  assert.ok(Guidance.TIPS.every(tip => tip.action !== "build"));
  const tip = Guidance.TIPS.find(entry => entry.id === "workstations");
  assert.equal(tip.action, "manage");
  assert.match(tip.body, /four focused improvements/i);
});

test("recovery guidance appears from either cash or reserve pressure", () => {
  assert.ok(Guidance.available(bankFixture({ day: 8, cash: 600 })).some(tip => tip.id === "recovery"));
  assert.ok(Guidance.available(bankFixture({ day: 8, cash: 400, deposits: 4_000 })).some(tip => tip.id === "recovery"));
});

test("legacy guidance state filters unknown ids and can be reset", () => {
  const bank = bankFixture({ guidance: { seen: ["welcome", "removed-tip", "welcome"], currentId: "removed-tip" } });
  assert.deepEqual(Guidance.migrate(bank), { seen: ["welcome"], currentId: null });
  Guidance.reset(bank);
  assert.deepEqual(Guidance.progress(bank), { seen: 0, total: Guidance.TIPS.length, available: 1 });
});
