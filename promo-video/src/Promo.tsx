import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Avatar, C, Caption, Card, Chip, FONT, Phone, Scene, Tap, baht, clamp, useSpring } from './ui';

// 30 fps · 1080x1920 · 30 s. [start, duration] per scene.
const T = {
  hook: [0, 105],
  logo: [100, 65],
  event: [160, 140],
  receipt: [295, 150],
  split: [440, 120],
  slip: [555, 160],
  close: [710, 100],
  outro: [805, 95],
} as const;
export const PROMO_DURATION = 900;

export const Promo = () => (
  <AbsoluteFill style={{ background: C.navyDeep, fontFamily: FONT }}>
    {(Object.keys(T) as (keyof typeof T)[]).map((k) => {
      const [from, dur] = T[k];
      const S = SCENES[k];
      return (
        <Sequence key={k} from={from} durationInFrames={dur}>
          <S dur={dur} />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);

/* ------------------------------------------------------------------ 1. Hook */

const CHAT = [
  { who: 'ต้น', text: 'เมื่อคืนใครกินเบียร์บ้าง 🍺', me: false },
  { who: 'แพร', text: 'เราไม่ได้กินเหล้านะ!', me: false },
  { who: 'บอส', text: 'สรุปต้องโอนเท่าไหร่ 😵‍💫', me: false },
  { who: '', text: 'ใครยังไม่โอนบ้างงง', me: true },
];

function Hook({ dur }: { dur: number }) {
  const frame = useCurrentFrame();
  const dim = interpolate(frame, [58, 70], [1, 0.25], clamp);
  const title = useSpring(62, { damping: 10, stiffness: 160 });
  return (
    <Scene dur={dur} bg="#2B3A4A">
      <div style={{ position: 'absolute', top: 260, left: 60, right: 60, opacity: dim, filter: `blur(${(1 - dim) * 6}px)` }}>
        {CHAT.map((m, i) => (
          <Bubble key={i} {...m} delay={4 + i * 13} />
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1180,
          left: 60,
          right: 60,
          textAlign: 'center',
          color: 'white',
          transform: `scale(${0.6 + title * 0.4}) rotate(${(1 - title) * -6}deg)`,
          opacity: title,
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.2 }}>หารบิลทีไร</div>
        <div style={{ fontSize: 120, fontWeight: 700, lineHeight: 1.2, color: C.primary }}>ปวดหัวทุกที</div>
      </div>
    </Scene>
  );
}

function Bubble({ who, text, me, delay }: { who: string; text: string; me: boolean; delay: number }) {
  const s = useSpring(delay, { damping: 12, stiffness: 180 });
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: me ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 18,
        marginBottom: 36,
        opacity: s,
        transform: `translateY(${(1 - s) * 50}px) scale(${0.85 + s * 0.15})`,
        transformOrigin: me ? 'right bottom' : 'left bottom',
      }}
    >
      {!me && <Avatar name={who} color={['#F97316', '#0EA5E9', '#8B5CF6'][who.length % 3]!} size={84} />}
      <div>
        {!me && <div style={{ color: '#CBD5E1', fontSize: 28, marginBottom: 6, marginLeft: 8 }}>{who}</div>}
        <div
          style={{
            background: me ? '#06C755' : 'white',
            color: me ? 'white' : C.fg,
            fontSize: 44,
            fontWeight: 500,
            padding: '22px 34px',
            borderRadius: 40,
            borderBottomLeftRadius: me ? 40 : 8,
            borderBottomRightRadius: me ? 8 : 40,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 2. Logo */

function Logo({ dur }: { dur: number }) {
  const s = useSpring(4, { damping: 11 });
  const tag = useSpring(18);
  return (
    <Scene dur={dur}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 640,
            height: 640,
            borderRadius: 120,
            background: 'white',
            transform: `scale(${s}) rotate(${(1 - s) * 20}deg)`,
            boxShadow: `0 30px 120px ${C.primary}66`,
            overflow: 'hidden',
          }}
        >
          <Img src={staticFile('logo.png')} style={{ width: 640, height: 640 }} />
        </div>
        <div
          style={{
            marginTop: 70,
            color: 'white',
            fontSize: 60,
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1.35,
            opacity: tag,
            transform: `translateY(${(1 - tag) * 30}px)`,
          }}
        >
          หารบิลวงเหล้า
          <br />
          <span style={{ color: C.primary }}>จบในกลุ่ม LINE</span>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}

/* ------------------------------------------------------------- 3. Event/join */

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
  const frame = useCurrentFrame();
  const joined = frame >= 52;
  const chooser = useSpring(60);
  const picked = frame >= 84;
  const shared = useSpring(10);
  return (
    <Scene dur={dur}>
      <Caption step="01 · สร้างงาน" pre="แชร์เข้ากลุ่ม LINE" hl="เพื่อนกดเข้าร่วม" />
      <Phone title="MaoLeaw">
        <div style={{ opacity: shared, transform: `translateY(${(1 - shared) * 30}px)` }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                height: 220,
                background: `linear-gradient(135deg, ${C.primary}, #F59E0B)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 120,
              }}
            >
              🔥🥩🍻
            </div>
            <div style={{ padding: 30 }}>
              <div style={{ fontSize: 44, fontWeight: 700 }}>ปาร์ตี้หมูกระทะ</div>
              <div style={{ fontSize: 28, color: C.muted, marginTop: 12 }}>📅 ศ. 10 ต.ค. · 19:00</div>
              <div style={{ fontSize: 28, color: C.muted, marginTop: 6 }}>📍 หมูกระทะลุงชัย</div>
              <div style={{ display: 'flex', gap: 14, marginTop: 22 }}>
                <Chip color={C.muted}>🗺️ แผนที่</Chip>
                <Chip color={C.muted}>🗓️ เพิ่มลงปฏิทิน</Chip>
              </div>
            </div>
          </Card>
        </div>

        <div
          style={{
            marginTop: 28,
            height: 100,
            borderRadius: 24,
            background: joined ? C.green : C.primary,
            color: 'white',
            fontSize: 38,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${frame >= 48 && frame < 54 ? 0.95 : 1})`,
          }}
        >
          {joined ? 'เข้าร่วมแล้ว ✓' : 'เข้าร่วมงาน'}
        </div>

        <div style={{ marginTop: 28, opacity: chooser, transform: `translateY(${(1 - chooser) * 30}px)` }}>
          <div style={{ fontSize: 30, fontWeight: 600, marginBottom: 16 }}>คืนนี้ดื่มอะไร?</div>
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
                  height: 92,
                  borderRadius: 22,
                  fontSize: 30,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `3px solid ${picked && i === 0 ? color : C.border}`,
                  background: picked && i === 0 ? `${color}22` : C.card,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <div style={{ display: 'flex' }}>
            {ATTENDEES.map(([name, color], i) => (
              <PopIn key={name} delay={92 + i * 4} style={{ marginLeft: i ? -18 : 0 }}>
                <Avatar name={name} color={color} size={78} />
              </PopIn>
            ))}
          </div>
          <PopIn delay={124}>
            <div style={{ fontSize: 30, fontWeight: 600, color: C.green, marginTop: 14 }}>
              เข้าร่วมแล้ว 8 คน 🎉
            </div>
          </PopIn>
        </div>

        <Tap x={308} y={650} at={48} />
        <Tap x={110} y={838} at={82} />
      </Phone>
    </Scene>
  );
}

function PopIn({ delay, children, style }: { delay: number; children: React.ReactNode; style?: React.CSSProperties }) {
  const s = useSpring(delay, { damping: 10, stiffness: 200 });
  return <div style={{ transform: `scale(${s})`, opacity: Math.min(1, s * 2), ...style }}>{children}</div>;
}

/* ------------------------------------------------------------ 4. Receipt AI */

const ITEMS = [
  { name: 'หมูกระทะ x4', price: 796, type: 'หารทุกคน', color: C.shared },
  { name: 'ลีโอ ขวดใหญ่ x10', price: 900, type: '🍺 เบียร์', color: C.beer },
  { name: 'รีเจนซี่ 700 มล.', price: 690, type: '🥃 เหล้า', color: C.liquor },
  { name: 'โซดา x6', price: 120, type: 'มิกเซอร์', color: C.mixer },
  { name: 'น้ำแข็ง', price: 60, type: 'หารทุกคน', color: C.shared },
];

function ReceiptScene({ dur }: { dur: number }) {
  const frame = useCurrentFrame();
  const scan = interpolate(frame, [14, 58], [0, 1], clamp);
  const shrink = interpolate(frame, [60, 76], [0, 1], clamp);
  return (
    <Scene dur={dur}>
      <Caption step="02 · ทำบิล" pre="ถ่ายรูปใบเสร็จ" hl="AI แยกรายการให้" />
      <Phone title="สร้างบิล">
        <div
          style={{
            position: 'absolute',
            left: 32,
            right: 32,
            top: 32,
            transformOrigin: 'top left',
            transform: `scale(${1 - shrink * 0.72})`,
          }}
        >
          <Receipt scan={scan} />
        </div>

        <div style={{ position: 'absolute', left: 32 + 576 * 0.28 + 24, right: 32, top: 40, opacity: shrink }}>
          <Chip color={C.primary} solid>
            ✨ Gemini อ่านแล้ว
          </Chip>
          <div style={{ fontSize: 28, color: C.muted, marginTop: 14 }}>2 รูป · 5 รายการ</div>
        </div>

        <div style={{ position: 'absolute', left: 32, right: 32, top: 262 }}>
          {ITEMS.map((it, i) => (
            <ItemRow key={it.name} {...it} delay={74 + i * 8} />
          ))}
          <PopIn delay={124}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 38,
                fontWeight: 700,
                marginTop: 18,
                padding: '0 8px',
              }}
            >
              <span>รวม</span>
              <span style={{ color: C.primary }}>{baht(2566)}</span>
            </div>
          </PopIn>
        </div>
      </Phone>
    </Scene>
  );
}

function Receipt({ scan }: { scan: number }) {
  const lines = ['หมูกระทะ 4 ชุด', 'LEO 620ML x10', 'REGENCY 700ML', 'SODA x6', 'ICE'];
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 16,
        padding: '40px 44px',
        fontFamily: 'monospace',
        fontSize: 34,
        color: '#44403C',
        boxShadow: '0 16px 40px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden',
        transform: 'rotate(-2deg)',
      }}
    >
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 38 }}>หมูกระทะลุงชัย</div>
      <div style={{ textAlign: 'center', fontSize: 26, marginBottom: 26 }}>10/10/26 22:41</div>
      {lines.map((l, i) => (
        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', margin: '14px 0' }}>
          <span>{l}</span>
          <span>{ITEMS[i]!.price}.00</span>
        </div>
      ))}
      <div style={{ borderTop: '3px dashed #A8A29E', marginTop: 24, paddingTop: 18, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
        <span>TOTAL</span>
        <span>2,566.00</span>
      </div>
      {scan > 0 && scan < 1 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${scan * 100}%`,
            height: 8,
            background: C.primary,
            boxShadow: `0 0 40px 18px ${C.primary}88`,
          }}
        />
      )}
    </div>
  );
}

function ItemRow({ name, price, type, color, delay }: (typeof ITEMS)[number] & { delay: number }) {
  const s = useSpring(delay, { damping: 15 });
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: C.card,
        border: `2px solid ${C.border}`,
        borderLeft: `10px solid ${color}`,
        borderRadius: 20,
        padding: '14px 22px',
        marginBottom: 12,
        opacity: s,
        transform: `translateX(${(1 - s) * 120}px)`,
      }}
    >
      <div>
        <div style={{ fontSize: 30, fontWeight: 600 }}>{name}</div>
        <div style={{ marginTop: 6 }}>
          <Chip color={color}>{type}</Chip>
        </div>
      </div>
      <div style={{ fontSize: 34, fontWeight: 700 }}>{baht(price)}</div>
    </div>
  );
}

/* --------------------------------------------------------------- 5. Split */

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

function SplitScene({ dur }: { dur: number }) {
  const frame = useCurrentFrame();
  const count = interpolate(frame, [20, 60], [0, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 });
  return (
    <Scene dur={dur}>
      <Caption step="03 · คิดเงิน" pre="ใครกินอะไร" hl="จ่ายตามนั้น" />
      <Phone title="บิล · ปาร์ตี้หมูกระทะ">
        {SHARES.map((s, i) => (
          <ShareRow key={s.name} {...s} amount={s.amount * count} delay={8 + i * 4} />
        ))}
        <PopIn delay={70}>
          <div
            style={{
              marginTop: 14,
              background: C.primarySoft,
              borderRadius: 22,
              padding: '20px 26px',
              fontSize: 28,
              color: '#92400E',
              fontWeight: 500,
            }}
          >
            แพรไม่ดื่ม จ่ายแค่ค่าหมูกระทะ {baht(107)} 🙌
          </div>
        </PopIn>
      </Phone>
    </Scene>
  );
}

function ShareRow({ name, color, label, amount, delay }: (typeof SHARES)[number] & { delay: number }) {
  const s = useSpring(delay, { damping: 15 });
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '11px 8px',
        borderBottom: `2px solid ${C.border}`,
        opacity: s,
        transform: `translateY(${(1 - s) * 30}px)`,
      }}
    >
      <Avatar name={name} color={color} size={70} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 32, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 24, color: C.muted }}>{label}</div>
      </div>
      <div style={{ fontSize: 38, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{baht(amount)}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- 6. Slip */

function SlipScene({ dur }: { dur: number }) {
  const frame = useCurrentFrame();
  const slipIn = useSpring(56, { damping: 14 });
  const checking = frame >= 84 && frame < 112;
  const ok = useSpring(112, { damping: 9, stiffness: 180 });
  return (
    <Scene dur={dur}>
      <Caption step="04 · จ่ายเงิน" pre="โอนแล้วแนบสลิป" hl="ระบบตรวจให้เอง" />
      <Phone title="บิลของฉัน">
        <Card style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, color: C.muted }}>ยอดที่ต้องจ่าย</div>
          <div style={{ fontSize: 96, fontWeight: 800, color: C.primary, lineHeight: 1.15 }}>{baht(407)}</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
            <FakeQR />
          </div>
          <div style={{ fontSize: 26, color: C.muted, marginTop: 14 }}>สแกนจ่ายด้วย PromptPay</div>
        </Card>

        <div
          style={{
            position: 'absolute',
            left: 32,
            right: 32,
            top: 620,
            opacity: slipIn,
            transform: `translateY(${(1 - slipIn) * 400}px)`,
          }}
        >
          <Card style={{ display: 'flex', gap: 24, alignItems: 'center', borderColor: ok > 0.5 ? C.green : C.border, borderWidth: 3 }}>
            <div
              style={{
                width: 150,
                height: 210,
                borderRadius: 16,
                background: 'linear-gradient(180deg, #E0F2FE, #FFFFFF)',
                border: `2px solid ${C.border}`,
                padding: 14,
                fontSize: 18,
                color: C.muted,
                flexShrink: 0,
              }}
            >
              <div style={{ color: C.green, fontWeight: 700, fontSize: 20 }}>โอนเงินสำเร็จ</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: C.fg, marginTop: 14 }}>407.00</div>
              <div style={{ marginTop: 12, height: 8, background: C.border, borderRadius: 4 }} />
              <div style={{ marginTop: 10, height: 8, width: '70%', background: C.border, borderRadius: 4 }} />
              <div style={{ marginTop: 10, height: 8, width: '85%', background: C.border, borderRadius: 4 }} />
            </div>
            <div style={{ flex: 1 }}>
              {ok < 0.05 ? (
                <div style={{ fontSize: 32, fontWeight: 600, color: C.muted }}>
                  {checking ? (
                    <>
                      <Spinner /> กำลังตรวจสลิป…
                    </>
                  ) : (
                    'แนบสลิปแล้ว'
                  )}
                </div>
              ) : (
                <div style={{ transform: `scale(${ok})`, transformOrigin: 'left center' }}>
                  <div style={{ fontSize: 40, fontWeight: 700, color: C.green }}>จ่ายแล้ว ✓</div>
                  <div style={{ fontSize: 24, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
                    ยอดตรง · บัญชีตรง
                    <br />
                    สลิปไม่ซ้ำ · ไม่ต้องรอแอดมิน
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        <Tap x={300} y={760} at={50} />
      </Phone>
    </Scene>
  );
}

function Spinner() {
  const frame = useCurrentFrame();
  return (
    <span
      style={{
        display: 'inline-block',
        width: 30,
        height: 30,
        border: `5px solid ${C.border}`,
        borderTopColor: C.primary,
        borderRadius: '50%',
        transform: `rotate(${frame * 18}deg)`,
        verticalAlign: 'middle',
        marginRight: 8,
      }}
    />
  );
}

/** Decorative QR-looking grid (not a scannable code). */
function FakeQR() {
  const n = 21;
  const cells: boolean[] = [];
  let seed = 7;
  for (let i = 0; i < n * n; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    cells.push(seed % 3 === 0);
  }
  const finder = (r: number, c: number) => {
    const inBox = (r0: number, c0: number) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7;
    for (const [r0, c0] of [
      [0, 0],
      [0, n - 7],
      [n - 7, 0],
    ] as const) {
      if (inBox(r0, c0)) {
        const rr = r - r0;
        const cc = c - c0;
        return rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4);
      }
    }
    return null;
  };
  const size = 13;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, ${size}px)`, padding: 14, background: 'white', border: `2px solid ${C.border}`, borderRadius: 16 }}>
      {cells.map((on, i) => {
        const f = finder(Math.floor(i / n), i % n);
        return <div key={i} style={{ width: size, height: size, background: (f ?? on) ? C.navyDeep : 'white' }} />;
      })}
    </div>
  );
}

/* --------------------------------------------------------------- 7. Close */

function CloseScene({ dur }: { dur: number }) {
  const frame = useCurrentFrame();
  const paid = Math.min(8, 5 + Math.floor(interpolate(frame, [12, 48], [0, 3.99], clamp)));
  const stamp = useSpring(52, { damping: 8, stiffness: 200 });
  return (
    <Scene dur={dur}>
      <Caption step="05 · จบ" pre="จ่ายครบทุกคน" hl="ปิดบิลให้เอง" />
      <Phone title="บิล · ปาร์ตี้หมูกระทะ">
        <div style={{ fontSize: 32, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
          <span>จ่ายแล้ว</span>
          <span style={{ color: paid === 8 ? C.green : C.fg }}>{paid}/8 คน</span>
        </div>
        <div style={{ height: 26, background: C.border, borderRadius: 13, marginTop: 16, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(paid / 8) * 100}%`, background: C.green, borderRadius: 13 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22, marginTop: 44 }}>
          {SHARES.map((s, i) => (
            <div key={s.name} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{ display: 'inline-block', opacity: i < paid ? 1 : 0.35 }}>
                <Avatar name={s.name} color={s.color} size={104} />
              </div>
              {i < paid && (
                <div
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: 70,
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: C.green,
                    color: 'white',
                    fontSize: 26,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid white',
                  }}
                >
                  ✓
                </div>
              )}
              <div style={{ fontSize: 26, marginTop: 8 }}>{s.name}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 90,
            textAlign: 'center',
            transform: `scale(${2 - stamp}) rotate(-8deg)`,
            opacity: Math.min(1, stamp * 1.5),
          }}
        >
          <div
            style={{
              display: 'inline-block',
              border: `8px solid ${C.green}`,
              color: C.green,
              borderRadius: 28,
              padding: '18px 44px',
              fontSize: 64,
              fontWeight: 800,
            }}
          >
            ปิดบิลแล้ว 🎉
          </div>
        </div>
      </Phone>
      <Confetti start={52} />
    </Scene>
  );
}

function Confetti({ start }: { start: number }) {
  const frame = useCurrentFrame();
  const t = frame - start;
  if (t < 0) return null;
  const colors = [C.primary, C.beer, C.green, C.none, '#F43F5E', 'white'];
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: 70 }, (_, i) => {
        const angle = (i * 137.5 * Math.PI) / 180;
        const speed = 18 + (i % 7) * 4;
        const x = 540 + Math.cos(angle) * speed * t;
        const y = 1300 + Math.sin(angle) * speed * t * 0.8 + 0.9 * t * t;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 18,
              height: 30,
              background: colors[i % colors.length],
              borderRadius: 4,
              transform: `rotate(${t * (12 + i)}deg)`,
              opacity: interpolate(t, [0, 40], [1, 0], clamp),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/* --------------------------------------------------------------- 8. Outro */

const STACK = ['LINE LIFF', 'Messaging API', 'Next.js', 'NestJS', 'Prisma · Supabase', 'Gemini AI', 'SlipOK'];

function Outro({ dur }: { dur: number }) {
  const s = useSpring(2, { damping: 12 });
  return (
    <Scene dur={dur + 8}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
        <div
          style={{
            width: 520,
            height: 520,
            borderRadius: 100,
            background: 'white',
            overflow: 'hidden',
            transform: `scale(${s})`,
            boxShadow: `0 30px 120px ${C.primary}66`,
          }}
        >
          <Img src={staticFile('logo.png')} style={{ width: 520, height: 520 }} />
        </div>
        <PopIn delay={12}>
          <div style={{ color: 'white', fontSize: 64, fontWeight: 700, marginTop: 70, textAlign: 'center', lineHeight: 1.3 }}>
            ไปเมา ไม่ต้องปวดหัว
            <br />
            <span style={{ color: C.primary }}>เรื่องหารเงิน</span>
          </div>
        </PopIn>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 80, padding: '0 90px' }}>
          {STACK.map((t, i) => (
            <PopIn key={t} delay={26 + i * 4}>
              <div
                style={{
                  color: '#E2E8F0',
                  fontSize: 30,
                  fontWeight: 600,
                  padding: '12px 26px',
                  borderRadius: 999,
                  border: '2px solid #475569',
                  background: '#ffffff0d',
                }}
              >
                {t}
              </div>
            </PopIn>
          ))}
        </div>
      </AbsoluteFill>
    </Scene>
  );
}

const SCENES = {
  hook: Hook,
  logo: Logo,
  event: EventScene,
  receipt: ReceiptScene,
  split: SplitScene,
  slip: SlipScene,
  close: CloseScene,
  outro: Outro,
};
