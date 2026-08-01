const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const source = readFileSync(join(root, "js", "events.js"), "utf8");

function focusedEventRuntime() {
  const bank = {
    day: 1,
    cash: 5_000,
    loansOut: 0,
    loanBook: [],
    rep: 60,
    upgrades: {},
    stats: { loansApproved: 0, loansDenied: 0, totalIssued: 0 },
  };
  const context = vm.createContext({
    bank,
    queue: [],
    Math,
    fmt: value => `$${Math.round(value).toLocaleString("en-US")}`,
    randInt: () => 50,
    pick: values => values[0],
    BankWorld: { modifiers: () => ({ loanAmount: 1 }) },
    BankPortfolio: {
      riskProfile: risk => ({ expectedLossRate: risk === "high" ? 0.24 : risk === "medium" ? 0.08 : 0.015 }),
      createLoan: loan => loan,
    },
    BankMarket: {
      customerProfile: () => null,
      prestigeModifiers: () => ({ feeMultiplier: 1, depositMultiplier: 1 }),
    },
    BankCampaign: { activePricingEffects: () => ({ feeMultiplier: 1, depositDemand: 1 }) },
    BankEconomy: { applyTransactionFee: (target, amount) => { target.cash += amount; return amount; } },
    BankCommunity: {
      relationship: () => ({ visits: 0, isReturning: false, text: "First visit to your counter" }),
      record: () => ({}),
      scheduleLoanFollowUp: () => ({}),
    },
  });
  vm.runInContext(`${source}\nthis.makeLoanEventForTest = makeLoanEvent;`, context);
  return context;
}

test("authored opening loans become person-first service files", () => {
  const runtime = focusedEventRuntime();
  const event = runtime.makeLoanEventForTest({
    id: "ranchers",
    label: "Ranchers & Farms",
    icon: "farm",
    name: "Elena Ivanova",
    organization: "Green Valley Farm",
    communityId: "elena",
    purpose: "winter feed before the first snow",
    amountMultiplier: 1,
    amount: 700,
    termMonths: 12,
    risk: "medium",
  });

  assert.equal(event.title, "Elena Ivanova");
  assert.match(event.story, /Elena Ivanova of Green Valley Farm/);
  assert.equal(event.amount, 700);
  assert.equal(event.single, true);
  assert.equal(event.choicePreview, undefined);
  assert.equal(event.onDeny, undefined);
  const result = event.onApprove({ id: "perfect" });
  assert.match(result.msg, /terms prepared/i);
  assert.equal(runtime.bank.loanBook[0].principal, 700);
  assert.equal(runtime.bank.loanBook[0].reviewed, true);
});

test("service quality changes loan underwriting without an approve-deny branch", () => {
  const runtime = focusedEventRuntime();
  const event = runtime.makeLoanEventForTest({
    id: "miners",
    label: "Miners",
    icon: "pick",
    name: "Liam Nkosi",
    organization: "Copper Ridge Crew",
    communityId: "liam",
    purpose: "safer equipment for a promising claim",
    amountMultiplier: 1,
    amount: 1_200,
    termMonths: 12,
    risk: "high",
  });

  event.onApprove({ id: "steady" });
  assert.equal(runtime.bank.loanBook[0].principal, 1_200);
  assert.equal(runtime.bank.loanBook[0].reviewed, false);
  assert.equal(runtime.bank.stats.loansDenied, 0);
});
