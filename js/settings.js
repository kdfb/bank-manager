// Player settings — persisted to localStorage.
// Electron: swap localStorage calls for Node fs in save.js when packaging.

const DEFAULT_SETTINGS = {
  difficulty:   'normal',
  soundEnabled: true,
  timerSpeed:   1.0,       // multiplier — reserved for a future speed toggle
};

let settings = { ...DEFAULT_SETTINGS };

function loadSettings() {
  try {
    const raw = localStorage.getItem('bankSettings');
    if (raw) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (_) { /* corrupt storage — keep defaults */ }
}

function saveSettings() {
  try { localStorage.setItem('bankSettings', JSON.stringify(settings)); } catch (_) {}
}
