import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

import { log } from '../context.ts';
import { config } from '../env.ts';

/** Amazon SES (eu-central-1, PRD 10.1). Ohne Zugangsdaten (Entwicklung) nur Protokoll. */
let ses: SESv2Client | undefined;

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  if (!config.mail.sesConfigured) {
    if (config.isProduction) throw new Error('SES ist nicht konfiguriert.');
    log.info('E-Mail (Entwicklung, nicht versendet)', { to, subject, text: text.slice(0, 600) });
    return;
  }
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
