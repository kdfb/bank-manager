const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");

test("web entry point loads economy before dependent gameplay modules", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const platform = html.indexOf('src="js/platform.js"');
  const controls = html.indexOf('src="js/controls.js"');
  const economy = html.indexOf('src="js/economy.js"');
  const portfolio = html.indexOf('src="js/portfolio.js"');
  const world = html.indexOf('src="js/world.js"');
  const market = html.indexOf('src="js/market.js"');
  const town = html.indexOf('src="js/town.js"');
  const campaign = html.indexOf('src="js/campaign.js"');
  const achievements = html.indexOf('src="js/achievements.js"');
  const operations = html.indexOf('src="js/operations.js"');
  const guidance = html.indexOf('src="js/guidance.js"');
  const telemetry = html.indexOf('src="js/telemetry.js"');
  const bank = html.indexOf('src="js/bank.js"');
  const management = html.indexOf('src="js/management.js"');
  const help = html.indexOf('src="js/help.js"');
  const game = html.indexOf('src="js/game.js"');
  assert.ok(platform > -1 && platform < economy && platform < bank);
  assert.ok(controls > platform && controls < bank);
  assert.ok(portfolio > economy && portfolio < world);
  assert.ok(world > portfolio && world < market);
  assert.ok(market > world && market < campaign);
  assert.ok(town > market && town < campaign);
  assert.ok(campaign > market && campaign < operations);
  assert.ok(achievements > campaign && achievements < bank);
  assert.ok(operations > campaign && operations < bank);
  assert.ok(guidance > operations && guidance < bank);
  assert.ok(telemetry > guidance && telemetry < bank);
  assert.ok(management > bank && management < game);
  assert.ok(help > management && help < game);
});

test("desktop wrapper and all referenced local assets exist", () => {
  assert.ok(existsSync(join(root, "desktop", "main.cjs")));
  assert.ok(existsSync(join(root, "desktop", "preload.cjs")));
  const html = readFileSync(join(root, "index.html"), "utf8");
  const references = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => match[1]);
  for (const reference of references) {
    assert.ok(existsSync(join(root, reference)), `Missing ${reference}`);
  }
});

test("desktop shell uses an isolated durable storage bridge", () => {
  const main = readFileSync(join(root, "desktop", "main.cjs"), "utf8");
  const preload = readFileSync(join(root, "desktop", "preload.cjs"), "utf8");
  assert.match(main, /preload:\s*path\.join\(__dirname, "preload\.cjs"\)/);
  assert.match(main, /app\.getPath\("userData"\)/);
  assert.match(main, /bank-manager-saves\.json/);
  for (const channel of ["bank-storage-read", "bank-storage-write", "bank-archive-export", "bank-archive-import", "bank-platform-capabilities", "bank-achievement-unlock", "bank-rich-presence"]) {
    assert.match(main, new RegExp(channel));
    assert.match(preload, new RegExp(channel));
  }
  assert.match(preload, /contextBridge\.exposeInMainWorld/);
});

test("web manifest and service worker form a complete offline asset graph", () => {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.webmanifest"), "utf8"));
  const worker = readFileSync(join(root, "service-worker.js"), "utf8");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ["192x192", "512x512"]);
  for (const icon of manifest.icons) assert.ok(existsSync(join(root, icon.src)));
  const cached = [...worker.matchAll(/"\.\/([^"?]*)"/g)].map(match => match[1]).filter(Boolean);
  for (const reference of cached) assert.ok(existsSync(join(root, reference)), `Offline asset missing: ${reference}`);
  for (const required of ["index.html", "manifest.webmanifest", "css/style.css", "js/platform.js", "js/game.js"]) assert.ok(cached.includes(required));
  assert.match(worker, /caches\.match\(event\.request, \{ ignoreSearch: true \}\)/);
});

test("release icon assets are valid and configured for web and Windows", () => {
  const png = readFileSync(join(root, "assets", "release", "app-icon.png"));
  const ico = readFileSync(join(root, "assets", "release", "app-icon.ico"));
  const html = readFileSync(join(root, "index.html"), "utf8");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.ok(ico.readUInt16LE(4) >= 7);
  assert.match(html, /rel="icon"[^>]+assets\/release\/app-icon\.png/);
  assert.equal(pkg.build.win.icon, "assets/release/app-icon.ico");
});

test("Wild West sprite atlases are valid transparent PNG assets", () => {
  for (const name of ["characters-atlas.png", "furniture-atlas.png"]) {
    const file = readFileSync(join(root, "assets", "western", name));
    assert.equal(file.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(file.readUInt32BE(16), 1536);
    assert.equal(file.readUInt32BE(20), 1024);
    assert.ok(file.length > 100_000, `${name} appears unexpectedly small`);
  }
});

test("primary management actions are visible and explicitly labelled", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  for (const id of ["operationsBtn", "strategyBtn", "helpBtn", "buildModeBtn", "ledgerToggleBtn", "menuBtn"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test("accessibility controls and dialog semantics are present", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const settings = readFileSync(join(root, "js", "settings.js"), "utf8");
  for (const id of ["settingsPanel", "savePortabilityPanel", "saveArchiveInput", "guidanceCard", "guideOverlay", "guideCloseBtn"]) assert.match(html, new RegExp(`id="${id}"`));
  for (const overlay of ["menuOverlay", "operationsOverlay", "strategyOverlay", "guideOverlay", "legacyOverlay", "overlay", "eventInfoOverlay"]) {
    assert.match(html, new RegExp(`id="${overlay}"[^>]*role="dialog"[^>]*aria-modal="true"`));
  }
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /object-src 'none'/);
  assert.doesNotMatch(html, /user-scalable=no/);
  for (const preference of ["soundEnabled", "soundVolume", "tutorialsEnabled", "highContrast", "reducedMotion", "textScale", "controllerVibration"]) assert.match(settings, new RegExp(preference));
});

test("campaign conclusion is persistent, replayable, and preserves open-ended play", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const game = readFileSync(join(root, "js", "game.js"), "utf8");
  const render = readFileSync(join(root, "js", "render.js"), "utf8");
  const strategy = readFileSync(join(root, "js", "strategy.js"), "utf8");
  const branch = readFileSync(join(root, "js", "branch.js"), "utf8");
  assert.match(html, /id="legacyOverlay"[^>]*role="dialog"/);
  assert.match(game, /maybeShowCampaignConclusion\(\)/);
  assert.match(render, /BankTown\.isComplete\(bank\).*showSilverCreekConclusion/);
  assert.match(render, /bank\.town\.acknowledged\s*=\s*true/);
  assert.match(render, /bank\.campaign\.victoryAcknowledged\s*=\s*true/);
  assert.match(html, /Continue in open-ended mode/);
  assert.match(strategy, /View legacy report/);
  assert.match(branch, /closeLegacyConclusion/);
});

test("branch pricing controls use shared policy definitions in active and regional management", () => {
  const events = readFileSync(join(root, "js", "events.js"), "utf8");
  const game = readFileSync(join(root, "js", "game.js"), "utf8");
  const branch = readFileSync(join(root, "js", "branch.js"), "utf8");
  const management = readFileSync(join(root, "js", "management.js"), "utf8");
  const strategy = readFileSync(join(root, "js", "strategy.js"), "utf8");
  assert.match(events, /activePricingEffects/);
  assert.match(game, /pricingEffects\.depositInterestCost/);
  assert.match(branch, /activePricingEffects\(bank\)\.customerDemand/);
  for (const source of [management, strategy]) {
    assert.match(source, /DEPOSIT_PRICING/);
    assert.match(source, /FEE_PRICING/);
  }
});

test("standard gamepad and fullscreen controls cover branch, build, and management actions", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const controls = readFileSync(join(root, "js", "controls.js"), "utf8");
  const branch = readFileSync(join(root, "js", "branch.js"), "utf8");
  const help = readFileSync(join(root, "js", "help.js"), "utf8");
  assert.match(html, /id="controllerStatus"/);
  assert.match(html, /class="gamepad-control"/);
  for (const action of ["primary", "cancel", "build", "ledger", "operations", "strategy", "sell", "rotate", "guide", "menu"]) {
    assert.match(controls, new RegExp(`${action}:\\s*\\d+`));
  }
  assert.match(branch, /moveControllerBuildCursor/);
  assert.match(branch, /activateControllerBuildCursor/);
  assert.match(help, /requestFullscreen/);
  assert.match(help, /Controller reference/);
});

test("desktop suspend and focus loss preserve the clock, save state, and clear held input", () => {
  const timers = readFileSync(join(root, "js", "timers.js"), "utf8");
  const branch = readFileSync(join(root, "js", "branch.js"), "utf8");
  assert.match(timers, /visibilitychange/);
  assert.match(timers, /visibilityPaused/);
  assert.match(timers, /saveGame\(\)/);
  assert.match(branch, /addEventListener\("blur"/);
  assert.match(branch, /keysDown\s*=\s*\{\}/);
});

test("runtime performance keeps static scenery cached and background UI throttled", () => {
  const branch = readFileSync(join(root, "js", "branch.js"), "utf8");
  const timers = readFileSync(join(root, "js", "timers.js"), "utf8");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.match(branch, /6_000_000/);
  assert.match(branch, /drawStaticScene/);
  assert.match(branch, /staticSceneRenders/);
  assert.match(branch, /ts - lastModalDrawAt >= 250/);
  assert.match(timers, /now - lastClockPaint >= 100/);
  assert.match(timers, /clockPaints/);
  assert.equal(pkg.scripts["audit:runtime"], "electron tools/runtime-audit.cjs");
  assert.ok(existsSync(join(root, "tools", "runtime-audit.cjs")));
});

test("mobile play keeps secondary actions compact and supports persistent camera zoom", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const css = readFileSync(join(root, "css", "style.css"), "utf8");
  const branch = readFileSync(join(root, "js", "branch.js"), "utf8");
  const settings = readFileSync(join(root, "js", "settings.js"), "utf8");
  assert.match(html, /id="mobileMoreBtn"[^>]*aria-expanded="false"/);
  assert.match(html, /id="mobileQuickMenu"[^>]*hidden/);
  assert.match(html, /id="zoomOutBtn"/);
  assert.match(html, /id="zoomResetBtn"/);
  assert.match(html, /id="zoomInBtn"/);
  assert.match(css, /\.hud-actions \.icon-btn:disabled\s*\{\s*display:\s*none/);
  assert.match(css, /\.guidance-card:not\(\.expanded\) p/);
  assert.match(branch, /handleCanvasPointerMove/);
  assert.match(branch, /fitScale \* \(settings\?\.cameraZoom/);
  assert.match(settings, /cameraZoom:\s*1\.25/);
  assert.match(settings, /Math\.max\(0\.8, Math\.min\(2\.2/);
});

test("the opening day is a focused five-appointment banking loop", () => {
  const game = readFileSync(join(root, "js", "game.js"), "utf8");
  const community = readFileSync(join(root, "js", "community.js"), "utf8");
  const events = readFileSync(join(root, "js", "events.js"), "utf8");
  const render = readFileSync(join(root, "js", "render.js"), "utf8");
  const css = readFileSync(join(root, "css", "style.css"), "utf8");
  assert.match(game, /function makeOpeningDayEvent/);
  for (const customer of ["Carmen Reyes", "Green Valley Farm", "Hiro Tanaka", "Copper Ridge Crew", "Blue Peak Outfitters"]) {
    assert.match(community, new RegExp(customer));
  }
  assert.match(events, /single:\s*true/);
  assert.match(events, /choicePreview/);
  assert.match(render, /No strategic tradeoff/);
  assert.match(render, /class="choice-grid"/);
  assert.match(render, /class="report-details"/);
  assert.match(css, /body\.decision-open \.interaction-prompt/);
});

test("named customers persist and loan choices return as later consequences", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const community = readFileSync(join(root, "js", "community.js"), "utf8");
  const game = readFileSync(join(root, "js", "game.js"), "utf8");
  const events = readFileSync(join(root, "js", "events.js"), "utf8");
  const render = readFileSync(join(root, "js", "render.js"), "utf8");
  assert.match(html, /js\/community\.js/);
  assert.match(community, /scheduleLoanFollowUp/);
  assert.match(community, /Returning customer/);
  assert.match(game, /makeRecurringCustomerEvent/);
  assert.match(game, /pendingFollowUps/);
  assert.match(events, /makeCommunityFollowUpEvent/);
  assert.match(render, /relationship-note/);
  assert.match(render, /Returning faces/);
});

test("the first management unlock stays focused on delegation and four improvements", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const floor = readFileSync(join(root, "js", "floor.js"), "utf8");
  const management = readFileSync(join(root, "js", "management.js"), "utf8");
  const render = readFileSync(join(root, "js", "render.js"), "utf8");
  assert.match(html, /id="achievementsPanel"[^>]*hidden/);
  assert.match(html, /id="telemetryPanel"[^>]*hidden/);
  assert.match(floor, /FOCUSED_UPGRADE_IDS[^\n]*teller_window[^\n]*risk_desk[^\n]*vault_upgrade[^\n]*lobby/);
  assert.match(management, /Mara Chen runs the public counter/);
  assert.match(management, /Loans and returning-customer follow-ups always come to you/);
  assert.match(management, /function renderEndOfDayReward/);
  assert.match(render, /renderEndOfDayReward/);
});

test("the focused campaign culminates in a local seven-day decision", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const game = readFileSync(join(root, "js", "game.js"), "utf8");
  const events = readFileSync(join(root, "js", "events.js"), "utf8");
  const render = readFileSync(join(root, "js", "render.js"), "utf8");
  const operations = readFileSync(join(root, "js", "operations.js"), "utf8");
  assert.match(html, /js\/town\.js/);
  assert.match(game, /BankTown\.nextMoment/);
  assert.match(events, /Could Silver Creek Own Its Mill/);
  assert.match(events, /What Kind of Town Will This Be/);
  assert.match(render, /function showSilverCreekConclusion/);
  assert.match(render, /The Silver Creek Ledger/);
  assert.match(operations, /const regional = branches > 1/);
});

test("delegation removes movement clutter and reports Mara's work visibly", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const css = readFileSync(join(root, "css", "style.css"), "utf8");
  const branch = readFileSync(join(root, "js", "branch.js"), "utf8");
  const render = readFileSync(join(root, "js", "render.js"), "utf8");
  assert.match(html, /id="staffServiceToast"[^>]*role="status"/);
  assert.match(css, /body\.delegated-counter \.touch-controls/);
  assert.match(branch, /function showStaffServiceToast/);
  assert.match(render, /class="town-report-thread"/);
  assert.match(render, /card\.scrollTop = 0/);
  const management = readFileSync(join(root, "js", "management.js"), "utf8");
  assert.match(management, /performance\.now\(\) \+ 800/);
});

test("one modal owns focus while incompatible branch panels close each other", () => {
  const help = readFileSync(join(root, "js", "help.js"), "utf8");
  const branch = readFileSync(join(root, "js", "branch.js"), "utf8");
  const css = readFileSync(join(root, "css", "style.css"), "utf8");
  assert.match(help, /function showAppDialog/);
  assert.match(help, /open\.classList\.remove\("show"\)/);
  assert.match(help, /shell\.inert = true/);
  assert.match(help, /function hideAppDialog/);
  assert.match(branch, /show && branchState\?\.mode === "build"/);
  assert.match(css, /body\.decision-open \.branch-status/);
  assert.match(css, /scrollbar-gutter: stable/);
});

test("save schema supports achievements and telemetry migration in version six", () => {
  const source = readFileSync(join(root, "js", "bank.js"), "utf8");
  assert.match(source, /version:\s*6/);
  assert.match(source, /\[1, 2, 3, 4, 5, 6\]/);
  assert.match(source, /BankTelemetry\.migrate/);
  assert.match(source, /BankAchievements\.migrate/);
  assert.match(source, /captureActiveBranch/);
});

test("achievement UI and native allowlist share the same platform identifiers", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const achievements = require("../js/achievements.js");
  const integrations = require("../desktop/integrations.cjs");
  assert.match(html, /id="achievementToast"/);
  assert.match(html, /id="achievementsPanel"/);
  assert.deepEqual(achievements.DEFINITIONS.map(entry => entry.id), integrations.ACHIEVEMENT_IDS);
});
