const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bankPlatform", Object.freeze({
  readStore: () => ipcRenderer.sendSync("bank-storage-read"),
  writeStore: serialized => ipcRenderer.sendSync("bank-storage-write", serialized),
  exportArchive: (serialized, suggestedName) => ipcRenderer.invoke("bank-archive-export", serialized, suggestedName),
  importArchive: () => ipcRenderer.invoke("bank-archive-import"),
  capabilities: () => ipcRenderer.sendSync("bank-platform-capabilities"),
  unlockAchievement: id => ipcRenderer.sendSync("bank-achievement-unlock", id),
  setRichPresence: presence => ipcRenderer.sendSync("bank-rich-presence", presence),
}));
