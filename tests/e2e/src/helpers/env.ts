// File: tests/e2e/src/helpers/env.ts
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const ENV = {
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',
  adminUrl: process.env.ADMIN_URL ?? 'http://localhost:3001',
  liffUrl: process.env.LIFF_URL ?? 'http://localhost:3000',
  adminEmail: req('ADMIN_EMAIL'),
  adminPassword: req('ADMIN_PASSWORD'),
};
