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

function fromEnvSource() {
  if (process.env.EMAIL_FROM?.trim()) return 'EMAIL_FROM';
  if (process.env.RESEND_FROM?.trim()) return 'RESEND_FROM';
  if (process.env.SMTP_FROM?.trim()) return 'SMTP_FROM';
  return 'none';
}

/** ל-/api/health — בלי לחשוף כתובת מלאה */
export function getMailerDiagnostics() {
  const from = getEmailFromAddress();
  const domainMatch = from.match(/@([\w.-]+)/i);
  return {
    from_set: Boolean(from),
    from_source: fromEnvSource(),
    from_domain: domainMatch?.[1] || null,
    sandbox_from: from ? isSandboxFrom(from) : false,
    resend_key_set: Boolean(process.env.RESEND_API_KEY?.trim()),
  };
}

export function logMailerStartup() {
  const d = getMailerDiagnostics();
  if (!d.resend_key_set) {
    console.warn('[mailer] RESEND_API_KEY not set');
    return;
  }
  if (!d.from_set) {
    console.error(
      '[mailer] No From address — set EMAIL_FROM (e.g. noreply@dirotnofesh.co.il) on Railway and redeploy',
    );
    return;
  }
  if (d.sandbox_from) {
    console.error(
      '[mailer] From uses @resend.dev sandbox — external recipients will get 403. Use EMAIL_FROM on your verified domain.',
    );
    return;
  }
  console.info(
    `[mailer] Resend ready: from_source=${d.from_source} domain=${d.from_domain}`,
  );
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
    console.error(
      '[mailer] Blocked: From uses @resend.dev sandbox — set EMAIL_FROM to your verified domain (e.g. noreply@dirotnofesh.co.il)',
    );
    return {
      ok: false,
      skipped: true,
      error: 'From address is Resend sandbox (@resend.dev) — use verified domain in EMAIL_FROM',
    };
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
