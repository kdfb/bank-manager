const fs = require("node:fs");
const path = require("node:path");

function createDurableStore(filePath, maxBytes = 8 * 1024 * 1024) {
  function read() {
    try {
      const value = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? value : "{}";
    } catch (_) {
      return "{}";
    }
  }

  function write(serialized) {
    if (typeof serialized !== "string" || Buffer.byteLength(serialized) > maxBytes) return false;
    try {
      const parsed = JSON.parse(serialized);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
      if (Object.values(parsed).some(value => typeof value !== "string")) return false;
      const temporary = `${filePath}.tmp`;
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(temporary, serialized, "utf8");
      try { fs.renameSync(temporary, filePath); }
      catch (_) {
        fs.writeFileSync(filePath, serialized, "utf8");
        try { fs.unlinkSync(temporary); } catch (_) {}
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  return Object.freeze({ read, write, filePath });
}

module.exports = { createDurableStore };
