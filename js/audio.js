// Lightweight synthesized sound design. No downloaded codecs or audio assets are required.

const BankAudio = (() => {
  const CUES = Object.freeze({
    uiOpen: [
      { frequency: 330, endFrequency: 440, delay: 0, duration: 0.055, gain: 0.026, type: "sine" },
    ],
    uiClose: [
      { frequency: 420, endFrequency: 300, delay: 0, duration: 0.05, gain: 0.022, type: "sine" },
    ],
    customerReady: [
      { frequency: 660, endFrequency: 720, delay: 0, duration: 0.06, gain: 0.035, type: "triangle" },
      { frequency: 880, endFrequency: 820, delay: 0.075, duration: 0.08, gain: 0.028, type: "triangle" },
    ],
    positive: [
      { frequency: 392, endFrequency: 440, delay: 0, duration: 0.07, gain: 0.035, type: "triangle" },
      { frequency: 523, endFrequency: 587, delay: 0.08, duration: 0.11, gain: 0.04, type: "triangle" },
    ],
    neutral: [
      { frequency: 330, endFrequency: 330, delay: 0, duration: 0.07, gain: 0.026, type: "triangle" },
    ],
    warning: [
      { frequency: 220, endFrequency: 196, delay: 0, duration: 0.13, gain: 0.038, type: "sawtooth" },
      { frequency: 196, endFrequency: 174, delay: 0.14, duration: 0.15, gain: 0.032, type: "sawtooth" },
    ],
    purchase: [
      { frequency: 740, endFrequency: 620, delay: 0, duration: 0.045, gain: 0.025, type: "square" },
      { frequency: 880, endFrequency: 760, delay: 0.06, duration: 0.05, gain: 0.02, type: "square" },
    ],
    dayStart: [
      { frequency: 262, endFrequency: 294, delay: 0, duration: 0.12, gain: 0.03, type: "triangle" },
      { frequency: 330, endFrequency: 392, delay: 0.13, duration: 0.18, gain: 0.035, type: "triangle" },
    ],
    dayEnd: [
      { frequency: 523, endFrequency: 494, delay: 0, duration: 0.11, gain: 0.032, type: "triangle" },
      { frequency: 392, endFrequency: 330, delay: 0.12, duration: 0.2, gain: 0.036, type: "triangle" },
    ],
    victory: [
      { frequency: 262, endFrequency: 330, delay: 0, duration: 0.14, gain: 0.035, type: "triangle" },
      { frequency: 392, endFrequency: 523, delay: 0.14, duration: 0.18, gain: 0.04, type: "triangle" },
      { frequency: 659, endFrequency: 784, delay: 0.32, duration: 0.28, gain: 0.045, type: "triangle" },
    ],
    failure: [
      { frequency: 247, endFrequency: 220, delay: 0, duration: 0.18, gain: 0.04, type: "sawtooth" },
      { frequency: 185, endFrequency: 147, delay: 0.2, duration: 0.35, gain: 0.045, type: "sawtooth" },
    ],
  });

  let context = null;
  let master = null;
  let lastCue = "";
  let lastCueAt = 0;

  function soundEnabled() {
    return typeof settings === "undefined" || settings.soundEnabled !== false;
  }

  function volume() {
    const value = typeof settings === "undefined" ? 0.6 : Number(settings.soundVolume);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.6;
  }

  function ensureContext() {
    if (!soundEnabled() || typeof window === "undefined") return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = volume();
      master.connect(context.destination);
    }
    if (master) master.gain.setTargetAtTime(volume(), context.currentTime, 0.01);
    if (context.state === "suspended") context.resume().catch(() => {});
    return context;
  }

  function unlock() {
    return Boolean(ensureContext());
  }

  function play(name) {
    const pattern = CUES[name];
    if (!pattern || !soundEnabled() || volume() <= 0) return false;
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    if (name === lastCue && now - lastCueAt < 90) return false;
    const audioContext = ensureContext();
    if (!audioContext || audioContext.state !== "running" || !master) return false;
    lastCue = name;
    lastCueAt = now;
    const start = audioContext.currentTime + 0.005;
    pattern.forEach(note => {
      const oscillator = audioContext.createOscillator();
      const envelope = audioContext.createGain();
      const noteStart = start + note.delay;
      const noteEnd = noteStart + note.duration;
      oscillator.type = note.type;
      oscillator.frequency.setValueAtTime(note.frequency, noteStart);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, note.endFrequency), noteEnd);
      envelope.gain.setValueAtTime(0.0001, noteStart);
      envelope.gain.exponentialRampToValueAtTime(note.gain, noteStart + Math.min(0.018, note.duration / 3));
      envelope.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd + 0.02);
    });
    return true;
  }

  function playOutcome(kind) {
    if (kind === "good") return play("positive");
    if (kind === "bad" || kind === "warn") return play("warning");
    return play("neutral");
  }

  function refresh() {
    if (!soundEnabled() && context?.state === "running") context.suspend().catch(() => {});
    else if (context) ensureContext();
  }

  if (typeof document !== "undefined") {
    const unlockOnce = () => unlock();
    document.addEventListener("pointerdown", unlockOnce, { once: true, passive: true });
    document.addEventListener("keydown", unlockOnce, { once: true });
  }

  return { CUES, unlock, play, playOutcome, refresh, soundEnabled, volume };
})();
