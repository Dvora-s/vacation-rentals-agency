import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import {
  findUserByEmail,
  findUserById,
  insertGoogleUser,
  insertLocalUser,
  listUsersForAdmin,
  mergeGoogleUser,
  setEmailVerified,
  updatePasswordAndVerify,
} from '../models/userModel.js';
import {
  signToken,
  signEmailToken,
  verifyEmailToken,
  signResetToken,
  verifyResetToken,
} from '../middlewares/auth.js';
import {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  isMailerConfigured,
} from '../utils/mailer.js';
import { STRONG_PASSWORD, STRONG_PASSWORD_MESSAGE } from '../utils/passwordPolicy.js';

const APP_URL = (
  process.env.APP_URL ||
  process.env.CLIENT_ORIGIN ||
  'https://vacation-rentals-agency1.vercel.app'
).replace(/\/$/, '');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    email_verified: !!row.email_verified,
    auth_provider: row.auth_provider || 'local',
    created_at: row.created_at,
  };
}

function queueVerificationEmail(user, verifyUrl) {
  void sendVerificationEmail({
    to: user.email,
    fullName: user.full_name,
    verifyUrl,
  })
    .then((result) => {
      if (result?.skipped) {
        console.warn('[mailer] verification email skipped for', user.email);
        return;
      }
      console.info('[mailer] verification email sent to', user.email);
    })
    .catch((err) => {
      console.error('[mailer] verification email failed for', user.email, ':', err.message);
    });
}

/** Builds verify link immediately; sends email in background (non-blocking). */
function createVerificationDelivery(user) {
  let verifyUrl = null;

  try {
    const token = signEmailToken({ id: user.id, email: user.email });
    verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  } catch (err) {
    console.error('[auth] cannot create verification token:', err.message);
    return {
      verifyUrl: null,
      mail_sent: false,
      mail_skipped: true,
      mail_queued: false,
      mail_error: err.message,
    };
  }

  const mail_queued = isMailerConfigured();
  if (mail_queued) {
    queueVerificationEmail(user, verifyUrl);
  }

  return {
    verifyUrl,
    mail_sent: false,
    mail_skipped: !mail_queued,
    mail_queued,
  };
}

function verificationPayload(user, delivery, successMessage) {
  const payload = {
    pending_verification: true,
    email: user.email,
    mail_sent: delivery.mail_sent,
    mail_skipped: delivery.mail_skipped,
    mail_queued: delivery.mail_queued,
    mailer_configured: isMailerConfigured(),
    message: delivery.mail_queued
      ? `${successMessage} אפשר גם ללחוץ על קישור האימות למטה.`
      : delivery.verifyUrl
        ? 'שליחת מייל לא זמינה כרגע. השתמשי בקישור האימות למטה.'
        : 'החשבון נוצר, אך אימות אימייל אינו זמין כרגע. פנו לתמיכה.',
  };
  if (delivery.verifyUrl) {
    payload.verify_url = delivery.verifyUrl;
  }
  if (delivery.mail_error && process.env.NODE_ENV !== 'production') {
    payload.mail_error = delivery.mail_error;
  }
  return payload;
}

function passwordFingerprint(passwordHash) {
  return String(passwordHash || '').slice(-12);
}

export async function register(req, res) {
  const { full_name, email, phone, password } = req.body || {};
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'שם מלא, אימייל וסיסמה הם שדות חובה' });
  }
  if (!STRONG_PASSWORD.test(password)) {
    return res.status(400).json({ error: STRONG_PASSWORD_MESSAGE });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    if (!existingUser.email_verified) {
      const delivery = createVerificationDelivery(publicUser(existingUser));
      return res.json(
        verificationPayload(
          publicUser(existingUser),
          delivery,
          'החשבון כבר קיים אך טרם אומת. נשלח שוב מייל אימות — יש ללחוץ על הקישור שבו.',
        ),
      );
    }
    return res.status(409).json({
      error: 'משתמש עם האימייל הזה כבר קיים. נסו להתחבר.',
      already_registered: true,
    });
  }

  const password_hash = await bcrypt.hash(password, 12);

  try {
    const insertId = await insertLocalUser({
      full_name,
      email: normalizedEmail,
      phone,
      password_hash,
    });

    const user = publicUser(await findUserById(insertId));
    if (!user) {
      return res.status(500).json({ error: 'יצירת המשתמש נכשלה. נסו שוב.' });
    }

    const delivery = createVerificationDelivery(user);
    return res.status(201).json(
      verificationPayload(
        user,
        delivery,
        'נשלח אליך מייל לאימות החשבון. יש ללחוץ על הקישור שבמייל כדי להפעיל את החשבון.',
      ),
    );
  } catch (err) {
    console.error('[auth] register failed:', err);
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'משתמש עם האימייל הזה כבר קיים. נסו להתחבר.',
        already_registered: true,
      });
    }
    return res.status(500).json({ error: 'שגיאת שרת בהרשמה. נסו שוב.' });
  }
}

export async function verifyEmail(req, res) {
  const token = req.query.token;
  if (!token) {
    return res.status(400).json({ error: 'חסר טוקן אימות' });
  }

  let decoded;
  try {
    decoded = verifyEmailToken(token);
  } catch {
    return res.status(400).json({ error: 'קישור האימות אינו תקין או שפג תוקפו' });
  }

  const user = await findUserById(decoded.id);
  if (!user) {
    return res.status(404).json({ error: 'המשתמש לא נמצא' });
  }

  const wasVerified = !!user.email_verified;
  if (!wasVerified) {
    await setEmailVerified(user.id);
    sendWelcomeEmail({ to: user.email, fullName: user.full_name }).catch((err) =>
      console.error('[mailer] מייל ברוכים-הבאים נכשל:', err.message),
    );
  }
  user.email_verified = 1;

  const authToken = signToken({ id: user.id, email: user.email, role: user.role });
  res.json({
    ok: true,
    email: user.email,
    already_verified: wasVerified,
    user: publicUser(user),
    token: authToken,
  });
}

export async function resendVerification(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'נדרש אימייל' });

  const row = await findUserByEmail(email);
  if (row && !row.email_verified) {
    const delivery = createVerificationDelivery(publicUser(row));
    return res.json({
      ok: true,
      mail_sent: delivery.mail_sent,
      mail_skipped: delivery.mail_skipped,
      mail_queued: delivery.mail_queued,
      mailer_configured: isMailerConfigured(),
      verify_url: delivery.verifyUrl || undefined,
      message: delivery.mail_queued
        ? 'מייל אימות נשלח ברקע. בדקו את תיבת הדואר (וגם ספאם), או השתמשי בקישור למטה.'
        : delivery.verifyUrl
          ? 'שליחת מייל לא זמינה. השתמשי בקישור האימות למטה.'
          : 'לא ניתן ליצור קישור אימות.',
    });
  }
  res.json({
    ok: true,
    mail_sent: false,
    message: 'אם קיים חשבון שאינו מאומת, נשלח אליו מייל אימות חדש.',
  });
}

export async function forgotPassword(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'נדרש אימייל' });

  const user = await findUserByEmail(email);

  if (user && user.password_hash) {
    const token = signResetToken({
      id: user.id,
      email: user.email,
      fp: passwordFingerprint(user.password_hash),
    });
    const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await sendPasswordResetEmail({
        to: user.email,
        fullName: user.full_name,
        resetUrl,
      });
    } catch (err) {
      console.error('[mailer] שליחת מייל איפוס סיסמה נכשלה:', err.message);
    }
  }

  res.json({
    ok: true,
    message: 'אם קיים חשבון עם האימייל הזה, נשלח אליו קישור לאיפוס הסיסמה.',
  });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: 'נדרשים טוקן וסיסמה חדשה' });
  }
  if (!STRONG_PASSWORD.test(password)) {
    return res.status(400).json({ error: STRONG_PASSWORD_MESSAGE });
  }

  let decoded;
  try {
    decoded = verifyResetToken(token);
  } catch {
    return res.status(400).json({ error: 'קישור האיפוס אינו תקין או שפג תוקפו' });
  }

  const user = await findUserById(decoded.id);
  if (!user) {
    return res.status(404).json({ error: 'המשתמש לא נמצא' });
  }

  if (decoded.fp !== passwordFingerprint(user.password_hash)) {
    return res.status(400).json({ error: 'קישור האיפוס כבר נוצל או שאינו תקף עוד' });
  }

  const password_hash = await bcrypt.hash(password, 12);
  await updatePasswordAndVerify(user.id, password_hash);

  res.json({ ok: true, message: 'הסיסמה עודכנה בהצלחה. אפשר להתחבר עם הסיסמה החדשה.' });
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'נדרשים אימייל וסיסמה' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
  }

  if (!user.password_hash) {
    return res.status(401).json({
      error: 'החשבון נוצר באמצעות התחברות עם גוגל. יש להתחבר דרך כפתור "התחברות עם Google".',
    });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
  }

  if (!user.email_verified && user.role !== 'admin') {
    const delivery = createVerificationDelivery(publicUser(user));
    return res.status(403).json({
      error: 'החשבון עדיין לא אומת. יש לאמת את האימייל לפני ההתחברות.',
      needs_verification: true,
      email: user.email,
      mail_sent: delivery.mail_sent,
      verify_url: delivery.verifyUrl,
    });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.json({ user: publicUser(user), token });
}

export async function googleAuth(req, res) {
  if (!googleClient) {
    return res.status(503).json({ error: 'התחברות עם גוגל אינה מוגדרת בשרת.' });
  }
  const { credential } = req.body || {};
  if (!credential) {
    return res.status(400).json({ error: 'חסר אסימון התחברות מגוגל' });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'אימות מול גוגל נכשל' });
  }

  if (!payload?.email || !payload.email_verified) {
    return res.status(401).json({ error: 'חשבון הגוגל אינו כולל אימייל מאומת' });
  }

  const email = payload.email.trim().toLowerCase();
  const fullName = payload.name || email.split('@')[0];
  const googleId = payload.sub;

  const existingRow = await findUserByEmail(email);

  let userRow;
  let isNew = false;
  if (existingRow) {
    userRow = existingRow;
    await mergeGoogleUser(googleId, userRow.id);
  } else {
    isNew = true;
    const insertId = await insertGoogleUser({ fullName, email, googleId });
    userRow = await findUserById(insertId);
  }

  if (isNew) {
    sendWelcomeEmail({ to: email, fullName }).catch((err) =>
      console.error('[mailer] מייל ברוכים-הבאים (גוגל) נכשל:', err.message),
    );
  }

  const token = signToken({ id: userRow.id, email: userRow.email, role: userRow.role });
  res.json({ user: publicUser(userRow), token });
}

export async function me(req, res) {
  const user = await findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'המשתמש לא נמצא' });
  }
  res.json(publicUser(user));
}

export async function listUsers(_req, res) {
  const rows = await listUsersForAdmin();
  res.json(rows.map(publicUser));
}
