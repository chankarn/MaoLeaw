import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont as loadThai } from '@remotion/google-fonts/IBMPlexSansThai';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';

const thai = loadThai('normal', { weights: ['400', '500', '600', '700'], subsets: ['thai', 'latin'] });
const inter = loadInter('normal', { weights: ['400', '600', '700', '800'], subsets: ['latin'] });

export const FONT = `${inter.fontFamily}, ${thai.fontFamily}, sans-serif`;

// Colors from apps/liff/src/styles/globals.css + tailwind drink colors + logo navy.
export const C = {
  primary: '#DB7B06',
  primarySoft: '#FDF1E1',
  navy: '#1B2733',
  navyDeep: '#111A23',
  bg: '#FAFAF8',
  card: '#FFFFFF',
  fg: '#1C1917',
  muted: '#78716C',
  border: '#E7E5E4',
  green: '#16A34A',
  greenSoft: '#DCFCE7',
  liquor: '#D97706',
  beer: '#EAB308',
  none: '#0EA5E9',
  mixer: '#14B8A6',
  shared: '#A8A29E',
};

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export function useSpring(delay = 0, config: { damping?: number; stiffness?: number; mass?: number } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 140, ...config } });
}

/** Fades a whole scene in and out (frame is local to the scene's Sequence). */
export function Scene({ dur, children, bg = C.navy }: { dur: number; children: ReactNode; bg?: string }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, dur - 8, dur], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: bg, fontFamily: FONT, opacity }}>
      <Backdrop />
      {children}
    </AbsoluteFill>
  );
}

/** Slow-drifting warm glow so dark scenes don't feel flat. */
function Backdrop() {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 300], [0, -120]);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          width: 1300,
          height: 1300,
          left: -110,
          top: 820 + y,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.primary}55 0%, ${C.primary}00 65%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          right: -400,
          top: -300 - y / 2,
          borderRadius: '50%',
          background: `radial-gradient(circle, #3B82F633 0%, #3B82F600 65%)`,
        }}
      />
    </AbsoluteFill>
  );
}

/** Big caption at the top of each feature scene; `hl` is rendered in orange. */
export function Caption({ step, pre, hl, post = '', delay = 4 }: { step?: string; pre: string; hl: string; post?: string; delay?: number }) {
  const s = useSpring(delay);
  return (
    <div
      style={{
        position: 'absolute',
        top: 120,
        left: 70,
        right: 70,
        transform: `translateY(${(1 - s) * 40}px)`,
        opacity: s,
        color: 'white',
      }}
    >
      {step && (
        <div style={{ fontSize: 34, fontWeight: 700, color: C.primary, letterSpacing: 4, marginBottom: 14 }}>{step}</div>
      )}
      <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.25 }}>
        {pre}
        <br />
        <span style={{ color: C.primary }}>{hl}</span>
        {post}
      </div>
    </div>
  );
}

/** Phone mockup that rises in from the bottom. Content area is 640 x 1180. */
export function Phone({ children, delay = 6, title }: { children: ReactNode; delay?: number; title: string }) {
  const s = useSpring(delay, { damping: 16 });
  return (
    <div
      style={{
        position: 'absolute',
        left: (1080 - 680) / 2,
        top: 520,
        width: 680,
        height: 1300,
        borderRadius: 72,
        background: '#0B0F14',
        padding: 20,
        boxShadow: '0 40px 120px rgba(0,0,0,0.55)',
        transform: `translateY(${(1 - s) * 600}px)`,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 54,
          background: C.bg,
          overflow: 'hidden',
          position: 'relative',
          color: C.fg,
        }}
      >
        <div
          style={{
            height: 120,
            paddingTop: 52,
            textAlign: 'center',
            fontSize: 30,
            fontWeight: 600,
            borderBottom: `2px solid ${C.border}`,
            background: C.card,
          }}
        >
          {title}
        </div>
        <div style={{ padding: 32, position: 'relative', height: 1140 }}>{children}</div>
      </div>
    </div>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 28,
        border: `2px solid ${C.border}`,
        padding: 28,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Chip({ color, children, solid = false }: { color: string; children: ReactNode; solid?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 18px',
        borderRadius: 999,
        fontSize: 24,
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
        border: '4px solid white',
        flexShrink: 0,
      }}
    >
      {initial(name)}
    </div>
  );
}

/** Finger-tap ripple at (x, y) inside the phone content area, firing at `at`. */
export function Tap({ x, y, at }: { x: number; y: number; at: number }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < -12 || t > 20) return null;
  const approach = interpolate(t, [-12, 0], [0, 1], clamp);
  const ring = interpolate(t, [0, 20], [0, 1], clamp);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x - 34,
          top: y - 34,
          width: 68,
          height: 68,
          borderRadius: '50%',
          background: 'rgba(28,25,23,0.35)',
          opacity: t <= 0 ? approach : 1 - ring,
          transform: `scale(${t <= 0 ? 1.4 - approach * 0.4 : 1})`,
        }}
      />
      {t > 0 && (
        <div
          style={{
            position: 'absolute',
            left: x - 34,
            top: y - 34,
            width: 68,
            height: 68,
            borderRadius: '50%',
            border: '5px solid rgba(28,25,23,0.4)',
            transform: `scale(${1 + ring * 1.8})`,
            opacity: 1 - ring,
          }}
        />
      )}
    </>
  );
}

/** First Thai consonant, skipping leading vowels (โ เ แ ใ ไ). */
function initial(name: string) {
  return name.replace(/^[เแโใไ]/, '').slice(0, 1);
}

export function baht(n: number) {
  return `฿${Math.round(n).toLocaleString('en-US')}`;
}
