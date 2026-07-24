const test = require("node:test");
const assert = require("node:assert/strict");
const Campaign = require("../js/campaign.js");

function bankFixture(overrides = {}) {
  return Campaign.migrateCampaign({
    cash: 8_000, deposits: 3_000, loansOut: 1_000, debt: 500, profit: 0,
    day: 12, locationId: "silver_creek", lendingPolicy: "balanced",
    prestigeLevel: 2, rep: 70, marketShare: 12,
    stats: { customersServed: 30 }, dayMetrics: {},
    ...overrides,
  });
}

test("legacy banks receive one active headquarters", () => {
  const bank = bankFixture();
  assert.equal(bank.campaign.branches.length, 1);
  assert.equal(bank.campaign.branches[0].active, true);
  assert.equal(bank.branchAssets, 0);
});

test("opening and funding a branch preserve transferred capital in consolidated equity", () => {
  const bank = bankFixture();
  const beforeCapital = Campaign.consolidatedNetCapital(bank);
  const opened = Campaign.openBranch(bank, "red_mesa", 500);
  assert.equal(opened.ok, true);
  assert.equal(Campaign.consolidatedNetCapital(bank), beforeCapital - Campaign.REGIONS.red_mesa.setupCost);
  const beforeTransfer = Campaign.consolidatedNetCapital(bank);
  assert.equal(Campaign.transferCapital(bank, opened.branch.id, 250).ok, true);
  assert.equal(Campaign.consolidatedNetCapital(bank), beforeTransfer);
});

test("off-screen simulation is deterministic and reconciles branch equity with profit", () => {
  const first = bankFixture();
  const second = bankFixture();
  Campaign.openBranch(first, "red_mesa", 750);
  Campaign.openBranch(second, "red_mesa", 750);
  const firstBefore = first.branchAssets;
  const resultA = Campaign.simulateNetworkDay(first);
  const resultB = Campaign.simulateNetworkDay(second);
  assert.deepEqual(resultA.results, resultB.results);
  assert.equal(first.branchAssets - firstBefore, resultA.profit);
});

test("branch policy changes loan demand and expected loss", () => {
  const conservative = bankFixture();
  const growth = bankFixture();
  const a = Campaign.openBranch(conservative, "red_mesa", 1_000).branch;
  const b = Campaign.openBranch(growth, "red_mesa", 1_000).branch;
  a.loans = b.loans = 5_000;
  Campaign.syncBranchAssets(conservative);
  Campaign.syncBranchAssets(growth);
  Campaign.setBranchPolicy(conservative, a.id, "conservative");
  Campaign.setBranchPolicy(growth, b.id, "growth");
  const conservativeDay = Campaign.simulateNetworkDay(conservative).results[0];
  const growthDay = Campaign.simulateNetworkDay(growth).results[0];
  assert.ok(growthDay.originations > conservativeDay.originations);
  assert.ok(growthDay.defaults > conservativeDay.defaults);
});

test("deposit and fee pricing expose independent growth and margin tradeoffs", () => {
  const base = bankFixture();
  const highRate = Campaign.openBranch(base, "red_mesa", 1_000).branch;
  highRate.deposits = 20_000;
  Campaign.setBranchDepositPricing(base, highRate.id, "attract");
  Campaign.setBranchFeePricing(base, highRate.id, "standard");

  const marginBank = bankFixture();
  const lowRate = Campaign.openBranch(marginBank, "red_mesa", 1_000).branch;
  lowRate.deposits = 20_000;
  Campaign.setBranchDepositPricing(marginBank, lowRate.id, "margin");
  Campaign.setBranchFeePricing(marginBank, lowRate.id, "standard");

  const highRateBranch = Campaign.regionBranch(base, "red_mesa");
  const lowRateBranch = Campaign.regionBranch(marginBank, "red_mesa");
  highRateBranch.deposits = 20_000;
  lowRateBranch.deposits = 20_000;
  const highRateDay = Campaign.simulateBranchDay(highRateBranch, 20);
  const lowRateDay = Campaign.simulateBranchDay(lowRateBranch, 20);
  assert.ok(highRateDay.newDeposits > lowRateDay.newDeposits);
  assert.ok(highRateDay.depositInterest > lowRateDay.depositInterest);
  assert.ok(highRateBranch.marketShare > lowRateBranch.marketShare);

  const premiumBank = bankFixture();
  const premium = Campaign.openBranch(premiumBank, "red_mesa", 1_000).branch;
  Campaign.setBranchFeePricing(premiumBank, premium.id, "premium");
  const accessibleBank = bankFixture();
  const accessible = Campaign.openBranch(accessibleBank, "red_mesa", 1_000).branch;
  Campaign.setBranchFeePricing(accessibleBank, accessible.id, "accessible");
  const premiumBranch = Campaign.regionBranch(premiumBank, "red_mesa");
  const accessibleBranch = Campaign.regionBranch(accessibleBank, "red_mesa");
  const premiumDay = Campaign.simulateBranchDay(premiumBranch, 20);
  const accessibleDay = Campaign.simulateBranchDay(accessibleBranch, 20);
  assert.ok(premiumDay.fees > accessibleDay.fees);
  assert.ok(premiumDay.demand < accessibleDay.demand);
  assert.ok(premiumBranch.marketShare < accessibleBranch.marketShare);
});

test("pricing policy definitions combine into transparent active-branch effects", () => {
  const bank = bankFixture({ depositPricing: "attract", feePricing: "premium" });
  const effects = Campaign.activePricingEffects(bank);
  assert.equal(effects.depositDemand, 1.28);
  assert.equal(effects.depositInterestCost, 1.65);
  assert.equal(effects.feeMultiplier, 1.5);
  assert.equal(effects.customerDemand, 1.06 * 0.82);
  assert.equal(effects.marketShareDaily, 0);
});

test("campaign status advances into regional expansion goals", () => {
  const bank = bankFixture({ prestigeLevel: 2, marketShare: 12 });
  const status = Campaign.campaignStatus(bank, Campaign.consolidatedNetCapital(bank));
  assert.equal(status.current.id, "network");
  const opened = Campaign.openBranch(bank, "red_mesa", 500).branch;
  assert.equal(Campaign.campaignStatus(bank, Campaign.consolidatedNetCapital(bank)).current.id, "network");
  bank.campaign.branches.find(branch => branch.id === opened.id).marketShare = 12;
  assert.equal(Campaign.campaignStatus(bank, Campaign.consolidatedNetCapital(bank)).current.id, "territory");
});

test("legacy campaigns receive three persistent rivals with regional footprints", () => {
  const bank = bankFixture();
  assert.deepEqual(bank.campaign.rivals.map(rival => rival.id), ["continental", "pioneer", "iron_crown"]);
  assert.equal(Campaign.regionalCompetition(bank, "silver_creek").rivals[0].name, "Continental Trust");
  assert.equal(bank.campaign.rivals.find(rival => rival.id === "iron_crown").shares.ironwood, 21);
});

test("rival campaigns target a player branch and reduce local share deterministically", () => {
  const bank = bankFixture({ day: 3, marketShare: 12 });
  const before = bank.marketShare;
  const result = Campaign.simulateRivalDay(bank);
  assert.ok(result.actions.some(action => action.regionId === "silver_creek" && action.playerLoss > 0));
  assert.ok(bank.marketShare < before);
  assert.equal(bank.dayMetrics.rivalActions, undefined);
});

test("strategic events can move a named rival's regional share", () => {
  const bank = bankFixture();
  const before = Campaign.regionalCompetition(bank, "silver_creek").rivals.find(rival => rival.id === "continental").share;
  Campaign.adjustRivalShare(bank, "continental", "silver_creek", 0.35);
  const after = Campaign.regionalCompetition(bank, "silver_creek").rivals.find(rival => rival.id === "continental").share;
  assert.equal(after, before + 0.35);
  assert.equal(bank.rivalShare, after);
});

test("rivals expand across the map during a deterministic long campaign", () => {
  const first = bankFixture({ day: 1 });
  const second = bankFixture({ day: 1 });
  for (let day = 1; day <= 45; day += 1) {
    first.day = second.day = day;
    Campaign.simulateRivalDay(first);
    Campaign.simulateRivalDay(second);
  }
  assert.deepEqual(first.campaign.rivals, second.campaign.rivals);
  assert.deepEqual(first.campaign.rivalHistory, second.campaign.rivalHistory);
  assert.ok(first.campaign.rivalHistory.some(action => action.type === "expansion"));
  assert.ok(first.campaign.rivals.every(rival => rival.openedRegions.length >= 3));
  assert.ok(first.campaign.rivals.every(rival => Object.values(rival.shares).every(share => share >= 0 && share <= 55)));
});

test("a well-run conservative network can beat the territory goal over a long campaign", () => {
  const bank = bankFixture({ cash: 50_000, prestigeLevel: 3, rep: 80, marketShare: 15, debt: 0 });
  for (const regionId of ["red_mesa", "ironwood", "port_mercy"]) {
    const opened = Campaign.openBranch(bank, regionId, 2_000).branch;
    Campaign.setBranchPolicy(bank, opened.id, "conservative");
    Campaign.setBranchFocus(bank, opened.id, "community");
  }
  for (let day = 1; day <= 200; day += 1) {
    bank.day = day;
    bank.dayMetrics = {};
    Campaign.simulateNetworkDay(bank);
  }
  const satellites = bank.campaign.branches.filter(branch => !branch.active);
  assert.ok(Campaign.networkShare(bank) >= 14);
  assert.ok(satellites.every(branch => branch.cumulativeProfit > 0));
  assert.ok(Campaign.consolidatedNetCapital(bank) > 50_000 - bank.deposits);
});

test("a completed campaign produces a deterministic narrative legacy summary", () => {
  const bank = bankFixture({ cash: 50_000, prestigeLevel: 3, rep: 82, marketShare: 19, debt: 0 });
  for (const regionId of ["red_mesa", "ironwood", "port_mercy"]) {
    const branch = Campaign.openBranch(bank, regionId, 2_000).branch;
    branch.cumulativeProfit = 500;
    branch.marketShare = 18;
    Campaign.setBranchPolicy(bank, branch.id, "conservative");
    Campaign.setBranchFocus(bank, branch.id, "community");
  }
  bank.stats.worldEventsResolved = 12;
  Campaign.updateProgress(bank, Campaign.consolidatedNetCapital(bank));
  const summary = Campaign.legacySummary(bank, Campaign.consolidatedNetCapital(bank));
  assert.equal(summary.title, "Steward of the Frontier");
  assert.equal(summary.dominantFocus, "Community");
  assert.equal(summary.dominantPolicy, "Conservative");
  assert.equal(summary.metrics.branches, 4);
  assert.equal(summary.metrics.strategicDecisions, 12);
  assert.equal(summary.branches.length, 4);
  assert.equal(summary.leadingRival.name, "Continental Trust");
});

test("legacy summary remains unavailable until every campaign goal is met", () => {
  const bank = bankFixture();
  assert.equal(Campaign.legacySummary(bank, Campaign.consolidatedNetCapital(bank)), null);
  assert.equal(bank.campaign.victoryAcknowledged, false);
});

test("switching direct control preserves consolidated capital and local branch state", () => {
  const bank = bankFixture({
    cash: 10_000,
    loansOut: 600,
    loanBook: [{ id: "hq-loan", balance: 600, scheduledPayment: 30 }],
    staff: [{ id: "mara-chen", dailyWage: 20, assignment: "counter", level: 2 }],
    upgrades: { lobby: 1 },
  });
  const opened = Campaign.openBranch(bank, "red_mesa", 1_000).branch;
  opened.loans = 750;
  opened.deposits = 300;
  opened.cash = 900;
  Campaign.setBranchDepositPricing(bank, opened.id, "attract");
  Campaign.setBranchFeePricing(bank, opened.id, "premium");
  Campaign.syncBranchAssets(bank);
  const hqCash = bank.cash;
  const before = Campaign.consolidatedNetCapital(bank);
  assert.equal(Campaign.scheduleBranchVisit(bank, opened.id).ok, true);
  const outbound = Campaign.activateScheduledBranch(bank, { objects: [{ id: "hq-desk" }], player: { x: 1, y: 2 } });
  assert.equal(outbound.ok, true);
  assert.equal(outbound.capitalDelta, 0);
  assert.equal(bank.locationId, "red_mesa");
  assert.equal(bank.loansOut, 750);
  assert.equal(bank.loanBook.length, 1);
  assert.deepEqual(bank.staff, []);
  assert.equal(bank.depositPricing, "attract");
  assert.equal(bank.feePricing, "premium");

  bank.staff = [{ id: "isaac-turner", dailyWage: 32, assignment: "loans", level: 1 }];
  bank.upgrades = { risk_desk: 1 };
  const hq = bank.campaign.branches.find(branch => branch.id === "silver-creek-hq");
  assert.equal(Campaign.scheduleBranchVisit(bank, hq.id).ok, true);
  const returning = Campaign.activateScheduledBranch(bank, { objects: [{ id: "mesa-desk" }], player: { x: 4, y: 5 } });
  assert.equal(returning.ok, true);
  assert.ok(Math.abs(Campaign.consolidatedNetCapital(bank) - before) < 0.001);
  assert.equal(bank.locationId, "silver_creek");
  assert.equal(bank.cash, hqCash);
  assert.equal(bank.staff[0].id, "mara-chen");
  assert.equal(bank.upgrades.lobby, 1);
  assert.equal(returning.localState.objects[0].id, "hq-desk");
  const mesa = bank.campaign.branches.find(branch => branch.regionId === "red_mesa");
  assert.equal(mesa.localState.objects[0].id, "mesa-desk");
  assert.equal(mesa.staff[0].id, "isaac-turner");
  assert.equal(mesa.depositPricing, "attract");
  assert.equal(mesa.feePricing, "premium");
});

test("network liquidity covers a visited branch shortfall without changing capital", () => {
  const bank = bankFixture({ cash: 8_000 });
  const opened = Campaign.openBranch(bank, "red_mesa", 500).branch;
  Campaign.scheduleBranchVisit(bank, opened.id);
  Campaign.activateScheduledBranch(bank, null);
  bank.cash = -125;
  const before = Campaign.consolidatedNetCapital(bank);
  const covered = Campaign.coverActiveShortfall(bank);
  assert.equal(covered.ok, true);
  assert.equal(bank.cash, 0);
  assert.ok(Math.abs(Campaign.consolidatedNetCapital(bank) - before) < 0.001);
  const available = Campaign.networkCash(bank);
  assert.equal(Campaign.withdrawNetworkCash(bank, 100).ok, true);
  assert.equal(Campaign.networkCash(bank), available - 100);
});

test("an uncovered branch deficit remains visible instead of creating capital", () => {
  const bank = bankFixture({ cash: 500 });
  bank.cash = -2_000;
  const before = Campaign.consolidatedNetCapital(bank);
  const covered = Campaign.coverActiveShortfall(bank);
  assert.equal(covered.ok, false);
  assert.ok(bank.cash < 0);
  assert.ok(Math.abs(Campaign.consolidatedNetCapital(bank) - before) < 0.001);
});
