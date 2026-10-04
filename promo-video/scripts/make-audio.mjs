// Synthesizes the promo's soundtrack and sound effects from scratch (no samples, no
// downloads) → public/audio/*.wav. Everything is generated, so it's ours to use anywhere.
//
//   node scripts/make-audio.mjs
//
// Music: 120 BPM house loop, one beat = 15 video frames at 30 fps.
//   0.0–4.5 s  intro: drone + hits under the kinetic type, riser into the drop
//   4.5 s      drop (logo mugs clink)
//   21.0–22.5  breakdown while the slip is being checked, riser
//   22.5 s     back in on the big ✓
//   26.0 s     stamp "ปิดบิลแล้ว": final hit, then a warm pad outro that fades out

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio');
const MUSIC_LEN = 31.6;

/* ------------------------------------------------------------------ utilities */

let seed = 12345;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const n = (sec) => Math.round(sec * SR);
const TAU = Math.PI * 2;

function writeWav(file, chans) {
  const len = chans[0].length;
  const nc = chans.length;
  const buf = Buffer.alloc(44 + len * nc * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + len * nc * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(nc, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * nc * 2, 28);
  buf.writeUInt16LE(nc * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(len * nc * 2, 40);
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < nc; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      buf.writeInt16LE(Math.round(s * 32767), o);
      o += 2;
    }
  }
  fs.writeFileSync(file, buf);
}

/** RBJ biquad; call set() any time to sweep. */
class Biquad {
  constructor(type, f, q = 0.707) {
    this.type = type;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(f, q);
  }
  set(f, q = this.q) {
    this.q = q;
    const w0 = (TAU * Math.min(f, SR * 0.45)) / SR;
    const cs = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * q);
    let b0, b1, b2;
    if (this.type === 'lp') (b0 = (1 - cs) / 2), (b1 = 1 - cs), (b2 = (1 - cs) / 2);
    else if (this.type === 'hp') (b0 = (1 + cs) / 2), (b1 = -(1 + cs)), (b2 = (1 + cs) / 2);
    else (b0 = alpha), (b1 = 0), (b2 = -alpha); // band-pass
    const a0 = 1 + alpha;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cs) / a0;
    this.a2 = (1 - alpha) / a0;
  }
  p(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

function polyblep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

/** Band-limited saw oscillator. */
class Saw {
  constructor(phase = Math.random()) {
    this.p = phase;
  }
  next(f) {
    const dt = f / SR;
    this.p += dt;
    if (this.p >= 1) this.p -= 1;
    return 2 * this.p - 1 - polyblep(this.p, dt);
  }
}

/** Mixes a mono clip into a stereo buffer. */
function mix(L, R, at, clip, gain = 1, pan = 0) {
  const s = n(at);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < clip.length && s + i < L.length; i++) {
    if (s + i < 0) continue;
    L[s + i] += clip[i] * gl;
    R[s + i] += clip[i] * gr;
  }
}

function render(sec, fn) {
  const out = new Float32Array(n(sec));
  for (let i = 0; i < out.length; i++) out[i] = fn(i / SR, i);
  return out;
}

function normalize(chans, peak = 0.89) {
  let m = 0;
  for (const c of chans) for (const v of c) m = Math.max(m, Math.abs(v));
  if (m > 0) for (const c of chans) for (let i = 0; i < c.length; i++) c[i] *= peak / m;
  return chans;
}

/** Small Schroeder reverb: mono in → stereo out (wet only). */
function reverb(input, decay = 0.8) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  const aps = [225, 556, 441].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  const L = new Float32Array(input.length);
  const R = new Float32Array(input.length);
  for (let k = 0; k < input.length; k++) {
    let sumL = 0;
    let sumR = 0;
    combs.forEach((c, j) => {
      const y = c.buf[c.i];
      c.buf[c.i] = input[k] + y * decay;
      c.i = (c.i + 1) % c.d;
      if (j % 2) sumL += y;
      else sumR += y;
    });
    let yL = sumL;
    let yR = sumR;
    for (const a of aps) {
      const b = a.buf[a.i];
      const v = yL + b * 0.5;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.d;
      yL = b - v * 0.5;
    }
    yR = yR * 0.6 + yL * 0.4;
    L[k] = yL * 0.12;
    R[k] = yR * 0.12;
  }
  return [L, R];
}

/* -------------------------------------------------------------------- drums */

const kick = () => {
  let ph = 0;
  return render(0.5, (t) => {
    const f = 46 + 120 * Math.exp(-t / 0.028);
    ph += (TAU * f) / SR;
    return Math.sin(ph) * Math.exp(-t / 0.2) * 1.0 + noise() * Math.exp(-t / 0.0025) * 0.25;
  });
};

const clap = () => {
  const bp = new Biquad('bp', 1400, 0.9);
  return render(0.45, (t) => {
    const bursts = [0, 0.011, 0.023].reduce((s, b) => s + (t >= b ? Math.exp(-(t - b) / 0.006) : 0), 0);
    const env = bursts * 0.7 + Math.exp(-t / 0.13) * 0.55;
    return bp.p(noise()) * env * 2.4;
  });
};

const snare = () => {
  const bp = new Biquad('bp', 2200, 0.7);
  let ph = 0;
  return render(0.3, (t) => {
    ph += (TAU * (185 + 60 * Math.exp(-t / 0.02))) / SR;
    return bp.p(noise()) * Math.exp(-t / 0.09) * 1.6 + Math.sin(ph) * Math.exp(-t / 0.05) * 0.5;
  });
};

const hat = (open) => {
  const hp = new Biquad('hp', 7500, 0.8);
  return render(open ? 0.35 : 0.08, (t) => hp.p(noise()) * Math.exp(-t / (open ? 0.12 : 0.022)));
};

const crash = () => {
  const hp = new Biquad('hp', 4500, 0.6);
  const ratios = [1, 1.47, 1.83, 2.31, 2.97];
  const ph = ratios.map(() => 0);
  return render(2.4, (t) => {
    let metal = 0;
    ratios.forEach((r, i) => {
      ph[i] += (TAU * 540 * r) / SR;
      metal += Math.sign(Math.sin(ph[i]));
    });
    return hp.p(noise() * 0.8 + metal * 0.08) * Math.exp(-t / 0.7) * 0.9;
  });
};

/* ------------------------------------------------------------- tonal voices */

const NOTE = { A1: 55, C2: 65.41, F2: 87.31, G2: 98, A2: 110, C3: 130.81, E3: 164.81, F3: 174.61, G3: 196, A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, C5: 523.25, E5: 659.25 };
const CHORDS = [
  { name: 'Am', root: NOTE.A2, notes: [NOTE.A3, NOTE.C4, NOTE.E4] },
  { name: 'F', root: NOTE.F2, notes: [NOTE.F3, NOTE.A3, NOTE.C4] },
  { name: 'C', root: NOTE.C3, notes: [NOTE.G3, NOTE.C4, NOTE.E4] },
  { name: 'G', root: NOTE.G2, notes: [NOTE.G3, NOTE.B3, NOTE.D4] },
];

function bass(f, dur) {
  const a = new Saw(0);
  const b = new Saw(0.3);
  const lp = new Biquad('lp', 400, 1.4);
  let sub = 0;
  return render(dur + 0.05, (t) => {
    lp.set(180 + 1400 * Math.exp(-t / 0.07), 1.4);
    sub += (TAU * f) / SR;
    const env = Math.min(1, t / 0.004) * (t > dur ? Math.exp(-(t - dur) / 0.01) : 1);
    return (lp.p(a.next(f) + b.next(f * 1.006)) * 0.55 + Math.sin(sub) * 0.5) * env;
  });
}

/** Detuned-saw chord stab; returns [L, R]. */
function stab(notes, dur = 0.3, bright = 1) {
  const len = n(dur + 0.1);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  for (const f of notes) {
    [-1, 1].forEach((side) => {
      const o1 = new Saw();
      const o2 = new Saw();
      const lp = new Biquad('lp', 2000, 0.9);
      for (let i = 0; i < len; i++) {
        const t = i / SR;
        lp.set(500 + 3800 * bright * Math.exp(-t / 0.07), 0.9);
        const s = lp.p(o1.next(f * (1 + side * 0.006)) + o2.next(f * 2 * (1 - side * 0.004)) * 0.35) * Math.exp(-t / 0.14) * Math.min(1, t / 0.003);
        if (side < 0) L[i] += s * 0.22;
        else R[i] += s * 0.22;
      }
    });
  }
  return [L, R];
}

function pad(notes, dur, cutoff = 1100) {
  const len = n(dur + 0.6);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  for (const f of notes) {
    [-1, 1].forEach((side) => {
      const o = [new Saw(), new Saw(), new Saw()];
      const lp = new Biquad('lp', cutoff, 0.6);
      for (let i = 0; i < len; i++) {
        const t = i / SR;
        const env = Math.min(1, t / 0.35) * (t > dur ? Math.exp(-(t - dur) / 0.25) : 1);
        const s = lp.p(o[0].next(f * (1 + side * 0.004)) + o[1].next(f * (1 - side * 0.007)) + o[2].next(f / 2)) * env;
        if (side < 0) L[i] += s * 0.06;
        else R[i] += s * 0.06;
      }
    });
  }
  return [L, R];
}

function pluck(f) {
  const o = new Saw();
  const lp = new Biquad('lp', 3000, 1.1);
  return render(0.3, (t) => {
    lp.set(600 + 4000 * Math.exp(-t / 0.04), 1.1);
    return lp.p(o.next(f)) * Math.exp(-t / 0.09);
  });
}

function riser(dur) {
  const bp = new Biquad('bp', 400, 1.2);
  const o = new Saw();
  return render(dur, (t) => {
    const p = t / dur;
    bp.set(300 + 7000 * p * p, 1.2);
    return (bp.p(noise()) * 0.9 + o.next(150 + 650 * p * p) * 0.12) * p * p;
  });
}

/* --------------------------------------------------------------------- music */

function music() {
  const N = n(MUSIC_LEN);
  const D = [new Float32Array(N), new Float32Array(N)]; // drums
  const S = [new Float32Array(N), new Float32Array(N)]; // sidechained synths
  const FX = new Float32Array(N); // reverb send
  const DL = [new Float32Array(N), new Float32Array(N)]; // delay send

  const K = kick();
  const CL = clap();
  const SN = snare();
  const HC = hat(false);
  const HO = hat(true);
  const CR = crash();

  const kicks = [];
  const G0 = 4.5; // groove start
  const BEAT = 0.5;
  const S16 = BEAT / 4;
  const BREAK = [21.0, 22.5];
  const END = 26.0;
  const inBreak = (t) => t >= BREAK[0] - 1e-6 && t < BREAK[1] - 1e-6;

  // intro: hits on the kinetic-type slams + a low drone, riser into the drop
  for (const t of [0, 1, 2, 2.5]) {
    mix(...D, t, K, 0.9);
    kicks.push(t);
  }
  {
    const [pl, pr] = pad([NOTE.A2, NOTE.E3, NOTE.A3], 4.4, 500);
    for (let i = 0; i < pl.length; i++) (S[0][i] += pl[i] * 1.2), (S[1][i] += pr[i] * 1.2);
  }
  mix(...D, 2.5, riser(2.0), 0.55);
  [3.5, 3.75, 4.0, 4.125, 4.25, 4.3125, 4.375, 4.4375].forEach((t, i) => mix(...D, t, SN, 0.25 + i * 0.06, i % 2 ? 0.2 : -0.2));

  // groove
  for (let t = G0; t < END - 1e-6; t += S16) {
    const step = Math.round((t - G0) / S16) % 16;
    const bar = Math.floor((t - G0) / 2 + 1e-6);
    const chord = CHORDS[bar % 4];
    const brk = inBreak(t);
    if (!brk) {
      if (step % 4 === 0) {
        mix(...D, t, K, 0.95);
        kicks.push(t);
      }
      if (step === 4 || step === 12) {
        mix(...D, t, CL, 0.55);
        const s = n(t);
        for (let i = 0; i < CL.length && s + i < N; i++) FX[s + i] += CL[i] * 0.5;
      }
      if (step % 4 === 2) mix(...D, t, HO, 0.22, 0.25);
      else if (step % 2 === 1) mix(...D, t, HC, 0.13, -0.3);
      if ([2, 6, 10, 14].includes(step)) mix(...S, t, bass(chord.root, S16 * 1.7), 0.5);
      if (step === 11) mix(...S, t, bass(chord.root * 2, S16 * 0.8), 0.35);
    }
    if ([3, 6, 10, 14].includes(step) && !brk) {
      const [l, r] = stab(chord.notes, 0.28, bar >= 2 ? 1 : 0.6);
      for (const [ch, src] of [
        [0, l],
        [1, r],
      ]) {
        const s = n(t);
        for (let i = 0; i < src.length && s + i < N; i++) {
          S[ch][s + i] += src[i] * 0.85;
          DL[ch][s + i] += src[i] * 0.35;
        }
      }
    }
    if (bar >= 2 && !brk) {
      const tones = [chord.notes[0] * 2, chord.notes[1] * 2, chord.notes[2] * 2, chord.notes[1] * 2];
      const p = pluck(tones[step % 4]);
      mix(...S, t, p, 0.09, step % 2 ? 0.4 : -0.4);
      const s = n(t);
      for (let i = 0; i < p.length && s + i < N; i++) (DL[0][s + i] += p[i] * 0.05), (DL[1][s + i] += p[i] * 0.05);
    }
    if (step === 0) {
      const [l, r] = pad(chord.notes, 1.95, brk ? 700 : 1300);
      mix(S[0], S[1], t, l, 1, -1);
      const s = n(t);
      for (let i = 0; i < r.length && s + i < N; i++) S[1][s + i] += r[i];
    }
  }
  // breakdown riser + roll back into the ✓
  mix(...D, BREAK[0], riser(BREAK[1] - BREAK[0]), 0.5);
  for (let k = 0; k < 12; k++) mix(...D, BREAK[0] + 0.75 + k * 0.0625, SN, 0.15 + k * 0.03, k % 2 ? 0.2 : -0.2);
  for (const t of [G0, BREAK[1], END]) mix(...D, t, CR, 0.5);

  // final hit + outro pad (F → C), soft plucks
  mix(...D, END, K, 1.1);
  kicks.push(END);
  {
    const [l, r] = stab([NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4], 0.6, 1);
    mix(S[0], S[1], END, l, 1, -1);
    for (let i = 0; i < r.length; i++) S[1][n(END) + i] += r[i];
    for (const [t, ch, d] of [
      [END, [NOTE.F2, NOTE.F3, NOTE.A3, NOTE.C4], 2.4],
      [END + 2.5, [NOTE.C3, NOTE.G3, NOTE.C4, NOTE.E4], 3.0],
    ]) {
      const [pl, pr] = pad(ch, d, 1500);
      const s = n(t);
      for (let i = 0; i < pl.length && s + i < N; i++) (S[0][s + i] += pl[i] * 1.6), (S[1][s + i] += pr[i] * 1.6);
    }
    [NOTE.C5, NOTE.A4, NOTE.F4, NOTE.C5, NOTE.E5, NOTE.C5, NOTE.G4, NOTE.E5].forEach((f, i) => {
      const p = pluck(f);
      mix(...S, END + 0.5 + i * 0.5, p, 0.1, i % 2 ? 0.5 : -0.5);
      const s = n(END + 0.5 + i * 0.5);
      for (let k = 0; k < p.length && s + k < N; k++) (DL[0][s + k] += p[k] * 0.08), (DL[1][s + k] += p[k] * 0.08);
    });
  }

  // sidechain pump on synths
  const sc = new Float32Array(N).fill(1);
  for (const t of kicks) {
    const s = n(t);
    for (let i = 0; i < n(0.45) && s + i < N; i++) sc[s + i] = Math.min(sc[s + i], 1 - 0.7 * Math.exp(-i / SR / 0.1));
  }

  // ping-pong dotted-eighth delay
  const dly = n(0.375);
  const out = [new Float32Array(N), new Float32Array(N)];
  const dl = [new Float32Array(N), new Float32Array(N)];
  for (let i = 0; i < N; i++) {
    dl[0][i] = DL[0][i] + (i >= dly ? dl[1][i - dly] * 0.42 : 0);
    dl[1][i] = DL[1][i] + (i >= dly ? dl[0][i - dly] * 0.42 : 0);
  }
  const [rvL, rvR] = reverb(FX, 0.82);
  const hp = [new Biquad('hp', 30), new Biquad('hp', 30)];
  for (let i = 0; i < N; i++) {
    for (let c = 0; c < 2; c++) {
      const x = D[c][i] + S[c][i] * sc[i] + dl[c][i] * 0.6 * sc[i] + (c ? rvR[i] : rvL[i]);
      out[c][i] = Math.tanh(hp[c].p(x) * 1.15);
    }
  }
  // fade out the tail
  const fadeStart = n(MUSIC_LEN - 2.2);
  for (let i = fadeStart; i < N; i++) {
    const g = 1 - (i - fadeStart) / (N - fadeStart);
    out[0][i] *= g * g;
    out[1][i] *= g * g;
  }
  return normalize(out, 0.9);
}

/* ----------------------------------------------------------------------- sfx */

const SFX = {
  impact() {
    let ph = 0;
    const lp = new Biquad('lp', 900, 0.8);
    return render(1.4, (t) => {
      ph += (TAU * (30 + 70 * Math.exp(-t / 0.08))) / SR;
      return Math.sin(ph) * Math.exp(-t / 0.45) + lp.p(noise()) * Math.exp(-t / 0.12) * 0.9 + noise() * Math.exp(-t / 0.004) * 0.4;
    });
  },
  whoosh() {
    const bp = new Biquad('bp', 300, 1.5);
    const len = 0.55;
    return render(len, (t) => {
      const p = t / len;
      bp.set(250 * Math.pow(18, Math.sin(Math.PI * p)), 1.5);
      return bp.p(noise()) * Math.pow(Math.sin(Math.PI * p), 2) * 2.2;
    });
  },
  swish() {
    const bp = new Biquad('bp', 800, 1.2);
    const len = 0.24;
    return render(len, (t) => {
      const p = t / len;
      bp.set(900 + 5000 * p, 1.2);
      return bp.p(noise()) * Math.pow(Math.sin(Math.PI * p), 2) * 1.8;
    });
  },
  pop() {
    let ph = 0;
    return render(0.14, (t) => {
      ph += (TAU * (380 + 700 * (1 - Math.exp(-t / 0.02)))) / SR;
      return Math.sin(ph) * Math.exp(-t / 0.045) * Math.min(1, t / 0.002);
    });
  },
  tap() {
    let ph = 0;
    const hp = new Biquad('hp', 3000);
    return render(0.06, (t) => {
      ph += (TAU * 1700) / SR;
      return hp.p(noise()) * Math.exp(-t / 0.003) * 0.8 + Math.sin(ph) * Math.exp(-t / 0.012) * 0.5;
    });
  },
  clink() {
    const parts = [2210, 3570, 5120, 6890, 8150];
    return render(1.2, (t) =>
      [0, 0.014].reduce((s, off, k) => {
        if (t < off) return s;
        const tt = t - off;
        return s + parts.reduce((a, f, i) => a + Math.sin(TAU * f * (1 + k * 0.004) * tt) * Math.exp(-tt / (0.5 / (i + 1))) / (i + 1), 0) * (k ? 0.6 : 1);
      }, 0) * 0.6,
    );
  },
  blip() {
    return render(0.07, (t) => Math.sign(Math.sin(TAU * 1500 * t)) * 0.25 * Math.exp(-t / 0.02));
  },
  ding() {
    const f = 1318.5;
    return render(1.0, (t) => [1, 2.0, 2.76, 5.4].reduce((a, r, i) => a + Math.sin(TAU * f * r * t) * Math.exp(-t / (0.6 / (i + 1))) / (i + 1.5), 0));
  },
  success() {
    const notes = [1046.5, 1318.5, 1568, 2093];
    return render(1.6, (t) =>
      notes.reduce((s, f, k) => {
        const off = k * 0.07;
        if (t < off) return s;
        const tt = t - off;
        return s + [1, 2, 3.01].reduce((a, r, i) => a + Math.sin(TAU * f * r * tt) * Math.exp(-tt / (0.8 / (i + 1))) / (i + 1.3), 0);
      }, 0) * 0.5,
    );
  },
  coin() {
    return render(0.7, (t) =>
      [
        [0, 2637],
        [0.07, 3951],
      ].reduce((s, [off, f]) => {
        if (t < off) return s;
        const tt = t - off;
        return s + (Math.sin(TAU * f * tt) + Math.sin(TAU * f * 2.01 * tt) * 0.3) * Math.exp(-tt / 0.22);
      }, 0) * 0.5,
    );
  },
  cash() {
    const coin = SFX.coin();
    const hp = new Biquad('bp', 3500, 2);
    const out = render(0.9, (t) => {
      let s = 0;
      for (let k = 0; k < 6; k++) {
        const off = k * 0.018;
        if (t >= off) s += hp.p(noise()) * Math.exp(-(t - off) / 0.004);
      }
      return s * 0.6;
    });
    for (let i = 0; i < coin.length && n(0.12) + i < out.length; i++) out[n(0.12) + i] += coin[i] * 1.2;
    return out;
  },
  scan() {
    const bp = new Biquad('bp', 2000, 3);
    let ph = 0;
    return render(1.35, (t) => {
      ph += (TAU * (700 + 500 * t)) / SR;
      const trem = 0.55 + 0.45 * Math.sin(TAU * 24 * t);
      const env = Math.min(1, t / 0.05) * Math.min(1, (1.35 - t) / 0.15);
      return (Math.sin(ph) * 0.25 * trem + bp.p(noise()) * 0.35) * env;
    });
  },
  digital() {
    const out = new Float32Array(n(1.2));
    for (let k = 0; k < 46; k++) {
      const at = Math.pow(Math.random(), 0.8) * 1.1;
      const f = 1800 + Math.random() * 3600;
      const s = n(at);
      for (let i = 0; i < n(0.03) && s + i < out.length; i++) out[s + i] += Math.sign(Math.sin((TAU * f * i) / SR)) * 0.12 * Math.exp(-i / SR / 0.01);
    }
    return out;
  },
  paper() {
    const bp = new Biquad('bp', 1300, 0.8);
    let ph = 0;
    return render(0.25, (t) => {
      ph += (TAU * (120 * Math.exp(-t / 0.05) + 60)) / SR;
      return bp.p(noise()) * Math.exp(-t / 0.03) * 1.4 + Math.sin(ph) * Math.exp(-t / 0.06) * 0.6;
    });
  },
  stamp() {
    let ph = 0;
    const lp = new Biquad('lp', 1600, 0.9);
    return render(0.9, (t) => {
      ph += (TAU * (40 + 90 * Math.exp(-t / 0.04))) / SR;
      return Math.sin(ph) * Math.exp(-t / 0.25) * 1.1 + lp.p(noise()) * Math.exp(-t / 0.05) * 1.2;
    });
  },
  sparkle() {
    const out = new Float32Array(n(1.6));
    for (let k = 0; k < 34; k++) {
      const at = Math.pow(k / 34, 1.6) * 1.3;
      const f = 3000 + Math.random() * 4500;
      const s = n(at);
      for (let i = 0; i < n(0.2) && s + i < out.length; i++) out[s + i] += Math.sin((TAU * f * i) / SR) * 0.18 * Math.exp(-i / SR / 0.05);
    }
    return out;
  },
  count() {
    const out = new Float32Array(n(1.0));
    let t = 0;
    let k = 0;
    while (t < 0.9) {
      const f = 1200 + k * 40;
      const s = n(t);
      for (let i = 0; i < n(0.02); i++) out[s + i] += Math.sin((TAU * f * i) / SR) * 0.3 * Math.exp(-i / SR / 0.006);
      t += 0.035;
      k++;
    }
    return out;
  },
};

fs.mkdirSync(path.join(OUT, 'sfx'), { recursive: true });
writeWav(path.join(OUT, 'music.wav'), music());
for (const [name, fn] of Object.entries(SFX)) {
  writeWav(path.join(OUT, 'sfx', `${name}.wav`), normalize([fn()], 0.85));
}
console.log(`wrote ${OUT}`);
