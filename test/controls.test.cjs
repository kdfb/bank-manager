const test = require("node:test");
const assert = require("node:assert/strict");

const BankControls = require("../js/controls.js");

function button(value = 0) {
  return { pressed: value >= 0.55, value };
}

function gamepad({ axes = [0, 0], pressed = [] } = {}) {
  const buttons = Array.from({ length: 16 }, () => button());
  pressed.forEach(index => { buttons[index] = button(1); });
  return { id: "Standard Test Pad", index: 2, mapping: "standard", axes, buttons };
}

test("controller axes use a dead zone and preserve full directional range", () => {
  assert.equal(BankControls.normalizeAxis(0.2), 0);
  assert.equal(BankControls.normalizeAxis(-0.22), 0);
  assert.equal(BankControls.normalizeAxis(1), 1);
  assert.equal(BankControls.normalizeAxis(-1), -1);
  assert.ok(BankControls.normalizeAxis(0.61) > 0.49);
});

test("standard gamepad mapping exposes gameplay, management, and build actions", () => {
  const snapshot = BankControls.snapshotGamepad(gamepad({
    axes: [0.65, -0.8],
    pressed: [0, 2, 4, 5, 6, 7, 8, 9, 12],
  }));
  assert.equal(snapshot.id, "Standard Test Pad");
  assert.equal(snapshot.index, 2);
  assert.equal(snapshot.mapping, "standard");
  for (const action of ["primary", "build", "operations", "strategy", "sell", "rotate", "guide", "menu", "up"]) {
    assert.equal(snapshot.buttons[action], true, `${action} should be pressed`);
  }
  assert.equal(snapshot.directions.up, true);
  assert.ok(snapshot.movement.x > 0);
  assert.ok(snapshot.movement.y < 0);
});

test("button transitions only fire once until the control is released", () => {
  const held = { primary: true, cancel: false, menu: true };
  assert.deepEqual(BankControls.edgeTransitions(held, {}), { primary: true, cancel: false, menu: true });
  assert.deepEqual(BankControls.edgeTransitions(held, held), { primary: false, cancel: false, menu: false });
  assert.deepEqual(BankControls.edgeTransitions({ ...held, primary: false }, held), { primary: false, cancel: false, menu: false });
});
