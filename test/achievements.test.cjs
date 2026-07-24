const test = require("node:test");
const assert = require("node:assert/strict");
const Achievements = require("../js/achievements.js");

function bankFixture(overrides = {}) {
  return {
    day: 1,
    debt: 1_000,
    prestigeLevel: 0,
    staff: [],
    upgrades: {},
    stats: { customersServed: 0, loansApproved: 0, staffServed: 0 },
    campaign: { branches: [{ id: "hq" }] },
    ...overrides,
  };
}

test("achievement migration keeps known unlocks and rejects unknown identifiers", () => {
  const bank = bankFixture({ achievements: { unlocked: { FIRST_DAY: { day: 3 }, MADE_UP: { day: 2 } } } });
  assert.deepEqual(Achievements.migrate(bank), { unlocked: { FIRST_DAY: { day: 3 } } });
});

test("achievement synchronization unlocks met conditions exactly once", () => {
  const bank = bankFixture({
    day: 2,
    debt: 0,
    prestigeLevel: 2,
    staff: [{ id: "teller" }],
    upgrades: { lobby: 1, vault_upgrade: 2 },
    stats: { customersServed: 12, loansApproved: 1, staffServed: 10 },
    campaign: { branches: [{ id: "hq" }, { id: "mesa" }] },
  });
  const first = Achievements.sync(bank, { campaignComplete: false });
  assert.deepEqual(first.map(entry => entry.id), [
    "FIRST_DAY", "FIRST_CUSTOMER", "FIRST_LOAN", "FIRST_HIRE", "DELEGATION",
    "FURNISHED_BRANCH", "COUNTY_BANK", "BRANCH_NETWORK", "DEBT_FREE",
  ]);
  assert.deepEqual(Achievements.sync(bank, { campaignComplete: false }), []);
  assert.equal(Achievements.sync(bank, { campaignComplete: true })[0].id, "BANKING_LEGACY");
  assert.equal(Achievements.summary(bank).complete, true);
});

test("rich presence summarizes campaign, branch count, and prestige without platform dependencies", () => {
  const bank = bankFixture({ day: 18, campaign: { branches: [{}, {}, {}] } });
  assert.deepEqual(Achievements.presence(bank, {
    locationLabel: "Ironwood",
    prestigeTitle: "County Bank",
    campaignTitle: "Command the territory",
    campaignComplete: false,
  }), {
    state: "Managing 3 regional branches",
    details: "Day 18 · County Bank · Command the territory",
    day: 18,
    branchCount: 3,
    campaignComplete: false,
  });
});
