const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const root = join(__dirname, "..");
const audioSource = readFileSync(join(root, "js", "audio.js"), "utf8");
const settingsSource = readFileSync(join(root, "js", "settings.js"), "utf8");

function audioHarness(initialSettings = { soundEnabled: true, soundVolume: 0.6 }) {
  const created = { contexts: 0, oscillators: 0, gains: [] };
  class FakeAudioContext {
    constructor() {
      created.contexts++;
      this.currentTime = 1;
      this.state = "running";
      this.destination = {};
    }
    createGain() {
      const gain = {
        value: 1,
        setTargetAtTime(value) { this.value = value; },
        setValueAtTime() {}, exponentialRampToValueAtTime() {},
      };
      created.gains.push(gain);
      return { gain, connect() {} };
    }
    createOscillator() {
      created.oscillators++;
      return {
        type: "sine",
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {}, start() {}, stop() {},
      };
    }
    resume() { this.state = "running"; return Promise.resolve(); }
    suspend() { this.state = "suspended"; return Promise.resolve(); }
  }
  const context = {
    settings: { ...initialSettings },
    window: { AudioContext: FakeAudioContext },
    document: { addEventListener() {} },
    performance: { now: () => 1000 },
  };
  vm.createContext(context);
  vm.runInContext(`${audioSource}\n;globalThis.__audio = BankAudio;`, context);
  return { audio: context.__audio, created };
}

test("audio cue library covers the major game feedback states", () => {
  const { audio } = audioHarness();
  for (const cue of ["uiOpen", "uiClose", "customerReady", "positive", "warning", "purchase", "dayStart", "dayEnd", "victory", "failure"]) {
    assert.ok(Array.isArray(audio.CUES[cue]) && audio.CUES[cue].length > 0, `Missing ${cue}`);
  }
  for (const pattern of Object.values(audio.CUES)) {
    for (const note of pattern) {
      assert.ok(note.frequency > 0 && note.endFrequency > 0);
      assert.ok(note.duration > 0 && note.gain > 0 && note.gain < 0.1);
    }
  }
});

test("audio remains lazy and silent when the preference is disabled", () => {
  const { audio, created } = audioHarness({ soundEnabled: false, soundVolume: 1 });
  assert.equal(audio.play("positive"), false);
  assert.equal(created.contexts, 0);
  assert.equal(created.oscillators, 0);
});

test("playing an enabled cue creates its scheduled notes at the saved volume", () => {
  const { audio, created } = audioHarness({ soundEnabled: true, soundVolume: 0.25 });
  assert.equal(audio.play("positive"), true);
  assert.equal(created.contexts, 1);
  assert.equal(created.oscillators, audio.CUES.positive.length);
  assert.equal(created.gains[0].value, 0.25);
});

test("sound settings normalize legacy and out-of-range preferences", () => {
  const context = { localStorage: { getItem: () => null, setItem() {} } };
  vm.createContext(context);
  vm.runInContext(`${settingsSource}\n;globalThis.__normalize = normalizeSettings;`, context);
  const legacy = context.__normalize({});
  assert.equal(legacy.soundEnabled, true);
  assert.equal(legacy.soundVolume, 0.6);
  assert.equal(context.__normalize({ soundVolume: 4 }).soundVolume, 1);
  assert.equal(context.__normalize({ soundVolume: -2 }).soundVolume, 0);
  assert.equal(context.__normalize({ soundEnabled: false }).soundEnabled, false);
});
