const test = require("node:test");
const assert = require("node:assert/strict");
const World = require("../js/world.js");
const Campaign = require("../js/campaign.js");

function bankFixture(overrides = {}) {
  return {
    cash: 1_000,
    deposits: 3_000,
    loansOut: 0,
    loanBook: [],
    debt: 1_000,
    debtPaymentAmount: 100,
    profit: 0,
    rep: 50,
    marketShare: 8,
    rivalShare: 16,
    day: 1,
    staff: [],
    dayMetrics: { eventCosts: 0 },
    ...overrides,
  };
}

test("legacy banks receive persistent world state defaults", () => {
  const bank = bankFixture();
  World.migrateWorld(bank);
  assert.equal(bank.world.location, "Silver Creek");
  assert.deepEqual(bank.world.activeConditions, []);
  assert.deepEqual(bank.world.history, []);
  assert.deepEqual(bank.world.resolvedEventIds, []);
});

test("conditions stack mechanical modifiers and expire by campaign day", () => {
  const bank = bankFixture();
  World.activateCondition(bank, "mine_slowdown", 2, "Mine closure");
  World.activateCondition(bank, "rate_match", 3, "Rival response");
  const modifiers = World.modifiers(bank);
  assert.equal(modifiers.depositAmount, 0.82 * 1.22);
  assert.equal(modifiers.missedPaymentChance, 1.45);
  assert.equal(modifiers.depositInterestCost, 1.65);
  assert.equal(modifiers.marketShareDaily, 0.06);

  assert.deepEqual(World.advanceConditions(bank), []);
  assert.equal(bank.world.activeConditions.find(condition => condition.id === "mine_slowdown").remainingDays, 1);
  assert.deepEqual(World.advanceConditions(bank), ["Mine Slowdown"]);
  assert.equal(bank.world.activeConditions.length, 1);
});

test("world choices charge visible costs and create auditable conditions", () => {
  const bank = bankFixture();
  const result = World.resolveWorldEvent(bank, "harvest_outlook", "back_merchants");
  assert.equal(result.kind, "good");
  assert.equal(bank.cash, 880);
  assert.equal(bank.profit, -120);
  assert.equal(bank.rep, 54);
  assert.equal(bank.dayMetrics.eventCosts, 120);
  assert.equal(bank.world.activeConditions[0].id, "harvest_boom");
  assert.equal(bank.world.history[0].eventId, "harvest_outlook");
});

test("staff incidents only enter the event pool after the first hire", () => {
  const withoutStaff = bankFixture();
  for (let index = 0; index < 20; index += 1) {
    assert.equal(World.selectWorldEvent(withoutStaff, () => index / 20).requiresStaff, undefined);
  }
  const withStaff = bankFixture({ staff: [{}] });
  const nonStaffIds = World.WORLD_EVENTS.filter(event => !event.requiresStaff).map(event => event.id);
  assert.equal(World.selectWorldEvent(withStaff, () => 0, nonStaffIds).requiresStaff, true);
  assert.equal(World.selectWorldEvent(withoutStaff, () => 0, ["harvest_outlook"]).id, "mine_closure");
});

test("event catalog spans replayable categories and staged arcs with valid mechanical choices", () => {
  assert.ok(World.WORLD_EVENTS.length >= 23);
  assert.ok(new Set(World.WORLD_EVENTS.map(event => event.id)).size === World.WORLD_EVENTS.length);
  assert.ok(new Set(World.WORLD_EVENTS.map(event => event.category)).size >= 5);
  for (const event of World.WORLD_EVENTS) {
    assert.equal(event.choices.length, 2, `${event.id} should present a tradeoff`);
    assert.equal(new Set(event.choices.map(choice => choice.id)).size, 2);
    for (const choice of event.choices) {
      assert.ok(choice.result && choice.kind);
      if (choice.condition) assert.ok(World.CONDITIONS[choice.condition], `${choice.condition} is undefined`);
    }
  }
  for (const id of ["timber_consortium", "harbor_bond_issue", "territorial_charter_bid"]) {
    const event = World.worldEventDefinition(id);
    assert.equal(event.once, true);
    assert.ok(event.choices.every(choice => choice.followUp));
  }
});

test("regional and campaign-stage eligibility keeps major stories contextual", () => {
  const early = bankFixture({ locationId: "silver_creek", prestigeLevel: 3, day: 30, campaign: { branches: [{}] } });
  World.migrateWorld(early);
  assert.equal(World.eventEligible(World.worldEventDefinition("drought_response"), early), false);
  assert.equal(World.eventEligible(World.worldEventDefinition("timber_consortium"), early), false);
  assert.equal(World.eventEligible(World.worldEventDefinition("territorial_charter_bid"), early), false);

  const ironwood = bankFixture({ locationId: "ironwood", prestigeLevel: 2, day: 18, campaign: { branches: [{}, {}] } });
  World.migrateWorld(ironwood);
  assert.equal(World.eventEligible(World.worldEventDefinition("timber_consortium"), ironwood), true);
  assert.equal(World.eventEligible(World.worldEventDefinition("harvest_outlook"), ironwood), false);
  assert.equal(World.eventEligible(World.worldEventDefinition("harbor_bond_issue"), ironwood), false);

  const regionalNetwork = bankFixture({ locationId: "red_mesa", prestigeLevel: 2, day: 18, campaign: { branches: [{}, {}, {}] } });
  World.migrateWorld(regionalNetwork);
  assert.equal(World.eventEligible(World.worldEventDefinition("territorial_charter_bid"), regionalNetwork), true);
});

test("late-game arcs schedule follow-ups, affect named rivals, and cannot repeat", () => {
  global.BankCampaign = Campaign;
  const bank = Campaign.migrateCampaign(bankFixture({
    cash: 8_000,
    locationId: "ironwood",
    prestigeLevel: 3,
    day: 20,
    stats: { customersServed: 40 },
  }));
  World.migrateWorld(bank);
  Campaign.openBranch(bank, "red_mesa", 500);
  assert.equal(World.eventEligible(World.worldEventDefinition("timber_consortium"), bank), true);
  const otherRootEvents = World.WORLD_EVENTS.filter(event => !event.followUpOnly && event.id !== "timber_consortium").map(event => event.id);
  assert.equal(World.selectWorldEvent(bank, () => 0, otherRootEvents).id, "timber_consortium");
  const beforeIron = bank.campaign.rivals.find(rival => rival.id === "iron_crown").shares.ironwood;
  const beforeContinental = bank.campaign.rivals.find(rival => rival.id === "continental").shares.ironwood || 0;
  const opening = World.resolveWorldEvent(bank, "timber_consortium", "underwrite_mills");
  assert.equal(opening.kind, "good");
  assert.equal(bank.campaign.rivals.find(rival => rival.id === "iron_crown").shares.ironwood, beforeIron - 0.2);
  assert.equal(bank.campaign.rivals.find(rival => rival.id === "continental").shares.ironwood || 0, beforeContinental);
  assert.deepEqual(World.pendingFollowUps(bank).map(pending => pending.eventId), ["timber_settlement"]);
  assert.equal(World.eventEligible(World.worldEventDefinition("timber_consortium"), bank), false);
  delete global.BankCampaign;
});

test("arc settlements can produce visible event income with a lasting tradeoff", () => {
  const bank = bankFixture({ cash: 900, day: 8 });
  World.scheduleFollowUp(bank, "timber_consortium", { eventId: "timber_settlement", delay: 1 });
  bank.day = 9;
  const result = World.resolveWorldEvent(bank, "timber_settlement", "liquidate_lumber");
  assert.equal(result.kind, "warn");
  assert.equal(bank.cash, 1_120);
  assert.equal(bank.profit, 220);
  assert.equal(bank.dayMetrics.eventIncome, 220);
  assert.equal(bank.world.activeConditions[0].id, "lumber_liquidation");
  assert.equal(World.pendingFollowUps(bank).length, 0);
});

test("major choices schedule visible delayed follow-up events", () => {
  const bank = bankFixture({ day: 3 });
  World.resolveWorldEvent(bank, "railway_depot", "subscribe_rail");
  assert.deepEqual(World.pendingFollowUps(bank).map(pending => ({ id: pending.eventId, due: pending.dueDay })), [
    { id: "railway_freight_contract", due: 6 },
  ]);
  bank.day = 5;
  assert.notEqual(World.selectWorldEvent(bank, () => 0).id, "railway_freight_contract");
  bank.day = 6;
  assert.equal(World.selectWorldEvent(bank, () => 0).id, "railway_freight_contract");
  assert.notEqual(World.selectWorldEvent(bank, () => 0).id, "railway_freight_contract", "a queued follow-up should not duplicate on the same day");
});

test("resolving a follow-up consumes it and applies its next consequence", () => {
  const bank = bankFixture({ day: 1 });
  World.resolveWorldEvent(bank, "bank_run_rumor", "publish_reserves");
  bank.day = 3;
  assert.equal(World.selectWorldEvent(bank, () => 0).id, "rumor_source_found");
  const result = World.resolveWorldEvent(bank, "rumor_source_found", "publish_evidence");
  assert.equal(result.kind, "good");
  assert.equal(World.pendingFollowUps(bank).length, 0);
  assert.ok(bank.world.activeConditions.some(condition => condition.id === "rival_exposed"));
  assert.equal(bank.world.history[0].eventId, "rumor_source_found");
});

test("unaffordable follow-up remains pending for a later recovery decision", () => {
  const bank = bankFixture({ cash: 100, day: 1 });
  World.resolveWorldEvent(bank, "railway_depot", "subscribe_rail");
  // The initial choice was unaffordable, so no chain starts.
  assert.equal(World.pendingFollowUps(bank).length, 0);
  bank.cash = 100;
  World.scheduleFollowUp(bank, "railway_depot", { eventId: "railway_freight_contract", delay: 1 });
  bank.day = 2;
  const blocked = World.resolveWorldEvent(bank, "railway_freight_contract", "finance_warehouses");
  assert.equal(blocked.kind, "warn");
  assert.equal(World.pendingFollowUps(bank).length, 1);
});

test("new economic events produce distinct auditable pressures", () => {
  const growthBank = bankFixture();
  const growth = World.resolveWorldEvent(growthBank, "railway_depot", "subscribe_rail");
  assert.equal(growth.kind, "good");
  assert.equal(growthBank.cash, 750);
  assert.equal(growthBank.marketShare, 8.35);
  assert.equal(growthBank.world.activeConditions[0].id, "rail_expansion");

  const stressBank = bankFixture();
  World.resolveWorldEvent(stressBank, "drought_response", "tighten_for_drought");
  const pressure = World.modifiers(stressBank);
  assert.equal(pressure.withdrawalAmount, 1.3);
  assert.equal(pressure.missedPaymentChance, 1.4);
});

test("emergency credit provides recoverable cash with explicit future cost", () => {
  const bank = bankFixture({ cash: 500, deposits: 5_000, day: 10 });
  const result = World.drawEmergencyCredit(bank);
  assert.equal(result.ok, true);
  assert.equal(bank.cash, 1_250);
  assert.equal(bank.debt, 1_900);
  assert.equal(bank.debtPaymentAmount, 125);
  assert.equal(bank.rep, 48);
  assert.equal(World.drawEmergencyCredit(bank).ok, false);
});

test("loan participation sales raise cash while recognizing a discount", () => {
  const bank = bankFixture({
    cash: 400,
    loansOut: 1_000,
    loanBook: [{
      balance: 1_000,
      originalPrincipal: 1_000,
      scheduledPayment: 100,
      principalPerPayment: 90,
      interestPerPayment: 10,
    }],
  });
  const result = World.sellLoanParticipation(bank);
  assert.equal(result.ok, true);
  assert.equal(result.principalSold, 250);
  assert.equal(result.proceeds, 230);
  assert.equal(result.loss, 20);
  assert.equal(bank.cash, 630);
  assert.equal(bank.loansOut, 750);
  assert.equal(bank.loanBook[0].scheduledPayment, 75);
  assert.equal(bank.dayMetrics.eventCosts, 20);
});
