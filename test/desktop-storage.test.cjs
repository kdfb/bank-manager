const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createDurableStore } = require("../desktop/storage.cjs");

test("desktop store writes and recovers a complete serialized save map", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bank-manager-store-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const target = path.join(directory, "nested", "bank-manager-saves.json");
  const store = createDurableStore(target, 10_000);
  const serialized = JSON.stringify({ bankSave: JSON.stringify({ version: 5, bank: { day: 8 } }) });
  assert.equal(store.write(serialized), true);
  assert.equal(store.read(), serialized);
  assert.equal(fs.existsSync(`${target}.tmp`), false);
});

test("desktop store rejects malformed, oversized, and non-string entries", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bank-manager-store-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = createDurableStore(path.join(directory, "saves.json"), 40);
  assert.equal(store.write("not json"), false);
  assert.equal(store.write(JSON.stringify({ bankSave: { version: 5 } })), false);
  assert.equal(store.write(JSON.stringify({ bankSave: "x".repeat(80) })), false);
  assert.equal(store.read(), "{}");
});

test("desktop store treats a corrupt existing file as an empty recoverable store", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bank-manager-store-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const target = path.join(directory, "saves.json");
  fs.writeFileSync(target, "broken", "utf8");
  const store = createDurableStore(target);
  assert.equal(store.read(), "{}");
  assert.equal(store.write(JSON.stringify({ bankSettings: "{}" })), true);
  assert.equal(store.read(), JSON.stringify({ bankSettings: "{}" }));
});
