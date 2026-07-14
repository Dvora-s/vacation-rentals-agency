const PAYME_FIELDS_SCRIPT = 'https://gateway.payme.io/js/payme-fields.js';

let scriptPromise = null;

/**
 * Load PayMe's official Hosted Fields / iFrame SDK once per page.
 * @returns {Promise<void>}
 */
export function loadPayMeFieldsScript() {
  if (typeof window !== 'undefined' && window.PayMeFields) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PAYME_FIELDS_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load PayMe SDK')));
      if (window.PayMeFields) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = PAYME_FIELDS_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayMe SDK'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Initialize PayMeFields with sale ID and container.
 * @param {string} paymeSaleId
 * @param {string} [containerSelector]
 * @returns {unknown}
 */
export function createPayMeFieldsInstance(paymeSaleId, containerSelector = '#payme-iframe-container') {
  const PayMeFields = window.PayMeFields;
  if (!PayMeFields) {
    throw new Error('PayMeFields SDK not loaded');
  }

  try {
    return new PayMeFields({
      saleId: paymeSaleId,
      container: containerSelector,
    });
  } catch {
    return new PayMeFields(paymeSaleId, containerSelector);
  }
}

/**
 * Attach success / error listeners (covers common PayMe SDK event APIs).
 * @param {unknown} instance
 * @param {{ onSuccess?: (data?: unknown) => void, onError?: (err?: unknown) => void }} handlers
 */
export function bindPayMeFieldsEvents(instance, { onSuccess, onError }) {
  if (!instance || typeof instance !== 'object') return;

  const inst = /** @type {Record<string, unknown>} */ (instance);

  if (typeof inst.on === 'function') {
    inst.on('success', (data) => onSuccess?.(data));
    inst.on('payment-success', (data) => onSuccess?.(data));
    inst.on('error', (err) => onError?.(err));
    inst.on('payment-error', (err) => onError?.(err));
  }

  if (typeof inst.addEventListener === 'function') {
    inst.addEventListener('success', (data) => onSuccess?.(data));
    inst.addEventListener('error', (err) => onError?.(err));
  }

  if (typeof inst.render === 'function') {
    inst.render();
  } else if (typeof inst.mount === 'function') {
    inst.mount();
  }
}
