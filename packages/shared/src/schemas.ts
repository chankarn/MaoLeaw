// File: packages/shared/src/schemas.ts
// Zod schemas shared between API (validation) and Next.js client (form parsing).
import { z } from 'zod';
import {
  MAX_BILL_NAME_LENGTH,
  MAX_CUSTOM_NAME_LENGTH,
  MAX_EVENT_NAME_LENGTH,
  MAX_ITEM_NAME_LENGTH,
  MAX_VENUE_LENGTH,
} from './constants';

export const drinkPreferenceSchema = z.enum(['LIQUOR', 'BEER']);
export const drinkChoiceSchema = z.enum(['LIQUOR', 'BEER', 'NONE']);
export const memberTypeSchema = z.enum(['BD', 'TL', 'KU', 'SWU', 'CU', 'KMITL', 'FRIEND', 'OTHER']);
export const eventStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const billStatusSchema = z.enum(['DRAFT', 'SENT', 'CLOSED']);
export const billItemTypeSchema = z.enum(['LIQUOR', 'BEER', 'MIXER', 'SHARED', 'CUSTOM']);
export const paymentTypeSchema = z.enum(['PROMPTPAY', 'BANK']);
export const bankCodeSchema = z.enum(['BBL', 'KBANK', 'KTB', 'SCB', 'BAY', 'TTB', 'GSB', 'BAAC', 'GHB', 'UOB', 'CIMB', 'LHB', 'TISCO', 'KKP']);

export const registerMemberSchema = z.object({
  customName: z.string().trim().min(1, 'กรุณาใส่ชื่อ').max(MAX_CUSTOM_NAME_LENGTH),
  preferredDrink: drinkPreferenceSchema,
  memberType: memberTypeSchema,
});
export type RegisterMemberInput = z.infer<typeof registerMemberSchema>;

export const updateMemberSchema = registerMemberSchema.partial();
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const lineAuthSchema = z.object({
  idToken: z.string().min(10),
  accessToken: z.string().min(10).optional(),
});
export type LineAuthInput = z.infer<typeof lineAuthSchema>;

export const adminLoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const submitAttendanceSchema = z.object({
  nameSnapshot: z.string().trim().min(1).max(MAX_CUSTOM_NAME_LENGTH),
  drinkChoice: drinkChoiceSchema,
});
export type SubmitAttendanceInput = z.infer<typeof submitAttendanceSchema>;

export const promptpayIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{10,15}$/, 'ต้องเป็นตัวเลข 10–15 หลัก (เบอร์ 10 หลัก หรือบัตร 13 หลัก)');

export const createEventSchema = z.object({
  name: z.string().trim().min(1).max(MAX_EVENT_NAME_LENGTH),
  venue: z.string().trim().min(1).max(MAX_VENUE_LENGTH),
  eventDate: z.string().datetime({ offset: true }),
  status: eventStatusSchema.default('ACTIVE'),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.partial();
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const billItemInputSchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_ITEM_NAME_LENGTH),
    price: z.number().int().nonnegative(),
    itemType: billItemTypeSchema,
    extraMemberIds: z.array(z.string().uuid()).default([]),
    customMemberIds: z.array(z.string().uuid()).default([]),
    sortOrder: z.number().int().nonnegative().default(0),
  })
  .superRefine((val, ctx) => {
    if (val.itemType === 'CUSTOM' && val.customMemberIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: 'array',
        inclusive: true,
        message: 'ต้องเลือกอย่างน้อย 1 คนสำหรับรายการประเภท "เลือกเอง"',
        path: ['customMemberIds'],
      });
    }
  });

const billPaymentSchema = z.discriminatedUnion('paymentType', [
  z.object({
    paymentType: z.literal('PROMPTPAY'),
    promptpayId: promptpayIdSchema,
    bankCode: z.undefined().optional(),
    bankAccountNumber: z.undefined().optional(),
    bankAccountName: z.undefined().optional(),
  }),
  z.object({
    paymentType: z.literal('BANK'),
    promptpayId: z.undefined().optional(),
    bankCode: bankCodeSchema,
    bankAccountNumber: z.string().trim().min(1).max(30),
    bankAccountName: z.string().trim().min(1).max(100),
  }),
]);

export const createBillSchema = z
  .object({
    eventId: z.string().uuid(),
    name: z.string().trim().min(1).max(MAX_BILL_NAME_LENGTH),
    items: z.array(billItemInputSchema).min(1, 'ต้องมีอย่างน้อย 1 รายการ'),
  })
  .and(billPaymentSchema);
export type CreateBillInput = z.infer<typeof createBillSchema>;

export const updateBillSchema = z.object({
  name: z.string().trim().min(1).max(MAX_BILL_NAME_LENGTH).optional(),
  items: z.array(billItemInputSchema).min(1).optional(),
  paymentType: paymentTypeSchema.optional(),
  promptpayId: promptpayIdSchema.optional(),
  bankCode: bankCodeSchema.optional(),
  bankAccountNumber: z.string().trim().min(1).max(30).optional(),
  bankAccountName: z.string().trim().min(1).max(100).optional(),
});
export type UpdateBillInput = z.infer<typeof updateBillSchema>;

export const markShareSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'CLAIMED', 'PAID']),
});
export type MarkShareInput = z.infer<typeof markShareSchema>;

export const claimPaidSchema = z.object({
  note: z.string().trim().max(200).optional().nullable(),
});
export type ClaimPaidInput = z.infer<typeof claimPaidSchema>;

export const banMemberSchema = z.object({
  banned: z.boolean(),
});
export type BanMemberInput = z.infer<typeof banMemberSchema>;
