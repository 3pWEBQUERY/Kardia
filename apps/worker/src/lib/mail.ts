import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import nodemailer, { type Transporter } from 'nodemailer';

import { log } from '../context.ts';
import { config } from '../env.ts';

/**
 * Versand über Amazon SES (eu-central-1, PRD 10.1) oder SMTP (SMTP_URL, z. B. ein
 * Schweizer Anbieter). `log` protokolliert nur; in Produktion ohne Inhalt, weil
 * Mails Anmeldelinks enthalten.
 */
let ses: SESv2Client | undefined;
let smtp: Transporter | undefined;

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  switch (config.mail.transport) {
    case 'log':
      if (config.isProduction) log.info('E-Mail nicht versendet (MAIL_TRANSPORT=log)', { subject });
      else log.info('E-Mail (Entwicklung, nicht versendet)', { to, subject, text: text.slice(0, 600) });
      return;
    case 'smtp': {
      if (!config.mail.smtpUrl) throw new Error('SMTP_URL ist nicht gesetzt.');
      smtp ??= nodemailer.createTransport(config.mail.smtpUrl);
      await smtp.sendMail({ from: config.mail.from, to, subject, html, text });
      return;
    }
    case 'ses':
      ses ??= new SESv2Client({ region: config.mail.region });
      await ses.send(
        new SendEmailCommand({
          FromEmailAddress: config.mail.from,
          Destination: { ToAddresses: [to] },
          Content: {
            Simple: {
              Subject: { Data: subject, Charset: 'UTF-8' },
              Body: { Html: { Data: html, Charset: 'UTF-8' }, Text: { Data: text, Charset: 'UTF-8' } },
            },
          },
        }),
      );
  }
}
