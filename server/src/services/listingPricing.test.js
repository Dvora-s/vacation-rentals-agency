import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bestDiscountedPrice } from './pricingCompute.js';
import { getCheckoutPlansForTier, resolveListingAmount } from './listingPricing.js';

describe('pricingCompute.bestDiscountedPrice', () => {
  it('applies percent discount', () => {
    const { effective, promotion } = bestDiscountedPrice(100, [
      { discount_type: 'percent', discount_value: 20 },
    ]);
    assert.equal(effective, 80);
    assert.ok(promotion);
  });

  it('applies flat discount', () => {
    const { effective } = bestDiscountedPrice(60, [{ discount_type: 'flat', discount_value: 10 }]);
    assert.equal(effective, 50);
  });

  it('picks the lowest effective price from multiple promos', () => {
    const { effective } = bestDiscountedPrice(100, [
      { discount_type: 'percent', discount_value: 10 },
      { discount_type: 'flat', discount_value: 25 },
    ]);
    assert.equal(effective, 75);
  });
});

describe('listingPricing (seed fallback)', () => {
  it('returns standard checkout plans with base prices when DB is empty', async () => {
    const { tier, plans } = await getCheckoutPlansForTier('standard');
    assert.equal(tier, 'standard');
    assert.ok(plans.length >= 3);
    const oneMonth = plans.find((p) => p.months === 1);
    assert.equal(oneMonth.price, 30);
    assert.equal(oneMonth.basePrice, 30);
  });

  it('returns premium checkout plans for hotels tier', async () => {
    const { tier, plans } = await getCheckoutPlansForTier('premium');
    assert.equal(tier, 'premium');
    const yearly = plans.find((p) => p.months === 12);
    assert.ok(yearly);
    assert.equal(yearly.price, 550);
    assert.equal(yearly.originalPrice, 800);
  });

  it('resolveListingAmount matches discounted plan price', async () => {
    const quote = await resolveListingAmount('standard', 1);
    assert.equal(quote.amount, 30);
    assert.equal(quote.tier, 'standard');
    assert.equal(quote.months, 1);
  });

  it('resolveListingAmount uses static table for non-standard month counts', async () => {
    const quote = await resolveListingAmount('standard', 3);
    assert.equal(quote.amount, 90);
  });
});
