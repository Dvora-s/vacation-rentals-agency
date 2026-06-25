import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeListingPaymentRow } from '../models/listingPaymentModel.js';

test('normalizeListingPaymentRow swaps legacy status/provider columns', () => {
  const row = {
    id: 1,
    apartment_id: 10,
    status: 'promo_free',
    provider: 'paid',
    amount: 0,
  };
  const fixed = normalizeListingPaymentRow(row);
  assert.equal(fixed.status, 'paid');
  assert.equal(fixed.provider, 'promo_free');
});

test('normalizeListingPaymentRow leaves correct rows unchanged', () => {
  const row = {
    id: 2,
    apartment_id: 11,
    status: 'authorized',
    provider: 'paypal',
    amount: 99,
  };
  const fixed = normalizeListingPaymentRow(row);
  assert.equal(fixed.status, 'authorized');
  assert.equal(fixed.provider, 'paypal');
});
