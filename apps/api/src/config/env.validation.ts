// File: apps/api/src/config/env.validation.ts
import { z } from 'zod';

export const configValidationSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TZ: z.string().default('Asia/Bangkok'),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_PUBLIC_URL: z.string().url().optional(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  LINE_CHANNEL_ID: z.string().min(1),
  LINE_CHANNEL_SECRET: z.string().min(1),
  LINE_MESSAGING_TOKEN: z.string().min(1),
  LIFF_ID: z.string().min(1),

  PROMPTPAY_ID: z.string().min(4),

  ADMIN_SEED_EMAIL: z.string().email().optional(),
  ADMIN_SEED_PASSWORD: z.string().optional(),
  ADMIN_SEED_NAME: z.string().optional(),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  // Slip verification (optional — without SlipOK keys every claim goes to admin review;
  // without Supabase keys, review images are not kept).
  SLIPOK_API_KEY: z.string().optional(),
  SLIPOK_BRANCH_ID: z.string().optional(),
  SLIPOK_MONTHLY_LIMIT: z.coerce.number().int().nonnegative().default(100),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // E2E test bypass — when 'true', /auth/line accepts fake idTokens (e2e:USER_ID)
  // and LINE Push is skipped. NEVER set in production.
  E2E_TEST_MODE: z.enum(['true', 'false']).optional(),
});

export type AppEnv = z.infer<typeof configValidationSchema>;
