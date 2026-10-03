// API-level checks for the bill state machine + share snapshot rules.
import { test, expect, type LiffFixtures, type LiffProfile } from '../../fixtures/liff-mock';
import { cleanupE2EMembers, deleteEventsByNameLike, makeEventName } from '../../helpers/db';
import {
  apiCall,
  claimWithSlip,
  closeBill,
  createBill,
  createEvent,
  e2eSlip,
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
    await expect(claimWithSlip(auth.token, ev.id, e2eSlip({ amount: 300 }))).rejects.toThrow(/409/);

    // Marking the only share PAID closed the bill automatically.
    const after = await apiCall<{ status: string }>(`/admin/bills/${bill.id}`, { token: adminToken });
    expect(after.status).toBe('CLOSED');
  });

});

test.describe('Slip verification', () => {
  async function setup(liff: LiffFixtures['liff'], user: LiffProfile, tag: string) {
    const auth = await liff.installRegistered(user, {
      customName: user.displayName,
      preferredDrink: 'BEER',
      memberType: 'OTHER',
    });
    const adminToken = await loginAdmin();
    const ev = await createEvent(adminToken, {
      name: makeEventName(`${TAG} ${tag}`),
      venue: 'V',
      eventDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    await submitAttendance(auth.token, ev.id, { customName: user.displayName, drinkChoice: 'BEER' });
    const bill = await createBill(adminToken, {
      eventId: ev.id,
      name: `${TAG} ${tag}`,
      items: [{ name: 'food', price: 300, itemType: 'SHARED' }],
    });
    await sendBill(adminToken, bill.id);
    return { auth, adminToken, ev, bill };
  }

  test('matching slip settles the share automatically', async ({ liff, newLineUser }) => {
    const { auth, ev } = await setup(liff, newLineUser, 'auto');
    const r = await claimWithSlip(auth.token, ev.id, e2eSlip({ amount: 300 }));
    expect(r).toMatchObject({ paymentStatus: 'PAID', slipCheck: 'AUTO_OK' });
  });

  test('underpaid / wrong receiver go to review; a used slip is rejected', async ({ liff, newLineUser }) => {
    const { auth, ev } = await setup(liff, newLineUser, 'review');

    const under = await claimWithSlip(auth.token, ev.id, e2eSlip({ amount: 200 }));
    expect(under).toMatchObject({ paymentStatus: 'CLAIMED', slipCheck: 'NEEDS_REVIEW' });
    expect(under.slipReviewReason).toMatch(/น้อยกว่า/);

    const wrongReceiver = await claimWithSlip(
      auth.token,
      ev.id,
      e2eSlip({ amount: 300, receiverProxy: 'xxx-xxx-9999' }),
    );
    expect(wrongReceiver.slipCheck).toBe('NEEDS_REVIEW');

    // A slip already used to settle someone else's share can't be reused.
    const used = e2eSlip({ amount: 300 });
    const other = await setup(liff, { userId: `${newLineUser.userId}_b`, displayName: 'Other' }, 'reuse');
    await claimWithSlip(other.auth.token, other.ev.id, used);
    await expect(claimWithSlip(auth.token, ev.id, used)).rejects.toThrow(/409/);
  });

  test('admin rejects a claim → back to PENDING, slip can be resent', async ({ liff, newLineUser }) => {
    const { auth, adminToken, ev, bill } = await setup(liff, newLineUser, 'reject');
    const slip = e2eSlip({ amount: 100 }); // underpaid → NEEDS_REVIEW
    await claimWithSlip(auth.token, ev.id, slip);

    const detail = await apiCall<{ shares: Share[] }>(`/admin/bills/${bill.id}`, { token: adminToken });
    const share = detail.shares[0];
    const r = await apiCall<{ pushed: boolean }>(`/admin/bills/${bill.id}/shares/${share.id}/reject`, {
      method: 'POST',
      body: { reason: 'ยอดโอนไม่ครบ' },
      token: adminToken,
    });
    expect(r.pushed).toBe(true); // E2E mode swallows the LINE push

    const mine = await apiCall<{ myShare: { paymentStatus: string; slipCheck: string | null } }>(
      `/events/${ev.id}/my-bill`,
      { token: auth.token },
    );
    expect(mine.myShare).toMatchObject({ paymentStatus: 'PENDING', slipCheck: null });

    // Only CLAIMED shares can be rejected.
    await expect(
      apiCall(`/admin/bills/${bill.id}/shares/${share.id}/reject`, { method: 'POST', body: {}, token: adminToken }),
    ).rejects.toThrow(/409/);

    // The rejected slip's transRef is released — a corrected slip settles it.
    const ok = await claimWithSlip(auth.token, ev.id, e2eSlip({ amount: 300 }));
    expect(ok.paymentStatus).toBe('PAID');
  });

  test('outstanding summary lists unpaid shares; auto-close clears it', async ({ liff, newLineUser }) => {
    const { auth, ev } = await setup(liff, newLineUser, 'outstanding');
    const before = await apiCall<{ totalOutstanding: number; bills: { amount: number }[] }>(
      '/members/me/bills',
      { token: auth.token },
    );
    expect(before.totalOutstanding).toBe(300);

    await claimWithSlip(auth.token, ev.id, e2eSlip({ amount: 300 }));
    const after = await apiCall<{ totalOutstanding: number }>('/members/me/bills', { token: auth.token });
    expect(after.totalOutstanding).toBe(0);
  });

  test('claim without a slip is rejected', async ({ liff, newLineUser }) => {
    const { auth, ev } = await setup(liff, newLineUser, 'noslip');
    await expect(
      apiCall(`/events/${ev.id}/my-bill/claim`, { method: 'POST', body: {}, token: auth.token }),
    ).rejects.toThrow(/400/);
  });
});
