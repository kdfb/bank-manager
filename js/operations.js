// Pure branch-operations helpers shared by gameplay and automated tests.
(function exposeOperations(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BankOperations = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createOperations() {
  const BASE_PATIENCE_SECONDS = 60;
  const LOBBY_PATIENCE_BONUS = 12;
  const STAFF_CANDIDATES = Object.freeze([
    Object.freeze({
      id: "mara-chen",
      name: "Mara Chen",
      role: "Teller",
      specialty: "Consumer banking",
      hireCost: 600,
      dailyWage: 30,
      serviceMs: 4_200,
      assignments: Object.freeze(["counter"]),
      pitch: "A dependable teller for deposits, withdrawals, and new accounts.",
    }),
    Object.freeze({
      id: "isaac-turner",
      name: "Isaac Turner",
      role: "Loan Officer",
      specialty: "Credit review",
      hireCost: 900,
      dailyWage: 48,
      serviceMs: 5_000,
      assignments: Object.freeze(["loans"]),
      pitch: "An experienced underwriter who applies your lending policy to credit applications.",
    }),
    Object.freeze({
      id: "clara-reyes",
      name: "Clara Reyes",
      role: "Senior Cashier",
      specialty: "Queue control",
      hireCost: 1_100,
      dailyWage: 55,
      serviceMs: 3_100,
      assignments: Object.freeze(["counter", "loans"]),
      pitch: "A fast, flexible veteran who can cover either the public counter or the loan desk.",
    }),
  ]);
  const ASSIGNMENT_LABELS = Object.freeze({ counter: "Public counter", loans: "Loan desk" });

  function patienceSeconds(bank) {
    return BASE_PATIENCE_SECONDS
      + (bank.upgrades?.lobby || 0) * LOBBY_PATIENCE_BONUS
      + (bank.prestigeLevel || 0) * 2;
  }

  function waitSeconds(customer, nowMs) {
    if (!Number.isFinite(customer?.arrivedAt)) return 0;
    return Math.max(0, (nowMs - customer.arrivedAt) / 1000);
  }

  function patienceRatio(customer, nowMs, bank) {
    return Math.max(0, 1 - waitSeconds(customer, nowMs) / patienceSeconds(bank));
  }

  function queueHealth(customers, nowMs, bank) {
    const active = (customers || []).filter(customer => customer.state !== "leaving");
    const narratives = active.filter(customer => customer.event?.isNarrative);
    const waiting = active.filter(customer => !customer.event?.isNarrative);
    const waits = waiting.map(customer => waitSeconds(customer, nowMs));
    const ratios = waiting.map(customer => patienceRatio(customer, nowMs, bank));
    return {
      count: waiting.length,
      longestWait: waits.length ? Math.max(...waits) : 0,
      lowestPatience: ratios.length ? Math.min(...ratios) : 1,
      atRisk: ratios.filter(ratio => ratio <= 0.25).length,
      narratives: narratives.length,
    };
  }

  function staffCandidate(id) {
    return STAFF_CANDIDATES.find(candidate => candidate.id === id) || null;
  }

  function normalizeStaffMember(member) {
    const candidate = staffCandidate(member?.id) || STAFF_CANDIDATES[0];
    const assignments = candidate.assignments;
    const requestedAssignment = member?.assignment;
    const assignment = assignments.includes(requestedAssignment) ? requestedAssignment : assignments[0];
    return {
      ...candidate,
      ...member,
      assignments: [...assignments],
      assignment,
      level: Math.max(1, Math.min(3, Number(member?.level) || 1)),
      served: Math.max(0, Number(member?.served) || 0),
      dailyWage: Number.isFinite(member?.dailyWage) ? member.dailyWage : candidate.dailyWage,
    };
  }

  function migrateRoster(bank) {
    bank.staff = (bank.staff || []).map(normalizeStaffMember);
    return bank;
  }

  function taskForEvent(eventType) {
    if (eventType === "World Event" || eventType === "Branch Incident" || eventType === "Customer Follow-up" || eventType === "Town Project") return null;
    return eventType === "Credit Application" ? "loans" : "counter";
  }

  function workstationCapacity(bank, assignment) {
    if (assignment === "loans") return bank.upgrades?.risk_desk || 0;
    return 1 + (bank.upgrades?.teller_window || 0);
  }

  function staffServiceMs(member) {
    const candidate = staffCandidate(member?.id) || STAFF_CANDIDATES[0];
    const level = Math.max(1, Math.min(3, Number(member?.level) || 1));
    return Math.round((Number(member?.serviceMs) || candidate.serviceMs) * Math.pow(0.88, level - 1));
  }

  function activeStaff(bank, assignment) {
    const capacity = workstationCapacity(bank, assignment);
    return (bank.staff || [])
      .map(normalizeStaffMember)
      .filter(member => member.assignment === assignment && member.assignments.includes(assignment))
      .sort((left, right) => staffServiceMs(left) - staffServiceMs(right))
      .slice(0, capacity);
  }

  function selectStaffForEvent(bank, eventType) {
    const assignment = taskForEvent(eventType);
    if (!assignment) return null;
    const available = activeStaff(bank, assignment);
    if (!available.length) return null;
    const member = available.reduce((best, candidate) =>
      (candidate.served || 0) < (best.served || 0) ? candidate : best
    );
    return (bank.staff || []).find(entry => entry.id === member.id) || member;
  }

  function serviceIntervalMs(bank, eventType = "Deposit Proposal") {
    const assignment = taskForEvent(eventType);
    if (!assignment) return Infinity;
    const workers = activeStaff(bank, assignment);
    if (!workers.length) return Infinity;
    const throughputPerMs = workers.reduce((sum, member) => sum + (1 / staffServiceMs(member)), 0);
    const expressMultiplier = assignment === "counter" && bank.upgrades?.teller_window ? 0.7 : 1;
    return Math.max(1_300, Math.round((1 / throughputPerMs) * expressMultiplier));
  }

  function trainingCost(member) {
    const level = Math.max(1, Number(member?.level) || 1);
    return level >= 3 ? 0 : 250 * level;
  }

  function staffingSummary(bank) {
    const counter = activeStaff(bank, "counter");
    const loans = activeStaff(bank, "loans");
    return {
      hired: (bank.staff || []).length,
      active: counter.length + loans.length,
      counter: counter.length,
      loans: loans.length,
      counterIntervalMs: serviceIntervalMs(bank, "Deposit Proposal"),
      loanIntervalMs: serviceIntervalMs(bank, "Credit Application"),
    };
  }

  function dailyAppointmentTarget() {
    return 5;
  }

  function currentObjective(bank, currentNetWorth) {
    const served = bank.stats?.customersServed || 0;
    const upgrades = Object.values(bank.upgrades || {}).reduce((sum, count) => sum + count, 0);
    if (served < 5) {
      return { step: 1, total: 5, title: "Complete your first five appointments", progress: `${served}/5` };
    }
    const target = 1_200;
    if (currentNetWorth < target) {
      return {
        step: 2,
        total: 5,
        title: "Build a $1,200 capital cushion",
        progress: `$${Math.round(currentNetWorth).toLocaleString()} / $${target.toLocaleString()}`,
      };
    }
    if (served < 10) {
      return { step: 3, total: 5, title: "Get to know ten customers", progress: `${served}/10` };
    }
    if (!(bank.staff || []).length) {
      return { step: 4, total: 5, title: "Hire a teller for routine service", progress: "0/1" };
    }
    if (upgrades < 1) {
      return { step: 5, total: 5, title: "Choose one useful branch improvement", progress: "0/1" };
    }
    const townChoices = Array.isArray(bank.town?.choices) ? bank.town.choices : [];
    if (!bank.town?.outcome) {
      const next = townChoices.length < 1
        ? "Hear the mill proposal on day 4"
        : townChoices.length < 2
          ? "Prepare the mill financing"
          : "Make Silver Creek's decision on day 7";
      return { step: 6, total: 7, title: next, progress: `${townChoices.length}/3 town decisions` };
    }
    return {
      step: 7,
      total: 7,
      title: "Silver Creek remembers your bank",
      progress: "Local story complete",
      complete: true,
    };
  }

  // Progressive disclosure keeps the teller-first opening readable while
  // preserving every simulation system for the stage where it becomes useful.
  function featureAvailability(bank) {
    const served = Math.max(0, Number(bank.stats?.customersServed) || 0);
    const creditDecisions = Math.max(0,
      (Number(bank.stats?.loansApproved) || 0) + (Number(bank.stats?.loansDenied) || 0));
    const staff = Array.isArray(bank.staff) ? bank.staff : [];
    const branches = Array.isArray(bank.campaign?.branches) ? bank.campaign.branches.length : 1;
    const conditions = Object.keys(bank.world?.conditions || {}).length;
    const worldHistory = Array.isArray(bank.world?.history) ? bank.world.history.length : 0;
    const followUps = Array.isArray(bank.world?.followUps) ? bank.world.followUps.length : 0;
    const reserveRatio = (Number(bank.deposits) || 0) > 0
      ? (Number(bank.cash) || 0) / Number(bank.deposits)
      : 1;
    const staffing = served >= 10 || staff.length > 0;
    const building = staffing || Object.keys(bank.upgrades || {}).length > 0;
    const credit = creditDecisions > 0 || (bank.loanBook || []).length > 0
      || staff.some(member => member.assignment === "loans");
    const regional = branches > 1;
    return {
      stage: branches > 1 ? "Executive" : staff.length ? "Manager" : staffing ? "Operator" : "Teller",
      staffing,
      building,
      credit,
      market: served >= 10 || (Number(bank.prestigeLevel) || 0) >= 2,
      world: (Number(bank.day) || 1) >= 6 || conditions > 0 || worldHistory > 0 || followUps > 0,
      pricing: regional,
      regional,
      recovery: (Number(bank.cash) || 0) < 800 || reserveRatio < 0.15 || Boolean(bank.missedDebtPayment),
    };
  }

  return Object.freeze({
    BASE_PATIENCE_SECONDS,
    LOBBY_PATIENCE_BONUS,
    STAFF_CANDIDATES,
    ASSIGNMENT_LABELS,
    patienceSeconds,
    waitSeconds,
    patienceRatio,
    queueHealth,
    staffCandidate,
    normalizeStaffMember,
    migrateRoster,
    taskForEvent,
    workstationCapacity,
    staffServiceMs,
    activeStaff,
    selectStaffForEvent,
    serviceIntervalMs,
    trainingCost,
    staffingSummary,
    dailyAppointmentTarget,
    currentObjective,
    featureAvailability,
  });
});
