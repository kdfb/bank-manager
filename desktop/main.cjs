const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { createDurableStore } = require("./storage.cjs");
const { createPlatformServices } = require("./integrations.cjs");

const isDevelopment = !app.isPackaged;
const MAX_ARCHIVE_BYTES = 8 * 1024 * 1024;
const platformServices = createPlatformServices();

function storagePath() {
  return path.join(app.getPath("userData"), "bank-manager-saves.json");
}

function readStore() {
  return createDurableStore(storagePath(), MAX_ARCHIVE_BYTES).read();
}

function writeStore(serialized) {
  return createDurableStore(storagePath(), MAX_ARCHIVE_BYTES).write(serialized);
}

function trustedRenderer(event) {
  return event.senderFrame?.url?.startsWith("file:") === true;
}

ipcMain.on("bank-storage-read", event => {
  event.returnValue = trustedRenderer(event) ? readStore() : "{}";
});

ipcMain.on("bank-storage-write", (event, serialized) => {
  event.returnValue = trustedRenderer(event) && writeStore(serialized);
});

ipcMain.on("bank-platform-capabilities", event => {
  event.returnValue = trustedRenderer(event) ? platformServices.capabilities : { desktop: false };
});

ipcMain.on("bank-achievement-unlock", (event, id) => {
  event.returnValue = trustedRenderer(event) && platformServices.unlockAchievement(id);
});

ipcMain.on("bank-rich-presence", (event, presence) => {
  event.returnValue = trustedRenderer(event) && platformServices.setRichPresence(presence);
});

ipcMain.handle("bank-archive-export", async (event, serialized, suggestedName) => {
  if (!trustedRenderer(event) || typeof serialized !== "string" || Buffer.byteLength(serialized) > MAX_ARCHIVE_BYTES) return { ok: false };
  const safeName = String(suggestedName || "bank-manager-saves.json").replace(/[^a-z0-9._-]/gi, "-");
  const result = await dialog.showSaveDialog({
    title: "Export Bank Manager saves",
    defaultPath: path.join(app.getPath("documents"), safeName),
    filters: [{ name: "Bank Manager save archive", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  fs.writeFileSync(result.filePath, serialized, "utf8");
  return { ok: true, filePath: result.filePath };
});

ipcMain.handle("bank-archive-import", async event => {
  if (!trustedRenderer(event)) return { ok: false };
  const result = await dialog.showOpenDialog({
    title: "Import Bank Manager saves",
    properties: ["openFile"],
    filters: [{ name: "Bank Manager save archive", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
  const info = fs.statSync(result.filePaths[0]);
  if (info.size > MAX_ARCHIVE_BYTES) return { ok: false, reason: "Archive is larger than 8 MB." };
  return { ok: true, text: fs.readFileSync(result.filePaths[0], "utf8") };
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#101820",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", event => event.preventDefault());
  window.once("ready-to-show", () => window.show());
  window.loadFile(path.join(__dirname, "..", "index.html"));

  if (isDevelopment && process.env.BANK_MANAGER_DEVTOOLS === "1") {
    window.webContents.openDevTools({ mode: "detach" });
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
