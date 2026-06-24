import { attachImagesToApartment, selectApartmentById } from '../models/apartmentModel.js';
import { signApproveToken } from '../middlewares/auth.js';
import { sendNewListingToAdmin } from '../utils/mailer.js';
import {
  selectAdminEmailsFromDb,
  selectUserPublisherFields,
} from '../models/userModel.js';

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || `${APP_URL}/api`).replace(/\/$/, '');

function absoluteImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${APP_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

async function getAdminEmails() {
  if (process.env.ADMIN_NOTIFY_EMAIL) {
    return process.env.ADMIN_NOTIFY_EMAIL.split(',').map((e) => e.trim()).filter(Boolean);
  }
  const emails = await selectAdminEmailsFromDb();
  return emails.filter((email) => !email.endsWith('.local'));
}

/** שולח למנהל התראה על מודעה שממתינה לאישור (אחרי תשלום או שליחה חוזרת). */
export async function notifyAdminNewListing(apartmentId, { userId, userEmail } = {}) {
  const row = await selectApartmentById(apartmentId);
  if (!row || row.status !== 'pending') return false;

  const apartment = await attachImagesToApartment(row);
  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) return false;

  let publisherName = apartment.owner_name || null;
  let publisherEmail = apartment.owner_email || null;
  let publisherPhone = apartment.owner_phone || null;

  if (userId) {
    const u = await selectUserPublisherFields(userId);
    publisherName = publisherName || u?.full_name || userEmail || null;
    publisherEmail = publisherEmail || u?.email || userEmail || null;
    publisherPhone = publisherPhone || u?.phone || null;
  }

  const approveToken = signApproveToken({ id: apartment.id });
  const approveUrl = `${PUBLIC_API_URL}/apartments/${apartment.id}/email-approve?token=${encodeURIComponent(approveToken)}`;
  const adminPanelUrl = `${APP_URL}/admin`;

  const emailApartment = {
    ...apartment,
    images: (apartment.images || []).map(absoluteImageUrl).filter(Boolean),
  };

  await sendNewListingToAdmin({
    to: adminEmails.join(', '),
    apartment: emailApartment,
    publisherName,
    publisherPhone,
    publisherEmail,
    approveUrl,
    adminPanelUrl,
  });

  return true;
}
