import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * LINE signs each webhook with base64(HMAC-SHA256(channelSecret, rawBody)) in the
 * `x-line-signature` header. Must be computed over the exact bytes received.
 */
export function verifyLineSignature(
  rawBody: Buffer,
  signature: string | undefined,
  channelSecret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', channelSecret).update(rawBody).digest();
  const given = Buffer.from(signature, 'base64');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
