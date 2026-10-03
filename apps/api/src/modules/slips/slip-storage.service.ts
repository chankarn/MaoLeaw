// Private Supabase Storage bucket for slips that need admin review.
// Talks to the Storage REST API directly (no SDK). Optional: without
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, images are simply not kept.
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const BUCKET = 'slips';

@Injectable()
export class SlipStorageService {
  private readonly logger = new Logger('SlipStorageService');

  constructor(private readonly cfg: ConfigService) {}

  private get conf() {
    const url = this.cfg.get<string>('SUPABASE_URL')?.replace(/\/+$/, '');
    const key = this.cfg.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    return url && key ? { url, key } : null;
  }

  private headers(key: string, extra: Record<string, string> = {}) {
    return { Authorization: `Bearer ${key}`, apikey: key, ...extra };
  }

  /** Upload (overwrite) an image. Returns false if storage is off or the upload failed. */
  async upload(path: string, data: Buffer, contentType: string): Promise<boolean> {
    const c = this.conf;
    if (!c) return false;
    const put = () =>
      fetch(`${c.url}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: this.headers(c.key, { 'Content-Type': contentType, 'x-upsert': 'true' }),
        body: new Uint8Array(data),
      });
    try {
      let res = await put();
      if (!res.ok && (await res.text()).includes('Bucket not found')) {
        await this.createBucket(c.url, c.key);
        res = await put();
      }
      if (!res.ok) {
        this.logger.error(`Slip upload failed: ${res.status} ${await res.text()}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error('Slip upload failed', err);
      return false;
    }
  }

  /** Best-effort delete — a leftover file only costs storage, never correctness. */
  async remove(paths: string[]): Promise<void> {
    const c = this.conf;
    if (!c || paths.length === 0) return;
    try {
      const res = await fetch(`${c.url}/storage/v1/object/${BUCKET}`, {
        method: 'DELETE',
        headers: this.headers(c.key, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ prefixes: paths }),
      });
      if (!res.ok) this.logger.warn(`Slip delete failed: ${res.status} ${await res.text()}`);
    } catch (err) {
      this.logger.warn(`Slip delete failed: ${String(err)}`);
    }
  }

  /** Short-lived URL so an admin can view a private slip image. */
  async signedUrl(path: string, expiresIn = 300): Promise<string | null> {
    const c = this.conf;
    if (!c) return null;
    const res = await fetch(`${c.url}/storage/v1/object/sign/${BUCKET}/${path}`, {
      method: 'POST',
      headers: this.headers(c.key, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ expiresIn }),
    });
    if (!res.ok) return null;
    const { signedURL } = (await res.json()) as { signedURL?: string };
    return signedURL ? `${c.url}/storage/v1${signedURL}` : null;
  }

  private async createBucket(url: string, key: string) {
    const res = await fetch(`${url}/storage/v1/bucket`, {
      method: 'POST',
      headers: this.headers(key, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
    });
    if (!res.ok) this.logger.warn(`Create bucket failed: ${res.status} ${await res.text()}`);
  }
}
