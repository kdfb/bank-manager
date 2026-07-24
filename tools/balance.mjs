import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const Campaign = require("../js/campaign.js");
const World = require("../js/world.js");

export const STRATEGIES = Object.freeze({
  conservative: Object.freeze({ policy: "conservative", focus: "community", depositPricing: "margin", feePricing: "accessible" }),
  balanced: Object.freeze({ policy: "balanced", focus: "business", depositPricing: "market", feePricing: "standard" }),
  growth: Object.freeze({ policy: "growth", focus: "business", depositPricing: "attract", feePricing: "accessible" }),
});

function startingBank() {
  return Campaign.migrateCampaign({
    cash: 50_000,
    deposits: 3_000,
    loansOut: 1_000,
    loanBook: [],
    debt: 0,
    profit: 0,
    day: 1,
    locationId: "silver_creek",
    lendingPolicy: "balanced",
    prestigeLevel: 3,
    rep: 80,
    marketShare: 15,
    stats: { customersServed: 80 },
    dayMetrics: {},
  });
}

export function runStrategy(id, days = 120) {
  const strategy = STRATEGIES[id];
  if (!strategy) throw new Error(`Unknown strategy: ${id}`);
  const bank = startingBank();
  for (const regionId of ["red_mesa", "ironwood", "port_mercy"]) {
    const opened = Campaign.openBranch(bank, regionId, 2_000);
    if (!opened.ok) throw new Error(opened.reason);
    Campaign.setBranchPolicy(bank, opened.branch.id, strategy.policy);
    Campaign.setBranchFocus(bank, opened.branch.id, strategy.focus);
    Campaign.setBranchDepositPricing(bank, opened.branch.id, strategy.depositPricing);
    Campaign.setBranchFeePricing(bank, opened.branch.id, strategy.feePricing);
  }
  const initialCapital = Campaign.consolidatedNetCapital(bank);
  let totalDefaults = 0;
  let totalOriginations = 0;
  let totalDemand = 0;
  let minNetworkCash = Campaign.networkCash(bank);
  let profitableDays = 0;
  for (let day = 1; day <= days; day += 1) {
    bank.day = day;
    bank.dayMetrics = {};
    const result = Campaign.simulateNetworkDay(bank);
    totalDefaults += result.results.reduce((sum, branch) => sum + branch.defaults, 0);
    totalOriginations += result.results.reduce((sum, branch) => sum + branch.originations, 0);
    totalDemand += result.results.reduce((sum, branch) => sum + branch.demand, 0);
    if (result.profit > 0) profitableDays += 1;
    minNetworkCash = Math.min(minNetworkCash, Campaign.networkCash(bank));
  }
  const satellites = bank.campaign.branches.filter(branch => !branch.active);
  const finalCapital = Campaign.consolidatedNetCapital(bank);
  return {
    id,
    days,
    policy: strategy.policy,
    focus: strategy.focus,
    depositPricing: strategy.depositPricing,
    feePricing: strategy.feePricing,
    initialCapital,
    finalCapital,
    capitalGrowth: finalCapital - initialCapital,
    networkCash: Campaign.networkCash(bank),
    minNetworkCash,
    networkShare: Campaign.networkShare(bank),
    totalDefaults,
    totalOriginations,
    totalDemand: Math.round(totalDemand),
    profitableDayRate: profitableDays / days,
    profitableBranches: satellites.filter(branch => branch.cumulativeProfit > 0).length,
    branchCount: bank.campaign.branches.length,
    victory: Campaign.campaignStatus(bank, finalCapital).complete,
  };
}

export function runMatrix(days = 120) {
  const strategies = Object.keys(STRATEGIES).map(id => runStrategy(id, days));
  return {
    format: "bank-manager-balance-matrix",
    days,
    strategies,
    comparisons: {
      shareSpread: Math.max(...strategies.map(result => result.networkShare)) - Math.min(...strategies.map(result => result.networkShare)),
      capitalSpread: Math.max(...strategies.map(result => result.finalCapital)) - Math.min(...strategies.map(result => result.finalCapital)),
    },
    recovery: runRecoveryScenarios(),
  };
}

function stressedBank() {
  return {
    cash: 450, deposits: 4_000, loansOut: 1_600, debt: 1_000, debtPaymentAmount: 100,
    profit: 0, rep: 70, marketShare: 8, rivalShare: 16, day: 10, staff: [], dayMetrics: { eventCosts: 0 },
    loanBook: [{
      id: "stress-loan", balance: 1_600, originalPrincipal: 1_600, scheduledPayment: 160,
      principalPerPayment: 140, interestPerPayment: 20,
    }],
  };
}

export function runRecoveryScenarios() {
  const emergency = stressedBank();
  const emergencyCapitalBefore = emergency.cash + emergency.loansOut - emergency.deposits - emergency.debt;
  const emergencyResult = World.drawEmergencyCredit(emergency);
  const emergencyCapitalAfter = emergency.cash + emergency.loansOut - emergency.deposits - emergency.debt;
  const cooldownEnforced = !World.drawEmergencyCredit(emergency).ok;

  const participation = stressedBank();
  const participationCapitalBefore = participation.cash + participation.loansOut - participation.deposits - participation.debt;
  const participationResult = World.sellLoanParticipation(participation);
  const participationCapitalAfter = participation.cash + participation.loansOut - participation.deposits - participation.debt;
  return {
    emergencyCredit: {
      ok: emergencyResult.ok,
      cashBefore: 450,
      cashAfter: emergency.cash,
      debtAfter: emergency.debt,
      capitalCost: emergencyCapitalBefore - emergencyCapitalAfter,
      cooldownEnforced,
    },
    participationSale: {
      ok: participationResult.ok,
      cashBefore: 450,
      cashAfter: participation.cash,
      loansAfter: participation.loansOut,
      capitalCost: participationCapitalBefore - participationCapitalAfter,
    },
  };
}

function renderReport(matrix) {
  const money = value => `$${Math.round(value).toLocaleString("en-US")}`;
  const rows = matrix.strategies.map(result => [
    result.id.padEnd(12),
    money(result.capitalGrowth).padStart(12),
    `${result.networkShare.toFixed(1)}%`.padStart(9),
    money(result.totalDefaults).padStart(11),
    `${Math.round(result.profitableDayRate * 100)}%`.padStart(10),
    String(result.victory).padStart(8),
  ].join("  "));
  return [
    `Bank Manager deterministic balance matrix · ${matrix.days} days`,
    "Strategy       Capital gain      Share     Defaults  Profitable  Victory",
    ...rows,
  ].join("\n");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const requestedDays = Number(process.argv.find(argument => argument.startsWith("--days="))?.split("=")[1]) || 120;
  const matrix = runMatrix(Math.max(30, Math.min(365, Math.floor(requestedDays))));
  console.log(process.argv.includes("--json") ? JSON.stringify(matrix) : renderReport(matrix));
}
