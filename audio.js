/*
 * Sound effects, made live with the Web Audio API, and calm underwater music,
 * played from a recording (music/ocean.m4a, made by tools/render-music.js: making
 * the music live, note by note through two reverbs, kept phones warm).
 *
 *   ArrowAudio.play('exit')   one of the effects in SOUNDS below
 *
 * Volumes and on/off come from ArrowSettings. Browsers only allow sound after
 * the first tap or key press, so nothing starts until then. Everything pauses
 * while the app is in the background or an ad plays, and the effects' sound
 * engine sleeps a few seconds after the last effect.
 */
(function (root) {
  'use strict';
  const Settings = root.ArrowSettings;
  const AC = root.AudioContext || root.webkitAudioContext;
  if (!AC || !Settings) { root.ArrowAudio = { play() {} }; return; }

  let ctx = null;
  let sfxBus, sfxVerb;
  const rand = (a, b) => a + Math.random() * (b - a);
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
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0;
    sfxBus.connect(master);
    // A short reverb (a long one is more work for the phone on every effect).
    sfxVerb = ctx.createConvolver();
    sfxVerb.buffer = impulse(1.2, 2.6);
    sfxVerb.connect(sfxBus);
    whiteNoise = noiseBuffer(1, false);
    apply();
    // Whenever sound starts (or starts again), make sure the volumes are right.
    ctx.onstatechange = () => { if (ctx.state === 'running') apply(); };
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
    updateMusic();
    if (!ctx) return;
    setLevel(sfxBus.gain, Settings.get('sfx') ? loud(Settings.get('sfxVol')) : 0, 0.05);
  }
  Settings.onChange(() => {
    apply();
    napSoon();
  });

  // The effects' sound engine sleeps a few seconds after the last effect (even
  // silent, it keeps the phone working); the next effect wakes it.
  let asleep = false, napTimer = 0;
  function napSoon() {
    clearTimeout(napTimer);
    if (!ctx) return;
    napTimer = setTimeout(() => {
      if (ctx.state === 'running') { asleep = true; ctx.suspend(); }
    }, 4000);
  }

  // Start on the first tap or key (browsers block sound before that). iPhones
  // also want a sound started inside the tap itself, so play a silent one.
  let unlocked = false;
  function unlock() {
    init();
    if (document.hidden) return;
    // Safari also has an "interrupted" state (after a call, say), so resume
    // from anything that isn't playing.
    if (ctx.state !== 'running' && !asleep) ctx.resume().then(apply, () => {});
    napSoon();
    if (!unlocked) {
      unlocked = true;
      updateMusic(); // inside the tap, so the music is allowed to start
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      src.connect(ctx.destination);
      src.start(0);
    }
  }
  ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((type) => document.addEventListener(type, unlock, { capture: true, passive: true }));
  // Sound pauses while an ad plays (ads.js).
  root.addEventListener('arrow-ad', (e) => {
    adPlaying = !!(e.detail && e.detail.playing);
    updateMusic();
    if (!ctx) return;
    if (e.detail && e.detail.playing) ctx.suspend(); else if (!document.hidden && !asleep) ctx.resume().then(apply, () => {});
  });
  document.addEventListener('visibilitychange', () => {
    updateMusic();
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (!asleep) ctx.resume().then(apply, () => {});
  });

  // ---------- Music ----------
  // A recorded loop. Android sets its volume directly; iPhones ignore an audio
  // element's volume, so there it goes through a tiny Web Audio gain instead.
  let adPlaying = false;
  let music = null, musicGain = null, musicCtx = null, fade = 0;
  const volumeWorks = (() => { try { const a = new Audio(); a.volume = 0.5; return a.volume === 0.5; } catch (e) { return false; } })();
  function musicTarget() { return Settings.get('music') ? loud(Settings.get('musicVol')) : 0; }
  function setMusicVolume(v) {
    if (musicGain) musicGain.gain.value = v;
    else if (music) music.volume = Math.max(0, Math.min(1, v));
  }
  function updateMusic() {
    const target = musicTarget();
    const wanted = unlocked && target > 0 && !document.hidden && !adPlaying;
    if (!wanted) {
      clearInterval(fade);
      fade = 0;
      if (music && !music.paused) music.pause();
      if (musicCtx && musicCtx.state === 'running') musicCtx.suspend();
      return;
    }
    if (!music) {
      music = new Audio('music/ocean.m4a');
      music.loop = true;
      music.preload = 'auto';
      if (!volumeWorks && AC) {
        try {
          musicCtx = new AC();
          musicGain = musicCtx.createGain();
          musicCtx.createMediaElementSource(music).connect(musicGain);
          musicGain.connect(musicCtx.destination);
        } catch (e) { musicCtx = null; musicGain = null; }
      }
      setMusicVolume(0);
    }
    if (musicCtx && musicCtx.state !== 'running') musicCtx.resume().catch(() => {});
    if (music.paused) {
      // Fade in from silence over a second or so.
      setMusicVolume(0);
      music.play().catch(() => {});
      clearInterval(fade);
      let step = 0;
      fade = setInterval(() => {
        step++;
        setMusicVolume(musicTarget() * Math.min(1, step / 24));
        if (step >= 24) { clearInterval(fade); fade = 0; }
      }, 50);
    } else if (!fade) {
      setMusicVolume(target); // (while fading in, the fade follows the slider itself)
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
    // Aquarium: food sprinkled on the water, and a fish taking a bite.
    sprinkle: () => [0, 0.05, 0.11, 0.16, 0.22].forEach((at) => tone({ type: 'triangle', f0: 2200 + Math.random() * 900, dur: 0.04, vol: 0.035, at, verb: 0.4 })),
    nibble: () => tone({ type: 'sine', f0: 320, f1: 720, dur: 0.07, vol: 0.12, verb: 0.3 }),
  };

  const lastPlayed = {};
  function play(name, options) {
    if (ctx && asleep && Settings.get('sfx') && SOUNDS[name] && !document.hidden) {
      asleep = false;
      ctx.resume().then(() => { apply(); play(name, options); }, () => {});
      return;
    }
    napSoon();
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
