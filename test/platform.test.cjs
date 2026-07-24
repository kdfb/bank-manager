const test = require("node:test");
const assert = require("node:assert/strict");
const Platform = require("../js/platform.js");

function save(day = 4, version = 6) {
  return JSON.stringify({ version, bank: { day, cash: 2_000 }, settings: {}, branch: null, floor: [] });
}

function memoryStorage(initial = {}, failKey = null) {
  const values = { ...initial };
  return {
    values,
    getItem: key => values[key] ?? null,
    setItem(key, value) {
      if (key === failKey) return false;
      values[key] = value;
      return true;
    },
    removeItem(key) { delete values[key]; return true; },
  };
}

test("portable archive round-trips autosave, slots, and settings", () => {
  const source = memoryStorage({
    bankSave: save(12),
    bankSave_slot1: save(9),
    bankSettings: JSON.stringify({ highContrast: true }),
  });
  const archive = Platform.createArchive(source, "2026-07-24T00:00:00.000Z", "test");
  const summary = Platform.summarizeArchive(JSON.stringify(archive));
  assert.equal(summary.day, 12);
  assert.equal(summary.saveCount, 2);
  assert.equal(summary.slotCount, 1);

  const target = memoryStorage({ bankSave_slot3: save(2) });
  Platform.applyArchive(archive, target);
  assert.equal(JSON.parse(target.values.bankSave).bank.day, 12);
  assert.equal(JSON.parse(target.values.bankSettings).highContrast, true);
  assert.equal(target.values.bankSave_slot3, undefined);
});

test("archive validation rejects unknown entries and future save versions", () => {
  const base = Platform.createArchive(memoryStorage({ bankSave: save() }));
  assert.throws(() => Platform.parseArchive({ ...base, entries: { ...base.entries, arbitrary: "{}" } }), /unknown storage entry/);
  assert.throws(() => Platform.parseArchive({ ...base, entries: { bankSave: save(1, 99) } }), /unsupported save version/);
  assert.throws(() => Platform.parseArchive("not-json"), /not valid JSON/);
});

test("failed archive application rolls back all prior entries", () => {
  const original = save(3);
  const target = memoryStorage({ bankSave: original, bankSave_slot1: save(2) }, "bankSave_slot1");
  const archive = Platform.createArchive(memoryStorage({ bankSave: save(20), bankSave_slot1: save(18) }));
  assert.throws(() => Platform.applyArchive(archive, target), /Could not write/);
  assert.equal(target.values.bankSave, original);
  assert.equal(JSON.parse(target.values.bankSave_slot1).bank.day, 2);
});

test("archive must contain at least one real game save", () => {
  const archive = {
    format: Platform.ARCHIVE_FORMAT,
    archiveVersion: Platform.ARCHIVE_VERSION,
    entries: { bankSettings: JSON.stringify({ textScale: "large" }) },
  };
  assert.throws(() => Platform.parseArchive(archive), /contains no game saves/);
});
