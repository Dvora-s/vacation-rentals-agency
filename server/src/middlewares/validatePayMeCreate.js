/**
 * Validates JSON body for PayMe session creation (iFrame / Hosted Fields).
 * Accepts `price` in agorot (preferred) or `amount` in major currency units (ILS).
 */
export function validatePayMeCreateBody(req, res, next) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  let priceAgorot;
  if (body.price !== undefined && body.price !== null && body.price !== '') {
    const p = Number(body.price);
    if (!Number.isInteger(p) || p <= 0) {
      return res.status(400).json({ error: 'price must be a positive integer (agorot)' });
    }
    if (p > 100_000_000) {
      return res.status(400).json({ error: 'price exceeds allowed maximum' });
    }
    priceAgorot = p;
  } else if (body.amount !== undefined && body.amount !== null && body.amount !== '') {
    const n = Number(body.amount);
    if (!Number.isFinite(n) || n <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }
    if (n > 1_000_000) {
      return res.status(400).json({ error: 'amount exceeds allowed maximum' });
    }
    priceAgorot = Math.round(n * 100);
  } else {
    return res.status(400).json({ error: 'price (agorot) or amount (ILS) is required' });
  }

  const currencyRaw = body.currency;
  let currency = 'ILS';
  if (currencyRaw !== undefined && currencyRaw !== null && String(currencyRaw).trim() !== '') {
    currency = String(currencyRaw).trim().toUpperCase();
    if (!/^[A-Z]{3,8}$/.test(currency)) {
      return res.status(400).json({ error: 'currency must be 3–8 uppercase letters' });
    }
  }

  const productName =
    body.product_name != null
      ? String(body.product_name).slice(0, 500)
      : body.description != null
        ? String(body.description).slice(0, 500)
        : 'Payment';

  let metadata = body.metadata;
  if (metadata !== undefined && metadata !== null && typeof metadata !== 'object') {
    return res.status(400).json({ error: 'metadata must be an object when provided' });
  }
  if (metadata && typeof metadata === 'object') {
    try {
      const s = JSON.stringify(metadata);
      if (s.length > 4000) {
        return res.status(400).json({ error: 'metadata is too large' });
      }
    } catch {
      return res.status(400).json({ error: 'metadata must be JSON-serializable' });
    }
  }

  req.paymeCreate = {
    priceAgorot,
    amountMajor: priceAgorot / 100,
    currency,
    productName,
    description: productName,
    metadata,
  };
  next();
}
