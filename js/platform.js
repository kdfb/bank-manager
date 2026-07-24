// Shared browser/Electron storage, portable save archives, and offline registration.
(function exposePlatform(root, factory) {
  const api = factory(root);
  if (typeof module === "undefined" || !module.exports) root.BankPlatform = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPlatform(root) {
  const ARCHIVE_FORMAT = "bank-manager-save-archive";
  const ARCHIVE_VERSION = 1;
  const CURRENT_SAVE_VERSION = 6;
  const MAX_ARCHIVE_BYTES = 8 * 1024 * 1024;
  const SAVE_KEYS = Object.freeze(["bankSave", "bankSave_slot1", "bankSave_slot2", "bankSave_slot3", "bankSettings"]);
  const nativeBridge = root?.bankPlatform || null;
  let desktopStore = null;
  let platformCapabilities = null;
  let lastPresence = "";

  function safeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function loadDesktopStore() {
    if (!nativeBridge) return null;
    if (desktopStore) return desktopStore;
    try {
      const parsed = JSON.parse(nativeBridge.readStore() || "{}");
      desktopStore = safeObject(parsed) ? parsed : {};
    } catch (_) {
      desktopStore = {};
    }
    return desktopStore;
  }

  function flushDesktopStore() {
    if (!nativeBridge || !desktopStore) return true;
    return nativeBridge.writeStore(JSON.stringify(desktopStore)) === true;
  }

  function getItem(key) {
    if (!SAVE_KEYS.includes(key)) return null;
    if (nativeBridge) {
      const store = loadDesktopStore();
      if (typeof store[key] === "string") return store[key];
      // One-time migration from Electron's original localStorage-backed builds.
      try {
        const legacy = root.localStorage?.getItem(key);
        if (legacy != null) {
          store[key] = legacy;
          flushDesktopStore();
          return legacy;
        }
      } catch (_) {}
      return null;
    }
    try { return root.localStorage?.getItem(key) ?? null; } catch (_) { return null; }
  }

  function setItem(key, value) {
    if (!SAVE_KEYS.includes(key) || typeof value !== "string") return false;
    if (nativeBridge) {
      const store = loadDesktopStore();
      store[key] = value;
      try { root.localStorage?.setItem(key, value); } catch (_) {}
      return flushDesktopStore();
    }
    try { root.localStorage?.setItem(key, value); return true; } catch (_) { return false; }
  }

  function removeItem(key) {
    if (!SAVE_KEYS.includes(key)) return false;
    if (nativeBridge) {
      const store = loadDesktopStore();
      delete store[key];
      try { root.localStorage?.removeItem(key); } catch (_) {}
      return flushDesktopStore();
    }
    try { root.localStorage?.removeItem(key); return true; } catch (_) { return false; }
  }

  function validateSaveEntry(key, serialized) {
    if (typeof serialized !== "string") throw new Error(`${key} must be serialized JSON.`);
    let parsed;
    try { parsed = JSON.parse(serialized); } catch (_) { throw new Error(`${key} contains invalid JSON.`); }
    if (key === "bankSettings") {
      if (!safeObject(parsed)) throw new Error("Settings must be an object.");
      return parsed;
    }
    if (!safeObject(parsed) || !safeObject(parsed.bank)) throw new Error(`${key} is not a Bank Manager save.`);
    if (!Number.isInteger(parsed.version) || parsed.version < 1 || parsed.version > CURRENT_SAVE_VERSION) {
      throw new Error(`${key} uses an unsupported save version.`);
    }
    return parsed;
  }

  function createArchive(storage = { getItem }, generatedAt = null, source = nativeBridge ? "desktop" : "web") {
    const entries = {};
    for (const key of SAVE_KEYS) {
      const value = storage.getItem(key);
      if (value == null) continue;
      validateSaveEntry(key, value);
      entries[key] = value;
    }
    return {
      format: ARCHIVE_FORMAT,
      archiveVersion: ARCHIVE_VERSION,
      gameSaveVersion: CURRENT_SAVE_VERSION,
      generatedAt,
      source,
      entries,
    };
  }

  function parseArchive(input) {
    const serialized = typeof input === "string" ? input : JSON.stringify(input);
    if (serialized.length > MAX_ARCHIVE_BYTES) throw new Error("Save archive is larger than 8 MB.");
    let archive;
    try { archive = typeof input === "string" ? JSON.parse(input) : input; } catch (_) { throw new Error("Save archive is not valid JSON."); }
    if (!safeObject(archive) || archive.format !== ARCHIVE_FORMAT || archive.archiveVersion !== ARCHIVE_VERSION) {
      throw new Error("This is not a supported Bank Manager save archive.");
    }
    if (!safeObject(archive.entries)) throw new Error("Save archive has no entries.");
    const keys = Object.keys(archive.entries);
    if (keys.some(key => !SAVE_KEYS.includes(key))) throw new Error("Save archive contains an unknown storage entry.");
    if (!keys.some(key => key.startsWith("bankSave"))) throw new Error("Save archive contains no game saves.");
    keys.forEach(key => validateSaveEntry(key, archive.entries[key]));
    return archive;
  }

  function summarizeArchive(input) {
    const archive = parseArchive(input);
    const saves = Object.entries(archive.entries)
      .filter(([key]) => key.startsWith("bankSave"))
      .map(([key, value]) => ({ key, data: JSON.parse(value) }));
    const autosave = saves.find(save => save.key === "bankSave")?.data;
    return {
      generatedAt: archive.generatedAt || null,
      source: archive.source || "unknown",
      saveCount: saves.length,
      slotCount: saves.filter(save => save.key !== "bankSave").length,
      day: autosave?.bank?.day || Math.max(...saves.map(save => Number(save.data?.bank?.day) || 1)),
      archive,
    };
  }

  function applyArchive(input, storage = { getItem, setItem, removeItem }) {
    const archive = parseArchive(input);
    const previous = Object.fromEntries(SAVE_KEYS.map(key => [key, storage.getItem(key)]));
    try {
      for (const key of SAVE_KEYS) {
        if (typeof archive.entries[key] === "string") {
          if (storage.setItem(key, archive.entries[key]) === false) throw new Error(`Could not write ${key}.`);
        } else if (storage.removeItem(key) === false) {
          throw new Error(`Could not clear ${key}.`);
        }
      }
    } catch (error) {
      for (const key of SAVE_KEYS) {
        if (previous[key] == null) storage.removeItem(key);
        else storage.setItem(key, previous[key]);
      }
      throw error;
    }
    return summarizeArchive(archive);
  }

  async function exportArchive(serialized, suggestedName) {
    if (nativeBridge) return nativeBridge.exportArchive(serialized, suggestedName);
    if (!root.document || !root.Blob || !root.URL) return { ok: false, reason: "Downloads are unavailable." };
    const blob = new root.Blob([serialized], { type: "application/json" });
    const href = root.URL.createObjectURL(blob);
    const link = root.document.createElement("a");
    link.href = href;
    link.download = suggestedName;
    root.document.body.appendChild(link);
    link.click();
    link.remove();
    root.setTimeout(() => root.URL.revokeObjectURL(href), 0);
    return { ok: true, downloaded: true };
  }

  async function pickArchive() {
    if (!nativeBridge) return { ok: false, browserPicker: true };
    return nativeBridge.importArchive();
  }

  function registerServiceWorker() {
    if (!root.navigator?.serviceWorker || !/^https?:$/.test(root.location?.protocol || "")) return Promise.resolve(null);
    return root.navigator.serviceWorker.register("service-worker.js", { scope: "./" }).catch(() => null);
  }

  function capabilities() {
    if (platformCapabilities) return platformCapabilities;
    const fallback = { desktop: Boolean(nativeBridge), achievements: false, richPresence: false, cloudSaves: false };
    if (!nativeBridge?.capabilities) return Object.freeze(fallback);
    try {
      const native = nativeBridge.capabilities();
      platformCapabilities = Object.freeze({
        desktop: true,
        achievements: native?.achievements === true,
        richPresence: native?.richPresence === true,
        cloudSaves: native?.cloudSaves === true,
      });
    } catch (_) { platformCapabilities = Object.freeze(fallback); }
    return platformCapabilities;
  }

  function unlockAchievement(id) {
    if (typeof id !== "string" || !nativeBridge?.unlockAchievement || !capabilities().achievements) return false;
    try { return nativeBridge.unlockAchievement(id) === true; } catch (_) { return false; }
  }

  function setRichPresence(presence) {
    if (!presence || typeof presence !== "object" || !nativeBridge?.setRichPresence || !capabilities().richPresence) return false;
    const serialized = JSON.stringify(presence);
    if (serialized === lastPresence) return true;
    try {
      const updated = nativeBridge.setRichPresence(presence) === true;
      if (updated) lastPresence = serialized;
      return updated;
    } catch (_) { return false; }
  }

  return Object.freeze({
    ARCHIVE_FORMAT, ARCHIVE_VERSION, CURRENT_SAVE_VERSION, MAX_ARCHIVE_BYTES, SAVE_KEYS,
    isDesktop: Boolean(nativeBridge), getItem, setItem, removeItem, validateSaveEntry,
    createArchive, parseArchive, summarizeArchive, applyArchive, exportArchive, pickArchive, registerServiceWorker,
    capabilities, unlockAchievement, setRichPresence,
  });
});
