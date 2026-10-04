# MaoLeaw promo video

~31-second 9:16 (1080x1920) promo for portfolio and sharing, built with [Remotion](https://www.remotion.dev).
It is **not** part of the pnpm workspace (own `package-lock.json`), so CI, Render and Vercel ignore it.
All names and amounts in the video are made up; no production data.

```bash
cd promo-video
npm install
npm run studio   # live preview / tweak timing in the browser
npm run render   # → out/maoleaw-promo.mp4
```

The soundtrack and every sound effect are synthesized by `scripts/make-audio.mjs` (no samples or downloads),
so they're free to use anywhere. `npm run audio` regenerates `public/audio/` (gitignored); `render` and `studio` run it first.
Music is 120 BPM = one beat per 15 frames; SFX cue frames live in `CUES` in `src/Promo.tsx`.

Rendering uses the locally installed Chrome (`remotion.config.ts`); change the path if yours differs.
Scenes and timings live in `src/Promo.tsx` (`T`); colors and shared pieces in `src/ui.tsx`.
