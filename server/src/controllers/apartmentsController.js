import { APARTMENT_EDITABLE_FIELDS } from '../utils/mapApartment.js';
import {
  attachImagesToApartment,
  attachImagesToApartments,
  apartmentExists,
  approveApartmentRow,
  deleteApartmentById,
  deleteApartmentImages,
  insertApartmentImagesRows,
  insertApartmentPending,
  markApartmentPendingForReview,
  rejectApartmentRow,
  selectApartmentById,
  selectApprovedApartments,
  selectMineApartments,
  selectPendingApartments,
  selectPublishedApartmentsForAdmin,
  updateApartmentDynamic,
} from '../models/apartmentModel.js';
import { verifyApproveToken } from '../middlewares/auth.js';
import {
  sendListingInquiryEmail,
  sendListingLiveEmail,
} from '../utils/mailer.js';
import { notifyAdminNewListing } from '../services/listingAdminNotify.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { isApartmentOwner } from '../utils/apartmentOwnership.js';
import { selectUserContactById } from '../models/userModel.js';
import { apartmentHasPaidListing, apartmentHasSecuredListingPayment } from '../models/listingPaymentModel.js';
import { publishApartmentInstantlyForAdmin } from '../services/adminListingPublish.js';
import { captureListingPaymentOnApprove, releaseListingPaymentOnReject } from '../services/listingPaymentCapture.js';
import { mapFeaturedApartmentsForResponse } from '../services/featuredApartments.js';

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

async function resolveOwnerContact(apt) {
  let ownerEmail = apt.owner_email || null;
  let ownerName = apt.owner_name || null;
  if (apt.owner_id) {
    const u = await selectUserContactById(apt.owner_id);
    if (u) {
      ownerEmail = ownerEmail || u.email;
      ownerName = ownerName || u.full_name;
    }
  }
  return { ownerEmail, ownerName };
}

export async function listPublic(_req, res) {
  const rows = await selectApprovedApartments();
  const apartments = await attachImagesToApartments(rows);
  res.json(apartments);
}

export async function listFeatured(req, res) {
  const limit = Math.min(12, Math.max(1, Number(req.query.limit) || 4));
  const apartments = await mapFeaturedApartmentsForResponse(limit);
  res.json(apartments);
}

export async function listMine(req, res) {
  const email = String(req.user.email || '').trim().toLowerCase();
  const rows = await selectMineApartments(req.user.id, email);
  res.json(await attachImagesToApartments(rows));
}

export async function listPending(_req, res) {
  const rows = await selectPendingApartments();
  res.json(await attachImagesToApartments(rows));
}

export async function listPublishedForAdmin(_req, res) {
  const rows = await selectPublishedApartmentsForAdmin();
  res.json(await attachImagesToApartments(rows));
}

export async function getById(req, res) {
  const apt = await selectApartmentById(req.params.id);
  if (!apt) {
    return res.status(404).json({ error: 'דירה לא נמצאה' });
  }

  if (apt.status !== 'approved') {
    const isOwner = req.user && isApartmentOwner(apt, req.user);
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(404).json({ error: 'דירה לא נמצאה' });
    }
  } else {
    const hasPaid = await apartmentHasPaidListing(apt.id);
    const isOwner = req.user && isApartmentOwner(apt, req.user);
    const isAdmin = req.user && req.user.role === 'admin';
    if (!hasPaid && !isOwner && !isAdmin) {
      return res.status(404).json({ error: 'דירה לא נמצאה' });
    }
  }

  const apartment = await attachImagesToApartment(apt);
  const { ownerEmail } = await resolveOwnerContact(apt);
  apartment.can_inquire = apt.status === 'approved' && !!ownerEmail;
  res.json(apartment);
}

export async function postInquiry(req, res) {
  const { email, message } = req.body || {};

  if (!email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'יש למלא כתובת מייל ותוכן הודעה' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return res.status(400).json({ error: 'כתובת אימייל לא תקינה' });
  }
  if (String(message).trim().length < 10) {
    return res.status(400).json({ error: 'ההודעה קצרה מדי' });
  }

  const aptId = Number(req.params.id);
  if (!Number.isFinite(aptId) || aptId <= 0) {
    return res.status(400).json({ error: 'מזהה דירה לא תקין' });
  }

  const apt = await selectApartmentById(aptId);
  if (!apt) {
    return res.status(404).json({ error: 'דירה לא נמצאה' });
  }

  if (apt.status !== 'approved') {
    return res.status(400).json({
      error: 'ניתן לשלוח הודעה רק למודעות שאושרו ופורסמו באתר',
    });
  }

  const hasPaid = await apartmentHasPaidListing(aptId);
  if (!hasPaid) {
    return res.status(400).json({
      error: 'ניתן לשלוח הודעה רק למודעות שפורסמו לאחר תשלום',
    });
  }

  const { ownerEmail, ownerName } = await resolveOwnerContact(apt);

  if (!ownerEmail) {
    return res.status(422).json({
      error: 'לבעל הנכס אין כתובת מייל במערכת. נסו ליצור קשר בטלפון או בוואטסאפ',
    });
  }

  const senderEmail = email.trim().toLowerCase();
  try {
    await sendListingInquiryEmail({
      to: ownerEmail,
      ownerName,
      apartment: apt,
      senderEmail,
      message: message.trim(),
      listingUrl: `${APP_URL}/apartments/${apt.id}`,
    });
  } catch (err) {
    console.error('[mailer] מייל פנייה לבעל הנכס נכשל:', err.message);
    return res.status(502).json({ error: 'שליחת ההודעה נכשלה. נסו שוב מאוחר יותר.' });
  }

  res.status(201).json({ ok: true, message: 'ההודעה נשלחה לבעל הנכס בהצלחה' });
}

export async function create(req, res) {
  const body = req.body || {};

  const required = ['title', 'location', 'price_per_night'];
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return res.status(400).json({ error: `השדה "${field}" חובה` });
    }
  }

  const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
  const coverImage = body.image_url || images[0] || null;

  const insertId = await insertApartmentPending({
    owner_id: req.user.id,
    title: body.title,
    description: body.description,
    location: body.location,
    address: body.address,
    property_type: body.property_type,
    rental_period: body.rental_period,
    price_per_night: body.price_per_night,
    bedrooms: body.bedrooms,
    bathrooms: body.bathrooms,
    max_guests: body.max_guests,
    image_url: coverImage,
    owner_name: body.owner_name,
    owner_phone: body.owner_phone,
    owner_email: body.owner_email,
    contact_via_whatsapp: body.contact_via_whatsapp,
    is_available: body.is_available,
  });

  if (images.length > 0) {
    const values = images.map((url, idx) => [insertId, url, idx]);
    await insertApartmentImagesRows(values);
  }

  const row = await selectApartmentById(insertId);
  let apartment = await attachImagesToApartment(row);

  if (req.user.role === 'admin') {
    const published = await publishApartmentInstantlyForAdmin(insertId, req.user);
    apartment = published.apartment;
  }

  res.status(201).json(apartment);
}

/** מנהל מפרסם דירה מיד ללא תשלום */
export async function adminPublishFree(req, res) {
  const apt = await loadOwnedApartment(req, res);
  if (!apt) return;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'רק מנהל מערכת יכול לפרסם ללא תשלום' });
  }

  if (apt.status !== 'awaiting_payment' && apt.status !== 'pending') {
    return res.status(400).json({
      error: 'ניתן לפרסם ללא תשלום רק דירה שטרם פורסמה',
    });
  }

  const { apartment } = await publishApartmentInstantlyForAdmin(req.params.id, req.user);
  res.json(apartment);
}

/** שליחה חוזרת לאישור מנהל (דירה שנדחתה או שפג תוקפה) */
export async function resubmitForApproval(req, res) {
  const apt = await loadOwnedApartment(req, res);
  if (!apt) return;

  if (apt.status !== 'rejected' && apt.status !== 'expired') {
    return res.status(400).json({
      error: 'ניתן לשלוח שוב לאישור רק דירה שנדחתה או שפג תוקף הפרסום שלה',
    });
  }

  if (apt.status === 'expired') {
    return res.status(400).json({
      error: 'לחידוש פרסום יש להשלים תשלום תחילה. עברו ל"הדירות שלי" ולחצו על "תשלום ושליחה לאישור".',
    });
  }

  const hasPaid = await apartmentHasSecuredListingPayment(req.params.id);
  if (!hasPaid) {
    return res.status(400).json({
      error: 'לא ניתן לשלוח לאישור ללא תשלום שבוצע. השלימו תשלום תחילה.',
    });
  }

  const moved = await markApartmentPendingForReview(req.params.id);
  if (!moved) {
    return res.status(400).json({ error: 'לא ניתן לעדכן את סטטוס הדירה' });
  }

  try {
    await notifyAdminNewListing(req.params.id, {
      userId: req.user.id,
      userEmail: req.user.email,
    });
  } catch (err) {
    console.error('[mailer] התראת שליחה חוזרת למנהל נכשלה:', err.message);
    return res.status(502).json({ error: 'הדירה עודכנה אך שליחת ההתראה למנהל נכשלה. נסו שוב.' });
  }

  const row = await selectApartmentById(req.params.id);
  res.json(await attachImagesToApartment(row));
}

async function loadOwnedApartment(req, res) {
  const apt = await selectApartmentById(req.params.id);
  if (!apt) {
    res.status(404).json({ error: 'דירה לא נמצאה' });
    return null;
  }
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && !isApartmentOwner(apt, req.user)) {
    res.status(403).json({ error: 'אין הרשאה לערוך את הדירה' });
    return null;
  }
  return apt;
}

export async function update(req, res) {
  const apt = await loadOwnedApartment(req, res);
  if (!apt) return;

  const body = req.body || {};
  const updates = [];
  const values = [];
  const skipFields = Array.isArray(body.images) ? new Set(['image_url']) : new Set();

  for (const field of APARTMENT_EDITABLE_FIELDS) {
    if (skipFields.has(field)) continue;
    if (body[field] === undefined) continue;
    let value = body[field];
    if (field === 'contact_via_whatsapp' || field === 'is_available') {
      value = value ? 1 : 0;
    }
    if (field === 'price_per_night') value = Number(value);
    if (['bedrooms', 'bathrooms', 'max_guests'].includes(field)) value = Number(value) || 0;
    updates.push(`${field} = ?`);
    values.push(value);
  }

  if (Array.isArray(body.images)) {
    const images = body.images.filter(Boolean);
    await deleteApartmentImages(req.params.id);
    if (images.length > 0) {
      const inserts = images.map((url, idx) => [req.params.id, url, idx]);
      await insertApartmentImagesRows(inserts);
    }
    const coverUrl = body.image_url || images[0] || null;
    updates.push('image_url = ?');
    values.push(coverUrl);
  }

  if (updates.length === 0 && !Array.isArray(body.images)) {
    return res.status(400).json({ error: 'אין שדות לעדכון' });
  }

  let shouldNotifyAdmin = false;
  if (req.user.role !== 'admin' && apt.status === 'approved' && updates.length > 0) {
    updates.push('status = ?');
    values.push('pending');
    updates.push('approved_at = NULL');
    shouldNotifyAdmin = true;
  }

  if (updates.length > 0) {
    values.push(req.params.id);
    await updateApartmentDynamic(updates, values);
  }

  if (shouldNotifyAdmin) {
    try {
      await notifyAdminNewListing(req.params.id, {
        userId: req.user.id,
        userEmail: req.user.email,
      });
    } catch (err) {
      console.error('[mailer] התראת עדכון מודעה למנהל נכשלה:', err.message);
    }
  }

  const updated = await selectApartmentById(req.params.id);
  res.json(await attachImagesToApartment(updated));
}

export async function remove(req, res) {
  const apt = await loadOwnedApartment(req, res);
  if (!apt) return;
  await deleteApartmentById(req.params.id);
  res.status(204).end();
}

async function approveApartmentById(id) {
  const apt = await selectApartmentById(id);
  if (!apt) return null;

  if (apt.status !== 'pending') {
    return { error: 'ניתן לאשר רק דירות שממתינות לאישור מנהל' };
  }

  const hasPaid = await apartmentHasSecuredListingPayment(id);
  if (!hasPaid) {
    return { error: 'לא ניתן לאשר דירה ללא תשלום שבוצע או אושר' };
  }

  try {
    await captureListingPaymentOnApprove(id);
  } catch (err) {
    return { error: err.message || 'חיוב התשלום נכשל — לא ניתן לאשר את הדירה' };
  }

  const approved = await approveApartmentRow(id);
  if (!approved) {
    return { error: 'לא ניתן לאשר את הדירה' };
  }

  const row = await selectApartmentById(id);
  const apartment = await attachImagesToApartment(row);

  (async () => {
    try {
      const { ownerEmail } = await resolveOwnerContact(apartment);
      if (!ownerEmail) return;
      await sendListingLiveEmail({
        to: ownerEmail,
        apartment,
        listingUrl: `${APP_URL}/apartments/${apartment.id}`,
        editUrl: `${APP_URL}/my-apartments/${apartment.id}/edit`,
      });
    } catch (err) {
      console.error('[mailer] מייל "המודעה באוויר" נכשל:', err.message);
    }
  })();

  return apartment;
}

export async function approve(req, res) {
  const result = await approveApartmentById(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'דירה לא נמצאה' });
  }
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result);
}

export async function emailApprove(req, res) {
  const renderPage = (title, body) =>
    res.type('html').send(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/><title>${title}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f1ea;text-align:center;padding:48px 16px;">
<div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #ece6d8;border-radius:16px;padding:32px 24px;">
${body}</div></body></html>`);

  const { token } = req.query;
  if (!token) {
    return res.status(400).send('חסר טוקן אישור');
  }

  let decoded;
  try {
    decoded = verifyApproveToken(token);
  } catch {
    return renderPage(
      'קישור לא תקין',
      `<h2 style="color:#b8860b;">הקישור אינו תקין או שפג תוקפו</h2>
         <p>ניתן להיכנס לפאנל הניהול ולאשר את המודעה ידנית.</p>
         <a href="${APP_URL}/admin" style="color:#1a2b4a;font-weight:700;">למעבר לפאנל הניהול</a>`,
    );
  }

  if (String(decoded.id) !== String(req.params.id)) {
    return res.status(400).send('טוקן אינו תואם למודעה');
  }

  const apartment = await approveApartmentById(req.params.id);
  if (!apartment) {
    return renderPage('המודעה לא נמצאה', `<h2>המודעה לא נמצאה</h2>`);
  }
  if (apartment.error) {
    return renderPage(
      'לא ניתן לאשר',
      `<h2 style="color:#b8860b;">${escapeHtml(apartment.error)}</h2>
       <a href="${APP_URL}/admin" style="color:#1a2b4a;font-weight:700;">למעבר לפאנל הניהול</a>`,
    );
  }

  const safeTitle = escapeHtml(apartment.title);
  return renderPage(
    'המודעה אושרה',
    `<h2 style="color:#237804;">✅ המודעה אושרה!</h2>
       <p>"${safeTitle}" אושרה ופורסמה באתר.</p>
       <a href="${APP_URL}/admin"
          style="display:inline-block;margin-top:8px;padding:12px 26px;background:#b8860b;color:#fff;
                 border-radius:10px;text-decoration:none;font-weight:700;">לפאנל הניהול</a>`,
  );
}

export async function reject(req, res) {
  if (!(await apartmentExists(req.params.id))) {
    return res.status(404).json({ error: 'דירה לא נמצאה' });
  }
  const reason = String(req.body?.reason || '').trim();
  if (reason.length < 5) {
    return res.status(400).json({ error: 'נדרשת סיבת דחייה (לפחות 5 תווים)' });
  }
  await rejectApartmentRow(req.params.id, reason);
  try {
    await releaseListingPaymentOnReject(req.params.id);
  } catch (err) {
    console.error('[payment] ביטול תשלום מושהה אחרי דחייה נכשל:', err.message);
  }
  const row = await selectApartmentById(req.params.id);
  res.json(await attachImagesToApartment(row));
}
