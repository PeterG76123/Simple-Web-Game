/*
 * Sound effects and calm underwater music, all made live with the Web Audio
 * API: no sound files to download, so it works offline in the app too.
 *
 *   ArrowAudio.play('exit')   one of the effects in SOUNDS below
 *
 * The music is generative: slow, soft chords through a muffled "underwater"
 * filter, the hush of ocean swell, drops of melody that echo away, and now
 * and then a far-off whale call. Volumes and on/off come from ArrowSettings.
 * Browsers only allow sound after the first tap or key press, so nothing
 * starts until then. Everything pauses while the app is in the background.
 */
(function (root) {
  'use strict';
  const Settings = root.ArrowSettings;
  const AC = root.AudioContext || root.webkitAudioContext;
  if (!AC || !Settings) { root.ArrowAudio = { play() {} }; return; }

  let ctx = null;
  let musicBus, sfxBus, musicVerb, sfxVerb, padFilter, echo, swellGain;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const loud = (v) => Math.pow(v / 100, 1.6); // slider 0-100 to a gain that sounds even

  // ---------- Set-up ----------
  function impulse(seconds, decay) {
    // A reverb tail: noise that fades away, smoothed so it sounds dark and watery.
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += (Math.random() * 2 - 1 - lp) * 0.3;
        d[i] = lp * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function noiseBuffer(seconds, brown) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * white) / 1.02; d[i] = last * 3.5; } else d[i] = white;
    }
    return buf;
  }
  let whiteNoise = null;

  function panner(value) {
    if (!ctx.createStereoPanner) return null;
    const p = ctx.createStereoPanner();
    p.pan.value = value;
    return p;
  }

  function init() {
    if (ctx) return;
    ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); // keeps sudden peaks gentle
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    master.connect(comp);
    comp.connect(ctx.destination);

    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.gain.value = 0;
    sfxBus.gain.value = 0;
    musicBus.connect(master);
    sfxBus.connect(master);

    musicVerb = ctx.createConvolver();
    musicVerb.buffer = impulse(4.5, 2.2);
    musicVerb.connect(musicBus);
    sfxVerb = ctx.createConvolver();
    sfxVerb.buffer = impulse(2.2, 2.6);
    sfxVerb.connect(sfxBus);
    whiteNoise = noiseBuffer(1, false);

    // Pads go through a soft low-pass whose brightness slowly breathes.
    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 750;
    padFilter.Q.value = 0.6;
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = 0.045;
    lfoDepth.gain.value = 320;
    lfo.connect(lfoDepth);
    lfoDepth.connect(padFilter.frequency);
    lfo.start();
    padFilter.connect(musicBus);
    const padSend = ctx.createGain();
    padSend.gain.value = 0.7;
    padFilter.connect(padSend);
    padSend.connect(musicVerb);

    // An echo for the melody drops, getting darker each time round.
    echo = ctx.createDelay(2);
    echo.delayTime.value = 0.48;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const dark = ctx.createBiquadFilter();
    dark.type = 'lowpass';
    dark.frequency.value = 1800;
    echo.connect(dark);
    dark.connect(feedback);
    feedback.connect(echo);
    dark.connect(musicBus);
    dark.connect(musicVerb);

    // Ocean swell: deep rumbling noise that rises and falls like waves overhead.
    const swell = ctx.createBufferSource();
    swell.buffer = noiseBuffer(6, true);
    swell.loop = true;
    const swellFilter = ctx.createBiquadFilter();
    swellFilter.type = 'lowpass';
    swellFilter.frequency.value = 320;
    swellGain = ctx.createGain();
    swellGain.gain.value = 0.05;
    const wave = ctx.createOscillator();
    const waveDepth = ctx.createGain();
    wave.frequency.value = 0.09;
    waveDepth.gain.value = 0.035;
    wave.connect(waveDepth);
    waveDepth.connect(swellGain.gain);
    swell.connect(swellFilter);
    swellFilter.connect(swellGain);
    swellGain.connect(musicBus);
    swell.start();
    wave.start();

    apply();
    // Whenever sound starts (or starts again), make sure the volumes are right.
    ctx.onstatechange = () => { if (ctx.state === 'running') apply(); };
    setInterval(schedule, 250);
  }

  function setLevel(param, value, glide) {
    // Safari can drop scheduled changes made while sound is still paused,
    // so set the value outright then, and only glide while it's playing.
    param.cancelScheduledValues(0);
    if (ctx.state !== 'running') { param.value = value; return; }
    const t = ctx.currentTime;
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(value, t + glide);
  }

  function apply() {
    if (!ctx) return;
    setLevel(musicBus.gain, Settings.get('music') ? loud(Settings.get('musicVol')) * 0.85 : 0, 1.2);
    setLevel(sfxBus.gain, Settings.get('sfx') ? loud(Settings.get('sfxVol')) : 0, 0.05);
  }
  Settings.onChange(apply);

  // Start on the first tap or key (browsers block sound before that). iPhones
  // also want a sound started inside the tap itself, so play a silent one.
  let unlocked = false;
  function unlock() {
    init();
    if (document.hidden) return;
    // Safari also has an "interrupted" state (after a call, say), so resume
    // from anything that isn't playing.
    if (ctx.state !== 'running') ctx.resume().then(apply, () => {});
    if (!unlocked) {
      unlocked = true;
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      src.connect(ctx.destination);
      src.start(0);
    }
  }
  ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((type) => document.addEventListener(type, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume().then(apply, () => {});
  });

  // ---------- Music ----------
  const D3 = 146.83;
  const hz = (semitones) => D3 * Math.pow(2, semitones / 12);
  // Soft, open chords in D major, in semitones from D3: Dmaj9, Bm7, Gmaj7,
  // Aadd9, Dmaj9, Em9, Gmaj7, Aadd9.
  const CHORDS = [
    [0, 7, 11, 16], [-3, 4, 7, 12], [-7, 0, 4, 9], [-5, 2, 9, 11],
    [0, 7, 11, 16], [2, 9, 12, 16], [-7, 0, 4, 9], [-5, 2, 9, 11],
  ];
  const CHORD_SECONDS = 9;
  // Melody notes that sound good over everything: D major pentatonic, high up.
  const DROPS = [12, 14, 16, 19, 21, 24, 26, 28, 31, 33];
  let chordIndex = 0;
  let nextChordAt = 0;
  let nextDropAt = 0;
  let nextWhaleAt = 0;

  function padNote(freq, start, length, gain) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 3.5);
    g.gain.setValueAtTime(gain, start + length - 0.5);
    g.gain.linearRampToValueAtTime(0, start + length + 3.5);
    g.connect(padFilter);
    [['sine', -7], ['triangle', 7]].forEach(([type, cents]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = cents;
      o.connect(g);
      o.start(start);
      o.stop(start + length + 3.6);
    });
  }

  function drop(freq, t, vol) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 0.97, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    o.connect(g);
    const p = panner(rand(-0.6, 0.6));
    const out = p ? (g.connect(p), p) : g;
    out.connect(musicBus);
    out.connect(echo);
    out.connect(musicVerb);
    o.start(t);
    o.stop(t + 2.7);
  }

  function whaleCall(t) {
    // A slow, far-away moan: a sine that rises and sinks, heavily reverbed.
    const o = ctx.createOscillator();
    o.type = 'sine';
    const base = rand(190, 260);
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.35, t + 1.4);
    o.frequency.linearRampToValueAtTime(base * 0.8, t + 3.6);
    const vib = ctx.createOscillator();
    const vibDepth = ctx.createGain();
    vib.frequency.value = 5;
    vibDepth.gain.value = 3;
    vib.connect(vibDepth);
    vibDepth.connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 1);
    g.gain.linearRampToValueAtTime(0.035, t + 2.6);
    g.gain.linearRampToValueAtTime(0, t + 3.8);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 600;
    o.connect(f);
    f.connect(g);
    const wet = ctx.createGain();
    wet.gain.value = 2.5;
    g.connect(wet);
    wet.connect(musicVerb);
    g.connect(musicBus);
    o.start(t);
    vib.start(t);
    o.stop(t + 4);
    vib.stop(t + 4);
  }

  function schedule() {
    if (!ctx || ctx.state !== 'running' || !Settings.get('music')) return;
    const now = ctx.currentTime;
    if (nextChordAt < now) nextChordAt = now + 0.1;
    if (nextChordAt < now + 1) {
      const chord = CHORDS[chordIndex++ % CHORDS.length];
      chord.forEach((s) => padNote(hz(s), nextChordAt, CHORD_SECONDS, 0.045));
      padNote(hz(chord[0] - 12), nextChordAt, CHORD_SECONDS, 0.07); // a soft bass note
      nextChordAt += CHORD_SECONDS;
    }
    if (nextDropAt < now) {
      if (nextDropAt > 0) {
        // A little phrase of one to three notes, like drops falling into water.
        const count = pick([1, 1, 2, 2, 3]);
        let i = Math.floor(rand(0, DROPS.length));
        for (let k = 0; k < count; k++) {
          drop(hz(DROPS[i]), now + 0.05 + k * rand(0.28, 0.5), 0.06);
          i = Math.max(0, Math.min(DROPS.length - 1, i + pick([-2, -1, 1, 2])));
        }
      }
      nextDropAt = now + rand(2.5, 6.5);
    }
    if (nextWhaleAt === 0) nextWhaleAt = now + rand(25, 45);
    if (nextWhaleAt < now) {
      whaleCall(now + 0.1);
      nextWhaleAt = now + rand(50, 100);
    }
  }

  // ---------- Effects ----------
  function out(node, { verb = 0.2, pan = 0 } = {}) {
    const p = pan ? panner(pan) : null;
    const end = p ? (node.connect(p), p) : node;
    end.connect(sfxBus);
    if (verb) {
      const send = ctx.createGain();
      send.gain.value = verb;
      end.connect(send);
      send.connect(sfxVerb);
    }
  }

  function tone({ type = 'sine', f0, f1 = f0, dur, vol, at = 0, attack = 0.005, verb, pan }) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    out(g, { verb, pan });
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise({ dur, vol, f0, f1 = f0, q = 1, type = 'bandpass', at = 0, verb }) {
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = whiteNoise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    out(g, { verb });
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  // A bubble: a quick sine chirp upwards, the sound bubbles really make.
  const bubble = (at, f = rand(500, 1100), vol = 0.12) =>
    tone({ f0: f, f1: f * 1.7, dur: 0.07, vol, at, attack: 0.003, verb: 0.3, pan: rand(-0.5, 0.5) });

  const SOUNDS = {
    // Starting to drag a line.
    pick: () => tone({ f0: 380, f1: 620, dur: 0.09, vol: 0.22 }),
    // A line settles somewhere new after a drag.
    slide: () => tone({ f0: 540, f1: 340, dur: 0.12, vol: 0.16 }),
    // A line swims away off the board.
    exit: () => {
      noise({ dur: 0.5, vol: 0.16, f0: 300, f1: 1900, q: 1.4, verb: 0.3 });
      for (let i = 0; i < 4; i++) bubble(0.05 + i * rand(0.05, 0.09));
    },
    // Running into another line or a closed gate.
    bump: () => {
      tone({ f0: 170, f1: 55, dur: 0.2, vol: 0.42, verb: 0.1 });
      noise({ dur: 0.08, vol: 0.12, f0: 500, type: 'lowpass' });
    },
    // A reflector turns: a glassy ping.
    turn: () => {
      tone({ type: 'triangle', f0: 1320, dur: 0.55, vol: 0.11, verb: 0.6 });
      tone({ f0: 1980, dur: 0.35, vol: 0.05, at: 0.01, verb: 0.6 });
    },
    // A reflector that can't turn right now.
    noTurn: () => tone({ type: 'triangle', f0: 240, f1: 170, dur: 0.1, vol: 0.16 }),
    gateOpen: () => {
      tone({ type: 'triangle', f0: 660, dur: 0.35, vol: 0.09, verb: 0.5 });
      tone({ type: 'triangle', f0: 990, dur: 0.45, vol: 0.09, at: 0.08, verb: 0.5 });
    },
    gateClose: () => {
      tone({ type: 'triangle', f0: 990, dur: 0.3, vol: 0.08, verb: 0.5 });
      tone({ type: 'triangle', f0: 660, dur: 0.4, vol: 0.08, at: 0.08, verb: 0.5 });
    },
    // A hint appears: a little sparkle.
    hint: () => [1568, 2093, 2637].forEach((f, i) => tone({ f0: f, dur: 0.45, vol: 0.06, at: i * 0.07, verb: 0.7 })),
    undo: () => tone({ f0: 620, f1: 380, dur: 0.11, vol: 0.16 }),
    // Every line is out: a rising run of notes and a burst of bubbles.
    win: () => {
      [587.3, 740, 880, 1174.7, 1318.5, 1480].forEach((f, i) => {
        tone({ type: 'triangle', f0: f, dur: 1.3, vol: 0.09, at: i * 0.09, verb: 0.6 });
        tone({ f0: f * 2, dur: 0.6, vol: 0.025, at: i * 0.09, verb: 0.6 });
      });
      for (let i = 0; i < 10; i++) bubble(rand(0, 0.9), rand(600, 1400), 0.08);
    },
    // A startled creature darts away: a quick watery swish and a few bubbles,
    // deeper and longer for bigger creatures.
    flee: ({ size = 120 } = {}) => {
      const big = Math.max(0.4, Math.min(3, size / 150));
      const pitch = 1 / Math.sqrt(big);
      const len = 0.28 * Math.sqrt(big);
      noise({ dur: len, vol: 0.17, f0: 1500 * pitch, f1: 380 * pitch, q: 1.3, verb: 0.25 });
      noise({ dur: len * 0.7, vol: 0.1, f0: 900 * pitch, f1: 260 * pitch, q: 1.1, at: len * 0.45, verb: 0.25 });
      tone({ f0: 210 * pitch, f1: 85 * pitch, dur: 0.12, vol: 0.1 });
      for (let i = 0; i < 3; i++) bubble(0.04 + i * rand(0.05, 0.08), rand(700, 1300) * pitch, 0.08);
    },
    // Any button.
    click: () => tone({ f0: 900, f1: 1300, dur: 0.05, vol: 0.07, verb: 0.1 }),
  };

  const lastPlayed = {};
  function play(name, options) {
    if (!ctx || ctx.state !== 'running' || !Settings.get('sfx') || !SOUNDS[name]) return;
    // The same sound twice in a few milliseconds just sounds like a glitch.
    const now = ctx.currentTime;
    if (lastPlayed[name] && now - lastPlayed[name] < 0.05) return;
    lastPlayed[name] = now;
    SOUNDS[name](options);
  }

  // A soft click for every button press.
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('button, .group-tab, .tier-tab, summary')) play('click');
  });

  root.ArrowAudio = { play };
})(window);
