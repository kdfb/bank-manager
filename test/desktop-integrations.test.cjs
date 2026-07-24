const test = require("node:test");
const assert = require("node:assert/strict");
const { ACHIEVEMENT_IDS, sanitizePresence, createPlatformServices } = require("../desktop/integrations.cjs");

test("desktop integration boundary remains disabled without a native provider", () => {
  const services = createPlatformServices();
  assert.deepEqual(services.capabilities, { desktop: true, achievements: false, richPresence: false, cloudSaves: false });
  assert.equal(services.unlockAchievement("FIRST_DAY"), false);
  assert.equal(services.setRichPresence({ state: "Playing", details: "Day 1" }), false);
});

test("desktop integration boundary validates achievements and sanitizes presence", () => {
  const unlocked = [];
  const presences = [];
  const services = createPlatformServices({
    cloudSaves: true,
    unlockAchievement(id) { unlocked.push(id); },
    setRichPresence(value) { presences.push(value); },
  });
  assert.equal(services.unlockAchievement("FIRST_CUSTOMER"), true);
  assert.equal(services.unlockAchievement("NOT_REAL"), false);
  assert.deepEqual(unlocked, ["FIRST_CUSTOMER"]);
  assert.equal(services.setRichPresence({
    state: "Managing\u0000 branches",
    details: "Day 9",
    day: 9,
    branchCount: 3,
    campaignComplete: false,
    arbitrary: "discarded",
  }), true);
  assert.deepEqual(presences, [{ state: "Managing  branches", details: "Day 9", day: 9, branchCount: 3, campaignComplete: false }]);
  assert.equal(services.setRichPresence({ state: "", details: "No state" }), false);
  assert.ok(ACHIEVEMENT_IDS.includes("BANKING_LEGACY"));
});

test("presence limits lengths and numeric ranges", () => {
  const sanitized = sanitizePresence({ state: "x".repeat(120), details: "y".repeat(120), day: -4, branchCount: 500 });
  assert.equal(sanitized.state.length, 96);
  assert.equal(sanitized.details.length, 96);
  assert.equal(sanitized.day, 1);
  assert.equal(sanitized.branchCount, 99);
});
