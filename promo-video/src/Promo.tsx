import { AbsoluteFill, Sequence, interpolate, random, useCurrentFrame } from 'remotion';
import {
  Avatar,

  BARS_DUR,
  Bars,
  Burst,
  C,
  Chip,
  Confetti,
  FONT,
  Flash,
  H,

  LogoCrop,
  MUGS,
  Marquee,
  Phone,
  RevealLine,
  Shaker,
  Shockwave,
  Shot,
  StepCaption,
  Tap,
  W,
  WORDMARK,
  baht,
  clamp,
  expoIn,
  tw,
  useSpring,
} from './ui';

// 30 fps · 1080x1920 · 30 s. Shots overlap by 10 frames where a whip/zoom/iris joins them;
// bar wipes hide the cut at their midpoint.
const SHOTS = {
  intro: [0, 64],
  logo: [62, 66], // cut under bars @ 113+15 = 128
  event: [127, 127],
  receipt: [244, 150],
  split: [384, 130],
  slip: [504, 166],
  close: [660, 134], // cut under bars @ 779+15 = 794
  outro: [793, 107],
} as const;
const BARS_AT = [113, 779];
export const PROMO_DURATION = 900;

export const Promo = () => (
  <AbsoluteFill style={{ background: C.navyDeep, fontFamily: FONT }}>
    {(Object.keys(SHOTS) as (keyof typeof SHOTS)[]).map((k) => {
      const [from, dur] = SHOTS[k];
      const S = SCENES[k];
      return (
        <Sequence key={k} from={from} durationInFrames={dur}>
          <S dur={dur} />
        </Sequence>
      );
    })}
    {BARS_AT.map((at, i) => (
      <Sequence key={at} from={at} durationInFrames={BARS_DUR}>
        <Bars colors={i === 0 ? [C.navy, C.primary, C.navyDeep, C.amber, C.navy] : [C.primary, C.cream, C.amber, C.primary, C.cream]} />
      </Sequence>
    ))}
  </AbsoluteFill>
);


/* =================================================================== 1. INTRO */

const TAGS = [407, 512, 107, 900, 796, 690, 120, 60, 2566, 407, 512, 107];

function Intro({ dur }: { dur: number }) {
  const f = useCurrentFrame();
  const beat = f < 15 ? 0 : f < 30 ? 1 : 2;
  const bg = [C.navy, C.primary, C.cream][beat]!;
  const slamA = Math.min(1.08, useSpring(0, { damping: 18, stiffness: 260 }));
  const slamB = Math.min(1.08, useSpring(15, { damping: 18, stiffness: 260 }));
  const l1 = useSpring(30, { damping: 13, stiffness: 200 });
  const l2 = useSpring(34, { damping: 10, stiffness: 200 });
  const iris = tw(f, [52, 64], [0, 1500], expoIn);
  return (
    <Shot dur={dur} bg={bg}>
      <Shaker events={[[1, 26], [16, 26], [35, 34]]}>
        {beat === 0 && (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2 - Math.PI / 2 + f * 0.04;
              const s = tw(f, [2 + i, 8 + i], [0, 1]);
              return (
                <div key={i} style={{ position: 'absolute', left: 540 + Math.cos(a) * 400 - 50, top: 940 + Math.sin(a) * 400 - 50, transform: `scale(${s})` }}>
                  <Avatar name={'ตมบพจฟนอ'[i]!} color={[C.beer, C.liquor, C.none][i % 3]!} size={100} />
                </div>
              );
            })}
            <div style={{ color: 'white', textAlign: 'center', transform: `scale(${3 - slamA * 2})`, filter: `blur(${(1 - slamA) * 20}px)` }}>
              <div style={{ fontSize: 460, fontWeight: 900, lineHeight: 0.9 }}>8</div>
              <div style={{ fontSize: 130, fontWeight: 700 }}>คน</div>
            </div>
          </AbsoluteFill>
        )}
        {beat === 1 && (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <AbsoluteFill
              style={{
                background: `repeating-linear-gradient(-35deg, transparent 0 60px, rgba(255,255,255,0.12) 60px 120px)`,
                backgroundPosition: `${f * 14}px 0`,
              }}
            />
            <div style={{ color: C.navy, textAlign: 'center', transform: `scale(${3 - slamB * 2}) rotate(${(1 - slamB) * 25 - 6}deg)` }}>
              <div style={{ fontSize: 460, fontWeight: 900, lineHeight: 0.9 }}>1</div>
              <div style={{ fontSize: 130, fontWeight: 700 }}>บิล</div>
            </div>
          </AbsoluteFill>
        )}
        {beat === 2 && (
          <AbsoluteFill style={{ perspective: 900 }}>
            {TAGS.map((n, i) => {
              const start = 30 + i * 2;
              const z = interpolate(f, [start, start + 26], [-2600, 900], clamp);
              if (f < start) return null;
              const x = 120 + random(`tx${i}`) * 840;
              const y = 260 + random(`ty${i}`) * 1400;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: x - 130,
                    top: y - 60,
                    padding: '18px 40px',
                    borderRadius: 999,
                    background: 'white',
                    border: `6px solid ${C.navy}`,
                    fontSize: 72,
                    fontWeight: 800,
                    color: C.navy,
                    transform: `translateZ(${z}px) rotate(${(random(`tr${i}`) - 0.5) * 40}deg)`,
                    opacity: interpolate(z, [-2600, -1800, 500, 900], [0, 1, 1, 0], clamp),
                  }}
                >
                  {baht(n)}
                </div>
              );
            })}
            <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: 70 }}>
              <div style={{ fontSize: 170, fontWeight: 700, color: C.navy, lineHeight: 1.15, transform: `translateX(${(1 - l1) * -1100}px)` }}>ใครจ่าย</div>
              <div
                style={{
                  fontSize: 190,
                  fontWeight: 700,
                  color: C.primary,
                  lineHeight: 1.15,
                  transform: `translateX(${(1 - l2) * 1100}px) rotate(${(1 - l2) * 10}deg)`,
                }}
              >
                เท่าไหร่?
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        )}
      </Shaker>
      {iris > 0 && (
        <div style={{ position: 'absolute', left: 860 - iris, top: 1100 - iris, width: iris * 2, height: iris * 2, borderRadius: '50%', background: C.primary }} />
      )}
    </Shot>
  );
}

/* ==================================================================== 2. LOGO */

function Logo({ dur }: { dur: number }) {
  const f = useCurrentFrame();
  const reveal = tw(f, [0, 14], [0, 1500]);
  const mugs = useSpring(6, { damping: 9, stiffness: 170 });
  const wobble = f > 16 ? Math.sin((f - 16) * 0.7) * 8 * Math.exp(-(f - 16) / 10) : 0;
  const word = tw(f, [20, 36], [100, 0]);
  return (
    <Shot dur={dur} bg={C.primary}>
      <div style={{ position: 'absolute', left: 540 - reveal, top: 900 - reveal, width: reveal * 2, height: reveal * 2, borderRadius: '50%', background: C.cream }} />
      <Shaker events={[[16, 18]]}>
        <AbsoluteFill
          style={{
            background: `repeating-conic-gradient(from ${f * 0.8}deg at 50% 41%, ${C.primary}14 0deg 9deg, transparent 9deg 18deg)`,
            opacity: tw(f, [8, 24], [0, 1]),
          }}
        />
        <Shockwave at={16} x={540} y={640} color={C.primary} max={760} rings={3} />
        <div style={{ position: 'absolute', left: 540 - (MUGS.w * 0.66) / 2, top: 470, transform: `scale(${mugs}) rotate(${(1 - mugs) * -30 + wobble}deg)` }}>
          <LogoCrop {...MUGS} scale={0.66} />
        </div>
        <Burst at={16} x={540} y={520} count={30} dist={460} colors={[C.primary, C.amber, C.navy]} />
        <div style={{ position: 'absolute', left: 540 - (WORDMARK.w * 0.6) / 2, top: 1150, clipPath: `inset(0 ${word}% 0 0)` }}>
          <LogoCrop {...WORDMARK} scale={0.6} />
        </div>
        <div style={{ position: 'absolute', top: 1430, left: 0, right: 0, textAlign: 'center' }}>
          <RevealLine delay={32} style={{ fontSize: 66, fontWeight: 700, color: C.navy }}>
            หารบิลวงเหล้า
          </RevealLine>
          <RevealLine delay={37} style={{ fontSize: 66, fontWeight: 700, color: C.primary }}>
            จบในแชท LINE
          </RevealLine>
        </div>
      </Shaker>
    </Shot>
  );
}

/* =================================================================== 3. EVENT */

const ATTENDEES = [
  ['ต้น', C.beer],
  ['มายด์', C.liquor],
  ['บอส', C.beer],
  ['แพร', C.none],
  ['เจ', C.liquor],
  ['ฟ้า', C.beer],
  ['นัท', C.none],
  ['โอ๊ต', C.none],
] as const;

function EventScene({ dur }: { dur: number }) {
  const f = useCurrentFrame();
  const enter = useSpring(4, { damping: 15, stiffness: 90 });
  const joined = f >= 40;
  const punch = useSpring(40, { damping: 8, stiffness: 300 });
  const chooser = useSpring(48);
  const picked = f >= 66;
  const badge = useSpring(74, { damping: 11 });
  const count = Math.round(tw(f, [78, 104], [0, 8]));
  return (
    <Shot dur={dur} enter="none" exit="whipLeft" bg={C.navy}>
      <Marquee text="เข้าร่วม • JOIN •" y={560} speed={9} />
      <Marquee text="ปาร์ตี้ • PARTY •" y={1300} speed={7} dir={-1} />
      <StepCaption num="01" l1="แชร์เข้ากลุ่ม LINE" l2="เพื่อนกดเข้าร่วม" delay={4} />
      <AbsoluteFill style={{ perspective: 2200 }}>
        <Phone
          title="MaoLeaw"
          style={{
            left: (W - 620) / 2,
            top: 470,
            transform: `translateY(${(1 - enter) * 1500}px) rotateX(${(1 - enter) * 45 + 6}deg) rotateY(${tw(f, [0, dur], [-24, 16], (t) => t)}deg) rotateZ(${(1 - enter) * -14}deg) scale(0.94)`,
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: 528, height: 410, borderRadius: 28, overflow: 'hidden', background: C.card, border: `2px solid ${C.border}` }}>
            <div style={{ height: 180, background: `linear-gradient(135deg, ${C.primary}, ${C.amber})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 104 }}>
              🔥🥩🍻
            </div>
            <div style={{ padding: 26 }}>
              <div style={{ fontSize: 42, fontWeight: 700 }}>ปาร์ตี้หมูกระทะ</div>
              <div style={{ fontSize: 26, color: C.muted, marginTop: 8 }}>📅 ศ. 10 ต.ค. · 19:00 · 📍 ลุงชัย</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                <Chip color={C.muted}>🗺️ แผนที่</Chip>
                <Chip color={C.muted}>🗓️ ลงปฏิทิน</Chip>
              </div>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              top: 434,
              left: 0,
              width: 528,
              height: 96,
              borderRadius: 24,
              background: joined ? C.green : C.primary,
              color: 'white',
              fontSize: 36,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${joined ? 0.9 + punch * 0.1 : 1})`,
            }}
          >
            {joined ? 'เข้าร่วมแล้ว ✓' : 'เข้าร่วมงาน'}
          </div>
          <Burst at={40} x={264} y={482} count={18} dist={260} colors={[C.green, '#86EFAC', 'white']} size={14} />
          <div style={{ position: 'absolute', top: 560, left: 0, width: 528, opacity: chooser, transform: `translateY(${(1 - chooser) * 40}px)` }}>
            <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 14 }}>คืนนี้ดื่มอะไร?</div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[
                ['🍺 เบียร์', C.beer],
                ['🥃 เหล้า', C.liquor],
                ['🥤 ไม่ดื่ม', C.none],
              ].map(([label, color], i) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    height: 88,
                    borderRadius: 22,
                    fontSize: 28,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `3px solid ${picked && i === 0 ? color : C.border}`,
                    background: picked && i === 0 ? `${color}2A` : C.card,
                    transform: `scale(${picked && i === 0 ? 1.04 : 1})`,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
          <Tap x={264} y={482} at={38} />
          <Tap x={83} y={660} at={64} />
        </Phone>
      </AbsoluteFill>

      {/* avatars fly in from the edges into a floating badge */}
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 1630,
          width: 860,
          height: 170,
          borderRadius: 999,
          background: 'white',
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
          transform: `scale(${badge})`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 36px',
          gap: 24,
        }}
      >
        <div style={{ width: 8 * 66 + 26, height: 100 }} />
        <div style={{ fontSize: 40, fontWeight: 700, color: C.navy }}>
          <span style={{ color: C.green, fontSize: 64, fontWeight: 800 }}>{count}</span> คน
        </div>
      </div>
      {ATTENDEES.map(([name, color], i) => {
        const s = springAt(f, 78 + i * 3);
        const fromA = random(`av${i}`) * Math.PI * 2;
        const sx = 540 + Math.cos(fromA) * 1300;
        const sy = 1000 + Math.sin(fromA) * 1300;
        const tx = 110 + 36 + i * 66;
        const ty = 1630 + 35;
        return (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: sx + (tx - sx) * s,
              top: sy + (ty - sy) * s,
              transform: `rotate(${(1 - s) * 360}deg)`,
              opacity: f >= 78 + i * 3 ? 1 : 0,
              zIndex: i,
            }}
          >
            <Avatar name={name} color={color} size={96} />
          </div>
        );
      })}
    </Shot>
  );
}

/** Damped-spring curve at a given delay; plain function so it is safe inside .map(). */
function springAt(frame: number, delay: number, damping = 13, stiffness = 120) {
  // critically-damped-ish curve that overshoots slightly, matching spring() feel
  const t = Math.max(0, frame - delay) / 30;
  const w = Math.sqrt(stiffness);
  const z = damping / (2 * w);
  if (t === 0) return 0;
  const wd = w * Math.sqrt(Math.max(0.0001, 1 - z * z));
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

/* ================================================================== 4. RECEIPT */

const ITEMS = [
  { name: 'หมูกระทะ x4', line: 'หมูกระทะ 4 ชุด', price: 796, type: 'หารทุกคน', color: C.shared },
  { name: 'ลีโอ ขวดใหญ่ x10', line: 'LEO 620ML x10', price: 900, type: '🍺 เบียร์', color: C.beer },
  { name: 'รีเจนซี่ 700 มล.', line: 'REGENCY 700ML', price: 690, type: '🥃 เหล้า', color: C.liquor },
  { name: 'โซดา x6', line: 'SODA x6', price: 120, type: 'มิกเซอร์', color: C.mixer },
  { name: 'น้ำแข็ง', line: 'ICE', price: 60, type: 'หารทุกคน', color: C.shared },
];
const R = { left: 200, top: 520, w: 680, lineTop: 170, lineGap: 76 };

function ReceiptScene({ dur }: { dur: number }) {
  const f = useCurrentFrame();
  const enter = useSpring(6, { damping: 13, stiffness: 110 });
  const scanY = tw(f, [16, 56], [0, 620], (t) => t);
  const shrink = tw(f, [60, 80], [0, 1]);
  const total = tw(f, [104, 124], [0, 2566]);
  const totalPop = useSpring(104, { damping: 10 });
  return (
    <Shot dur={dur} enter="whipLeft" exit="none" bg={C.navyDeep}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.primary}18 2px, transparent 2px), linear-gradient(90deg, ${C.primary}18 2px, transparent 2px)`,
          backgroundSize: '90px 90px',
          backgroundPosition: `0 ${f * 3}px`,
        }}
      />
      <StepCaption num="02" l1="ถ่ายรูปใบเสร็จ" l2="AI แยกรายการให้" delay={8} />

      {/* receipt: flies in, gets scanned, then tucks into the corner */}
      <AbsoluteFill style={{ perspective: 1800 }}>
        <div
          style={{
            position: 'absolute',
            left: R.left,
            top: R.top,
            width: R.w,
            transformOrigin: 'top left',
            transform: `translate(${shrink * -130}px, ${(1 - enter) * 1400 + shrink * -60}px) scale(${1 - shrink * 0.6}) rotateX(${(1 - shrink) * 14}deg) rotateZ(${(1 - enter) * 40 - 4 * (1 - shrink)}deg)`,
          }}
        >
          <div style={{ background: 'white', borderRadius: 18, padding: '44px 48px', fontFamily: 'monospace', fontSize: 34, color: '#44403C', position: 'relative', boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 40, fontFamily: FONT }}>หมูกระทะลุงชัย</div>
            <div style={{ textAlign: 'center', fontSize: 26, marginBottom: 30 }}>10/10/26 22:41</div>
            {ITEMS.map((it, i) => {
              const hit = scanY > R.lineTop + i * R.lineGap + 20;
              const hs = springAt(f, 16 + ((R.lineTop + i * R.lineGap + 20) / 620) * 40, 12, 220);
              return (
                <div key={it.line} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', height: R.lineGap, alignItems: 'center' }}>
                  <span style={{ fontFamily: i === 0 ? FONT : 'monospace' }}>{it.line}</span>
                  <span>{it.price}.00</span>
                  {hit && shrink < 1 && (
                    <>
                      <div style={{ position: 'absolute', inset: '4px -16px', border: `4px solid ${it.color}`, borderRadius: 10, opacity: (1 - shrink) * Math.min(1, hs), transform: `scale(${0.9 + hs * 0.1})` }} />
                      <div style={{ position: 'absolute', left: 300, top: 16, transform: `scale(${hs})`, opacity: 1 - shrink, fontFamily: FONT }}>
                        <Chip color={it.color} solid size={22}>
                          {it.type}
                        </Chip>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            <div style={{ borderTop: '4px dashed #A8A29E', marginTop: 20, paddingTop: 20, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>TOTAL</span>
              <span>2,566.00</span>
            </div>
            {scanY > 0 && scanY < 620 && (
              <>
                <div style={{ position: 'absolute', left: -20, right: -20, top: scanY, height: 6, background: C.amber, boxShadow: `0 0 50px 22px ${C.primary}AA` }} />
                {Array.from({ length: 6 }, (_, k) => (
                  <div
                    key={k}
                    style={{
                      position: 'absolute',
                      left: random(`sp${Math.floor(f / 3)}${k}`) * 640,
                      top: scanY - 30 - random(`sq${Math.floor(f / 3)}${k}`) * 60,
                      color: C.amber,
                      fontSize: 30 + random(`sz${k}`) * 20,
                      fontFamily: FONT,
                    }}
                  >
                    ✦
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </AbsoluteFill>

      <div style={{ position: 'absolute', left: 400, top: 560, opacity: shrink, transform: `translateX(${(1 - shrink) * 200}px)` }}>
        <Chip color={C.primary} solid size={34}>
          ✨ Gemini AI
        </Chip>
        <div style={{ color: '#CBD5E1', fontSize: 34, marginTop: 18 }}>อ่าน 2 รูป · ได้ 5 รายการ</div>
      </div>

      {/* rows fly out of the receipt into place */}
      {ITEMS.map((it, i) => {
        const at = 70 + i * 5;
        const s = springAt(f, at, 14, 130);
        if (f < at) return null;
        const sx = R.left + 40;
        const sy = R.top + R.lineTop + i * R.lineGap;
        const tx = 70;
        const ty = 900 + i * 132;
        return (
          <div
            key={it.name}
            style={{
              position: 'absolute',
              left: sx + (tx - sx) * s,
              top: sy + (ty - sy) * s,
              width: 940,
              height: 116,
              transform: `scale(${0.5 + 0.5 * Math.min(1.05, s)}) rotate(${(1 - s) * -8}deg)`,
              transformOrigin: 'left center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'white',
              borderRadius: 24,
              borderLeft: `14px solid ${it.color}`,
              padding: '0 32px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={{ fontSize: 38, fontWeight: 600 }}>{it.name}</span>
              <Chip color={it.color}>{it.type}</Chip>
            </div>
            <span style={{ fontSize: 42, fontWeight: 800 }}>{baht(it.price)}</span>
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          top: 1580,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          color: 'white',
          opacity: Math.min(1, totalPop * 2),
          transform: `scale(${0.6 + totalPop * 0.4})`,
        }}
      >
        <span style={{ fontSize: 52, fontWeight: 700 }}>รวม</span>
        <span style={{ fontSize: 110, fontWeight: 900, color: C.amber, fontVariantNumeric: 'tabular-nums' }}>{baht(total)}</span>
      </div>
    </Shot>
  );
}

/* ==================================================================== 5. SPLIT */

// Shared 856/8 = 107 · beer 900/3 = 300 · liquor+mixer 810/2 = 405 → sums to 2,566.
const SHARES = [
  { name: 'ต้น', color: C.beer, label: 'เบียร์', amount: 407 },
  { name: 'มายด์', color: C.liquor, label: 'เหล้า', amount: 512 },
  { name: 'บอส', color: C.beer, label: 'เบียร์', amount: 407 },
  { name: 'แพร', color: C.none, label: 'ไม่ดื่ม', amount: 107 },
  { name: 'เจ', color: C.liquor, label: 'เหล้า', amount: 512 },
  { name: 'ฟ้า', color: C.beer, label: 'เบียร์', amount: 407 },
  { name: 'นัท', color: C.none, label: 'ไม่ดื่ม', amount: 107 },
  { name: 'โอ๊ต', color: C.none, label: 'ไม่ดื่ม', amount: 107 },
];
const SEGMENTS = [
  { v: 856, color: 'white', label: 'หารทุกคน' },
  { v: 900, color: '#FDE047', label: 'เบียร์' },
  { v: 810, color: C.navy, label: 'เหล้า+มิกเซอร์' },
];

function SplitScene({ dur }: { dur: number }) {
  const f = useCurrentFrame();
  const count = tw(f, [10, 38], [0, 2566]);
  const punch = useSpring(38, { damping: 7, stiffness: 260 });
  const out = tw(f, [52, 66], [0, 1], expoIn);
  const cx = 540;
  const cy = 1010;
  const r = 300;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <Shot dur={dur} enter="iris" exit="whipUp" bg={C.primary}>
      <Marquee text="หาร • SPLIT •" y={1500} speed={10} color={C.navy} opacity={0.12} />
      <StepCaption num="03" l1="ใครกินอะไร" l2="จ่ายตามนั้น" delay={6} light />
      <Shaker events={[[38, 30]]}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: 1 - out, transform: `scale(${1 - out * 0.5})`, transformOrigin: `${cx}px ${cy}px` }}>
          <svg width={W} height={H} style={{ position: 'absolute' }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={70} />
            {SEGMENTS.map((s, i) => {
              const len = (s.v / 2566) * circ;
              const drawn = tw(f, [8 + i * 8, 26 + i * 8], [0, len]);
              const el = (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={70}
                  strokeDasharray={`${drawn} ${circ}`}
                  strokeDashoffset={-acc}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              );
              acc += len;
              return el;
            })}
          </svg>
          <div style={{ position: 'absolute', left: 0, right: 0, top: cy - 90, textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: 118, fontWeight: 900, fontVariantNumeric: 'tabular-nums', transform: `scale(${0.85 + punch * 0.15})`, lineHeight: 1 }}>{baht(count)}</div>
            <div style={{ fontSize: 40, fontWeight: 600, marginTop: 12, color: C.navy }}>ทั้งบิล</div>
          </div>
          <div style={{ position: 'absolute', top: cy + r + 90, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 18 }}>
            {SEGMENTS.map((s, i) => (
              <div key={i} style={{ opacity: tw(f, [20 + i * 8, 30 + i * 8], [0, 1]), display: 'flex', alignItems: 'center', gap: 10, color: 'white', fontSize: 30, fontWeight: 600 }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: s.color, display: 'inline-block' }} />
                {s.label}
              </div>
            ))}
          </div>
        </div>
        <Burst at={56} x={cx} y={cy} count={34} dist={600} colors={['white', C.navy, '#FDE047']} />

        {/* the total breaks into everyone's share */}
        {SHARES.map((s, i) => {
          const at = 56 + i * 2;
          const p = springAt(f, at, 13, 140);
          if (f < at) return null;
          const col = i % 2;
          const row = Math.floor(i / 2);
          const tx = 70 + col * 480;
          const ty = 560 + row * 196;
          const amt = tw(f, [at + 6, at + 30], [0, s.amount]);
          return (
            <div
              key={s.name}
              style={{
                position: 'absolute',
                left: cx - 215 + (tx - cx + 215) * p,
                top: cy - 85 + (ty - cy + 85) * p,
                width: 460,
                height: 172,
                transform: `scale(${Math.max(0, p)}) rotate(${(1 - p) * (random(`sr${i}`) - 0.5) * 120}deg)`,
                background: 'white',
                borderRadius: 32,
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                padding: '0 28px',
                boxShadow: '0 24px 60px rgba(120,53,15,0.35)',
                outline: f > 100 && s.label === 'ไม่ดื่ม' ? `6px solid ${C.none}` : undefined,
              }}
            >
              <Avatar name={s.name} color={s.color} size={96} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: C.fg }}>{s.name}</div>
                <div style={{ fontSize: 26, color: C.muted }}>{s.label}</div>
              </div>
              <div style={{ fontSize: 50, fontWeight: 900, color: C.navy, fontVariantNumeric: 'tabular-nums' }}>{baht(amt)}</div>
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: 70,
            right: 70,
            top: 1380,
            textAlign: 'center',
            fontSize: 46,
            fontWeight: 700,
            color: 'white',
            background: C.navy,
            borderRadius: 999,
            padding: '26px 0',
            transform: `scale(${springAt(f, 98, 10, 180)})`,
          }}
        >
          ไม่ดื่ม ก็ไม่ต้องหารค่าเหล้า 🙌
        </div>
      </Shaker>
    </Shot>
  );
}

/* ===================================================================== 6. SLIP */

function SlipScene({ dur }: { dur: number }) {
  const f = useCurrentFrame();
  const enter = useSpring(6, { damping: 15, stiffness: 100 });
  const thrown = springAt(f, 58, 12, 110);
  const checksOut = tw(f, [104, 110], [1, 0]);
  const big = useSpring(108, { damping: 9, stiffness: 180 });
  const draw = tw(f, [112, 126], [0, 1]);
  const done = Math.min(1.1, useSpring(118, { damping: 11 }));
  const scanning = f >= 74 && f < 104;
  return (
    <Shot dur={dur} enter="whipUp" exit="zoom" bg={C.navy}>
      <Marquee text="จ่าย • PAID •" y={600} speed={9} />
      <StepCaption num="04" l1="โอนแล้วแนบสลิป" l2="ระบบตรวจให้เอง" delay={8} />
      <Shaker events={[[108, 28]]}>
        <AbsoluteFill style={{ perspective: 2200 }}>
          <Phone
            title="บิลของฉัน"
            style={{
              left: (W - 620) / 2,
              top: 480,
              transform: `translateY(${(1 - enter) * 1500}px) rotateY(${tw(f, [0, dur], [20, -10], (t) => t)}deg) rotateX(6deg) scale(${0.94 - thrown * 0.08})`,
              filter: `brightness(${1 - thrown * 0.35})`,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, color: C.muted }}>ยอดที่ต้องจ่าย</div>
              <div style={{ fontSize: 110, fontWeight: 900, color: C.primary, lineHeight: 1.1 }}>{baht(407)}</div>
            </div>
            <QR f={f} />
            <div style={{ textAlign: 'center', fontSize: 26, color: C.muted, marginTop: 470 }}>สแกนจ่ายด้วย PromptPay</div>
            <div
              style={{
                position: 'absolute',
                top: 760,
                left: 0,
                width: 528,
                height: 96,
                borderRadius: 24,
                background: C.primary,
                color: 'white',
                fontSize: 34,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              📎 แนบสลิป
            </div>
            <Tap x={264} y={808} at={50} />
          </Phone>
        </AbsoluteFill>

        {/* slip gets thrown onto the screen */}
        <div
          style={{
            position: 'absolute',
            left: 1300 + (330 - 1300) * thrown,
            top: 2000 + (720 - 2000) * thrown,
            width: 420,
            height: 620,
            transform: `rotate(${(1 - thrown) * 70 - 6}deg)`,
            background: 'linear-gradient(180deg, #ECFDF5, #FFFFFF 40%)',
            borderRadius: 30,
            padding: 34,
            boxShadow: '0 40px 100px rgba(0,0,0,0.55)',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 700, color: C.green }}>✓ โอนเงินสำเร็จ</div>
          <div style={{ fontSize: 24, color: C.muted, marginTop: 6 }}>10 ต.ค. 2569 · 23:15</div>
          <div style={{ fontSize: 88, fontWeight: 900, color: C.fg, marginTop: 30 }}>407.00</div>
          {[90, 70, 84, 60, 76].map((w, i) => (
            <div key={i} style={{ height: 16, width: `${w}%`, background: C.border, borderRadius: 8, marginTop: 22 }} />
          ))}
          {scanning && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: ((f - 74) % 15) * 44,
                height: 8,
                background: C.green,
                boxShadow: `0 0 40px 16px ${C.green}88`,
              }}
            />
          )}
        </div>

        <div style={{ position: 'absolute', left: 70, right: 70, top: 1440, display: 'flex', justifyContent: 'center', gap: 16, opacity: checksOut, flexWrap: 'nowrap' }}>
          {['ยอดตรง', 'บัญชีตรง', 'สลิปไม่ซ้ำ'].map((t, i) => {
            const s = springAt(f, 80 + i * 8, 10, 220);
            return (
              <div
                key={t}
                style={{
                  transform: `scale(${s})`,
                  background: C.green,
                  color: 'white',
                  fontSize: 34,
                  fontWeight: 700,
                  padding: '16px 28px',
                  borderRadius: 999,
                }}
              >
                ✓ {t}
              </div>
            );
          })}
        </div>

        {/* big check over a dimmed frame */}
        <AbsoluteFill style={{ background: C.navyDeep, opacity: tw(f, [104, 114], [0, 0.82]) }} />
        <Flash at={108} color={C.green} peak={0.55} len={14} />
        <Shockwave at={108} x={540} y={1030} color="#86EFAC" max={900} rings={3} />
        <Burst at={110} x={540} y={1030} count={36} dist={620} colors={[C.green, '#86EFAC', 'white']} />
        <div
          style={{
            position: 'absolute',
            left: 540 - 230,
            top: 1030 - 230,
            width: 460,
            height: 460,
            borderRadius: '50%',
            background: C.green,
            transform: `scale(${big})`,
            boxShadow: `0 0 120px ${C.green}`,
          }}
        >
          <svg width={460} height={460} viewBox="0 0 460 460">
            <path d="M130 240 L205 312 L335 160" fill="none" stroke="white" strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          </svg>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1320, textAlign: 'center', color: 'white', transform: `scale(${done})` }}>
          <div style={{ fontSize: 120, fontWeight: 900 }}>จ่ายแล้ว</div>
          <div style={{ fontSize: 38, color: '#BBF7D0', fontWeight: 600 }}>ไม่ต้องรอแอดมินกดยืนยัน</div>
        </div>
      </Shaker>
    </Shot>
  );
}

/** QR that assembles itself from flying cells (decorative, not scannable). */
function QR({ f }: { f: number }) {
  const n = 21;
  const size = 19;
  const finder = (r: number, c: number) => {
    for (const [r0, c0] of [
      [0, 0],
      [0, n - 7],
      [n - 7, 0],
    ] as const) {
      if (r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7) {
        const rr = r - r0;
        const cc = c - c0;
        return rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4);
      }
    }
    return null;
  };
  const cells = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    const on = finder(r, c) ?? random(`q${i}`) < 0.45;
    if (!on) continue;
    const d = 10 + random(`qd${i}`) * 26;
    const p = tw(f, [d, d + 14], [0, 1]);
    const a = random(`qa${i}`) * Math.PI * 2;
    cells.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: c * size + Math.cos(a) * 700 * (1 - p),
          top: r * size + Math.sin(a) * 700 * (1 - p),
          width: size,
          height: size,
          background: C.navyDeep,
          opacity: p,
          transform: `rotate(${(1 - p) * 180}deg)`,
        }}
      />,
    );
  }
  return (
    <div style={{ position: 'absolute', left: (528 - n * size) / 2 - 20, top: 190, width: n * size + 40, height: n * size + 40, background: 'white', borderRadius: 24, border: `3px solid ${C.border}` }}>
      <div style={{ position: 'absolute', left: 20, top: 20 }}>{cells}</div>
    </div>
  );
}

/* ==================================================================== 7. CLOSE */

function CloseScene({ dur }: { dur: number }) {
  const f = useCurrentFrame();
  const paidAt = [0, 0, 0, 0, 0, 22, 34, 46];
  const paid = paidAt.filter((a) => f >= a).length;
  const prog = tw(f, [0, 10], [0, 5 / 8]) + paidAt.slice(5).reduce((s, a) => s + tw(f, [a, a + 10], [0, 1 / 8]), 0);
  const stamp = useSpring(60, { damping: 8, stiffness: 220 });
  const cx = 540;
  const cy = 1060;
  const r = 330;
  const circ = 2 * Math.PI * r;
  return (
    <Shot dur={dur} enter="zoom" bg={C.navyDeep}>
      <Marquee text="ครบ • DONE •" y={1560} speed={9} dir={-1} />
      <StepCaption num="05" l1="จ่ายครบทุกคน" l2="ปิดบิลให้เอง" delay={6} />
      <Shaker events={[[60, 44]]}>
        <svg width={W} height={H} style={{ position: 'absolute' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={34} />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={paid === 8 ? C.green : C.primary}
            strokeWidth={34}
            strokeLinecap="round"
            strokeDasharray={`${prog * circ} ${circ}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </svg>
        <div style={{ position: 'absolute', left: 0, right: 0, top: cy - 110, textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 170, fontWeight: 900, lineHeight: 1, color: paid === 8 ? '#4ADE80' : 'white' }}>{paid}/8</div>
          <div style={{ fontSize: 40, fontWeight: 600, color: '#94A3B8' }}>จ่ายแล้ว</div>
        </div>
        {SHARES.map((s, i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          const isPaid = f >= paidAt[i]!;
          const pop = springAt(f, paidAt[i]!, 8, 260);
          const appear = tw(f, [4 + i * 2, 14 + i * 2], [0, 1]);
          return (
            <div key={s.name} style={{ position: 'absolute', left: x - 64, top: y - 64, transform: `scale(${appear * (i >= 5 && isPaid ? 0.85 + pop * 0.15 : 1)})` }}>
              <div style={{ opacity: isPaid ? 1 : 0.4 }}>
                <Avatar name={s.name} color={s.color} size={128} />
              </div>
              {isPaid && (
                <div
                  style={{
                    position: 'absolute',
                    right: -6,
                    bottom: -6,
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: C.green,
                    border: '5px solid white',
                    color: 'white',
                    fontSize: 28,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `scale(${i >= 5 ? pop : 1})`,
                  }}
                >
                  ✓
                </div>
              )}
              {i >= 5 && <Burst at={paidAt[i]!} x={64} y={64} count={14} dist={160} colors={[C.green, 'white']} size={12} />}
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: cy - 100,
            textAlign: 'center',
            transform: `scale(${3 - stamp * 2}) rotate(-10deg)`,
            opacity: f >= 60 ? Math.min(1, stamp * 1.5) : 0,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              background: C.navyDeep,
              border: `14px solid #4ADE80`,
              color: '#4ADE80',
              borderRadius: 36,
              padding: '20px 56px',
              fontSize: 120,
              fontWeight: 900,
              boxShadow: '0 0 0 18px rgba(15,23,32,0.85)',
            }}
          >
            ปิดบิลแล้ว
          </div>
        </div>
      </Shaker>
      <Flash at={60} peak={0.8} len={10} />
      <Confetti at={60} x={cx} y={cy} />
    </Shot>
  );
}

/* ==================================================================== 8. OUTRO */

function Outro({ dur }: { dur: number }) {
  const f = useCurrentFrame();
  const mugs = useSpring(4, { damping: 10, stiffness: 150 });
  const bob = Math.sin(f * 0.12) * 10;
  const word = tw(f, [16, 32], [100, 0]);
  const foot = tw(f, [50, 64], [0, 1]);
  return (
    <Shot dur={dur + 20} bg={C.cream}>
      <AbsoluteFill
        style={{
          background: `repeating-conic-gradient(from ${f * 0.6}deg at 50% 33%, ${C.primary}12 0deg 9deg, transparent 9deg 18deg)`,
        }}
      />
      <Shockwave at={10} x={540} y={640} color={C.primary} max={700} rings={2} />
      <div style={{ position: 'absolute', left: 540 - (MUGS.w * 0.62) / 2, top: 360 + bob, transform: `scale(${mugs}) rotate(${(1 - mugs) * 30}deg)` }}>
        <LogoCrop {...MUGS} scale={0.62} />
      </div>
      <div style={{ position: 'absolute', left: 540 - (WORDMARK.w * 0.62) / 2, top: 1000, clipPath: `inset(0 ${word}% 0 0)` }}>
        <LogoCrop {...WORDMARK} scale={0.62} />
      </div>
      <div style={{ position: 'absolute', top: 1290, left: 0, right: 0, textAlign: 'center' }}>
        <RevealLine delay={30} style={{ fontSize: 72, fontWeight: 700, color: C.navy }}>
          ไปเมา ไม่ต้องปวดหัว
        </RevealLine>
        <RevealLine delay={36} style={{ fontSize: 72, fontWeight: 700, color: C.primary }}>
          เรื่องหารเงิน
        </RevealLine>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1580,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: foot,
          transform: `translateY(${(1 - foot) * 30}px)`,
        }}
      >
        <span style={{ display: 'inline-block', background: '#06C755', color: 'white', fontSize: 36, fontWeight: 700, padding: '18px 40px', borderRadius: 999 }}>
          ใช้ใน LINE ได้เลย ไม่ต้องลงแอพ
        </span>
      </div>
    </Shot>
  );
}

const SCENES = {
  intro: Intro,
  logo: Logo,
  event: EventScene,
  receipt: ReceiptScene,
  split: SplitScene,
  slip: SlipScene,
  close: CloseScene,
  outro: Outro,
};

