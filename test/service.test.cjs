const test = require("node:test");
const assert = require("node:assert/strict");
const Service = require("../js/service.js");

test("each daytime request has a short readable service sequence", () => {
  assert.deepEqual(Service.definition("Deposit Proposal").steps, ["Count the notes", "Post the deposit"]);
  assert.deepEqual(Service.definition("Credit Application").steps, ["Review the purpose", "Check the figures", "Prepare terms"]);
  assert.equal(Service.definition("Town Project"), null);
});

test("timing judgments are generous and every hit makes progress", () => {
  assert.equal(Service.judge(0.5, 0.5).id, "perfect");
  assert.equal(Service.judge(0.62, 0.5).id, "steady");
  assert.equal(Service.judge(0.9, 0.5).id, "rushed");
  assert.equal(Service.summarize(["perfect", "steady", "rushed"]).id, "steady");
  assert.equal(Service.summarize(["rushed", "rushed"]).steps, 2);
});

test("shift goals rise slowly across the focused week", () => {
  assert.equal(Service.shiftGoal(1), 7);
  assert.equal(Service.shiftGoal(4), 8);
  assert.equal(Service.shiftGoal(7), 10);
  assert.equal(Service.shiftGoal(40), 12);
});
