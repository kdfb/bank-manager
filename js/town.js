// Focused seven-day Silver Creek campaign and authored local conclusion.
(function exposeTown(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BankTown = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTown() {
  const MOMENTS = Object.freeze([
    Object.freeze({ id: "mill-survey", dueDay: 4, title: "The Mill Question" }),
    Object.freeze({ id: "supplier-note", dueDay: 6, title: "Neighbors at the Table" }),
    Object.freeze({ id: "mill-finale", dueDay: 7, title: "The Silver Creek Decision" }),
  ]);

  function migrate(bank) {
    const source = bank.town && typeof bank.town === "object" ? bank.town : {};
    const known = new Set(MOMENTS.map(moment => moment.id));
    const choices = Array.isArray(source.choices)
      ? source.choices.filter(entry => entry && known.has(entry.id)).map(entry => ({
          id: entry.id,
          choice: String(entry.choice || ""),
          day: Math.max(1, Number(entry.day) || 1),
        }))
      : [];
    bank.town = {
      project: "silver-creek-mill",
      choices: choices.filter((entry, index) => choices.findIndex(other => other.id === entry.id) === index),
      outcome: ["cooperative", "repair"].includes(source.outcome) ? source.outcome : null,
      completedDay: Math.max(0, Number(source.completedDay) || 0) || null,
      acknowledged: Boolean(source.acknowledged),
    };
    return bank.town;
  }

  function choice(bank, id) {
    migrate(bank);
    return bank.town.choices.find(entry => entry.id === id) || null;
  }

  function recordChoice(bank, id, selected) {
    migrate(bank);
    if (!MOMENTS.some(moment => moment.id === id) || choice(bank, id)) return choice(bank, id);
    const entry = { id, choice: String(selected), day: Math.max(1, Number(bank.day) || 1) };
    bank.town.choices.push(entry);
    return entry;
  }

  function nextMoment(bank, queuedIds = []) {
    migrate(bank);
    const queued = new Set(queuedIds);
    return MOMENTS.find(moment => moment.dueDay <= bank.day && !choice(bank, moment.id) && !queued.has(moment.id)) || null;
  }

  function complete(bank, outcome) {
    migrate(bank);
    recordChoice(bank, "mill-finale", outcome);
    bank.town.outcome = outcome === "cooperative" ? "cooperative" : "repair";
    bank.town.completedDay = Math.max(1, Number(bank.day) || 1);
    return bank.town;
  }

  function isComplete(bank) {
    migrate(bank);
    return Boolean(bank.town.outcome && bank.town.completedDay);
  }

  function identity(bank) {
    migrate(bank);
    const approved = Math.max(0, Number(bank.stats?.loansApproved) || 0);
    const denied = Math.max(0, Number(bank.stats?.loansDenied) || 0);
    const trust = Object.values(bank.community?.relationships || {})
      .reduce((sum, relationship) => sum + (Number(relationship?.trust) || 0), 0);
    const cautiousSignals = bank.town.choices.filter(entry => ["self-fund", "collateral", "repair"].includes(entry.choice)).length;
    const communitySignals = bank.town.choices.filter(entry => ["survey", "bridge", "cooperative"].includes(entry.choice)).length;
    if (cautiousSignals >= 2 || denied > approved + 1) {
      return {
        id: "steward",
        title: "The Careful Steward",
        summary: "Silver Creek learned that your promises were measured, legible, and built to survive a bad season.",
      };
    }
    if (communitySignals >= 2 || trust >= 10) {
      return {
        id: "neighbor",
        title: "The Neighbors' Bank",
        summary: "People came to see the bank as a partner that remembered names and understood what money was for.",
      };
    }
    return {
      id: "builder",
      title: "The Practical Builder",
      summary: "Your bank became known for turning workable plans into durable local businesses without betting the whole vault.",
    };
  }

  function summary(bank, currentNetWorth) {
    if (!isComplete(bank)) return null;
    const style = identity(bank);
    const cooperative = bank.town.outcome === "cooperative";
    const relationships = Object.values(bank.community?.relationships || {});
    const knownCustomers = relationships.filter(entry => (entry.visits || 0) > 1).length;
    const trustedCustomers = relationships.filter(entry => (entry.trust || 0) > 0).length;
    return {
      title: style.title,
      identity: style,
      outcome: bank.town.outcome,
      completedDay: bank.town.completedDay,
      headline: cooperative ? "The cooperative mill will open in spring" : "The old mill will turn another season",
      epilogue: cooperative
        ? "At first thaw, Elena's grain and Samir's first flour crossed the same counter. The loan remains a real obligation, but the town now owns a piece of its future."
        : "The repaired wheel turns more slowly, but it turns without placing the town or the bank under a crushing obligation. Silver Creek bought time and kept its options open.",
      styleSummary: style.summary,
      metrics: {
        netCapital: Number(currentNetWorth) || 0,
        customersServed: Math.max(0, Number(bank.stats?.customersServed) || 0),
        knownCustomers,
        trustedCustomers,
        loansApproved: Math.max(0, Number(bank.stats?.loansApproved) || 0),
        loansDenied: Math.max(0, Number(bank.stats?.loansDenied) || 0),
      },
    };
  }

  return Object.freeze({
    MOMENTS,
    migrate,
    choice,
    recordChoice,
    nextMoment,
    complete,
    isComplete,
    identity,
    summary,
  });
});
