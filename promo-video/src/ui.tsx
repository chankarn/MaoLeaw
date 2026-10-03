import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont as loadThai } from '@remotion/google-fonts/IBMPlexSansThai';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';

const thai = loadThai('normal', { weights: ['400', '500', '600', '700'], subsets: ['thai', 'latin'] });
const inter = loadInter('normal', { weights: ['400', '600', '700', '800', '900'], subsets: ['latin'] });

export const FONT = `${inter.fontFamily}, ${thai.fontFamily}, sans-serif`;
export const W = 1080;
export const H = 1920;

// Colors from apps/liff/src/styles/globals.css + tailwind drink colors + logo navy.
export const C = {
  primary: '#DB7B06',
  amber: '#F5A524',
  primarySoft: '#FDF1E1',
  navy: '#1B2733',
  navyDeep: '#0F1720',
  cream: '#FBF6EC',
  bg: '#FAFAF8',
  card: '#FFFFFF',
  fg: '#1C1917',
  muted: '#78716C',
  border: '#E7E5E4',
  green: '#16A34A',
  liquor: '#D97706',
  beer: '#EAB308',
  none: '#0EA5E9',
  mixer: '#14B8A6',
  shared: '#A8A29E',
};

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
export const expoIn = Easing.bezier(0.7, 0, 0.84, 0);

/** interpolate with clamping + expo-out by default. */
export function tw(frame: number, input: [number, number], output: [number, number], easing = expoOut) {
  return interpolate(frame, input, output, { ...clamp, easing });
}

export function useSpring(delay = 0, config: { damping?: number; stiffness?: number; mass?: number } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 140, ...config } });
}

/* ------------------------------------------------------------- Shot + transitions */

export type Tr = 'none' | 'whipLeft' | 'whipUp' | 'iris' | 'zoom';
const TL = 10;

/**
 * A full-frame shot with an enter/exit transition. Consecutive shots overlap by TL
 * frames so a whip/zoom out of one meets the whip/zoom into the next.
 */
export function Shot({ dur, enter = 'none', exit = 'none', bg, children }: { dur: number; enter?: Tr; exit?: Tr; bg: string; children: ReactNode }) {
  const f = useCurrentFrame();
  const i = tw(f, [0, TL], [1, 0]); // 1 → 0 entering
  const o = interpolate(f, [dur - TL, dur], [0, 1], { ...clamp, easing: expoIn }); // 0 → 1 leaving
  let tf = '';
  let blur = 0;
  let opacity = 1;
  let clipPath: string | undefined;
  if (enter === 'whipLeft') (tf += ` translateX(${i * W}px) skewX(${-i * 12}deg)`), (blur += i * 40);
  if (enter === 'whipUp') (tf += ` translateY(${i * H}px)`), (blur += i * 40);
  if (enter === 'zoom') (tf += ` scale(${1 + i * 0.5})`), (opacity *= 1 - i);
  if (enter === 'iris') clipPath = `circle(${tw(f, [0, 14], [0, 120])}% at 50% 52%)`;
  if (exit === 'whipLeft') (tf += ` translateX(${-o * W}px) skewX(${o * 12}deg)`), (blur += o * 40);
  if (exit === 'whipUp') (tf += ` translateY(${-o * H}px)`), (blur += o * 40);
  if (exit === 'zoom') (tf += ` scale(${1 + o * 2})`), (opacity *= 1 - o);
  return (
    <AbsoluteFill
      style={{
        background: bg,
        fontFamily: FONT,
        overflow: 'hidden',
        transform: tf || undefined,
        filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
        opacity,
        clipPath,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/** Staggered colour bars that sweep up over the frame; the cut happens at BARS_CUT. */
export const BARS_DUR = 30;
export const BARS_CUT = 15;
export function Bars({ colors = [C.primary, C.navy, C.amber, C.navyDeep, C.primary] }: { colors?: string[] }) {
  const f = useCurrentFrame();
  const bw = W / colors.length;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {colors.map((c, i) => {
        const d = i * 1.5;
        const y = f < 15 ? tw(f, [d, d + 9], [H, 0]) : tw(f, [16 + d, 24 + d], [0, -H], expoIn);
        return (
          <div
            key={i}
            style={{ position: 'absolute', left: i * bw - 1, width: bw + 2, top: 0, height: H, background: c, transform: `translateY(${y}px)` }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ motion helpers */

/** Decaying camera shake; `events` = [frame, strength][]. */
export function Shaker({ events, children }: { events: [number, number][]; children: ReactNode }) {
  const f = useCurrentFrame();
  let x = 0;
  let y = 0;
  let r = 0;
  for (const [at, s] of events) {
    const t = f - at;
    if (t < 0 || t > 16) continue;
    const k = (1 - t / 16) ** 2 * s;
    x += (random(`sx${f}${at}`) - 0.5) * 2 * k;
    y += (random(`sy${f}${at}`) - 0.5) * 2 * k;
    r += (random(`sr${f}${at}`) - 0.5) * 0.08 * k;
  }
  return <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) rotate(${r}deg)` }}>{children}</AbsoluteFill>;
}

/** Line of text that slides up from behind a mask. */
export function RevealLine({ children, delay, style }: { children: ReactNode; delay: number; style?: CSSProperties }) {
  const f = useCurrentFrame();
  const p = tw(f, [delay, delay + 16], [1, 0]);
  return (
    <div style={{ overflow: 'hidden', padding: '0.25em 0.1em', margin: '-0.25em -0.1em' }}>
      <div style={{ transform: `translateY(${p * 115}%) rotate(${p * 4}deg)`, transformOrigin: 'left bottom', ...style }}>{children}</div>
    </div>
  );
}

/** Outlined step number + two masked lines. */
export function StepCaption({
  num,
  l1,
  l2,
  delay = 6,
  light = false,
}: {
  num: string;
  l1: string;
  l2: string;
  delay?: number;
  light?: boolean;
}) {
  const n = useSpring(delay, { damping: 11, stiffness: 160 });
  return (
    <div style={{ position: 'absolute', top: 110, left: 64, right: 40, display: 'flex', alignItems: 'center', gap: 28 }}>
      <div
        style={{
          fontSize: 190,
          fontWeight: 900,
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: `5px ${light ? C.navy : C.primary}`,
          transform: `scale(${n}) rotate(${(1 - n) * -40}deg)`,
          letterSpacing: -8,
        }}
      >
        {num}
      </div>
      <div>
        <RevealLine delay={delay + 4} style={{ fontSize: 64, fontWeight: 700, color: light ? 'white' : 'white' }}>
          {l1}
        </RevealLine>
        <RevealLine delay={delay + 9} style={{ fontSize: 64, fontWeight: 700, color: light ? C.navy : C.primary }}>
          {l2}
        </RevealLine>
      </div>
    </div>
  );
}

/** Huge outlined words drifting sideways behind the action. */
export function Marquee({ text, y, speed, dir = 1, opacity = 0.09, color = 'white' }: { text: string; y: number; speed: number; dir?: 1 | -1; opacity?: number; color?: string }) {
  const f = useCurrentFrame();
  const x = dir === 1 ? -1600 + f * speed : -f * speed;
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: 0,
        whiteSpace: 'nowrap',
        fontSize: 230,
        fontWeight: 900,
        color: 'transparent',
        WebkitTextStroke: `3px ${color}`,
        opacity,
        transform: `translateX(${x}px)`,
      }}
    >
      {Array(6).fill(text).join('  ')}
    </div>
  );
}

/** Radial particle burst at (x, y). */
export function Burst({ at, x, y, count = 26, dist = 380, colors = [C.primary, C.amber, 'white'], size = 18 }: { at: number; x: number; y: number; count?: number; dist?: number; colors?: string[]; size?: number }) {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < 0 || t > 36) return null;
  const p = tw(t, [0, 30], [0, 1]);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = random(`ba${at}${i}`) * Math.PI * 2;
        const d = dist * (0.45 + random(`bd${at}${i}`) * 0.55) * p;
        const s = size * (0.5 + random(`bs${at}${i}`));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x + Math.cos(a) * d - s / 2,
              top: y + Math.sin(a) * d - s / 2 + t * t * 0.15,
              width: s,
              height: i % 3 === 0 ? s * 2.2 : s,
              borderRadius: i % 3 === 0 ? 4 : '50%',
              background: colors[i % colors.length],
              opacity: 1 - tw(t, [14, 36], [0, 1]),
              transform: `rotate(${a * 57 + t * 20}deg)`,
            }}
          />
        );
      })}
    </>
  );
}

/** Expanding ring(s). */
export function Shockwave({ at, x, y, color = 'white', max = 700, rings = 2 }: { at: number; x: number; y: number; color?: string; max?: number; rings?: number }) {
  const f = useCurrentFrame();
  return (
    <>
      {Array.from({ length: rings }, (_, i) => {
        const t = f - at - i * 5;
        if (t < 0 || t > 24) return null;
        const r = tw(t, [0, 24], [20, max]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - r,
              top: y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              border: `${tw(t, [0, 24], [22, 1])}px solid ${color}`,
              opacity: 1 - t / 24,
            }}
          />
        );
      })}
    </>
  );
}

/** Full-frame flash that fades out. */
export function Flash({ at, color = 'white', peak = 0.7, len = 10 }: { at: number; color?: string; peak?: number; len?: number }) {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < 0 || t > len) return null;
  return <AbsoluteFill style={{ background: color, opacity: peak * (1 - t / len), pointerEvents: 'none' }} />;
}

export function Confetti({ at, x = W / 2, y = H / 2 }: { at: number; x?: number; y?: number }) {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < 0 || t > 70) return null;
  const colors = [C.primary, C.beer, C.green, C.none, '#F43F5E', 'white'];
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: 90 }, (_, i) => {
        const a = random(`ca${i}`) * Math.PI * 2;
        const v = 22 + random(`cv${i}`) * 34;
        const drag = 1 - Math.exp(-t / 9);
        const px = x + Math.cos(a) * v * 9 * drag;
        const py = y + Math.sin(a) * v * 9 * drag + t * t * 0.32;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px,
              top: py,
              width: 16,
              height: 30,
              background: colors[i % colors.length],
              borderRadius: 4,
              transform: `rotate(${t * (10 + (i % 9) * 4)}deg) rotateX(${t * 14}deg)`,
              opacity: tw(t, [50, 70], [1, 0]),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/* ---------------------------------------------------------------------- UI pieces */

/** Phone mockup (620 x 1240). Content area is a relative box 528 wide starting at (28, 28) below the title bar. */
export function Phone({ children, title, style }: { children: ReactNode; title: string; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        width: 620,
        height: 1240,
        borderRadius: 74,
        background: 'linear-gradient(145deg, #2A3642, #070B10)',
        padding: 18,
        boxShadow: '0 60px 140px rgba(0,0,0,0.6), inset 0 0 0 3px #3B4856',
        ...style,
      }}
    >
      <div style={{ width: '100%', height: '100%', borderRadius: 58, background: C.bg, overflow: 'hidden', position: 'relative', color: C.fg }}>
        <div
          style={{
            height: 108,
            paddingTop: 50,
            textAlign: 'center',
            fontSize: 28,
            fontWeight: 600,
            borderBottom: `2px solid ${C.border}`,
            background: C.card,
          }}
        >
          {title}
        </div>
        <div style={{ position: 'absolute', left: 28, top: 136, width: 528, height: 1040 }}>{children}</div>
      </div>
    </div>
  );
}

export function Chip({ color, children, solid = false, size = 24 }: { color: string; children: ReactNode; solid?: boolean; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 18px',
        borderRadius: 999,
        fontSize: size,
        fontWeight: 600,
        background: solid ? color : `${color}22`,
        color: solid ? 'white' : color === C.beer ? '#A16207' : color,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/** First Thai consonant, skipping leading vowels (โ เ แ ใ ไ). */
function initial(name: string) {
  return name.replace(/^[เแโใไ]/, '').slice(0, 1);
}

export function Avatar({ name, color, size = 72 }: { name: string; color: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        color: 'white',
        fontWeight: 700,
        fontSize: size * 0.42,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `${Math.max(3, size / 22)}px solid white`,
        flexShrink: 0,
      }}
    >
      {initial(name)}
    </div>
  );
}

/** Finger-tap ripple at (x, y), firing at `at`. */
export function Tap({ x, y, at }: { x: number; y: number; at: number }) {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < -10 || t > 18) return null;
  const approach = tw(t, [-10, 0], [0, 1]);
  const ring = tw(t, [0, 18], [0, 1]);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x - 36,
          top: y - 36,
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(28,25,23,0.35)',
          opacity: t <= 0 ? approach : 1 - ring,
          transform: `scale(${t <= 0 ? 1.5 - approach * 0.5 : 0.9})`,
        }}
      />
      {t > 0 && (
        <div
          style={{
            position: 'absolute',
            left: x - 36,
            top: y - 36,
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: '5px solid rgba(28,25,23,0.4)',
            transform: `scale(${1 + ring * 2})`,
            opacity: 1 - ring,
          }}
        />
      )}
    </>
  );
}

/** A crop of public/logo.png (2048² source). */
export function LogoCrop({ x, y, w, h, scale, style }: { x: number; y: number; w: number; h: number; scale: number; style?: CSSProperties }) {
  return (
    <div style={{ width: w * scale, height: h * scale, overflow: 'hidden', position: 'relative', ...style }}>
      <Img src={staticFile('logo.png')} style={{ position: 'absolute', width: 2048 * scale, height: 2048 * scale, left: -x * scale, top: -y * scale }} />
    </div>
  );
}
export const MUGS = { x: 410, y: 745, w: 1200, h: 945 };
export const WORDMARK = { x: 270, y: 310, w: 1490, h: 380 };

export function baht(n: number) {
  return `฿${Math.round(n).toLocaleString('en-US')}`;
}
