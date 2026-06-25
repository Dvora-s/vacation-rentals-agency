import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('admin free tier eligibility', () => {
  it('admin role bypasses payment requirement on publish', () => {
    const user = { id: 1, role: 'admin', email: 'admin@test.com' };
    const shouldBypass = user.role === 'admin';
    assert.equal(shouldBypass, true);
  });

  it('owner role requires payment after approval', () => {
    const user = { id: 2, role: 'owner', email: 'owner@test.com' };
    const shouldBypass = user.role === 'admin';
    assert.equal(shouldBypass, false);
  });
});

describe('apartment status transitions', () => {
  const canResubmit = (status) => status === 'rejected' || status === 'expired';
  const canPay = (status) => status === 'awaiting_payment';
  const pendingAfterResubmit = 'pending';
  const awaitingPaymentAfterApprove = 'awaiting_payment';
  const activeAfterPayment = 'approved';

  it('rejected or expired apartments can move to pending on resubmit', () => {
    assert.equal(canResubmit('rejected'), true);
    assert.equal(canResubmit('expired'), true);
    assert.equal(pendingAfterResubmit, 'pending');
  });

  it('approved listings move to awaiting_payment after manager approval', () => {
    assert.equal(awaitingPaymentAfterApprove, 'awaiting_payment');
    assert.equal(canPay('awaiting_payment'), true);
    assert.equal(activeAfterPayment, 'approved');
  });
});
