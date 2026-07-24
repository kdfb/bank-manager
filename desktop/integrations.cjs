"use strict";

const ACHIEVEMENT_IDS = Object.freeze([
  "FIRST_DAY", "FIRST_CUSTOMER", "FIRST_LOAN", "FIRST_HIRE", "DELEGATION",
  "FURNISHED_BRANCH", "COUNTY_BANK", "BRANCH_NETWORK", "DEBT_FREE", "BANKING_LEGACY",
]);
const ACHIEVEMENT_SET = new Set(ACHIEVEMENT_IDS);

function cleanText(value, maxLength = 96) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength) : "";
}

function sanitizePresence(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = cleanText(value.state);
  const details = cleanText(value.details);
  if (!state || !details) return null;
  return {
    state,
    details,
    day: Math.max(1, Math.min(999_999, Math.floor(Number(value.day) || 1))),
    branchCount: Math.max(1, Math.min(99, Math.floor(Number(value.branchCount) || 1))),
    campaignComplete: value.campaignComplete === true,
  };
}

function createPlatformServices(provider = {}) {
  const capabilities = Object.freeze({
    desktop: true,
    achievements: typeof provider.unlockAchievement === "function",
    richPresence: typeof provider.setRichPresence === "function",
    cloudSaves: provider.cloudSaves === true,
  });

  function unlockAchievement(id) {
    if (!capabilities.achievements || !ACHIEVEMENT_SET.has(id)) return false;
    try { return provider.unlockAchievement(id) !== false; } catch (_) { return false; }
  }

  function setRichPresence(value) {
    const presence = sanitizePresence(value);
    if (!capabilities.richPresence || !presence) return false;
    try { return provider.setRichPresence(presence) !== false; } catch (_) { return false; }
  }

  return Object.freeze({ capabilities, unlockAchievement, setRichPresence });
}

module.exports = { ACHIEVEMENT_IDS, sanitizePresence, createPlatformServices };
