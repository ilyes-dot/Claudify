import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Thin wrapper around Resend. If RESEND_API_KEY isn't set (e.g. local dev
 * without an account configured yet), this logs the email to the console
 * instead of throwing — so the rest of the app (user creation, etc.) keeps
 * working even before email is configured, and you can read the invite
 * link straight out of the terminal during development.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput) {
  if (!resend) {
    console.warn(
      `\n⚠️  RESEND_API_KEY not set — email not sent. Would have sent to ${to}:\n` +
        `   Subject: ${subject}\n${html}\n`
    );
    return { simulated: true };
  }

  const from = process.env.EMAIL_FROM || "Shop Admin Panel <onboarding@resend.dev>";

  const result = await resend.emails.send({ from, to, subject, html });
  if (result.error) {
    console.error("[email] Resend error:", result.error);
    throw new Error(`Failed to send email: ${result.error.message}`);
  }
  return result;
}

export function inviteEmailTemplate({ name, inviteUrl }: { name: string; inviteUrl: string }) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #111827;">You've been invited to Shop Admin Panel</h2>
      <p style="color: #374151; line-height: 1.6;">
        Hi ${name}, an administrator has created an account for you. Click the button
        below to set your password and sign in. This link expires in 24 hours.
      </p>
      <a href="${inviteUrl}"
         style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #2563eb;
                color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Set your password
      </a>
      <p style="color: #6b7280; font-size: 13px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="word-break: break-all;">${inviteUrl}</span>
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
        If you weren't expecting this invitation, you can safely ignore this email.
      </p>
    </div>
  `;
}
