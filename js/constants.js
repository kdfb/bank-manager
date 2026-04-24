// Difficulty presets — money values scaled to ~$1,000 starting bankroll.
const DIFFICULTY = {
  easy: {
    startingCash:     7_500,
    startingDeposits: 2_000,
    startingRep:      70,
    dailyOverhead:    10,
    eventTimeout:     30,    // seconds per event before auto-resolve
    dayDuration:      120,   // real seconds per game day
  },
  normal: {
    startingCash:     5_000,
    startingDeposits: 3_000,
    startingRep:      60,
    dailyOverhead:    20,
    eventTimeout:     20,
    dayDuration:      90,
  },
  hard: {
    startingCash:     3_000,
    startingDeposits: 4_000,
    startingRep:      50,
    dailyOverhead:    35,
    eventTimeout:     12,
    dayDuration:      60,
  },
};

// ── Shared utilities ──────────────────────────────────────────
const fmt     = n   => '$' + Math.round(n).toLocaleString();
const pick    = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

// ── Calendar (game starts December 25, 1855) ──────────────────
const _MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const _MONTH_DAYS  = [31,28,31,30,31,30,31,31,30,31,30,31];

function _isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

// dayNumber is 1-indexed: gameDate(1) → "Dec 25, 1855"
function gameDate(dayNumber) {
  let d = 25 + (dayNumber - 1);
  let m = 11; // December (0-indexed)
  let y = 1855;
  while (true) {
    const dim = (m === 1 && _isLeap(y)) ? 29 : _MONTH_DAYS[m];
    if (d <= dim) break;
    d -= dim;
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return `${_MONTH_SHORT[m]} ${d}, ${y}`;
}
