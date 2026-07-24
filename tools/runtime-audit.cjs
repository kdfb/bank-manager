const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const path = require("node:path");

app.disableHardwareAcceleration();

const root = path.join(__dirname, "..");
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 760, height: 800 },
  { width: 390, height: 844 },
];

function delta(after, before) {
  return Object.fromEntries(Object.keys(after).map(key => [key, after[key] - before[key]]));
}

async function layoutAudit(win, viewport) {
  win.setContentSize(viewport.width, viewport.height);
  await delay(120);
  return win.webContents.executeJavaScript(`(() => {
    const shown = [...document.querySelectorAll('.overlay.show')];
    const box = shown[0]?.querySelector('.overlay-box');
    const rect = box?.getBoundingClientRect();
    const visible = selector => {
      const element = document.querySelector(selector);
      if (!element || getComputedStyle(element).display === 'none') return null;
      const value = element.getBoundingClientRect();
      return { x:value.x, y:value.y, right:value.right, bottom:value.bottom, width:value.width, height:value.height };
    };
    return {
      viewport: [innerWidth, innerHeight],
      shown: shown.map(element => element.id),
      focusedInside: shown.length === 1 && shown[0].contains(document.activeElement),
      box: rect ? { x:rect.x, y:rect.y, right:rect.right, bottom:rect.bottom, width:rect.width, height:rect.height } : null,
      documentOverflow: document.documentElement.scrollWidth - innerWidth,
      panelOverflow: box ? box.scrollWidth - box.clientWidth : 0,
      hud: visible('.hud'),
      mode: visible('.mode-banner'),
      status: visible('.branch-status'),
      guidance: visible('.guidance-card.show'),
      decision: visible('#decisionLayer.show'),
      build: visible('#buildPanel.show'),
      ledger: visible('#ledgerPanel.show'),
    };
  })()`);
}

function assertContained(audit, label) {
  assert.equal(audit.shown.length, 1, `${label}: exactly one modal should be visible`);
  assert.equal(audit.focusedInside, true, `${label}: focus should remain inside the modal`);
  assert.ok(audit.box, `${label}: modal box missing`);
  assert.ok(audit.box.x >= -1 && audit.box.y >= -1, `${label}: modal starts outside viewport`);
  assert.ok(audit.box.right <= audit.viewport[0] + 1, `${label}: modal overflows horizontally`);
  assert.ok(audit.box.bottom <= audit.viewport[1] + 1, `${label}: modal overflows vertically`);
  assert.ok(audit.documentOverflow <= 1, `${label}: document has horizontal overflow`);
  assert.ok(audit.panelOverflow <= 1, `${label}: modal has horizontal overflow`);
}

app.whenReady().then(async () => {
  const errors = [];
  const win = new BrowserWindow({
    show: false,
    frame: false,
    useContentSize: true,
    width: 1280,
    height: 720,
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: `runtime-audit-${Date.now()}`,
    },
  });
  win.webContents.on("console-message", event => {
    if (event.level === "warning" || event.level === "error" || event.level >= 2) errors.push(event.message);
  });

  await win.loadFile(path.join(root, "index.html"), {
    query: { debugCampaign: "1", debugRivals: "1", debugNoCustomers: "1", dayDuration: "600" },
  });
  await delay(1400);

  const metricsBefore = await win.webContents.executeJavaScript("({ ...BankRuntimeMetrics })");
  await delay(1600);
  const metricsActive = await win.webContents.executeJavaScript("({ ...BankRuntimeMetrics })");
  await win.webContents.executeJavaScript("openOperations()");
  await delay(1600);
  const metricsModal = await win.webContents.executeJavaScript("({ ...BankRuntimeMetrics })");
  const activeDelta = delta(metricsActive, metricsBefore);
  const modalDelta = delta(metricsModal, metricsActive);

  assert.ok(metricsActive.canvasPixels <= 6_000_000, "canvas exceeds its six-megapixel budget");
  assert.ok(activeDelta.branchFrames >= 10, "branch loop did not remain active");
  assert.ok(activeDelta.branchDraws >= 10, "active branch did not render smoothly");
  assert.ok(activeDelta.clockPaints <= 20, "day clock performed redundant DOM paints");
  assert.ok(activeDelta.staticSceneRenders <= 1, "static room was rebuilt during steady-state play");
  assert.ok(modalDelta.branchDraws <= 9, "branch continued full-rate drawing behind a modal");
  assert.equal(modalDelta.clockPaints, 0, "paused modal continued painting the day clock");

  const layouts = [];
  for (const viewport of viewports) {
    await win.webContents.executeJavaScript("openOperations()");
    const operations = await layoutAudit(win, viewport);
    assertContained(operations, `${viewport.width}x${viewport.height} operations`);

    await win.webContents.executeJavaScript("openStrategy()");
    const strategy = await layoutAudit(win, viewport);
    assertContained(strategy, `${viewport.width}x${viewport.height} strategy`);
    assert.deepEqual(strategy.shown, ["strategyOverlay"], "opening Strategy must replace Operations");

    await win.webContents.executeJavaScript("openMenu()");
    const menu = await layoutAudit(win, viewport);
    assertContained(menu, `${viewport.width}x${viewport.height} menu`);
    assert.deepEqual(menu.shown, ["menuOverlay"], "opening Menu must replace Strategy");

    await win.webContents.executeJavaScript("closeMenu(); queue=[makeCustomerEvent()]; qIdx=0; decisionOpen=true; renderEvent(); setDecisionLayerVisible(true)");
    const decision = await layoutAudit(win, viewport);
    assert.equal(decision.shown.length, 0, `${viewport.width}x${viewport.height}: customer card should not create a second modal`);
    assert.ok(decision.decision, `${viewport.width}x${viewport.height}: decision card missing`);
    assert.equal(decision.status, null, `${viewport.width}x${viewport.height}: branch status overlaps a decision`);
    assert.equal(decision.mode, null, `${viewport.width}x${viewport.height}: goal banner overlaps a decision`);
    assert.ok(decision.documentOverflow <= 1, `${viewport.width}x${viewport.height}: decision creates horizontal overflow`);

    await win.webContents.executeJavaScript("setDecisionLayerVisible(false); decisionOpen=false; setBuildMode(true); setLedgerVisible(true)");
    const panels = await layoutAudit(win, viewport);
    assert.equal(panels.build, null, `${viewport.width}x${viewport.height}: Build and Ledger overlap`);
    assert.ok(panels.ledger, `${viewport.width}x${viewport.height}: Ledger should remain visible`);
    layouts.push({ viewport, operations: operations.box, strategy: strategy.box, menu: menu.box });
  }

  win.setContentSize(390, 844);
  await win.webContents.executeJavaScript("setLedgerVisible(false); settings.textScale='xlarge'; applySettings(); openOperations()");
  const largeText = await layoutAudit(win, { width: 390, height: 844 });
  assertContained(largeText, "390x844 extra-large text operations");
  await win.webContents.executeJavaScript("settings.textScale='normal'; applySettings(); closeOperations()");

  assert.deepEqual(errors, [], `console warnings/errors: ${errors.join(" | ")}`);
  process.stdout.write(`${JSON.stringify({ canvasPixels: metricsActive.canvasPixels, activeDelta, modalDelta, layouts, largeText: largeText.box })}\n`);
  win.destroy();
  app.quit();
}).catch(error => {
  console.error(error);
  app.exit(1);
});
