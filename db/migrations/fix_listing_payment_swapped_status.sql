-- תיקון שורות listing_payments שבהן status ו-provider הוחלפו בטעות (גרסה ישנה של השרת).
-- אחרי התיקון דירות במצב pending יופיעו שוב בפאנל המנהל.
UPDATE listing_payments
SET status = provider, provider = status
WHERE provider IN ('paid', 'authorized')
  AND status IN ('paypal', 'payme', 'promo_free', 'slot_bundle', 'manual', 'admin_free');
