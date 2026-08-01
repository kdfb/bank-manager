(function exposeService(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BankService = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createService() {
  const DEFINITIONS = Object.freeze({
    "Account Opening": Object.freeze({ icon: "📒", label: "Open account", steps: Object.freeze(["Check identity", "Stamp the ledger"]) }),
    "Deposit Proposal": Object.freeze({ icon: "💵", label: "Take deposit", steps: Object.freeze(["Count the notes", "Post the deposit"]) }),
    "Withdrawal Demand": Object.freeze({ icon: "🏧", label: "Pay withdrawal", steps: Object.freeze(["Verify signature", "Count the payout"]) }),
    "Credit Application": Object.freeze({ icon: "✒", label: "Prepare loan", steps: Object.freeze(["Review the purpose", "Check the figures", "Prepare terms"]) }),
    "Customer Follow-up": Object.freeze({ icon: "🤝", label: "Hear update", steps: Object.freeze(["Listen carefully", "Update the ledger"]) }),
  });

  const QUALITY = Object.freeze({
    perfect: Object.freeze({ id: "perfect", label: "Perfect", points: 3, feeMultiplier: 1.25, standing: 1 }),
    steady: Object.freeze({ id: "steady", label: "Steady", points: 2, feeMultiplier: 1, standing: 0 }),
    rushed: Object.freeze({ id: "rushed", label: "Rushed", points: 1, feeMultiplier: 0.75, standing: 0 }),
  });

  function definition(eventType) {
    return DEFINITIONS[eventType] || null;
  }

  function targetFor(eventType, stepIndex = 0, customerId = 0) {
    const bases = [0.32, 0.67, 0.48];
    const eventOffset = [...String(eventType || "")].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 9;
    const customerOffset = Math.abs(Number(customerId) || 0) % 7;
    const offset = (eventOffset + customerOffset - 7) * 0.008;
    return Math.max(0.22, Math.min(0.78, bases[stepIndex % bases.length] + offset));
  }

  function judge(position, target) {
    const error = Math.abs((Number(position) || 0) - (Number(target) || 0));
    return error <= 0.065 ? QUALITY.perfect : error <= 0.16 ? QUALITY.steady : QUALITY.rushed;
  }

  function summarize(judgments = []) {
    const valid = judgments.map(entry => QUALITY[entry?.id] || QUALITY[entry] || QUALITY.rushed);
    const points = valid.reduce((sum, entry) => sum + entry.points, 0);
    const average = valid.length ? points / valid.length : 1;
    const quality = average >= 2.65 ? QUALITY.perfect : average >= 1.65 ? QUALITY.steady : QUALITY.rushed;
    return { ...quality, points, steps: valid.length };
  }

  function shiftGoal(day = 1) {
    return Math.min(12, 7 + Math.floor((Math.max(1, Number(day) || 1) - 1) / 2));
  }

  return Object.freeze({ DEFINITIONS, QUALITY, definition, targetFor, judge, summarize, shiftGoal });
});
