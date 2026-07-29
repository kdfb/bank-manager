const test = require("node:test");
const assert = require("node:assert/strict");
const Portfolio = require("../js/portfolio.js");

test("new loans expose an explicit amortized payment schedule", () => {
  const loan = Portfolio.createLoan({
    id: "loan-1",
    name: "Aster Farm",
    principal: 1_200,
    risk: "medium",
    annualRate: 0.12,
    termDays: 24,
    startDay: 3,
  });
  assert.equal(loan.balance, 1_200);
  assert.equal(loan.principalPerPayment, 50);
  assert.equal(loan.interestPerPayment, 6);
  assert.equal(loan.scheduledPayment, 56);
  assert.equal(loan.nextPaymentDay, 4);
});

test("a scheduled payment separates principal from earned interest", () => {
  const loan = Portfolio.createLoan({
    id: "loan-2",
    name: "Mercantile Co.",
    principal: 1_200,
    risk: "medium",
    annualRate: 0.12,
    termDays: 24,
    startDay: 1,
  });
  const result = Portfolio.processPortfolioDay([loan], 2, () => 0.99);
  assert.equal(result.metrics.received, 56);
  assert.equal(result.metrics.principalPaid, 50);
  assert.equal(result.metrics.interestIncome, 6);
  assert.equal(result.loans[0].balance, 1_150);
  assert.equal(result.loans[0].paymentsRemaining, 23);
});

test("missed payments become visible delinquencies before default", () => {
  const loan = Portfolio.createLoan({
    id: "loan-3",
    name: "High Mesa Mining",
    principal: 600,
    risk: "high",
    annualRate: 0.20,
    termDays: 12,
    startDay: 1,
  });
  const missed = Portfolio.processPortfolioDay([loan], 2, () => 0.01);
  assert.equal(missed.metrics.missedPayments, 1);
  assert.equal(missed.metrics.newDelinquencies, 1);
  assert.equal(missed.loans[0].status, "late");
  assert.equal(missed.loans[0].daysLate, 1);
  assert.equal(missed.metrics.defaultCount, 0);
});

test("a repeatedly late high-risk loan can default its remaining balance", () => {
  const loan = Portfolio.createLoan({
    id: "loan-4",
    name: "Speculative Works",
    principal: 500,
    risk: "high",
    annualRate: 0.20,
    termDays: 12,
    startDay: 1,
  });
  loan.status = "late";
  loan.daysLate = 2;
  const rolls = [0.01, 0.01];
  const result = Portfolio.processPortfolioDay([loan], 2, () => rolls.shift());
  assert.equal(result.metrics.defaultCount, 1);
  assert.equal(result.metrics.defaultedBalance, 500);
  assert.equal(result.loans.length, 0);
});

test("legacy loan records migrate without losing outstanding principal", () => {
  const bank = {
    day: 5,
    loansOut: 0,
    loanBook: [{ principal: 300, termDays: 30, daysLeft: 20, dailyPay: 11, name: "Legacy", risk: "low" }],
  };
  Portfolio.migrateLoanBook(bank);
  assert.equal(bank.loanBook[0].paymentsRemaining, 20);
  assert.equal(bank.loanBook[0].balance, 200);
  assert.equal(bank.loansOut, 200);
  assert.equal(bank.loanBook[0].nextPaymentDay, 6);
});

test("portfolio forecasts summarize risk, arrears, and expected inflow", () => {
  const low = Portfolio.createLoan({ id: "low", name: "Low", principal: 1_000, risk: "low", annualRate: 0.06, termDays: 12, startDay: 1 });
  const high = Portfolio.createLoan({ id: "high", name: "High", principal: 500, risk: "high", annualRate: 0.20, termDays: 12, startDay: 1 });
  high.status = "late";
  high.daysLate = 1;
  const summary = Portfolio.portfolioSummary([low, high], 1);
  assert.equal(summary.count, 2);
  assert.equal(summary.balance, 1_500);
  assert.equal(summary.delinquentCount, 1);
  assert.equal(summary.delinquentBalance, 500);
  assert.equal(summary.countsByRisk.high, 1);
  assert.ok(summary.expectedNextDay < summary.scheduledNextDay);
  assert.equal(summary.expectedLoss, 135);
});

test("the final scheduled payment closes the loan without a rounding balance", () => {
  let loans = [Portfolio.createLoan({
    id: "rounding",
    name: "Rounding Test",
    principal: 50,
    risk: "low",
    annualRate: 0.06,
    termDays: 12,
    startDay: 1,
  })];
  let principalReceived = 0;
  for (let day = 2; day <= 13; day++) {
    const result = Portfolio.processPortfolioDay(loans, day, () => 0.99);
    loans = result.loans;
    principalReceived += result.metrics.principalPaid;
  }
  assert.equal(loans.length, 0);
  assert.equal(Math.round(principalReceived * 100) / 100, 50);
});

test("regional conditions can increase or reduce missed-payment pressure", () => {
  const loan = Portfolio.createLoan({
    id: "condition",
    name: "Condition Test",
    principal: 500,
    risk: "medium",
    annualRate: 0.12,
    termDays: 12,
    startDay: 1,
  });
  const protectedResult = Portfolio.processPortfolioDay([loan], 2, () => 0.05, { missedPaymentMultiplier: 0.5 });
  assert.equal(protectedResult.metrics.missedPayments, 0);
  const stressedResult = Portfolio.processPortfolioDay([loan], 2, () => 0.05, { missedPaymentMultiplier: 1.5 });
  assert.equal(stressedResult.metrics.missedPayments, 1);
});

test("reviewed loans visibly reduce missed-payment and expected-loss risk", () => {
  const plain = Portfolio.createLoan({ id: "plain", name: "Plain", principal: 1_000, risk: "medium", annualRate: 0.12, termDays: 12, startDay: 1 });
  const reviewed = Portfolio.createLoan({ id: "reviewed", name: "Reviewed", principal: 1_000, risk: "medium", annualRate: 0.12, termDays: 12, startDay: 1, reviewed: true });
  assert.equal(Portfolio.processPortfolioDay([plain], 2, () => 0.06).metrics.missedPayments, 1);
  assert.equal(Portfolio.processPortfolioDay([reviewed], 2, () => 0.06).metrics.missedPayments, 0);
  assert.ok(Portfolio.portfolioSummary([reviewed], 1).expectedLoss < Portfolio.portfolioSummary([plain], 1).expectedLoss);
});
