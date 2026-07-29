// Persistent Silver Creek customers and lightweight relationship consequences.
(function exposeCommunity(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BankCommunity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCommunity() {
  const CAST = Object.freeze({
    carmen: Object.freeze({
      id: "carmen", name: "Carmen Reyes", organization: "Reyes Family Fund", segment: "households",
      approvedOutcome: "The household has room to plan past the next payday.",
      deniedOutcome: "She postponed the purchase and made do with what the family had.",
    }),
    elena: Object.freeze({
      id: "elena", name: "Elena Ivanova", organization: "Green Valley Farm", segment: "ranchers",
      approvedOutcome: "The herd made it through the first snow well-fed and healthy.",
      deniedOutcome: "She sold two young calves to buy enough feed for the winter.",
    }),
    hiro: Object.freeze({
      id: "hiro", name: "Hiro Tanaka", organization: "Tanaka Household", segment: "households",
      approvedOutcome: "The work was finished before the cold settled into the house.",
      deniedOutcome: "The family sealed one room and left the rest of the house cold.",
    }),
    liam: Object.freeze({
      id: "liam", name: "Liam Nkosi", organization: "Copper Ridge Crew", segment: "miners",
      approvedOutcome: "New supports prevented a collapse when the western shaft shifted.",
      deniedOutcome: "The crew pooled their wages for used timbers and lost two weeks of work.",
    }),
    grace: Object.freeze({
      id: "grace", name: "Grace Liu", organization: "Blue Peak Outfitters", segment: "merchants",
      approvedOutcome: "Her shelves stayed stocked through the busiest week of the season.",
      deniedOutcome: "She reduced the order and turned several families away empty-handed.",
    }),
    samir: Object.freeze({
      id: "samir", name: "Samir Haddad", organization: "Haddad Bakery", segment: "merchants",
      approvedOutcome: "The new oven now draws a warm line of customers before sunrise.",
      deniedOutcome: "He repaired the old oven again and cut bread production in half.",
    }),
  });

  const DECISION_LABELS = Object.freeze({
    "loan-approved": "Loan approved",
    "loan-denied": "Loan declined",
    account: "Account opened",
    deposit: "Deposit accepted",
    withdrawal: "Withdrawal paid",
    followup: "Shared an update",
  });

  function migrate(bank) {
    const source = bank.community && typeof bank.community === "object" ? bank.community : {};
    const sourceRelationships = source.relationships && typeof source.relationships === "object"
      ? source.relationships : {};
    const relationships = {};
    for (const id of Object.keys(CAST)) {
      const saved = sourceRelationships[id] || {};
      relationships[id] = {
        visits: Math.max(0, Number(saved.visits) || 0),
        trust: Math.max(-5, Math.min(10, Number(saved.trust) || 0)),
        lastDecision: typeof saved.lastDecision === "string" ? saved.lastDecision : null,
        lastDay: Math.max(0, Number(saved.lastDay) || 0),
        history: Array.isArray(saved.history) ? saved.history.slice(-6).filter(Boolean) : [],
      };
    }
    bank.community = {
      relationships,
      followUps: Array.isArray(source.followUps)
        ? source.followUps.filter(item => item && CAST[item.customerId]).map(item => ({
            id: String(item.id),
            customerId: item.customerId,
            dueDay: Math.max(1, Number(item.dueDay) || 1),
            sourceDay: Math.max(1, Number(item.sourceDay) || 1),
            decision: item.decision === "approved" ? "approved" : "denied",
            amount: Math.max(0, Number(item.amount) || 0),
            risk: ["low", "medium", "high"].includes(item.risk) ? item.risk : "medium",
            purpose: String(item.purpose || "their plans"),
            resolved: Boolean(item.resolved),
          }))
        : [],
    };
    bank.community.followUps = bank.community.followUps.slice(-24);
    return bank.community;
  }

  function dayTheme(day) {
    const themes = [
      { title: "Opening Day", summary: "Meet Silver Creek at the counter" },
      { title: "First Snow", summary: "Familiar faces return with winter plans" },
      { title: "News Travels", summary: "Earlier choices begin coming home" },
      { title: "A Town at Work", summary: "Small businesses prepare for the thaw" },
      { title: "Counting the Cost", summary: "The mill plan meets the bank's ledger" },
      { title: "Neighbors at the Table", summary: "Local suppliers decide what they can risk" },
      { title: "The Decision", summary: "Silver Creek chooses what it will build together" },
      { title: "A Bank with Roots", summary: "Open-ended life continues after the town's choice" },
    ];
    return themes[(Math.max(1, Number(day) || 1) - 1) % themes.length];
  }

  function customer(id) {
    return CAST[id] || null;
  }

  function relationship(bank, customerId) {
    migrate(bank);
    const state = bank.community.relationships[customerId];
    const lastLabel = state.lastDecision ? (DECISION_LABELS[state.lastDecision] || state.lastDecision) : null;
    return {
      visits: state.visits,
      visitNumber: state.visits + 1,
      trust: state.trust,
      isReturning: state.visits > 0,
      lastDecision: state.lastDecision,
      lastLabel,
      text: state.visits > 0
        ? `Returning customer · Visit ${state.visits + 1}${lastLabel ? ` · Last time: ${lastLabel}` : ""}`
        : "First visit to your counter",
    };
  }

  function profile(bank, customerId, service, overrides = {}) {
    const person = customer(customerId);
    if (!person) return null;
    const generated = BankMarket.customerProfileForSegment(person.segment, service, () => 0.35);
    return {
      ...generated,
      name: person.name,
      organization: person.organization,
      communityId: customerId,
      ...overrides,
    };
  }

  function record(bank, customerId, entry = {}) {
    if (!customer(customerId)) return null;
    migrate(bank);
    const state = bank.community.relationships[customerId];
    const decision = entry.decision || entry.service || "visit";
    const trustDelta = Number(entry.trustDelta) || 0;
    state.visits += 1;
    state.trust = Math.max(-5, Math.min(10, state.trust + trustDelta));
    state.lastDecision = decision;
    state.lastDay = Math.max(1, Number(entry.day) || Number(bank.day) || 1);
    state.history.push({
      day: state.lastDay,
      decision,
      amount: Math.max(0, Number(entry.amount) || 0),
      purpose: String(entry.purpose || ""),
    });
    state.history = state.history.slice(-6);
    return state;
  }

  function scheduleLoanFollowUp(bank, customerId, decision, context = {}) {
    if (!customer(customerId)) return null;
    migrate(bank);
    const sourceDay = Math.max(1, Number(bank.day) || 1);
    const id = `${customerId}-loan-${sourceDay}`;
    const existing = bank.community.followUps.find(item => item.id === id);
    if (existing) return existing;
    const item = {
      id,
      customerId,
      sourceDay,
      dueDay: sourceDay + 2,
      decision: decision === "approved" ? "approved" : "denied",
      amount: Math.max(0, Number(context.amount) || 0),
      risk: ["low", "medium", "high"].includes(context.risk) ? context.risk : "medium",
      purpose: String(context.purpose || "their plans"),
      resolved: false,
    };
    bank.community.followUps.push(item);
    return item;
  }

  function pendingFollowUps(bank, queuedIds = []) {
    migrate(bank);
    const queued = new Set(queuedIds);
    return bank.community.followUps
      .filter(item => !item.resolved && item.dueDay <= bank.day && !queued.has(item.id))
      .sort((a, b) => a.dueDay - b.dueDay || a.id.localeCompare(b.id));
  }

  function followUpPresentation(bank, item) {
    const person = customer(item.customerId);
    if (!person) return null;
    const approved = item.decision === "approved";
    const standingDelta = approved ? (item.risk === "high" ? 3 : 2) : (item.risk === "high" ? 0 : -1);
    return {
      title: person.name,
      organization: person.organization,
      story: approved
        ? `${person.name} returns with news: ${person.approvedOutcome}`
        : `${person.name} returns with news: ${person.deniedOutcome}`,
      decisionLabel: approved ? "You backed this plan" : "You protected the vault",
      standingDelta,
      result: approved
        ? `${person.name}'s progress has become part of the bank's story. Standing +${standingDelta}.`
        : standingDelta < 0
          ? `${person.name} remembers that the bank could not help. Standing ${standingDelta}.`
          : `${person.name} found another way through. The bank avoided the risk.`,
    };
  }

  function resolveFollowUp(bank, followUpId) {
    migrate(bank);
    const item = bank.community.followUps.find(entry => entry.id === followUpId && !entry.resolved);
    if (!item) return null;
    const presentation = followUpPresentation(bank, item);
    item.resolved = true;
    bank.rep = Math.max(0, Math.min(100, bank.rep + presentation.standingDelta));
    record(bank, item.customerId, { service: "followup", decision: "followup", day: bank.day });
    return { item, presentation };
  }

  return Object.freeze({
    CAST,
    DECISION_LABELS,
    migrate,
    dayTheme,
    customer,
    relationship,
    profile,
    record,
    scheduleLoanFollowUp,
    pendingFollowUps,
    followUpPresentation,
    resolveFollowUp,
  });
});
