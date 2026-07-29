const test = require("node:test");
const assert = require("node:assert/strict");
const Community = require("../js/community.js");

function bankFixture(overrides = {}) {
  return { day: 1, rep: 60, ...overrides };
}

test("legacy banks receive a clean relationship record for the Silver Creek cast", () => {
  const bank = bankFixture();
  Community.migrate(bank);
  assert.deepEqual(Object.keys(bank.community.relationships), Object.keys(Community.CAST));
  assert.equal(Community.relationship(bank, "elena").text, "First visit to your counter");
  assert.equal(bank.community.followUps.length, 0);
  assert.deepEqual(Community.dayTheme(3), {
    title: "News Travels",
    summary: "Earlier choices begin coming home",
  });
});

test("customer visits preserve a short readable decision history", () => {
  const bank = bankFixture();
  Community.record(bank, "elena", {
    decision: "loan-approved", amount: 300, purpose: "winter feed", trustDelta: 2,
  });
  const relationship = Community.relationship(bank, "elena");
  assert.equal(relationship.isReturning, true);
  assert.equal(relationship.visitNumber, 2);
  assert.match(relationship.text, /Last time: Loan approved/);
  assert.equal(bank.community.relationships.elena.trust, 2);
});

test("loan choices schedule one consequence two days later", () => {
  const bank = bankFixture();
  const first = Community.scheduleLoanFollowUp(bank, "elena", "approved", {
    amount: 300, purpose: "winter feed", risk: "medium",
  });
  const duplicate = Community.scheduleLoanFollowUp(bank, "elena", "approved", {
    amount: 300, purpose: "winter feed", risk: "medium",
  });
  assert.equal(first.id, duplicate.id);
  assert.equal(first.dueDay, 3);
  assert.equal(Community.pendingFollowUps(bank).length, 0);
  bank.day = 3;
  assert.equal(Community.pendingFollowUps(bank)[0].customerId, "elena");
});

test("resolving an approved plan visibly strengthens standing and the relationship", () => {
  const bank = bankFixture({ day: 1 });
  const followUp = Community.scheduleLoanFollowUp(bank, "liam", "approved", {
    amount: 400, purpose: "safer equipment", risk: "high",
  });
  bank.day = 3;
  const result = Community.resolveFollowUp(bank, followUp.id);
  assert.equal(result.presentation.standingDelta, 3);
  assert.equal(bank.rep, 63);
  assert.equal(Community.pendingFollowUps(bank).length, 0);
  assert.equal(Community.relationship(bank, "liam").isReturning, true);
});

test("a declined medium-risk request returns as a human consequence", () => {
  const bank = bankFixture({ day: 1 });
  const followUp = Community.scheduleLoanFollowUp(bank, "elena", "denied", {
    amount: 300, purpose: "winter feed", risk: "medium",
  });
  const presentation = Community.followUpPresentation({ ...bank, day: 3 }, followUp);
  assert.match(presentation.story, /sold two young calves/);
  assert.equal(presentation.standingDelta, -1);
});
