/**
 * Soft background music for the 3D gallery, generated in the browser with the
 * Web Audio API, so there is nothing to download and no track to license:
 * slow pad chords that drift from one to the next, now and then a quiet
 * chime, all through a long reverb like a large, quiet hall. It never loops
 * exactly, so it doesn't wear on a long visit.
 *
 * Browsers only allow sound after the visitor has tapped or pressed a key,
 * so start() must be called from (or after) such an event.
 */

export interface AmbientMusic {
  start(): Promise<void>;
  stop(): void;
  dispose(): void;
}

// D major with an added ninth and sixth: open and calm, never tense.
// Each chord is MIDI note numbers; the bass doubles its root an octave down.
const CHORDS: readonly (readonly number[])[] = [
  [50, 57, 62, 66, 69, 76], // Dmaj9
  [47, 54, 59, 62, 66, 73], // Bm9 (no 3rd doubling)
  [43, 50, 55, 59, 62, 69], // Gmaj9
  [45, 52, 57, 61, 64, 71] // A6/9
];
// High chimes from D major pentatonic, which sit on any of the chords.
const CHIMES = [74, 76, 78, 81, 83, 86, 88] as const;
const CHORD_SECONDS = 10;
const VOLUME = 0.32;

const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function createAmbientMusic(): AmbientMusic {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let padBus: GainNode | null = null;
  let chimeBus: GainNode | null = null;
  let chordTimer = 0;
  let chimeTimer = 0;
  let chordIndex = 0;
  let playing = false;

  function build(): AudioContext {
    const ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // A long, dark reverb: stereo noise that dies away over ~5 seconds.
    const reverb = ctx.createConvolver();
    const seconds = 5;
    const impulse = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
      }
    }
    reverb.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    reverb.connect(wet).connect(master);

    // Pads through a gentle low-pass, so nothing is bright or edgy.
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 1400;
    tone.Q.value = 0.4;
    padBus = ctx.createGain();
    padBus.gain.value = 0.5;
    padBus.connect(tone);
    tone.connect(master);
    tone.connect(reverb);

    chimeBus = ctx.createGain();
    chimeBus.gain.value = 0.22;
    chimeBus.connect(reverb);
    chimeBus.connect(master);
    return ctx;
  }

  // One chord: each note a pair of slightly detuned soft oscillators that
  // swell in over a few seconds and fade out as the next chord arrives.
  function playChord(ctx: AudioContext, notes: readonly number[]) {
    const bus = padBus;
    if (!bus) {
      return;
    }
    const now = ctx.currentTime;
    const end = now + CHORD_SECONDS + 4;
    notes.forEach((note, index) => {
      const voice = ctx.createGain();
      voice.gain.setValueAtTime(0, now);
      voice.gain.linearRampToValueAtTime(index === 0 ? 0.16 : 0.09, now + 3.5);
      voice.gain.setValueAtTime(index === 0 ? 0.16 : 0.09, now + CHORD_SECONDS - 0.5);
      voice.gain.linearRampToValueAtTime(0, end);
      voice.connect(bus);
      for (const [type, detune] of [["sine", -6], ["triangle", 6]] as const) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = frequency(note);
        osc.detune.value = detune;
        osc.connect(voice);
        osc.start(now);
        osc.stop(end + 0.1);
      }
    });
  }

  // A single soft chime, a bell-like sine with a quick start and long tail.
  function playChime(ctx: AudioContext) {
    const bus = chimeBus;
    if (!bus) {
      return;
    }
    const now = ctx.currentTime;
    const note = CHIMES[Math.floor(Math.random() * CHIMES.length)] ?? CHIMES[0];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
    gain.connect(bus);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequency(note);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 3.6);
  }

  function scheduleChime(ctx: AudioContext) {
    chimeTimer = window.setTimeout(() => {
      if (playing) {
        playChime(ctx);
        scheduleChime(ctx);
      }
    }, 2500 + Math.random() * 5500);
  }

  return {
    async start() {
      if (playing) {
        return;
      }
      context ??= build();
      const ctx = context;
      await ctx.resume();
      playing = true;
      master?.gain.cancelScheduledValues(ctx.currentTime);
      master?.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master?.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + 3);
      const next = () => {
        playChord(ctx, CHORDS[chordIndex % CHORDS.length] ?? CHORDS[0] ?? []);
        chordIndex += 1;
      };
      next();
      chordTimer = window.setInterval(next, CHORD_SECONDS * 1000);
      scheduleChime(ctx);
    },
    stop() {
      if (!playing || !context) {
        return;
      }
      playing = false;
      window.clearInterval(chordTimer);
      window.clearTimeout(chimeTimer);
      const ctx = context;
      master?.gain.cancelScheduledValues(ctx.currentTime);
      master?.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master?.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
      // Let the fade finish, then stop the clock so it costs nothing.
      window.setTimeout(() => {
        if (!playing) {
          void ctx.suspend();
        }
      }, 1400);
    },
    dispose() {
      playing = false;
      window.clearInterval(chordTimer);
      window.clearTimeout(chimeTimer);
      void context?.close();
      context = null;
    }
  };
}
