// Pure loan schedule, delinquency, default, and portfolio forecasting rules.
(function exposePortfolio(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BankPortfolio = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPortfolio() {
  const RISK_PROFILES = Object.freeze({
    low: Object.freeze({ missedPaymentChance: 0.025, lateDefaultChance: 0.08, expectedLossRate: 0.015 }),
    medium: Object.freeze({ missedPaymentChance: 0.07, lateDefaultChance: 0.22, expectedLossRate: 0.08 }),
    high: Object.freeze({ missedPaymentChance: 0.16, lateDefaultChance: 0.50, expectedLossRate: 0.24 }),
  });

  function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function riskProfile(risk) {
    return RISK_PROFILES[risk] || RISK_PROFILES.medium;
  }

  function createLoan({ id, name, principal, risk, annualRate, termDays, startDay }) {
    const safePrincipal = Math.max(0, Number(principal) || 0);
    const safeTerm = Math.max(1, Math.round(Number(termDays) || 1));
    const safeRate = Math.max(0, Number(annualRate) || 0);
    const totalInterest = safePrincipal * safeRate * (safeTerm / 24);
    return {
      id,
      name,
      risk,
      originalPrincipal: safePrincipal,
      balance: safePrincipal,
      annualRate: safeRate,
      termDays: safeTerm,
      paymentsRemaining: safeTerm,
      scheduledPayment: roundMoney((safePrincipal + totalInterest) / safeTerm),
      principalPerPayment: roundMoney(safePrincipal / safeTerm),
      interestPerPayment: roundMoney(totalInterest / safeTerm),
      originatedDay: startDay,
      nextPaymentDay: startDay + 1,
      status: "current",
      daysLate: 0,
      missedPayments: 0,
    };
  }

  function migrateLoan(loan, bankDay = 1, index = 0) {
    if (Number.isFinite(loan?.balance) && Number.isFinite(loan?.scheduledPayment)) {
      const originalPrincipal = Number(loan.originalPrincipal) || Number(loan.principal) || loan.balance;
      const termDays = Math.max(1, Number(loan.termDays) || Number(loan.paymentsRemaining) || 1);
      const paymentsRemaining = Math.max(1, Number(loan.paymentsRemaining) || Number(loan.daysLeft) || 1);
      const principalPerPayment = Number(loan.principalPerPayment) || originalPrincipal / termDays;
      return {
        ...loan,
        id: loan.id || `loan-${bankDay}-${index}`,
        originalPrincipal: roundMoney(originalPrincipal),
        balance: roundMoney(loan.balance),
        annualRate: Number(loan.annualRate) || 0,
        termDays,
        paymentsRemaining,
        scheduledPayment: roundMoney(loan.scheduledPayment),
        principalPerPayment: roundMoney(principalPerPayment),
        interestPerPayment: roundMoney(Number(loan.interestPerPayment) || Math.max(0, loan.scheduledPayment - principalPerPayment)),
        nextPaymentDay: Number(loan.nextPaymentDay) || bankDay + 1,
        status: loan.status === "late" ? "late" : "current",
        daysLate: Math.max(0, Number(loan.daysLate) || 0),
        missedPayments: Math.max(0, Number(loan.missedPayments) || 0),
      };
    }

    const originalPrincipal = Math.max(0, Number(loan?.principal) || 0);
    const termDays = Math.max(1, Number(loan?.termDays) || 1);
    const paymentsRemaining = Math.max(1, Number(loan?.daysLeft) || termDays);
    const principalPerPayment = originalPrincipal / termDays;
    const scheduledPayment = Math.max(principalPerPayment, Number(loan?.dailyPay) || principalPerPayment);
    const balance = Math.min(originalPrincipal, principalPerPayment * paymentsRemaining);
    const totalInterest = Math.max(0, scheduledPayment * termDays - originalPrincipal);
    const annualRate = originalPrincipal > 0 ? (totalInterest / originalPrincipal) * (24 / termDays) : 0;

    return {
      id: loan?.id || `legacy-loan-${bankDay}-${index}`,
      name: loan?.name || "Legacy borrower",
      risk: loan?.risk || "medium",
      originalPrincipal: roundMoney(originalPrincipal),
      balance: roundMoney(balance),
      annualRate,
      termDays,
      paymentsRemaining,
      scheduledPayment: roundMoney(scheduledPayment),
      principalPerPayment: roundMoney(principalPerPayment),
      interestPerPayment: roundMoney(Math.max(0, scheduledPayment - principalPerPayment)),
      originatedDay: Math.max(1, bankDay - (termDays - paymentsRemaining)),
      nextPaymentDay: bankDay + 1,
      status: "current",
      daysLate: 0,
      missedPayments: 0,
    };
  }

  function migrateLoanBook(bank) {
    bank.loanBook = (bank.loanBook || []).map((loan, index) => migrateLoan(loan, bank.day, index));
    bank.loansOut = roundMoney(bank.loanBook.reduce((sum, loan) => sum + loan.balance, 0));
    return bank;
  }

  function processPortfolioDay(loanBook, day, random = Math.random, options = {}) {
    const metrics = {
      due: 0,
      received: 0,
      principalPaid: 0,
      interestIncome: 0,
      missedPayments: 0,
      newDelinquencies: 0,
      defaultedBalance: 0,
      defaultCount: 0,
      completedCount: 0,
    };
    const surviving = [];

    (loanBook || []).forEach((sourceLoan, index) => {
      const loan = migrateLoan(sourceLoan, day, index);
      if (day < loan.nextPaymentDay) {
        surviving.push(loan);
        return;
      }

      metrics.due += loan.scheduledPayment;
      const profile = riskProfile(loan.risk);
      const missedPaymentChance = Math.min(0.95,
        profile.missedPaymentChance * (Number(options.missedPaymentMultiplier) || 1)
      );
      if (random() < missedPaymentChance) {
        const wasCurrent = loan.status !== "late";
        loan.status = "late";
        loan.daysLate += 1;
        loan.missedPayments += 1;
        metrics.missedPayments += 1;
        if (wasCurrent) metrics.newDelinquencies += 1;
        if (loan.daysLate >= 3 && random() < profile.lateDefaultChance) {
          metrics.defaultedBalance += loan.balance;
          metrics.defaultCount += 1;
          return;
        }
        surviving.push(loan);
        return;
      }

      const principalPaid = loan.paymentsRemaining <= 1
        ? loan.balance
        : Math.min(loan.balance, loan.principalPerPayment);
      const interestIncome = Math.min(
        Math.max(0, loan.scheduledPayment - principalPaid),
        loan.interestPerPayment
      );
      const received = principalPaid + interestIncome;
      loan.balance = roundMoney(Math.max(0, loan.balance - principalPaid));
      loan.paymentsRemaining = Math.max(0, loan.paymentsRemaining - 1);
      loan.nextPaymentDay = day + 1;
      loan.status = "current";
      loan.daysLate = 0;
      metrics.received += received;
      metrics.principalPaid += principalPaid;
      metrics.interestIncome += interestIncome;

      if (loan.balance <= 0.01 || loan.paymentsRemaining <= 0) {
        metrics.completedCount += 1;
      } else {
        surviving.push(loan);
      }
    });

    Object.keys(metrics).forEach(key => {
      if (!key.endsWith("Count") && !["missedPayments", "newDelinquencies"].includes(key)) {
        metrics[key] = roundMoney(metrics[key]);
      }
    });
    return { loans: surviving, metrics };
  }

  function portfolioSummary(loanBook, day) {
    const loans = (loanBook || []).map((loan, index) => migrateLoan(loan, day, index));
    const balance = loans.reduce((sum, loan) => sum + loan.balance, 0);
    const expectedLoss = loans.reduce((sum, loan) =>
      sum + loan.balance * riskProfile(loan.risk).expectedLossRate, 0
    );
    const scheduledNextDay = loans
      .filter(loan => loan.nextPaymentDay <= day + 1)
      .reduce((sum, loan) => sum + loan.scheduledPayment, 0);
    const expectedNextDay = loans
      .filter(loan => loan.nextPaymentDay <= day + 1)
      .reduce((sum, loan) => sum + loan.scheduledPayment * (1 - riskProfile(loan.risk).missedPaymentChance), 0);
    const countsByRisk = { low: 0, medium: 0, high: 0 };
    loans.forEach(loan => { countsByRisk[loan.risk] = (countsByRisk[loan.risk] || 0) + 1; });
    return {
      count: loans.length,
      balance: roundMoney(balance),
      expectedLoss: roundMoney(expectedLoss),
      scheduledNextDay: roundMoney(scheduledNextDay),
      expectedNextDay: roundMoney(expectedNextDay),
      delinquentCount: loans.filter(loan => loan.status === "late").length,
      delinquentBalance: roundMoney(loans.filter(loan => loan.status === "late").reduce((sum, loan) => sum + loan.balance, 0)),
      countsByRisk,
      loans: loans.sort((left, right) => left.nextPaymentDay - right.nextPaymentDay),
    };
  }

  return Object.freeze({
    RISK_PROFILES,
    riskProfile,
    createLoan,
    migrateLoan,
    migrateLoanBook,
    processPortfolioDay,
    portfolioSummary,
  });
});
