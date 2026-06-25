import { useCallback, useEffect, useState } from 'react';
import { getCheckoutPlans } from '../services/api';
import { PREMIUM_PLANS, STANDARD_PLANS } from '../data/pricing';

function fallbackPlans(tier) {
  const source = tier === 'premium' ? PREMIUM_PLANS : STANDARD_PLANS;
  return source.map((plan) => ({
    ...plan,
    basePrice: plan.price,
    originalPrice: plan.originalPrice,
  }));
}

/**
 * מסלולי תשלום לפרסום — כולל מחיר מוזל מהשרת (מבצעים פעילים).
 */
export function useCheckoutPlans(tier) {
  const [plans, setPlans] = useState(() => fallbackPlans(tier));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCheckoutPlans(tier);
      if (Array.isArray(data?.plans) && data.plans.length > 0) {
        setPlans(data.plans);
      } else {
        setPlans(fallbackPlans(tier));
      }
    } catch (err) {
      setError(err.message);
      setPlans(fallbackPlans(tier));
    } finally {
      setLoading(false);
    }
  }, [tier]);

  useEffect(() => {
    load();
  }, [load]);

  return { plans, loading, error, reload: load };
}
