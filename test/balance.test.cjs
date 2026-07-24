const test = require("node:test");
const assert = require("node:assert/strict");

test("240-day matrix preserves three viable strategies with distinct tradeoffs", async () => {
  const { runMatrix } = await import("../tools/balance.mjs");
  const matrix = runMatrix(240);
  const byId = Object.fromEntries(matrix.strategies.map(result => [result.id, result]));

  for (const result of matrix.strategies) {
    assert.ok(result.capitalGrowth > 0, `${result.id} should grow capital`);
    assert.ok(result.minNetworkCash > 0, `${result.id} should remain liquid`);
    assert.equal(result.profitableBranches, 3, `${result.id} should sustain all satellites`);
    assert.equal(result.victory, true, `${result.id} should reach the campaign conclusion`);
  }

  assert.ok(byId.conservative.totalDefaults < byId.balanced.totalDefaults);
  assert.ok(byId.balanced.totalDefaults < byId.growth.totalDefaults);
  assert.ok(byId.conservative.networkCash > byId.balanced.networkCash);
  assert.ok(byId.balanced.capitalGrowth > byId.conservative.capitalGrowth);
  assert.ok(byId.growth.networkShare > byId.balanced.networkShare);
  assert.ok(byId.growth.networkShare > byId.conservative.networkShare);
});

test("liquidity recovery tools restore cash with explicit capital costs", async () => {
  const { runRecoveryScenarios } = await import("../tools/balance.mjs");
  const recovery = runRecoveryScenarios();
  assert.equal(recovery.emergencyCredit.ok, true);
  assert.ok(recovery.emergencyCredit.cashAfter > recovery.emergencyCredit.cashBefore);
  assert.equal(recovery.emergencyCredit.debtAfter, 1_900);
  assert.equal(recovery.emergencyCredit.capitalCost, 150);
  assert.equal(recovery.emergencyCredit.cooldownEnforced, true);
  assert.equal(recovery.participationSale.ok, true);
  assert.ok(recovery.participationSale.cashAfter > recovery.participationSale.cashBefore);
  assert.equal(recovery.participationSale.loansAfter, 1_200);
  assert.equal(recovery.participationSale.capitalCost, 32);
});
