const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const sharp = require("sharp");

const root = join(__dirname, "..");
const storeDir = join(root, "assets", "store");

test("Steam deliverables match their declared dimensions and formats", async () => {
  const manifest = JSON.parse(readFileSync(join(storeDir, "store-assets.json"), "utf8"));
  assert.ok(manifest.sourceDimensions.width >= 1200);
  assert.ok(manifest.sourceDimensions.height >= 1200);
  assert.equal(manifest.deliverables.length, 11);
  for (const item of manifest.deliverables) {
    const file = join(storeDir, item.file);
    assert.ok(existsSync(file), `Missing ${item.file}`);
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.width, item.width, `${item.file} width`);
    assert.equal(metadata.height, item.height, `${item.file} height`);
  }
  const logo = await sharp(join(storeDir, "library-logo.png")).metadata();
  assert.equal(logo.hasAlpha, true);
});

test("store screenshots are nine real 1920x1080 gameplay captures", async () => {
  const expected = [
    "01-branch-operations.png",
    "02-loan-decision.png",
    "03-operations.png",
    "04-regions.png",
    "05-build-mode.png",
    "06-end-of-day.png",
    "07-campaign-legacy.png",
    "08-territorial-charter.png",
    "09-pricing-policy.png",
  ];
  for (const name of expected) {
    const file = join(storeDir, "screenshots", name);
    assert.ok(existsSync(file), `Missing ${name}; run npm run capture:store`);
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.width, 1920, `${name} width`);
    assert.equal(metadata.height, 1080, `${name} height`);
    assert.equal(metadata.format, "png");
  }
});

test("Windows distribution exposes portable and assisted installer targets", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.match(pkg.scripts["package:windows:all"], /portable nsis/);
  assert.equal(pkg.build.nsis.oneClick, false);
  assert.equal(pkg.build.nsis.perMachine, false);
  assert.equal(pkg.build.nsis.allowToChangeInstallationDirectory, true);
  assert.equal(pkg.build.nsis.deleteAppDataOnUninstall, false);
  assert.ok(pkg.build.files.includes("!assets/store/**/*"), "store submission artwork should not inflate the game package");
});
