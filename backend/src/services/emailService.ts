import nodemailer, { type Transporter } from 'nodemailer';
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
    transporter = nodemailer.createTransport({
      host: env.email.smtp.host,
      port: env.email.smtp.port,
      secure: env.email.smtp.port === 465,
      auth: { user: env.email.smtp.user, pass: env.email.smtp.password },
      // Gmail's hostname resolves to several frontend addresses (IPv4 and
      // IPv6); nodemailer tries them in order and falls back on failure,
      // but its default 2-minute per-address timeout makes that fallback
      // useless for a web request. Fail fast so a single unreachable
      // address doesn't stall sending for minutes.
      connectionTimeout: 5000,
    });
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

/**
 * EMAIL_PROVIDER=console logs the message instead of sending it, so
 * password-reset/verification links are readable in the backend
 * terminal during local development. EMAIL_PROVIDER=smtp sends for
 * real via any SMTP server (Gmail included) using the SMTP_* env vars.
 * EMAIL_PROVIDER=resend sends over HTTPS via the Resend API, which
 * avoids the SMTP port-blocking/flakiness some networks have.
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

    throw new Error(`Email provider "${env.email.provider as string}" is not implemented yet.`);
  },
};
