// Records the game's underwater music to music/ocean.m4a, a seamless loop the
// app just plays (making it live, note by note with two reverbs, kept phones
// busy and warm). The music itself is below: slow chords in D major through a
// breathing low-pass, ocean swell, drops of melody that echo away, and now and
// then a far-off whale call. Same seed, same recording.
//   node tools/render-music.js            (needs playwright and ffmpeg)
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const LOOP = 216;   // three times round the 8 chords of 9 seconds
const TAIL = 8;     // rendered past the end and blended into the start, so the loop is seamless
const RATE = 44100;

function music({ LOOP, TAIL, RATE }) {
  // Runs in the browser.
  let seed = 20261128;
  const random = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rand = (a, b) => a + random() * (b - a);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const ctx = new OfflineAudioContext(2, (LOOP + TAIL) * RATE, RATE);
  function impulse(seconds, decay) {
    const len = Math.floor(RATE * seconds);
    const buf = ctx.createBuffer(2, len, RATE);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) { lp += (random() * 2 - 1 - lp) * 0.3; d[i] = lp * Math.pow(1 - i / len, decay); }
    }
    return buf;
  }
  function noiseBuffer(seconds) {
    const len = Math.floor(RATE * seconds);
    const buf = ctx.createBuffer(1, len, RATE);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    return buf;
  }
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3;
  master.connect(comp);
  comp.connect(ctx.destination);
  const musicBus = ctx.createGain();
  musicBus.gain.value = 0.85;
  musicBus.connect(master);
  const musicVerb = ctx.createConvolver();
  musicVerb.buffer = impulse(4.5, 2.2);
  musicVerb.connect(musicBus);
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 750;
  padFilter.Q.value = 0.6;
  const lfo = ctx.createOscillator();
  const lfoDepth = ctx.createGain();
  // Breathes a whole number of times per loop, so the loop joins smoothly.
  lfo.frequency.value = Math.round(0.045 * LOOP) / LOOP;
  lfoDepth.gain.value = 320;
  lfo.connect(lfoDepth);
  lfoDepth.connect(padFilter.frequency);
  lfo.start();
  padFilter.connect(musicBus);
  const padSend = ctx.createGain();
  padSend.gain.value = 0.7;
  padFilter.connect(padSend);
  padSend.connect(musicVerb);
  const echo = ctx.createDelay(2);
  echo.delayTime.value = 0.48;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const dark = ctx.createBiquadFilter();
  dark.type = 'lowpass';
  dark.frequency.value = 1800;
  echo.connect(dark); dark.connect(feedback); feedback.connect(echo);
  dark.connect(musicBus); dark.connect(musicVerb);
  const swell = ctx.createBufferSource();
  swell.buffer = noiseBuffer(LOOP + TAIL);
  const swellFilter = ctx.createBiquadFilter();
  swellFilter.type = 'lowpass';
  swellFilter.frequency.value = 320;
  const swellGain = ctx.createGain();
  swellGain.gain.value = 0.05;
  const wave = ctx.createOscillator();
  const waveDepth = ctx.createGain();
  wave.frequency.value = Math.round(0.09 * LOOP) / LOOP;
  waveDepth.gain.value = 0.035;
  wave.connect(waveDepth); waveDepth.connect(swellGain.gain);
  swell.connect(swellFilter); swellFilter.connect(swellGain); swellGain.connect(musicBus);
  swell.start(); wave.start();

  const D3 = 146.83;
  const hz = (s) => D3 * Math.pow(2, s / 12);
  const CHORDS = [[0, 7, 11, 16], [-3, 4, 7, 12], [-7, 0, 4, 9], [-5, 2, 9, 11], [0, 7, 11, 16], [2, 9, 12, 16], [-7, 0, 4, 9], [-5, 2, 9, 11]];
  const CHORD_SECONDS = 9;
  const DROPS = [12, 14, 16, 19, 21, 24, 26, 28, 31, 33];
  function padNote(freq, start, length, gain) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 3.5);
    g.gain.setValueAtTime(gain, start + length - 0.5);
    g.gain.linearRampToValueAtTime(0, start + length + 3.5);
    g.connect(padFilter);
    [['sine', -7], ['triangle', 7]].forEach(([type, cents]) => {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = freq; o.detune.value = cents;
      o.connect(g); o.start(start); o.stop(start + length + 3.6);
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
    const p = ctx.createStereoPanner(); p.pan.value = rand(-0.6, 0.6);
    g.connect(p);
    p.connect(musicBus); p.connect(echo); p.connect(musicVerb);
    o.start(t); o.stop(t + 2.7);
  }
  function whaleCall(t) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    const base = rand(190, 260);
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.35, t + 1.4);
    o.frequency.linearRampToValueAtTime(base * 0.8, t + 3.6);
    const vib = ctx.createOscillator();
    const vibDepth = ctx.createGain();
    vib.frequency.value = 5; vibDepth.gain.value = 3;
    vib.connect(vibDepth); vibDepth.connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 1);
    g.gain.linearRampToValueAtTime(0.035, t + 2.6);
    g.gain.linearRampToValueAtTime(0, t + 3.8);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 600;
    o.connect(f); f.connect(g);
    const wet = ctx.createGain(); wet.gain.value = 2.5;
    g.connect(wet); wet.connect(musicVerb); g.connect(musicBus);
    o.start(t); vib.start(t); o.stop(t + 4); vib.stop(t + 4);
  }
  // The whole score, laid out in advance (the live version did this a second ahead).
  const end = LOOP + TAIL;
  for (let t = 0, k = 0; t < end; t += CHORD_SECONDS, k++) {
    const chord = CHORDS[k % CHORDS.length];
    chord.forEach((s) => padNote(hz(s), t, CHORD_SECONDS, 0.045));
    padNote(hz(chord[0] - 12), t, CHORD_SECONDS, 0.07);
  }
  for (let t = rand(2.5, 6.5); t < end - 3; t += rand(2.5, 6.5)) {
    const count = pick([1, 1, 2, 2, 3]);
    let i = Math.floor(rand(0, DROPS.length));
    for (let k = 0; k < count; k++) {
      drop(hz(DROPS[i]), t + 0.05 + k * rand(0.28, 0.5), 0.06);
      i = Math.max(0, Math.min(DROPS.length - 1, i + pick([-2, -1, 1, 2])));
    }
  }
  for (let t = rand(25, 45); t < LOOP - 5; t += rand(50, 100)) whaleCall(t);

  return ctx.startRendering().then((buf) => {
    // Blend the tail into the start (equal power), then cut to the loop length.
    const out = [];
    const X = TAIL * RATE, L = LOOP * RATE;
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      const o = new Int16Array(L);
      for (let i = 0; i < L; i++) {
        let v = d[i];
        if (i < X) { const a = (i / X) * Math.PI / 2; v = d[i] * Math.sin(a) + d[L + i] * Math.cos(a); }
        o[i] = Math.max(-32767, Math.min(32767, Math.round(v * 32767)));
      }
      out.push(o);
    }
    // Interleave into a WAV, as base64.
    const data = new DataView(new ArrayBuffer(44 + L * 4));
    const str = (off, s) => { for (let i = 0; i < s.length; i++) data.setUint8(off + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); data.setUint32(4, 36 + L * 4, true); str(8, 'WAVEfmt '); data.setUint32(16, 16, true);
    data.setUint16(20, 1, true); data.setUint16(22, 2, true); data.setUint32(24, RATE, true); data.setUint32(28, RATE * 4, true);
    data.setUint16(32, 4, true); data.setUint16(34, 16, true); str(36, 'data'); data.setUint32(40, L * 4, true);
    for (let i = 0; i < L; i++) { data.setInt16(44 + i * 4, out[0][i], true); data.setInt16(46 + i * 4, out[1][i], true); }
    const bytes = new Uint8Array(data.buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
}

(async () => {
  const root = path.join(__dirname, '..');
  const b = await chromium.launch();
  const p = await b.newPage();
  const wav = await p.evaluate(music, { LOOP, TAIL, RATE });
  await b.close();
  const tmp = path.join(require('os').tmpdir(), 'eel-music.wav');
  fs.writeFileSync(tmp, Buffer.from(wav, 'base64'));
  const out = path.join(root, 'music', 'ocean.m4a');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', out]);
  console.log(`${out}: ${(fs.statSync(out).size / 1e6).toFixed(1)} MB, ${LOOP} s loop`);
})();
