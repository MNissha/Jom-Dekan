import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { env } from '../config/config/env';
import { logger } from '../utils/logger';

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
}

// Built lazily (not at module load) so tests and EMAIL_PROVIDER=console
// setups never need real SMTP credentials to exist.
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    // `family` isn't in nodemailer's own SMTPTransport.Options typing, but
    // it forwards unrecognized options straight through to net.connect —
    // this extended type just lets us pass it without an `any` cast.
    const options: SMTPTransport.Options & { family?: number } = {
      host: env.email.smtp.host,
      port: env.email.smtp.port,
      secure: env.email.smtp.port === 465,
      auth: { user: env.email.smtp.user, pass: env.email.smtp.password },
      // Gmail's hostname resolves to both an IPv4 and an IPv6 address, and
      // nodemailer only opens a single socket rather than racing/falling
      // back between them — on a host with no real outbound IPv6 route,
      // picking the AAAA record fails with ENETUNREACH immediately. Force
      // IPv4 so this doesn't depend on the host's IPv6 connectivity.
      family: 4,
      // Fail fast so a genuinely unreachable address doesn't stall a web
      // request for nodemailer's default 2-minute connection timeout.
      connectionTimeout: 5000,
    };
    transporter = nodemailer.createTransport(options);
  }
  return transporter;
}

async function sendViaResend(params: SendEmailParams): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.email.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.email.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}

async function sendViaSendGrid(params: SendEmailParams): Promise<void> {
  // SendGrid's "single sender verification" only requires proving you own
  // EMAIL_FROM's inbox (a confirmation-link click), not a verified domain —
  // unlike Resend, that lets it deliver to arbitrary recipients without
  // owning a domain.
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.email.sendgridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: params.to }] }],
      from: { email: env.email.from },
      subject: params.subject,
      content: [{ type: 'text/plain', value: params.text }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`SendGrid API error ${response.status}: ${body}`);
  }
}

/**
 * EMAIL_PROVIDER=console logs the message instead of sending it, so
 * password-reset/verification links are readable in the backend
 * terminal during local development. EMAIL_PROVIDER=smtp sends for
 * real via any SMTP server (Gmail included) using the SMTP_* env vars.
 * EMAIL_PROVIDER=resend sends over HTTPS via the Resend API, which
 * avoids the SMTP port-blocking/flakiness some networks have — but its
 * onboarding@resend.dev sender only delivers to the Resend account's own
 * verified address until a domain is verified at resend.com/domains.
 * EMAIL_PROVIDER=sendgrid also sends over HTTPS and, via single-sender
 * verification (verifying one inbox you own, no domain needed), can
 * deliver to arbitrary recipients — the practical option when nobody
 * owns a domain to verify yet.
 */
export const emailService = {
  async sendEmail(params: SendEmailParams): Promise<void> {
    if (env.email.provider === 'console') {
      logger.info({ to: params.to, subject: params.subject, text: params.text }, 'Email (console provider)');
      return;
    }

    if (env.email.provider === 'smtp') {
      await getTransporter().sendMail({
        from: env.email.from,
        to: params.to,
        subject: params.subject,
        text: params.text,
      });
      logger.info({ to: params.to, subject: params.subject }, 'Email sent (smtp provider)');
      return;
    }

    if (env.email.provider === 'resend') {
      await sendViaResend(params);
      logger.info({ to: params.to, subject: params.subject }, 'Email sent (resend provider)');
      return;
    }

    if (env.email.provider === 'sendgrid') {
      await sendViaSendGrid(params);
      logger.info({ to: params.to, subject: params.subject }, 'Email sent (sendgrid provider)');
      return;
    }

    throw new Error(`Email provider "${env.email.provider as string}" is not implemented yet.`);
  },
};
