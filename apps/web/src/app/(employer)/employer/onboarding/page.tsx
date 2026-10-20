import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button, Callout, Card, CardBody } from '@kardia/ui';

import { OnboardingForm } from '@/components/employer/OnboardingForm';
import { PublicShell } from '@/components/shell/PublicShell';
import { db } from '@/server/db';
import { requireUser } from '@/server/session';

/** Registrierung mit UID (Modul C, agenturfrei). Ohne requireOrg – Ziel der Umleitung für Nutzer ohne Mitgliedschaft. */
export default async function OnboardingPage() {
  const s = await requireUser('/employer/onboarding');
  const t = await getTranslations('employer.onboarding');
  const memberships = await db.orgMember.count({ where: { userId: s.user.id } });
  return (
    <PublicShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body-s text-ink-700">{t('lead')}</p>
        </header>
        {memberships > 0 ? (
          <Callout
            action={
              <Button asChild size="s">
                <Link href="/employer">{t('toCockpit')}</Link>
              </Button>
            }
          >
            {t('already')}
          </Callout>
        ) : null}
        <Card>
          <CardBody>
            <OnboardingForm
              labels={{
                name: t('name'),
                uid: t('uid'),
                uidHint: t('uidHint'),
                domains: t('domains'),
                domainsHint: t('domainsHint'),
                submit: t('submit'),
              }}
              defaultDomain={s.user.email.split('@')[1] ?? ''}
            />
          </CardBody>
        </Card>
        <Callout title={t('agencyTitle')}>{t('agencyBody')}</Callout>
        <p className="text-micro text-ink-500">{t('invited')}</p>
      </div>
    </PublicShell>
  );
}
