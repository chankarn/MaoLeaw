// Generates the Thai voice-over with Gemini TTS → public/vo/<id>.wav (silence-trimmed)
// and writes each line's length in frames back into src/voiceover.json after every line.
//
//   GEMINI_API_KEY=... node scripts/make-voice.mjs                     # all lines
//   GEMINI_API_KEY=... node scripts/make-voice.mjs --only hook,close   # just these
//   GEMINI_API_KEY=... node scripts/make-voice.mjs --model <name>      # override cfg.model
//
// Prompt = cfg.style + the line's `direction`, then "Say:" + the Thai text. With 2.5 TTS models
// that is read as direction; 3.x TTS models tended to read it aloud, so for those the style
// goes into systemInstruction instead (cfg.styleAs = "system").
//
// The generated WAVs are committed: TTS output isn't deterministic and the free tier allows
// only ~10 TTS requests per model per day.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CFG_PATH = path.join(ROOT, 'src', 'voiceover.json');
const cfg = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) throw new Error('GEMINI_API_KEY is not set');

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
};
const MODEL = arg('--model') ?? cfg.model;
const ONLY = arg('--only')?.split(',') ?? null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tts(text, direction = '') {
  const style = `${cfg.style} ${direction}`.trim();
  const body = {
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cfg.voice } } } },
  };
  if (cfg.styleAs === 'system') {
    body.systemInstruction = { parts: [{ text: style }] };
    body.contents = [{ parts: [{ text }] }];
  } else {
    body.contents = [{ parts: [{ text: `${style}\nSay:\n${text}` }] }];
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (r.ok) {
      const d = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
      if (!d) throw new Error(`no audio for "${text}"`);
      return toPcm(Buffer.from(d.data, 'base64'), d.mimeType);
    }
    if (r.status === 429 || r.status >= 500) {
      const delay = j.error?.details?.find((x) => x.retryDelay)?.retryDelay;
      const wait = delay ? parseFloat(delay) * 1000 + 500 : 8000 * (attempt + 1);
      if (wait > 120000) throw new Error(`quota exhausted for ${MODEL} (retry in ${delay})`);
      console.log(`  ${r.status}, retrying in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${r.status} ${j.error?.message}`);
  }
  throw new Error('gave up after retries');
}

/** → { rate, samples: Int16Array } (mono). Handles WAV or raw L16. */
function toPcm(buf, mime) {
  if (buf.toString('ascii', 0, 4) === 'RIFF') {
    let o = 12;
    let rate = 24000;
    let ch = 1;
    while (o < buf.length) {
      const id = buf.toString('ascii', o, o + 4);
      const size = buf.readUInt32LE(o + 4);
      if (id === 'fmt ') (ch = buf.readUInt16LE(o + 10)), (rate = buf.readUInt32LE(o + 12));
      if (id === 'data') {
        const end = Math.min(buf.length, o + 8 + size);
        const all = new Int16Array(buf.buffer.slice(buf.byteOffset + o + 8, buf.byteOffset + end - ((end - o - 8) % 2)));
        if (ch === 1) return { rate, samples: all };
        const mono = new Int16Array(all.length / ch);
        for (let i = 0; i < mono.length; i++) mono[i] = all[i * ch];
        return { rate, samples: mono };
      }
      o += 8 + size + (size % 2);
    }
    throw new Error('wav without data chunk');
  }
  const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
  return { rate, samples: new Int16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length - (buf.length % 2))) };
}

/** Trims leading/trailing silence, keeping a few ms of air. */
function trim({ rate, samples }) {
  const thr = 600;
  let a = 0;
  let b = samples.length - 1;
  while (a < b && Math.abs(samples[a]) < thr) a++;
  while (b > a && Math.abs(samples[b]) < thr) b--;
  const pad = Math.round(rate * 0.04);
  return { rate, samples: samples.slice(Math.max(0, a - pad), Math.min(samples.length, b + pad)) };
}

function writeWav(file, { rate, samples }) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  Buffer.from(samples.buffer, samples.byteOffset, samples.length * 2).copy(buf, 44);
  fs.writeFileSync(file, buf);
}

const dir = path.join(ROOT, 'public', 'vo');
fs.mkdirSync(dir, { recursive: true });
for (const line of cfg.lines) {
  if (ONLY && !ONLY.includes(line.id)) continue;
  const pcm = trim(await tts(line.text, line.direction));
  writeWav(path.join(dir, `${line.id}.wav`), pcm);
  line.frames = Math.ceil((pcm.samples.length / pcm.rate) * 30);
  fs.writeFileSync(CFG_PATH, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`${line.id.padEnd(8)} ${(line.frames / 30).toFixed(2)}s  frames ${line.at}–${line.at + line.frames}`);
}
