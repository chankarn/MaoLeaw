'use client';
// Share cards into LINE chats via liff.shareTargetPicker. Messages are sent by the user
// who shares, so they don't use the OA's monthly push quota.
// Requires "shareTargetPicker" to be enabled for the LIFF app in LINE Developers.
import { initLiff } from './liff';
import { liffUrl } from './links';

const AMBER = '#D97706';
const MUTED = '#78716C';

export type ShareResult = 'shared' | 'cancelled' | 'copied' | 'failed';

function card(altText: string, title: string, lines: string[], buttonLabel: string, url: string) {
  return {
    type: 'flex',
    altText,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: title, weight: 'bold', size: 'lg', wrap: true },
          ...lines.map((t) => ({ type: 'text', text: t, size: 'sm', color: MUTED, wrap: true })),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'button', style: 'primary', color: AMBER, action: { type: 'uri', label: buttonLabel, uri: url } },
        ],
      },
    },
  };
}

function thaiDateTime(iso: string) {
  return new Date(iso).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "มาดื่มกัน" invite card for an event. */
export function eventShareCard(e: { id: string; name: string; venue: string; eventDate: string; attendeeCount: number }) {
  return card(
    `ชวนไป ${e.name}`,
    `🍻 ${e.name}`,
    [`📅 ${thaiDateTime(e.eventDate)}`, `📍 ${e.venue}`, `👥 ลงชื่อแล้ว ${e.attendeeCount} คน`],
    'ดูงาน / ลงชื่อ',
    liffUrl(`/events/${e.id}`),
  );
}

/** Plain-text invite for apps other than LINE (Messenger, Discord, IG…). */
export function eventShareText(e: { id: string; name: string; venue: string; eventDate: string }) {
  return [
    `🍻 ${e.name}`,
    `📅 ${thaiDateTime(e.eventDate)}`,
    `📍 ${e.venue}`,
    `กดลงชื่อ (เปิดใน LINE) 👉 ${liffUrl(`/events/${e.id}`)}`,
  ].join('\n');
}

/** Plain-text "บิลออกแล้ว" for apps other than LINE. */
export function billShareText(e: { eventId: string; billName: string }) {
  return [
    `💸 บิลออกแล้ว: ${e.billName}`,
    'เข้าไปดูยอดของตัวเอง สแกน QR แล้วแนบสลิปได้เลย',
    `เปิดใน LINE 👉 ${liffUrl(`/events/${e.eventId}/bill`)}`,
  ].join('\n');
}

/** "บิลออกแล้ว" card — no amounts, each person opens their own share. */
export function billShareCard(e: { eventId: string; billName: string }) {
  return card(
    `บิลออกแล้ว: ${e.billName}`,
    `💸 บิลออกแล้ว`,
    [e.billName, 'เข้าไปดูยอดของตัวเอง สแกน QR แล้วแนบสลิปได้เลย'],
    'ดูยอดของฉัน',
    liffUrl(`/events/${e.eventId}/bill`),
  );
}

/**
 * Open LINE's friend/group picker. Falls back to copying the link when the picker isn't
 * available (outside the LINE app, or the feature isn't enabled for this LIFF app).
 */
export async function shareToLine(message: object, fallbackUrl: string): Promise<ShareResult> {
  try {
    const liff = await initLiff();
    if (typeof liff.isApiAvailable === 'function' && liff.isApiAvailable('shareTargetPicker')) {
      const res = await liff.shareTargetPicker([message as never], { isMultiple: true });
      return res ? 'shared' : 'cancelled';
    }
  } catch (err) {
    console.error('shareTargetPicker failed', err);
  }
  try {
    await navigator.clipboard.writeText(fallbackUrl);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Whether the phone's own share sheet (Web Share API) exists here — not in every LINE WebView. */
export function canShareNatively(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/** Phone share sheet (any installed app); falls back to copying the text. */
export async function shareElsewhere(text: string): Promise<ShareResult> {
  if (canShareNatively()) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      console.error('navigator.share failed', err);
    }
  }
  return copyShareText(text);
}

export async function copyShareText(text: string): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Open a URL outside the LINE WebView (Maps / Calendar apps), or a new tab elsewhere. */
export async function openExternal(url: string) {
  try {
    const liff = await initLiff();
    if (typeof liff.isInClient === 'function' && liff.isInClient()) {
      liff.openWindow({ url, external: true });
      return;
    }
  } catch {
    // fall through to a normal tab
  }
  window.open(url, '_blank', 'noopener');
}

/** Toast for a share attempt; a cancelled picker stays silent. */
export function toastShareResult(result: ShareResult) {
  // Imported lazily so this module stays usable outside React (e.g. card validation).
  void import('sonner').then(({ toast }) => {
    if (result === 'shared') toast.success('แชร์แล้ว');
    else if (result === 'copied') toast.success('คัดลอกแล้ว วางในแชทได้เลย');
    else if (result === 'failed') toast.error('แชร์ไม่สำเร็จ');
  });
}
