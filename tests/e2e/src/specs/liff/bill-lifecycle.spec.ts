// API-level checks for the bill state machine + share snapshot rules.
import { test, expect } from '../../fixtures/liff-mock';
import { cleanupE2EMembers, deleteEventsByNameLike, makeEventName } from '../../helpers/db';
import {
  apiCall,
  closeBill,
  createBill,
  createEvent,
  loginAdmin,
  sendBill,
  submitAttendance,
} from '../../helpers/api';

const TAG = '[E2E-LIFECYCLE]';

interface Share {
  id: string;
  memberId: string;
  amount: number;
  paymentStatus: string;
}

test.afterAll(async () => {
  await deleteEventsByNameLike(TAG);
  await cleanupE2EMembers();
});

test.describe('Bill lifecycle', () => {
  test('DRAFT shares follow attendance changes; SENT locks submissions', async ({ liff, newLineUser }) => {
    const auth = await liff.installRegistered(newLineUser, {
      customName: newLineUser.displayName,
      preferredDrink: 'LIQUOR',
      memberType: 'OTHER',
    });
    const adminToken = await loginAdmin();
    const ev = await createEvent(adminToken, {
      name: makeEventName(`${TAG} lock`),
      venue: 'V',
      eventDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    await submitAttendance(auth.token, ev.id, { customName: newLineUser.displayName, drinkChoice: 'LIQUOR' });
    const bill = await createBill(adminToken, {
      eventId: ev.id,
      name: `${TAG} bill`,
      items: [{ name: 'whisky', price: 500, itemType: 'LIQUOR' }],
    });

    // DRAFT is hidden from members.
    await expect(apiCall(`/events/${ev.id}/my-bill`, { token: auth.token })).rejects.toThrow(/404/);

    // Switching to NONE while DRAFT removes the liquor charge.
    await submitAttendance(auth.token, ev.id, { customName: newLineUser.displayName, drinkChoice: 'NONE' });
    let detail = await apiCall<{ shares: Share[] }>(`/admin/bills/${bill.id}`, { token: adminToken });
    expect(detail.shares.find((s) => s.memberId === auth.memberId)?.amount).toBe(0);

    await submitAttendance(auth.token, ev.id, { customName: newLineUser.displayName, drinkChoice: 'LIQUOR' });
    await sendBill(adminToken, bill.id);
    detail = await apiCall<{ shares: Share[] }>(`/admin/bills/${bill.id}`, { token: adminToken });
    expect(detail.shares.find((s) => s.memberId === auth.memberId)?.amount).toBe(500);

    // SENT: submissions locked, re-send blocked.
    await expect(
      submitAttendance(auth.token, ev.id, { customName: newLineUser.displayName, drinkChoice: 'NONE' }),
    ).rejects.toThrow(/409/);
    await expect(sendBill(adminToken, bill.id)).rejects.toThrow(/409/);

    const mine = await apiCall<{ myShare: { amount: number } }>(`/events/${ev.id}/my-bill`, { token: auth.token });
    expect(mine.myShare.amount).toBe(500);
  });

  test('close requires SENT; PAID is never downgraded by a claim', async ({ liff, newLineUser }) => {
    const auth = await liff.installRegistered(newLineUser, {
      customName: newLineUser.displayName,
      preferredDrink: 'BEER',
      memberType: 'OTHER',
    });
    const adminToken = await loginAdmin();
    const ev = await createEvent(adminToken, {
      name: makeEventName(`${TAG} states`),
      venue: 'V',
      eventDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    await submitAttendance(auth.token, ev.id, { customName: newLineUser.displayName, drinkChoice: 'BEER' });
    const bill = await createBill(adminToken, {
      eventId: ev.id,
      name: `${TAG} states`,
      items: [{ name: 'food', price: 300, itemType: 'SHARED' }],
    });

    await expect(closeBill(adminToken, bill.id)).rejects.toThrow(/409/);
    await sendBill(adminToken, bill.id);

    const detail = await apiCall<{ shares: Share[] }>(`/admin/bills/${bill.id}`, { token: adminToken });
    const share = detail.shares[0];
    await apiCall(`/admin/bills/${bill.id}/shares/${share.id}`, {
      method: 'PATCH',
      body: { paymentStatus: 'PAID' },
      token: adminToken,
    });
    await expect(
      apiCall(`/events/${ev.id}/my-bill/claim`, { method: 'POST', body: {}, token: auth.token }),
    ).rejects.toThrow(/409/);

    await closeBill(adminToken, bill.id);
  });
});
