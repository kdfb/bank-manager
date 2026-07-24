const test = require("node:test");
const assert = require("node:assert/strict");
const Market = require("../js/market.js");

function bankFixture(overrides = {}) {
  return {
    locationId: "silver_creek",
    prestigeLevel: 0,
    prestigeHistory: [],
    rep: 60,
    marketShare: 8,
    day: 1,
    stats: { customersServed: 0, segmentResults: {} },
    dayMetrics: { segmentResults: {} },
    ...overrides,
  };
}

test("Silver Creek demographics exclude customer tiers not yet unlocked", () => {
  const local = bankFixture({ prestigeLevel: 0 });
  assert.equal(Market.chooseSegment(local, () => 0.999).id, "miners");
  const trusted = bankFixture({ prestigeLevel: 1 });
  assert.equal(Market.chooseSegment(trusted, () => 0.999).id, "institutions");
  const county = bankFixture({ prestigeLevel: 2 });
  assert.equal(Market.chooseSegment(county, () => 0.999).id, "enterprises");
});

test("segment definitions produce distinct service needs and risk", () => {
  assert.equal(Market.chooseService(Market.SEGMENTS.households, () => 0.1), "account");
  assert.equal(Market.chooseService(Market.SEGMENTS.ranchers, () => 0.9), "loan");
  assert.equal(Market.chooseRisk(Market.SEGMENTS.miners, () => 0.9), "high");
  assert.equal(Market.chooseRisk(Market.SEGMENTS.institutions, () => 0.1), "low");
});

test("prestige requires service, standing, capital, and market share", () => {
  const bank = bankFixture({
    rep: 66,
    marketShare: 9.5,
    stats: { customersServed: 24, segmentResults: {} },
  });
  const promotions = Market.updatePrestige(bank, 1_800);
  assert.deepEqual(promotions.map(tier => tier.level), [1, 2]);
  assert.equal(bank.prestigeLevel, 2);
  assert.equal(bank.prestigeHistory[0].title, "County Bank");
  assert.equal(Market.SEGMENTS.enterprises.prestigeRequired, 2);
});

test("segment performance records served value and lost demand", () => {
  const bank = bankFixture();
  Market.recordSegmentOutcome(bank, "merchants", "served", 450);
  Market.recordSegmentOutcome(bank, "merchants", "lost", 0);
  assert.deepEqual(bank.stats.segmentResults.merchants, { served: 1, lost: 1, value: 450 });
  assert.deepEqual(bank.dayMetrics.segmentResults.merchants, { served: 1, lost: 1, value: 450 });
});

test("location and prestige modifiers expose economic tradeoffs", () => {
  const bank = bankFixture({ prestigeLevel: 3 });
  const location = Market.locationProfile(bank);
  assert.equal(location.label, "Silver Creek");
  assert.equal(location.crimeRisk, 1.1);
  assert.equal(location.growth, 1.05);
  assert.deepEqual(Market.prestigeModifiers(bank), {
    feeMultiplier: 1.1,
    depositMultiplier: 1.12,
    patienceBonus: 6,
  });
});

test("regional branch locations retain distinct demographics and economics", () => {
  const mesa = Market.locationProfile(bankFixture({ locationId: "red_mesa" }));
  const ironwood = Market.locationProfile(bankFixture({ locationId: "ironwood" }));
  const port = Market.locationProfile(bankFixture({ locationId: "port_mercy" }));
  assert.equal(mesa.label, "Red Mesa");
  assert.ok(mesa.demographics.ranchers > mesa.demographics.merchants);
  assert.ok(ironwood.crimeRisk < mesa.crimeRisk);
  assert.ok(port.rentMultiplier > ironwood.rentMultiplier);
  assert.ok(port.demographics.enterprises > mesa.demographics.enterprises);
});

test("legacy market state migrates without losing segment totals", () => {
  const bank = bankFixture({
    locationId: "unknown",
    prestigeLevel: 99,
    stats: { customersServed: 5, segmentResults: { households: { served: 3, lost: 1, value: 200 } } },
  });
  Market.migrateMarket(bank);
  assert.equal(bank.locationId, "silver_creek");
  assert.equal(bank.prestigeLevel, 3);
  assert.deepEqual(bank.stats.segmentResults.households, { served: 3, lost: 1, value: 200 });
  assert.deepEqual(bank.stats.segmentResults.enterprises, { served: 0, lost: 0, value: 0 });
});
