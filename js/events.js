// Event data pools and factory functions.
// Each factory returns a plain object consumed by render.js and game.js.

const INCIDENT_EVENTS = [
  {
    icon: "📋", title: "Audit Passed", kind: "good", description: "Regulators found the branch records in good order.",
    apply(b) { b.rep = Math.min(100, b.rep + 4); return { msg: "Audit passed. Reputation +4.", kind: "good" }; },
  },
  {
    icon: "📰", title: "Positive Press", kind: "good", description: "The county paper praised the bank's community service.",
    apply(b) { b.rep = Math.min(100, b.rep + 3); return { msg: "Positive coverage spread through Silver Creek. Reputation +3.", kind: "good" }; },
  },
  {
    icon: "🔫", title: "Robbery Attempt", kind: "bad", description: "Armed thieves tested the branch's defenses and escaped with loose cash.",
    apply(b) {
      const vaultFactor = (b.upgrades?.vault_upgrade || 0) > 0 ? 0.25 : 1;
      const worldFactor = BankWorld.modifiers(b).robberyLoss;
      const locationFactor = BankMarket.locationProfile(b).crimeRisk;
      const loss = Math.min(b.cash, Math.round(80 * vaultFactor * worldFactor * locationFactor));
      b.cash -= loss;
      b.profit -= loss;
      b.rep = Math.max(0, b.rep - (loss > 80 ? 5 : 3));
      if (b.dayMetrics) b.dayMetrics.eventCosts = (b.dayMetrics.eventCosts || 0) + loss;
      return { msg: `Robbery loss ${fmt(loss)}. Reputation fell.`, kind: "warn" };
    },
  },
  {
    icon: "⚠️", title: "Compliance Fine", kind: "bad", description: "A filing error drew a modest regulatory penalty.",
    apply(b) {
      const fine = 50;
      b.cash -= fine;
      b.profit -= fine;
      b.rep = Math.max(0, b.rep - 2);
      if (b.dayMetrics) b.dayMetrics.eventCosts = (b.dayMetrics.eventCosts || 0) + fine;
      return { msg: "Compliance fine $50. Reputation -2.", kind: "warn" };
    },
  },
];

// ── Event factories ───────────────────────────────────────────
// Each returns an event object with: icon, eventType, title, details[],
// approveLabel, denyLabel?, single, canApprove(), cantMsg?, onApprove(), onDeny()

function makeLoanEvent(profile = BankMarket.customerProfile(bank, Math.random)) {
  const name = ["ranchers", "merchants", "institutions", "enterprises"].includes(profile.id)
    ? profile.organization
    : profile.name;
  const purpose = profile.purpose;
  const amountMultiplier = profile.amountMultiplier * BankWorld.modifiers(bank).loanAmount;
  const amount  = Math.max(10, Math.round(randInt(5, 80) * 10 * amountMultiplier / 10) * 10);
  const risk    = profile.risk;
  const termMo  = pick([6, 12, 24, 36]);
  // One campaign day represents roughly half a month for repayment pacing.
  const termDays = termMo * 2;
  const rates   = { low: 0.06, medium: 0.12, high: 0.20 };
  const rate    = rates[risk];
  const totalInt = amount * rate * (termMo / 12);
  const dailyPay = (amount + totalInt) / termDays;
  const expectedLoss = amount * BankPortfolio.riskProfile(risk).expectedLossRate;
  const riskColour = { low:"green", medium:"yellow", high:"red" }[risk];

  return {
    icon: "📝",
    eventType: "Credit Application",
    title: name,
    amount,
    risk,
    segmentId: profile.id,
    segmentLabel: profile.label,
    customerValue: amount,
    summary: {
      purpose: `${profile.icon} ${profile.label} credit`,
      amount: fmt(amount),
      risk: risk.toUpperCase(),
      riskClass: riskColour,
    },
    details: [
      { key:"Purpose",     val: purpose },
      { key:"Customer segment", val: `${profile.icon} ${profile.label}` },
      { key:"Amount",      val: fmt(amount) },
      { key:"Risk",        val: risk.toUpperCase(), cls: riskColour },
      { key:"Term",        val: `${termMo} months` },
      { key:"Interest",    val: `${(rate*100).toFixed(0)}% annual → ${fmt(totalInt)} total` },
      { key:"Schedule",    val: `${termDays} daily payments of ${fmt(dailyPay)}` },
      { key:"Expected loss", val: fmt(expectedLoss), cls: riskColour },
    ],
    approveLabel: "✅ Approve",
    denyLabel:    "❌ Deny",
    single: false,
    canApprove: () => bank.cash >= amount,
    cantMsg: "Insufficient funds in the vault.",
    onApprove() {
      bank.cash -= amount;
      bank.loansOut += amount;
      bank.loanBook.push(BankPortfolio.createLoan({
        id: `loan-${bank.day}-${bank.stats.loansApproved + 1}`,
        name,
        principal: amount,
        risk,
        annualRate: rate,
        termDays,
        startDay: bank.day,
      }));
      const analystBonus = risk === "high" && (bank.upgrades?.risk_desk || 0) > 0 ? 1 : 0;
      const bump = (risk === "low" ? 2 : 1) + analystBonus;
      bank.rep = Math.min(100, bank.rep + bump);
      bank.stats.loansApproved++;
      bank.stats.totalIssued += amount;
      const pricing = BankCampaign.activePricingEffects(bank);
      const fee = Math.max(3, Math.round(amount * 0.01 * BankMarket.prestigeModifiers(bank).feeMultiplier * pricing.feeMultiplier));
      BankEconomy.applyTransactionFee(bank, fee, "loanFees");
      return { msg:`Loan of ${fmt(amount)} approved. ${fmt(fee)} fee earned. Reputation +${bump}.`, kind:"good" };
    },
    onDeny() {
      bank.stats.loansDenied++;
      if (risk === "low") {
        bank.rep = Math.max(0, bank.rep - 2);
        return { msg:"Low-risk applicant turned away. Reputation −2.", kind:"warn" };
      }
      return { msg:"Risky applicant denied. Sensible call.", kind:"neutral" };
    },
  };
}

function makeDepositEvent(profile = BankMarket.customerProfile(bank, Math.random)) {
  const who = profile.organization;
  const baseAmount = randInt(20, 150) * 10 + ((bank.upgrades?.safe_deposit || 0) > 0 ? 200 : 0);
  const amountMultiplier = profile.amountMultiplier
    * BankWorld.modifiers(bank).depositAmount
    * BankMarket.prestigeModifiers(bank).depositMultiplier
    * BankCampaign.activePricingEffects(bank).depositDemand;
  const amount = Math.max(10, Math.round(baseAmount * amountMultiplier / 10) * 10);
  return {
    icon: "💰",
    eventType: "Deposit Proposal",
    title: who,
    segmentId: profile.id,
    segmentLabel: profile.label,
    customerValue: amount,
    summary: {
      purpose: `${profile.icon} ${profile.label} deposit`,
      amount: fmt(amount),
      risk: "LOW",
      riskClass: "green",
    },
    details: [
      { key:"Purpose", val: "Deposit" },
      { key:"Customer segment", val: `${profile.icon} ${profile.label}` },
      { key:"Amount", val: fmt(amount) },
      { key:"Risk", val: "LOW", cls: "green" },
      { key:"Effect", val: "Boosts cash, increases liability" },
    ],
    approveLabel: "✅ Accept",
    denyLabel:    "❌ Decline",
    single: false,
    canApprove: () => true,
    onApprove() {
      bank.cash     += amount;
      bank.deposits += amount;
      bank.rep = Math.min(100, bank.rep + 1);
      return { msg:`Deposit of ${fmt(amount)} accepted. Reputation +1.`, kind:"good" };
    },
    onDeny() {
      return { msg:`Deposit from ${who} declined.`, kind:"neutral" };
    },
  };
}

function makeAccountEvent(profile = BankMarket.customerProfile(bank, Math.random)) {
  const name = profile.id === "households" || profile.id === "miners" ? profile.name : profile.organization;
  const openingDeposit = Math.max(10, Math.round(randInt(5, 30) * 10 * profile.amountMultiplier / 10) * 10);
  const fee = Math.max(1, Math.round(12 * BankMarket.prestigeModifiers(bank).feeMultiplier * BankCampaign.activePricingEffects(bank).feeMultiplier));
  return {
    icon: "📒",
    eventType: "Account Opening",
    title: name,
    segmentId: profile.id,
    segmentLabel: profile.label,
    customerValue: openingDeposit + fee,
    summary: {
      purpose: `${profile.icon} ${profile.label} account`,
      amount: fmt(openingDeposit),
      risk: "LOW",
      riskClass: "green",
    },
    details: [
      { key:"Purpose", val:"Open a current account" },
      { key:"Customer segment", val: `${profile.icon} ${profile.label}` },
      { key:"Opening deposit", val:fmt(openingDeposit) },
      { key:"Service fee", val:fmt(fee), cls:"green" },
      { key:"Risk", val:"LOW", cls:"green" },
    ],
    approveLabel: "Open Account",
    denyLabel: "Decline",
    single: false,
    canApprove: () => true,
    onApprove() {
      bank.cash += openingDeposit;
      bank.deposits += openingDeposit;
      BankEconomy.applyTransactionFee(bank, fee, "accountFees");
      bank.rep = Math.min(100, bank.rep + 1);
      return { msg:`Account opened for ${name}. ${fmt(fee)} fee earned.`, kind:"good" };
    },
    onDeny() {
      bank.rep = Math.max(0, bank.rep - 1);
      return { msg:`Account request from ${name} declined. Reputation −1.`, kind:"warn" };
    },
  };
}

function makeWithdrawalEvent(profile = BankMarket.customerProfile(bank, Math.random)) {
  const amountMultiplier = profile.amountMultiplier * BankWorld.modifiers(bank).withdrawalAmount;
  const amount = Math.max(10, Math.round(randInt(5, 50) * 10 * amountMultiplier / 10) * 10);
  const canPay = () => bank.cash >= amount;
  return {
    icon: "🏧",
    eventType: "Withdrawal Demand",
    title: `${profile.name} · ${fmt(amount)} demanded`,
    segmentId: profile.id,
    segmentLabel: profile.label,
    customerValue: amount,
    summary: {
      purpose: `${profile.icon} ${profile.label} withdrawal`,
      amount: fmt(amount),
      risk: canPay() ? "LOW" : "HIGH",
      riskClass: canPay() ? "green" : "red",
    },
    details: [
      { key:"Purpose", val: "Withdrawal" },
      { key:"Customer segment", val: `${profile.icon} ${profile.label}` },
      { key:"Amount", val: fmt(amount) },
      { key:"Risk", val: canPay() ? "LOW" : "HIGH", cls: canPay() ? "green" : "red" },
      { key:"Status", val: canPay() ? "Funds available" : "⚠️ Vault low!", cls: canPay() ? "green" : "red" },
    ],
    approveLabel: "✅ Honour",
    denyLabel:    "❌ Refuse",
    single: false,
    canApprove: () => true,
    onApprove() {
      if (!canPay()) {
        bank.rep = Math.max(0, bank.rep - 10);
        return { msg:`Couldn't pay ${fmt(amount)} — funds short. Reputation −10.`, kind:"bad" };
      }
      bank.cash     -= amount;
      bank.deposits  = Math.max(0, bank.deposits - amount);
      const fee = Math.max(1, Math.round(2 * BankMarket.prestigeModifiers(bank).feeMultiplier * BankCampaign.activePricingEffects(bank).feeMultiplier));
      BankEconomy.applyTransactionFee(bank, fee, "transactionFees");
      return { msg:`Withdrawal of ${fmt(amount)} processed. ${fmt(fee)} fee earned.`, kind:"neutral" };
    },
    onDeny() {
      const penalty = (bank.upgrades?.atm || 0) > 0 ? 3 : 6;
      bank.rep = Math.max(0, bank.rep - penalty);
      return { msg:`Refused withdrawal. Customer furious. Reputation -${penalty}.`, kind:"bad" };
    },
  };
}

function makeRandomEvent() {
  if (Math.random() < 0.75) return makeWorldEvent();
  const ev = pick(INCIDENT_EVENTS);
  return {
    icon: ev.icon,
    eventType: "Branch Incident",
    title: ev.title,
    isNarrative: true,
    summary: {
      purpose: "Branch incident",
      amount: "N/A",
      risk: ev.kind === "bad" ? "HIGH" : ev.kind === "good" ? "LOW" : "MEDIUM",
      riskClass: ev.kind === "bad" ? "red" : ev.kind === "good" ? "green" : "yellow",
    },
    details: [{ key:"Detail", val: ev.description }],
    approveLabel: "Duly Noted",
    single: true,
    canApprove: () => true,
    onApprove() {
      const result = ev.apply(bank);
      BankWorld.recordHistory(bank, {
        eventId: `incident-${ev.title.toLowerCase().replace(/[^a-z]+/g, "-")}`,
        eventTitle: ev.title,
        choiceLabel: "Incident resolved",
        result: result.msg,
      });
      return result;
    },
  };
}

function makeWorldEvent(forcedEventId = null) {
  const queuedEventIds = typeof queue === "undefined"
    ? []
    : queue.filter(queuedEvent => queuedEvent.worldEventId).map(queuedEvent => queuedEvent.worldEventId);
  const event = BankWorld.worldEventDefinition(forcedEventId)
    || BankWorld.selectWorldEvent(bank, Math.random, queuedEventIds);
  const [first, second] = event.choices;
  return {
    icon: event.icon,
    eventType: "World Event",
    title: event.title,
    worldEventId: event.id,
    isNarrative: true,
    summary: {
      purpose: event.category,
      amount: first.cost ? fmt(first.cost) : "Policy",
      risk: first.kind === "good" ? "LOW" : "MEDIUM",
      riskClass: first.kind === "good" ? "green" : "yellow",
    },
    details: [
      { key: "Category", val: event.category },
      { key: "Situation", val: event.description },
      { key: first.label, val: first.result },
      { key: second.label, val: second.result },
    ],
    approveLabel: first.label,
    denyLabel: second.label,
    single: false,
    canApprove: () => !first.cost || bank.cash >= first.cost,
    cantMsg: first.cost ? `This response requires ${fmt(first.cost)} in cash.` : "",
    onApprove() { return BankWorld.resolveWorldEvent(bank, event.id, first.id); },
    onDeny() { return BankWorld.resolveWorldEvent(bank, event.id, second.id); },
  };
}
