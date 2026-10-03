// Reads a restaurant receipt photo into suggested bill rows using Gemini (vision).
// The admin always reviews the rows before saving — this only saves typing.
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@maoleaw/db';
import { parseReceipt, type ReceiptReadResult } from './parse-receipt';

export interface ReceiptImage {
  buffer: Buffer;
  mimetype: string;
}

/** Tried in order; the next one is used when a model is busy or out of free quota. */
const DEFAULT_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
// Several photos in one request can take ~45s on a busy model.
const TIMEOUT_MS = 60_000;
const MAX_EXAMPLES = 60;
const E2E_PREFIX = 'E2E-RECEIPT:';

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    readable: { type: 'BOOLEAN', description: 'false if the photo is not a legible receipt' },
    receiptTotal: { type: 'NUMBER', nullable: true, description: 'grand total printed on the receipt' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          price: { type: 'NUMBER', description: 'line total in baht = quantity × unit price' },
          itemType: { type: 'STRING', enum: ['LIQUOR', 'BEER', 'MIXER', 'SHARED'] },
          confident: { type: 'BOOLEAN', description: 'false when the type is a guess' },
        },
        required: ['name', 'price', 'itemType', 'confident'],
      },
    },
  },
  required: ['readable', 'items'],
};

function buildPrompt(examples: { name: string; itemType: string }[], imageCount: number) {
  const lines = [
    'You read Thai restaurant or bar receipt photos and list their line items for splitting the bill among friends.',
    'Return JSON only, following the schema.',
    ...(imageCount > 1
      ? [
          `There are ${imageCount} photos. They may be different receipts from the same night, or one long receipt`,
          'photographed in parts. List every purchased line exactly once across all photos: when photos overlap',
          'the same receipt, do not repeat the overlapping lines. Lines with the same name on different',
          'receipts are separate purchases — keep both.',
        ]
      : []),
    '',
    'For each purchased line:',
    '- name: the item as printed (keep Thai), include quantity if shown, e.g. "ลีโอ x6".',
    '- price: the LINE TOTAL in baht (quantity × unit price), not the unit price.',
    '- itemType:',
    '  BEER   = beer of any brand (Leo/ลีโอ, Chang/ช้าง, Singha/สิงห์, Heineken, tower/ทาวเวอร์, draft).',
    '  LIQUOR = spirits/whisky/rum/wine/soju/sake, bottles or shots (Regency, หงส์ทอง, แสงโสม, Black Label, เบลนด์).',
    '  MIXER  = drink mixers and ice: soda, ice/น้ำแข็ง, Coke/Pepsi/Sprite, tonic, juice for mixing, mixer sets.',
    '  SHARED = food, snacks, water/soft drinks for the table, service charge, VAT, anything else.',
    '- confident: false when the line is ambiguous (combo/promo sets mixing food and drinks, unreadable codes).',
    '',
    'Do NOT include subtotal, grand total, cash received, change, or payment lines.',
    'Include service charge and VAT as their own SHARED lines when printed.',
    'A bill-level discount goes in as its own line with a NEGATIVE price.',
    'receiptTotal: the final amount to pay (summed over distinct receipts if there are several), or null if any is not visible.',
  ];
  if (examples.length > 0) {
    lines.push(
      '',
      'This group typed these items on earlier bills — follow the same typing for the same or similar names:',
      ...examples.map((e) => `- ${e.name} → ${e.itemType}`),
    );
  }
  return lines.join('\n');
}

@Injectable()
export class ReceiptReaderService {
  private readonly logger = new Logger('ReceiptReaderService');

  constructor(private readonly cfg: ConfigService) {}

  /** One request for all photos: one quota hit, and the model can de-duplicate overlaps. */
  async read(images: ReceiptImage[]): Promise<ReceiptReadResult> {
    if (this.cfg.get<string>('E2E_TEST_MODE') === 'true') return this.readE2E(images[0]!);

    const apiKey = this.cfg.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new ServiceUnavailableException('ยังไม่ได้ตั้งค่า GEMINI_API_KEY');

    const body = JSON.stringify({
      contents: [
        {
          parts: [
            { text: buildPrompt(await this.pastExamples(), images.length) },
            ...images.map((image) => ({
              inline_data: { mime_type: image.mimetype, data: image.buffer.toString('base64') },
            })),
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const models = (this.cfg.get<string>('GEMINI_MODELS') || DEFAULT_MODELS.join(','))
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body,
            signal: AbortSignal.timeout(TIMEOUT_MS),
          },
        );
        if (res.status === 429 || res.status >= 500) {
          this.logger.warn(`${model} unavailable (${res.status}), trying next model`);
          continue;
        }
        const json = (await res.json()) as {
          error?: { message?: string };
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        if (!res.ok) {
          this.logger.error(`${model} rejected the request: ${res.status} ${json.error?.message ?? ''}`);
          continue;
        }
        const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch {
          raw = null;
        }
        return parseReceipt(raw);
      } catch (err) {
        this.logger.warn(`${model} request failed: ${String(err)}`);
      }
    }
    throw new ServiceUnavailableException('AI อ่านใบเสร็จไม่ได้ตอนนี้ (ไม่ว่างหรือโควต้าหมด) ลองใหม่อีกที หรือกรอกเอง');
  }

  /** Recent item names the admin already typed — the group's own vocabulary. */
  private async pastExamples() {
    const rows = await prisma.billItem.findMany({
      where: { itemType: { in: ['LIQUOR', 'BEER', 'MIXER', 'SHARED'] } },
      orderBy: { bill: { createdAt: 'desc' } },
      select: { name: true, itemType: true },
      take: 300,
    });
    const seen = new Set<string>();
    const examples: { name: string; itemType: string }[] = [];
    for (const r of rows) {
      const key = r.name.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      examples.push({ name: r.name.trim(), itemType: r.itemType });
      if (examples.length >= MAX_EXAMPLES) break;
    }
    return examples;
  }

  /** E2E: the "image" is `E2E-RECEIPT:{json}` in the same shape the model returns. */
  private readE2E(image: ReceiptImage): ReceiptReadResult {
    const text = image.buffer.toString('utf8');
    return parseReceipt(text.startsWith(E2E_PREFIX) ? JSON.parse(text.slice(E2E_PREFIX.length)) : null);
  }
}
