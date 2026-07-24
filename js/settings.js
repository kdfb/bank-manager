// Player settings persisted through the shared web/desktop platform adapter.

const DEFAULT_SETTINGS = {
  difficulty:   'normal',
  soundEnabled: true,
  soundVolume: 0.6,
  tutorialsEnabled: true,
  highContrast: false,
  reducedMotion: false,
  textScale: "normal",
  cameraZoom: 1.25,
  controllerVibration: true,
  timerSpeed:   1.0,       // multiplier — reserved for a future speed toggle
};

let settings = { ...DEFAULT_SETTINGS };

function loadSettings() {
  try {
    const raw = BankPlatform.getItem('bankSettings');
    if (raw) settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
  } catch (_) { /* corrupt storage — keep defaults */ }
  applySettings();
}

function saveSettings() {
  try { BankPlatform.setItem('bankSettings', JSON.stringify(settings)); } catch (_) {}
  applySettings();
}

function normalizeSettings(source) {
  const value = { ...DEFAULT_SETTINGS, ...(source || {}) };
  value.soundEnabled = value.soundEnabled !== false;
  value.soundVolume = Number.isFinite(Number(value.soundVolume))
    ? Math.max(0, Math.min(1, Number(value.soundVolume)))
    : DEFAULT_SETTINGS.soundVolume;
  value.tutorialsEnabled = value.tutorialsEnabled !== false;
  value.highContrast = Boolean(value.highContrast);
  value.reducedMotion = Boolean(value.reducedMotion);
  value.controllerVibration = value.controllerVibration !== false;
  value.textScale = ["normal", "large", "xlarge"].includes(value.textScale) ? value.textScale : "normal";
  value.cameraZoom = Number.isFinite(Number(value.cameraZoom))
    ? Math.max(0.8, Math.min(2.2, Number(value.cameraZoom)))
    : DEFAULT_SETTINGS.cameraZoom;
  return value;
}

function applySettings() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.textScale = settings.textScale;
  root.classList.toggle("high-contrast", settings.highContrast);
  root.classList.toggle("reduced-motion", settings.reducedMotion);
}

function setSetting(key, value) {
  if (!["soundEnabled", "soundVolume", "tutorialsEnabled", "highContrast", "reducedMotion", "textScale", "cameraZoom", "controllerVibration"].includes(key)) return false;
  settings = normalizeSettings({ ...settings, [key]: value });
  saveSettings();
  return true;
}

function controllerVibrationEnabled() {
  return settings.controllerVibration !== false;
}
