// Difficulty presets — replaces the old top-level const block.
// initBank(key) reads from here so every numeric balance can be tuned per mode.
const DIFFICULTY = {
  easy: {
    startingCash:     750_000,
    startingDeposits: 200_000,
    startingRep:      70,
    dailyOverhead:    1_000,
    eventTimeout:     30,    // seconds per event before auto-resolve
    dayDuration:      120,   // real seconds per game day
  },
  normal: {
    startingCash:     500_000,
    startingDeposits: 300_000,
    startingRep:      60,
    dailyOverhead:    2_000,
    eventTimeout:     20,
    dayDuration:      90,
  },
  hard: {
    startingCash:     300_000,
    startingDeposits: 400_000,
    startingRep:      50,
    dailyOverhead:    3_500,
    eventTimeout:     12,
    dayDuration:      60,
  },
};

// ── Shared utilities ──────────────────────────────────────────
const fmt     = n   => '$' + Math.round(n).toLocaleString();
const pick    = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
