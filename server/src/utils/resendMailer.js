import { Resend } from 'resend';

let resendClient = null;

function getClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

/** כתובת From — חייבת להיות מהדומיין המאומת ב-Resend (לא onboarding@resend.dev). */
export function getEmailFromAddress() {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    ''
  );
}

export function isResendReady() {
  return Boolean(getClient() && getEmailFromAddress());
}

function isSandboxFrom(from) {
  return /@resend\.dev$/i.test(String(from).trim());
}

/**
 * שליחת מייל גנרית דרך Resend.
 * לא זורקת שגיאה — מחזירה { ok, skipped, error? } כדי שלא תפיל Register/Login.
 */
export async function sendEmailViaResend({ to, subject, html, text, replyTo }) {
  const client = getClient();
  const from = getEmailFromAddress();

  if (!client) {
    return { ok: false, skipped: true, error: 'RESEND_API_KEY is not configured' };
  }

  if (!from) {
    console.error(
      '[mailer] EMAIL_FROM is missing — set it to an address on your verified domain (e.g. noreply@dirotnofesh.co.il)',
    );
    return { ok: false, skipped: true, error: 'EMAIL_FROM is not configured' };
  }

  if (isSandboxFrom(from)) {
    console.warn(
      '[mailer] EMAIL_FROM uses @resend.dev sandbox — Resend only allows your own inbox. Use your verified domain instead.',
    );
  }

  const recipients = Array.isArray(to) ? to : [to];

  try {
    const { data, error } = await client.emails.send({
      from,
      to: recipients,
      subject,
      html: html || undefined,
      text: text || undefined,
      ...(replyTo ? { reply_to: replyTo } : {}),
    });

    if (error) {
      console.error('[mailer] Resend API error:', error.message || JSON.stringify(error));
      return {
        ok: false,
        skipped: true,
        error: error.message || 'Resend send failed',
      };
    }

    return {
      ok: true,
      skipped: false,
      messageId: data?.id,
      provider: 'resend',
    };
  } catch (err) {
    console.error('[mailer] Resend send exception:', err.message);
    return { ok: false, skipped: true, error: err.message };
  }
}
