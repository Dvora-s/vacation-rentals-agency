/**
 * בדיקת חיבור PayPal מהשרת (אימות + יצירת הזמנת בדיקה).
 * הרצה: node scripts/test-paypal.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(serverRoot, '.env') });
const envLocal = path.join(serverRoot, '.env.local');
try {
  const fs = await import('fs');
  if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal, override: true });
} catch {
  /* ignore */
}

const { getPayPalEnvStatus, paypalCreateOrder } = await import('../src/services/paypalRest.js');

const status = getPayPalEnvStatus();
console.log('PayPal env:', JSON.stringify(status, null, 2));

if (!status.configured) {
  console.error('\n❌ PayPal לא מוגדר. הוסיפו PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET ל-server/.env');
  process.exit(1);
}

try {
  const order = await paypalCreateOrder(
    { currency_code: 'ILS', value: '1.00' },
    { intent: 'AUTHORIZE' },
  );
  console.log('\n✅ יצירת הזמנת בדיקה הצליחה:', order.id);
} catch (e) {
  console.error('\n❌ יצירת הזמנה נכשלה:', e.message);
  process.exit(1);
}
