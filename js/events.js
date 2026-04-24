// Event data pools and factory functions.
// Each factory returns a plain object consumed by render.js and game.js.

const NAMES = [
  "Alice Mwangi","Bob Okonkwo","Carmen Reyes","David Patel",
  "Elena Ivanova","Frank Johansson","Grace Liu","Hiro Tanaka",
  "Isabelle Morin","James Osei","Keiko Sato","Liam Nkosi",
];

const PURPOSES = [
  "a new business","a home renovation","a car purchase",
  "an education fund","a medical expense","farm equipment",
  "a restaurant opening","solar panel installation",
];

const DEPOSITORS = [
  "Sunrise Corp","Green Valley Farm","City Pension Fund",
  "Dr. Al-Rashid","The Goldstein Trust","Metro Retailers",
  "Harbour Logistics","Blue Peak Holdings",
];

const RANDOM_EVENTS = [
  {
    icon:"📋", title:"Audit Passed",
    desc:"Regulators gave your books a clean bill of health.",
    effect: b => { b.rep = Math.min(100, b.rep + 5); },
    msg: "Reputation +5", kind:"good",
  },
  {
    icon:"📰", title:"Positive Press",
    desc:"A reporter praised your community lending program.",
    effect: b => { b.rep = Math.min(100, b.rep + 3); },
    msg: "Reputation +3", kind:"good",
  },
  {
    icon:"📉", title:"Economic Downturn",
    desc:"Markets fell. Several borrowers are struggling to repay.",
    effect: b => {
      const loss = Math.min(b.loansOut, 150);
      b.loansOut -= loss;
      b.profit   -= loss;
    },
    msg: "Loan write-down: −$150", kind:"bad",
  },
  {
    icon:"🔫", title:"Robbery Attempt",
    desc:"Armed robbers hit the vault. Security held them off — barely.",
    effect: b => {
      const loss = Math.min(b.cash, 80);
      b.cash   -= loss;
      b.profit -= loss;
      b.rep = Math.max(0, b.rep - 4);
    },
    msg: "Cash −$80 · Reputation −4", kind:"bad",
  },
  {
    icon:"💡", title:"Central Bank Rate Cut",
    desc:"Lower rates mean your deposit interest costs drop slightly.",
    effect: b => { b.deposits = Math.max(0, b.deposits - 50); },
    msg: "Deposit liability −$50", kind:"good",
  },
  {
    icon:"🔍", title:"Fraud Attempt Foiled",
    desc:"A sharp teller caught a forged cheque before it cleared.",
    effect: () => {},
    msg: "Crisis averted — no loss.", kind:"neutral",
  },
  {
    icon:"⚠️", title:"Compliance Fine",
    desc:"Regulators flagged a paperwork issue. You must pay a fine.",
    effect: b => {
      b.cash   -= 50;
      b.profit -= 50;
      b.rep = Math.max(0, b.rep - 3);
    },
    msg: "Fine −$50 · Reputation −3", kind:"bad",
  },
  {
    icon:"🌟", title:"VIP Client Interest",
    desc:"A wealthy investor heard great things. Word is spreading.",
    effect: b => { b.rep = Math.min(100, b.rep + 4); },
    msg: "Reputation +4", kind:"good",
  },
];

// ── Event factories ───────────────────────────────────────────
// Each returns an event object with: icon, eventType, title, details[],
// approveLabel, denyLabel?, single, canApprove(), cantMsg?, onApprove(), onDeny()

function makeLoanEvent() {
  const name    = pick(NAMES);
  const purpose = pick(PURPOSES);
  const amount  = randInt(5, 80) * 10;
  const risk    = pick(["low","medium","high"]);
  const termMo  = pick([6, 12, 24, 36]);
  const termDays = termMo * 30;
  const rates   = { low: 0.06, medium: 0.12, high: 0.20 };
  const rate    = rates[risk];
  const totalInt = amount * rate * (termMo / 12);
  const dailyPay = (amount + totalInt) / termDays;
  const riskColour = { low:"green", medium:"yellow", high:"red" }[risk];

  return {
    icon: "📝",
    eventType: "Credit Application",
    title: name,
    details: [
      { key:"Purpose",     val: purpose },
      { key:"Amount",      val: fmt(amount) },
      { key:"Risk",        val: risk.toUpperCase(), cls: riskColour },
      { key:"Term",        val: `${termMo} months` },
      { key:"Interest",    val: `${(rate*100).toFixed(0)}% annual → ${fmt(totalInt)} total` },
      { key:"Your income", val: `${fmt(dailyPay)}/day`, cls:"green" },
    ],
    approveLabel: "✅ Approve",
    denyLabel:    "❌ Deny",
    single: false,
    canApprove: () => bank.cash >= amount,
    cantMsg: "Insufficient funds in the vault.",
    onApprove() {
      bank.cash     -= amount;
      bank.loansOut += amount;
      bank.loanBook.push({ principal: amount, termDays, daysLeft: termDays, dailyPay, name, risk });
      const bump = risk === "low" ? 2 : 1;
      bank.rep = Math.min(100, bank.rep + bump);
      bank.stats.loansApproved++;
      bank.stats.totalIssued += amount;
      return { msg:`Loan of ${fmt(amount)} approved. Reputation +${bump}.`, kind:"good" };
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

function makeDepositEvent() {
  const who    = pick(DEPOSITORS);
  const amount = randInt(20, 150) * 10;
  return {
    icon: "💰",
    eventType: "Deposit Proposal",
    title: who,
    details: [
      { key:"Amount", val: fmt(amount) },
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

function makeWithdrawalEvent() {
  const amount = randInt(5, 50) * 10;
  const canPay = () => bank.cash >= amount;
  return {
    icon: "🏧",
    eventType: "Withdrawal Demand",
    title: `${fmt(amount)} demanded`,
    details: [
      { key:"Amount", val: fmt(amount) },
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
      return { msg:`Withdrawal of ${fmt(amount)} processed.`, kind:"neutral" };
    },
    onDeny() {
      bank.rep = Math.max(0, bank.rep - 6);
      return { msg:`Refused withdrawal. Customer furious. Reputation −6.`, kind:"bad" };
    },
  };
}

function makeRandomEvent() {
  const ev = pick(RANDOM_EVENTS);
  return {
    icon: ev.icon,
    eventType: "Random Event",
    title: ev.title,
    details: [{ key:"Detail", val: ev.desc }],
    approveLabel: "Duly Noted",
    single: true,
    canApprove: () => true,
    onApprove() {
      ev.effect(bank);
      return { msg: ev.msg, kind: ev.kind };
    },
  };
}
