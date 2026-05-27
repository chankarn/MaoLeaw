// File: tests/e2e/src/helpers/api.ts
// Direct HTTP helpers — bypass the UI for setup/teardown.
import { ENV } from './env';

interface FetchOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function apiCall<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const method = opts.method ?? 'GET';
  const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${ENV.apiUrl}/v1${path}`, { method, headers, body });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON */
    }

    if (res.ok) return json as T;

    const detail = (json as { detail?: string; message?: string })?.detail ?? text ?? '';
    const isTransient =
      (res.status === 500 || res.status === 503) &&
      /connection pool|Timed out fetching|ECONNREFUSED|fetch failed/i.test(detail);

    if (isTransient && attempt < maxAttempts) {
      await sleep(500 * attempt);
      continue;
    }

    const err = (json as { message?: string })?.message ?? text ?? `HTTP ${res.status}`;
    throw new Error(`API ${method} ${path} → ${res.status}: ${err}`);
  }
  throw new Error(`API ${method} ${path}: exhausted retries`);
}

/** Login as the seeded admin and return a JWT. */
export async function loginAdmin(): Promise<string> {
  const res = await apiCall<{ token: string }>('/auth/admin/login', {
    method: 'POST',
    body: { email: ENV.adminEmail, password: ENV.adminPassword },
  });
  return res.token;
}

/** Login as a fake LINE member via E2E bypass token. Returns { token, memberId, isRegistered }. */
export async function loginAsLineMember(
  lineUserId: string,
  displayName?: string,
): Promise<{ token: string; memberId: string; isRegistered: boolean }> {
  const idToken = `e2e:${lineUserId}${displayName ? `:${displayName.replace(/ /g, '_')}` : ''}`;
  const res = await apiCall<{
    token: string;
    member: { id: string; isRegistered: boolean };
  }>('/auth/line', { method: 'POST', body: { idToken } });
  return { token: res.token, memberId: res.member.id, isRegistered: res.member.isRegistered };
}

/** Register an unregistered member (after loginAsLineMember). */
export async function registerMember(
  token: string,
  input: { customName: string; preferredDrink: 'LIQUOR' | 'BEER'; memberType: string },
) {
  return apiCall('/members/register', { method: 'POST', body: input, token });
}

/** Create an event (admin). */
export async function createEvent(
  token: string,
  input: {
    name: string;
    venue: string;
    eventDate: string;
    status?: 'ACTIVE' | 'INACTIVE';
    customPromptpayId?: string | null;
  },
): Promise<{ id: string }> {
  return apiCall('/admin/events', {
    method: 'POST',
    body: { status: 'ACTIVE', customPromptpayId: null, ...input },
    token,
  });
}

/** Submit attendance for a member. */
export async function submitAttendance(
  token: string,
  eventId: string,
  input: { customName: string; drinkChoice: 'LIQUOR' | 'BEER' | 'NONE' },
) {
  return apiCall(`/events/${eventId}/submission`, {
    method: 'PUT',
    body: { nameSnapshot: input.customName, drinkChoice: input.drinkChoice },
    token,
  });
}

/** Create a bill (admin). */
export async function createBill(
  token: string,
  input: {
    eventId: string;
    name: string;
    items: { name: string; price: number; itemType: 'LIQUOR' | 'BEER' | 'SHARED' }[];
  },
): Promise<{ id: string }> {
  return apiCall('/admin/bills', { method: 'POST', body: input, token });
}

/** Send bill notifications. */
export async function sendBill(token: string, billId: string) {
  return apiCall(`/admin/bills/${billId}/send`, { method: 'POST', token });
}
