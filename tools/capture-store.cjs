const { app, BrowserWindow } = require("electron");
const { mkdirSync, writeFileSync } = require("node:fs");
const path = require("node:path");

app.disableHardwareAcceleration();

const root = path.join(__dirname, "..");
const outputDir = path.join(root, "assets", "store", "screenshots");
const scenarios = [
  { file: "01-branch-operations.png", query: "debugNoCustomers=1&dayDuration=600" },
  {
    file: "02-loan-decision.png",
    query: "debugSegment=merchants&debugService=loan&debugNoCustomers=1&dayDuration=600",
    action: "queue=[makeCustomerEvent()];qIdx=0;decisionOpen=true;renderEvent();document.getElementById('decisionLayer').classList.add('show')",
  },
  { file: "03-operations.png", query: "debugCampaign=1&debugNoCustomers=1&dayDuration=600", action: "openOperations()" },
  { file: "04-regions.png", query: "debugCampaign=1&debugRivals=1&debugNoCustomers=1&dayDuration=600", action: "openStrategy()" },
  {
    file: "05-build-mode.png",
    query: "debugCampaign=1&debugNoCustomers=1&dayDuration=600",
    action: "setBuildMode(true);document.getElementById('guidanceCard')?.classList.remove('show')",
  },
  { file: "06-end-of-day.png", query: "debugNoCustomers=1&dayDuration=2", wait: 3600 },
  {
    file: "07-campaign-legacy.png",
    query: "debugVictory=1&debugNoCustomers=1&dayDuration=600",
    action: "showLegacyConclusion()",
    verify: "(() => { closeLegacyConclusion(); const closed = bank.campaign.victoryAcknowledged && !document.getElementById('legacyOverlay').classList.contains('show') && !decisionOpen; showLegacyConclusion(); return { closed, replayed: document.getElementById('legacyOverlay').classList.contains('show') }; })()",
  },
  {
    file: "08-territorial-charter.png",
    query: "debugCampaign=1&debugEvent=territorial_charter_bid&debugNoCustomers=1&dayDuration=600",
    action: "queue=[makeCustomerEvent()];qIdx=0;decisionOpen=true;renderEvent();document.getElementById('decisionLayer').classList.add('show')",
    verify: "(() => { const presented = document.getElementById('eventCard').textContent.includes('Territorial Charter Invitation'); const result = BankWorld.resolveWorldEvent(bank, 'territorial_charter_bid', 'seek_charter'); return { closed: presented && result.kind === 'good', replayed: BankWorld.pendingFollowUps(bank).some(item => item.eventId === 'charter_hearing') && bank.world.resolvedEventIds.includes('territorial_charter_bid') }; })()",
  },
  {
    file: "09-pricing-policy.png",
    query: "debugCampaign=1&debugNoCustomers=1&dayDuration=600",
    action: "openOperations();setDepositPricing('attract');setFeePricing('accessible');document.querySelector('.pricing-card')?.scrollIntoView({block:'center'})",
    verify: "(() => { const branch = BankCampaign.activeBranch(bank); const effects = BankCampaign.activePricingEffects(bank); return { closed: bank.depositPricing === 'attract' && branch.depositPricing === 'attract' && bank.feePricing === 'accessible' && branch.feePricing === 'accessible', replayed: effects.depositDemand === 1.28 && effects.feeMultiplier === 0.7 && document.querySelectorAll('.pricing-card .policy-option.active').length === 2 }; })()",
  },
];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const windows = [];

async function capture(scenario, index) {
  const win = new BrowserWindow({
    show: false,
    frame: false,
    useContentSize: true,
    width: 1920,
    height: 1080,
    backgroundColor: "#1a100b",
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: `store-capture-${index}-${Date.now()}`,
    },
  });
  windows.push(win);
  await win.loadFile(path.join(root, "index.html"), { query: Object.fromEntries(new URLSearchParams(scenario.query)) });
  win.setContentSize(1920, 1080);
  await delay(1200);
  if (scenario.action) {
    await win.webContents.executeJavaScript(scenario.action, true);
    await delay(500);
  }
  if (scenario.wait) await delay(scenario.wait);
  const image = await win.webContents.capturePage();
  const size = image.getSize();
  if (size.width !== 1920 || size.height !== 1080) throw new Error(`${scenario.file} captured at ${size.width}x${size.height}`);
  writeFileSync(path.join(outputDir, scenario.file), image.toPNG());
  process.stdout.write(`Captured ${scenario.file}\n`);
  if (scenario.verify) {
    const result = await win.webContents.executeJavaScript(scenario.verify, true);
    if (!result?.closed || !result?.replayed) throw new Error(`${scenario.file} failed its interaction verification`);
    process.stdout.write(`Verified ${scenario.file} deterministic interaction state\n`);
  }
}

app.whenReady().then(async () => {
  mkdirSync(outputDir, { recursive: true });
  for (const [index, scenario] of scenarios.entries()) await capture(scenario, index);
  for (const win of windows) win.destroy();
  app.quit();
}).catch(error => {
  console.error(error);
  for (const win of windows) win.destroy();
  app.exit(1);
});
