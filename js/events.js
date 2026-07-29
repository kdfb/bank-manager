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

function communityFields(profile) {
  if (!profile?.communityId || typeof BankCommunity === "undefined") return {};
  return {
    communityId: profile.communityId,
    relationship: BankCommunity.relationship(bank, profile.communityId),
  };
}

function rememberCommunity(profile, decision, context = {}) {
  if (!profile?.communityId || typeof BankCommunity === "undefined") return null;
  return BankCommunity.record(bank, profile.communityId, {
    decision,
    day: bank.day,
    amount: context.amount,
    purpose: context.purpose,
    trustDelta: context.trustDelta,
  });
}

function communityLobbyBonus(profile) {
  if (!profile?.communityId || !bank.upgrades?.lobby || typeof BankCommunity === "undefined") return 0;
  const returning = BankCommunity.relationship(bank, profile.communityId).isReturning;
  if (!returning) return 0;
  bank.rep = Math.min(100, bank.rep + 1);
  return 1;
}

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
  const reviewed = Boolean(bank.upgrades?.risk_desk);
  const expectedLoss = amount * BankPortfolio.riskProfile(risk).expectedLossRate * (reviewed ? 0.75 : 1);
  const riskColour = { low:"green", medium:"yellow", high:"red" }[risk];
  const fee = Math.max(3, Math.round(amount * 0.01 * BankMarket.prestigeModifiers(bank).feeMultiplier * BankCampaign.activePricingEffects(bank).feeMultiplier));
  const denialStanding = risk === "low" ? 2 : 0;

  return {
    icon: "📝",
    eventType: "Credit Application",
    title: name,
    amount,
    risk,
    segmentId: profile.id,
    segmentLabel: profile.label,
    customerValue: amount,
    ...communityFields(profile),
    story: `${name} is asking the bank to back ${purpose}.`,
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
      ...(reviewed ? [{ key:"Loan review desk", val:"Risk reduced 25%", cls:"green" }] : []),
    ],
    approveLabel: "✅ Approve",
    denyLabel:    "❌ Deny",
    choicePreview: {
      approve: {
        title: "Back the plan",
        summary: `${fmt(amount)} leaves the vault today. Earn up to ${fmt(totalInt + fee)} if the loan is repaid.`,
        tone: risk === "high" ? "risk" : risk === "low" ? "safe" : "balanced",
      },
      deny: {
        title: "Protect the vault",
        summary: denialStanding ? `Keep the cash, but lose ${denialStanding} standing with a strong applicant.` : "Keep the cash and avoid this credit risk.",
        tone: denialStanding ? "tradeoff" : "safe",
      },
    },
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
        reviewed,
      }));
      const analystBonus = risk === "high" && (bank.upgrades?.risk_desk || 0) > 0 ? 1 : 0;
      const bump = (risk === "low" ? 2 : 1) + analystBonus;
      bank.rep = Math.min(100, bank.rep + bump);
      bank.stats.loansApproved++;
      bank.stats.totalIssued += amount;
      BankEconomy.applyTransactionFee(bank, fee, "loanFees");
      rememberCommunity(profile, "loan-approved", {
        amount, purpose, trustDelta: risk === "high" ? 2 : 1,
      });
      if (profile.communityId) {
        BankCommunity.scheduleLoanFollowUp(bank, profile.communityId, "approved", { amount, purpose, risk });
      }
      return { msg:`Loan of ${fmt(amount)} approved. ${fmt(fee)} fee earned. Reputation +${bump}.`, kind:"good" };
    },
    onDeny() {
      bank.stats.loansDenied++;
      rememberCommunity(profile, "loan-denied", {
        amount, purpose, trustDelta: risk === "low" ? -2 : risk === "medium" ? -1 : 0,
      });
      if (profile.communityId) {
        BankCommunity.scheduleLoanFollowUp(bank, profile.communityId, "denied", { amount, purpose, risk });
      }
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
    ...communityFields(profile),
    story: `${who} wants to place ${fmt(amount)} with the bank.`,
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
    single: true,
    canApprove: () => true,
    onApprove() {
      bank.cash     += amount;
      bank.deposits += amount;
      bank.rep = Math.min(100, bank.rep + 1);
      const welcomeBonus = communityLobbyBonus(profile);
      rememberCommunity(profile, "deposit", { amount, trustDelta: 1 });
      return { msg:`Deposit of ${fmt(amount)} accepted. Standing +${1 + welcomeBonus}.`, kind:"good" };
    },
    onDeny() {
      rememberCommunity(profile, "deposit", { amount, trustDelta: -1 });
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
    ...communityFields(profile),
    story: `${name} wants a dependable place for everyday money.`,
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
    single: true,
    canApprove: () => true,
    onApprove() {
      bank.cash += openingDeposit;
      bank.deposits += openingDeposit;
      BankEconomy.applyTransactionFee(bank, fee, "accountFees");
      bank.rep = Math.min(100, bank.rep + 1);
      const welcomeBonus = communityLobbyBonus(profile);
      rememberCommunity(profile, "account", { amount: openingDeposit, trustDelta: 1 });
      return { msg:`Account opened for ${name}. ${fmt(fee)} fee earned${welcomeBonus ? " · returning neighbor welcomed" : ""}.`, kind:"good" };
    },
    onDeny() {
      bank.rep = Math.max(0, bank.rep - 1);
      rememberCommunity(profile, "account", { amount: openingDeposit, trustDelta: -1 });
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
    ...communityFields(profile),
    story: `${profile.name} needs ${fmt(amount)} from their savings today.`,
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
    single: canPay(),
    choicePreview: canPay() ? null : {
      approve: {
        title: "Attempt the payout",
        summary: "The vault is short. Failing to pay will cost 10 standing.",
        tone: "risk",
      },
      deny: {
        title: "Explain the shortfall",
        summary: "Keep the remaining cash, but lose 6 standing.",
        tone: "tradeoff",
      },
    },
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
      const welcomeBonus = communityLobbyBonus(profile);
      rememberCommunity(profile, "withdrawal", { amount, trustDelta: 1 });
      return { msg:`Withdrawal of ${fmt(amount)} processed. ${fmt(fee)} fee earned${welcomeBonus ? " · standing +1" : ""}.`, kind:"neutral" };
    },
    onDeny() {
      const penalty = bank.upgrades?.vault_upgrade ? 4 : (bank.upgrades?.atm || 0) > 0 ? 3 : 6;
      bank.rep = Math.max(0, bank.rep - penalty);
      rememberCommunity(profile, "withdrawal", { amount, trustDelta: -2 });
      return { msg:`Refused withdrawal. Customer furious. Reputation -${penalty}.`, kind:"bad" };
    },
  };
}

function makeCommunityFollowUpEvent(followUp) {
  const person = BankCommunity.customer(followUp.customerId);
  const presentation = BankCommunity.followUpPresentation(bank, followUp);
  const segment = BankMarket.SEGMENTS[person.segment];
  const standing = presentation.standingDelta;
  const relationship = BankCommunity.relationship(bank, person.id);
  relationship.isReturning = true;
  relationship.text = `Returning customer · Following up on your ${fmt(followUp.amount)} ${followUp.decision === "approved" ? "loan" : "decision"}`;
  return {
    icon: "🤝",
    eventType: "Customer Follow-up",
    title: person.name,
    communityId: person.id,
    communityFollowUpId: followUp.id,
    relationship,
    segmentId: person.segment,
    segmentLabel: segment.label,
    customerValue: 0,
    story: presentation.story,
    summary: {
      purpose: presentation.decisionLabel,
      amount: followUp.amount ? fmt(followUp.amount) : "—",
      risk: standing > 0 ? "GOOD NEWS" : standing < 0 ? "CONSEQUENCE" : "UPDATE",
      riskClass: standing > 0 ? "green" : standing < 0 ? "red" : "yellow",
    },
    details: [
      { key: "Earlier request", val: followUp.purpose },
      { key: "Your decision", val: presentation.decisionLabel },
      { key: "Original amount", val: followUp.amount ? fmt(followUp.amount) : "—" },
      { key: "Standing", val: standing ? `${standing > 0 ? "+" : ""}${standing}` : "No change", cls: standing > 0 ? "green" : standing < 0 ? "red" : "yellow" },
    ],
    approveLabel: "Hear the update",
    denyLabel: "",
    single: true,
    canApprove: () => true,
    onApprove() {
      const resolved = BankCommunity.resolveFollowUp(bank, followUp.id);
      return {
        msg: resolved?.presentation.result || "Customer update recorded.",
        kind: standing > 0 ? "good" : standing < 0 ? "warn" : "neutral",
      };
    },
    onDeny() {
      return this.onApprove();
    },
  };
}

function issueTownLoan(name, principal, risk, annualRate = 0.08) {
  const amount = Math.max(0, Math.min(Number(principal) || 0, bank.cash));
  if (!amount) return 0;
  bank.cash -= amount;
  bank.loansOut += amount;
  bank.loanBook.push(BankPortfolio.createLoan({
    id: `town-${bank.day}-${bank.loanBook.length + 1}`,
    name,
    principal: amount,
    risk,
    annualRate,
    termDays: 24,
    startDay: bank.day,
    reviewed: Boolean(bank.upgrades?.risk_desk),
  }));
  bank.stats.loansApproved++;
  bank.stats.totalIssued += amount;
  return amount;
}

function makeTownProjectEvent(moment) {
  if (moment.id === "mill-survey") {
    const cost = 200;
    return {
      icon: "⚙️",
      eventType: "Town Project",
      title: "Could Silver Creek Own Its Mill?",
      townMomentId: moment.id,
      isNarrative: true,
      story: "Elena and Samir bring a hand-drawn plan for a cooperative grain mill. Before anyone asks for a construction loan, an engineer must decide whether the old waterworks can be saved.",
      summary: { purpose: "Feasibility survey", amount: fmt(cost), risk: "EARLY COMMITMENT", riskClass: "yellow" },
      details: [
        { key: "People", val: "Elena Ivanova and Samir Haddad" },
        { key: "First step", val: "Survey the old mill and waterwheel" },
        { key: "Bank cost", val: fmt(cost) },
        { key: "Uncertainty", val: "No construction loan has been approved" },
      ],
      approveLabel: `Fund the survey · ${fmt(cost)}`,
      denyLabel: "Ask the town to self-fund",
      single: false,
      canApprove: () => bank.cash >= cost,
      cantMsg: `The bank needs ${fmt(cost)} in available cash to sponsor the survey.`,
      choicePreview: {
        approve: { title: "Learn before lending", summary: `${fmt(cost)} leaves cash today, but the final mill loan will be smaller and better understood.`, tone: "balanced" },
        deny: { title: "Protect the vault", summary: "Keep the cash. The cooperative must spend a day raising its own survey fund.", tone: "safe" },
      },
      onApprove() {
        bank.cash -= cost;
        bank.profit -= cost;
        bank.rep = Math.min(100, bank.rep + 2);
        BankTown.recordChoice(bank, moment.id, "survey");
        return { msg: `The bank funded the mill survey. ${fmt(cost)} spent · standing +2.`, kind: "good" };
      },
      onDeny() {
        BankTown.recordChoice(bank, moment.id, "self-fund");
        return { msg: "The cooperative will raise the survey money itself. The vault stays intact, but the plan loses time.", kind: "neutral" };
      },
    };
  }

  if (moment.id === "supplier-note") {
    const amount = 350;
    const surveyed = BankTown.choice(bank, "mill-survey")?.choice === "survey";
    return {
      icon: "🤝",
      eventType: "Town Project",
      title: "Timber, Stone, and a Promise",
      townMomentId: moment.id,
      isNarrative: true,
      story: "Liam can supply safe timbers and Grace can bring iron fittings, but both need payment before the final cooperative vote. They ask the bank for a short bridge loan.",
      summary: { purpose: "Supplier bridge loan", amount: fmt(amount), risk: surveyed ? "MEDIUM" : "HIGH", riskClass: surveyed ? "yellow" : "red" },
      details: [
        { key: "Borrower", val: "Silver Creek Mill Committee" },
        { key: "Amount", val: fmt(amount) },
        { key: "Use", val: "Reserve local timber and iron fittings" },
        { key: "Preparation", val: surveyed ? "Engineering survey complete" : "No bank-funded survey" },
      ],
      approveLabel: `Bridge the suppliers · ${fmt(amount)}`,
      denyLabel: "Require member collateral",
      single: false,
      canApprove: () => bank.cash >= amount,
      cantMsg: `The bank needs ${fmt(amount)} in available cash for the bridge loan.`,
      choicePreview: {
        approve: { title: "Keep the plan moving", summary: `${fmt(amount)} becomes a real loan asset. The committee can lock in local materials before prices rise.`, tone: "balanced" },
        deny: { title: "Share the risk", summary: "No bank cash leaves today. Members must pledge their own property before suppliers commit.", tone: "tradeoff" },
      },
      onApprove() {
        const issued = issueTownLoan("Silver Creek Mill Committee", amount, surveyed ? "medium" : "high", 0.10);
        bank.rep = Math.min(100, bank.rep + 2);
        BankTown.recordChoice(bank, moment.id, "bridge");
        return { msg: `${fmt(issued)} supplier bridge issued. The mill plan stays on schedule · standing +2.`, kind: "good" };
      },
      onDeny() {
        BankTown.recordChoice(bank, moment.id, "collateral");
        bank.rep = Math.max(0, bank.rep - 1);
        return { msg: "The committee must pledge collateral. The bank avoids the bridge risk · standing -1.", kind: "warn" };
      },
    };
  }

  const surveyed = BankTown.choice(bank, "mill-survey")?.choice === "survey";
  const bridged = BankTown.choice(bank, "supplier-note")?.choice === "bridge";
  const preparation = Number(surveyed) + Number(bridged);
  const cooperativeAmount = 900 - preparation * 100;
  const cooperativeRisk = preparation >= 2 ? "medium" : "high";
  const repairAmount = 300;
  return {
    icon: "🏘️",
    eventType: "Town Project",
    title: "What Kind of Town Will This Be?",
    townMomentId: moment.id,
    isNarrative: true,
    story: "The mill committee fills the bank after closing. One plan gives Silver Creek shared ownership and a larger obligation. The other repairs the old wheel cheaply and leaves the future undecided.",
    summary: { purpose: "Final mill financing", amount: `${fmt(repairAmount)}–${fmt(cooperativeAmount)}`, risk: cooperativeRisk.toUpperCase(), riskClass: cooperativeRisk === "high" ? "red" : "yellow" },
    details: [
      { key: "Cooperative plan", val: `${fmt(cooperativeAmount)} · ${cooperativeRisk} risk · shared local ownership` },
      { key: "Repair plan", val: `${fmt(repairAmount)} · low risk · one more season of output` },
      { key: "Preparation", val: `${preparation} of 2 early commitments completed` },
      { key: "Decision", val: "Both paths serve the town differently" },
    ],
    approveLabel: `Back the cooperative · ${fmt(cooperativeAmount)}`,
    denyLabel: `Finance the repair · ${fmt(repairAmount)}`,
    single: false,
    canApprove: () => bank.cash >= cooperativeAmount,
    cantMsg: `The cooperative plan needs ${fmt(cooperativeAmount)} in available cash. The smaller repair remains possible.`,
    choicePreview: {
      approve: { title: "Build something new", summary: `Issue a ${cooperativeRisk}-risk ${fmt(cooperativeAmount)} loan. The town owns the mill—and the bank carries the larger obligation.`, tone: cooperativeRisk === "high" ? "risk" : "balanced" },
      deny: { title: "Preserve what works", summary: `Issue a low-risk ${fmt(repairAmount)} repair loan. Cash and risk stay lower, but the town postpones shared ownership.`, tone: "safe" },
    },
    onApprove() {
      const issued = issueTownLoan("Silver Creek Cooperative Mill", cooperativeAmount, cooperativeRisk, 0.09);
      bank.rep = Math.min(100, bank.rep + 5);
      BankTown.complete(bank, "cooperative");
      return { msg: `${fmt(issued)} committed to the cooperative mill. Silver Creek will own its spring harvest · standing +5.`, kind: "good" };
    },
    onDeny() {
      const issued = issueTownLoan("Old Mill Repair Committee", repairAmount, "low", 0.06);
      bank.rep = Math.min(100, bank.rep + 2);
      BankTown.complete(bank, "repair");
      return { msg: `${fmt(issued)} committed to repair the old wheel. The town buys a safer year · standing +2.`, kind: "neutral" };
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
