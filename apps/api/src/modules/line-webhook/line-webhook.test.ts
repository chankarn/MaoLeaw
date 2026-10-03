import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { resolveIntent } from './intent';
import { verifyLineSignature } from './signature';

describe('resolveIntent', () => {
  it.each([
    ['บิล', 'MY_DEBT'],
    ['ค้างเท่าไหร่', 'MY_DEBT'],
    ['ต้องจ่ายกี่บาท', 'MY_DEBT'],
    ['  BILL ', 'MY_DEBT'],
    ['งาน', 'EVENTS'],
    ['มีนัดไหม', 'EVENTS'],
    ['Event', 'EVENTS'],
    ['จ่ายค่างาน', 'MY_DEBT'], // debt wins over events
    ['สวัสดี', 'HELP'],
    ['', 'HELP'],
    [null, 'HELP'],
  ])('%s → %s', (text, intent) => {
    expect(resolveIntent(text)).toBe(intent);
  });
});

describe('verifyLineSignature', () => {
  const secret = 'channel-secret';
  const body = Buffer.from('{"events":[]}');
  const sign = (b: Buffer, s = secret) => createHmac('sha256', s).update(b).digest('base64');

  it('accepts a valid signature', () => {
    expect(verifyLineSignature(body, sign(body), secret)).toBe(true);
  });

  it('rejects a signature made with another secret', () => {
    expect(verifyLineSignature(body, sign(body, 'other'), secret)).toBe(false);
  });

  it('rejects a tampered body', () => {
    expect(verifyLineSignature(Buffer.from('{"events":[1]}'), sign(body), secret)).toBe(false);
  });

  it('rejects a missing or malformed header', () => {
    expect(verifyLineSignature(body, undefined, secret)).toBe(false);
    expect(verifyLineSignature(body, 'abc', secret)).toBe(false);
  });
});
