// LINE message builders for the chat bot. Every reply carries quick-reply chips so users
// can tap a command instead of typing it.

const AMBER = '#D97706';
const MUTED = '#78716C';
const MAX_ROWS = 10;

export interface DebtItem {
  eventId: string | null;
  title: string;
  amount: number;
  paymentStatus: 'PENDING' | 'CLAIMED';
}

export interface UpcomingEvent {
  id: string;
  name: string;
  venue: string;
  eventDate: Date;
  hasSubmitted: boolean;
}

const quickReply = {
  items: [
    { type: 'action', action: { type: 'message', label: '💸 ยอดค้าง', text: 'บิล' } },
    { type: 'action', action: { type: 'message', label: '📅 งานที่จะถึง', text: 'งาน' } },
    { type: 'action', action: { type: 'message', label: '❓ ช่วยเหลือ', text: 'เมนู' } },
  ],
};

function baht(n: number) {
  return `฿${n.toLocaleString('th-TH')}`;
}

function flex(altText: string, contents: unknown) {
  return { type: 'flex', altText, contents, quickReply };
}

export function text(message: string) {
  return { type: 'text', text: message, quickReply };
}

function button(label: string, uri: string) {
  return { type: 'button', style: 'primary', color: AMBER, height: 'sm', action: { type: 'uri', label, uri } };
}

export function debtMessage(items: DebtItem[], liffUrl: string) {
  if (items.length === 0) return text('ไม่มียอดค้างเลย 🎉 เคลียร์ครบทุกบิลแล้ว');

  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const rows = items.slice(0, MAX_ROWS).map((i) => ({
    type: 'box',
    layout: 'horizontal',
    spacing: 'md',
    ...(i.eventId && {
      action: { type: 'uri', label: i.title.slice(0, 40), uri: `${liffUrl}/events/${i.eventId}/bill` },
    }),
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        flex: 3,
        contents: [
          { type: 'text', text: i.title, size: 'sm', wrap: true },
          ...(i.paymentStatus === 'CLAIMED'
            ? [{ type: 'text', text: 'แจ้งโอนแล้ว รอ admin เช็ค', size: 'xxs', color: '#0369A1' }]
            : []),
        ],
      },
      { type: 'text', text: baht(i.amount), size: 'sm', weight: 'bold', align: 'end', flex: 2 },
    ],
  }));

  return flex(`ยอดค้าง ${baht(total)}`, {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        { type: 'text', text: 'ยอดค้างของคุณ 💸', weight: 'bold', size: 'md', color: MUTED },
        { type: 'text', text: baht(total), weight: 'bold', size: 'xxl', color: AMBER },
        { type: 'separator' },
        ...rows,
        ...(items.length > MAX_ROWS
          ? [{ type: 'text', text: `และอีก ${items.length - MAX_ROWS} บิล`, size: 'xs', color: MUTED }]
          : []),
        { type: 'text', text: 'แตะที่บิลเพื่อดู QR และแนบสลิป', size: 'xs', color: MUTED, wrap: true },
      ],
    },
  });
}

export function eventsMessage(events: UpcomingEvent[], liffUrl: string) {
  if (events.length === 0) return text('ยังไม่มีงานที่จะถึงเลย รอ admin สร้างงานใหม่นะ 🍻');

  const rows = events.slice(0, MAX_ROWS).map((e) => ({
    type: 'box',
    layout: 'vertical',
    action: { type: 'uri', label: e.name.slice(0, 40), uri: `${liffUrl}/events/${e.id}` },
    contents: [
      {
        type: 'text',
        text: `${e.name}${e.hasSubmitted ? ' ✓' : ''}`,
        size: 'sm',
        weight: 'bold',
        wrap: true,
      },
      {
        type: 'text',
        text: `${e.eventDate.toLocaleString('th-TH', {
          timeZone: 'Asia/Bangkok',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })} · ${e.venue}`,
        size: 'xs',
        color: MUTED,
        wrap: true,
      },
    ],
  }));

  return flex(`งานที่จะถึง ${events.length} งาน`, {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'lg',
      contents: [
        { type: 'text', text: 'งานที่จะถึง 📅', weight: 'bold', size: 'md' },
        { type: 'separator' },
        ...rows,
        { type: 'text', text: '✓ = คุณกดเข้าร่วมแล้ว · แตะเพื่อดูรายละเอียด', size: 'xs', color: MUTED, wrap: true },
      ],
    },
    footer: { type: 'box', layout: 'vertical', contents: [button('เปิดแอป', liffUrl)] },
  });
}

export function helpMessage(liffUrl: string) {
  return flex('พิมพ์ "บิล" ดูยอดค้าง หรือ "งาน" ดูงานที่จะถึง', {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        { type: 'text', text: 'เมาแล้ว bot 🍻', weight: 'bold', size: 'lg' },
        { type: 'text', text: 'พิมพ์หรือแตะปุ่มด้านล่างได้เลย', size: 'sm', color: MUTED },
        { type: 'separator' },
        { type: 'text', text: '💸 "บิล" — ดูยอดที่ยังค้างจ่าย', size: 'sm', wrap: true },
        { type: 'text', text: '📅 "งาน" — ดูงานที่กำลังจะถึง', size: 'sm', wrap: true },
      ],
    },
    footer: { type: 'box', layout: 'vertical', contents: [button('เปิดแอป', liffUrl)] },
  });
}

export function notRegisteredMessage(liffUrl: string) {
  return flex('ยังไม่ได้ลงทะเบียน — เปิดแอปเพื่อลงทะเบียน', {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        { type: 'text', text: 'ยังไม่ได้ลงทะเบียนนะ 👋', weight: 'bold', size: 'md' },
        {
          type: 'text',
          text: 'ลงทะเบียนครั้งเดียวในแอป แล้วค่อยกลับมาถามยอดค้างหรืองานที่จะถึงได้เลย',
          size: 'sm',
          color: MUTED,
          wrap: true,
        },
      ],
    },
    footer: { type: 'box', layout: 'vertical', contents: [button('ลงทะเบียน', liffUrl)] },
  });
}
