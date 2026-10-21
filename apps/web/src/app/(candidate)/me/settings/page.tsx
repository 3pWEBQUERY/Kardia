import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { Card, CardBody, CardHeader } from '@kardia/ui';

import { PageHeader } from '@/components/app/PageHeader';
import { AccountActions } from '@/components/candidate/AccountActions';
import { PasskeyManager } from '@/components/candidate/PasskeyManager';
import { PushToggle } from '@/components/candidate/PushToggle';
import { Preferences } from '@/components/shell/Preferences';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import { requireUser } from '@/server/session';

/** Einstellungen: Sprache, Darstellung, Push, Passkeys, Datenexport, Selbstlöschung (PRD 14.1). */
export default async function SettingsPage() {
  const s = await requireUser('/me/settings');
  const t = await getTranslations('candidate.settings');
  const tm = await getTranslations('candidate.overview');
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={tm('eyebrow')} title={t('title')} description={t('lead')} />
      <Card>
        <CardHeader title={t('display')} />
        <CardBody><Preferences theme={theme} /></CardBody>
      </Card>
      <Card>
        <CardHeader title={t('notifications')} meta={t('notificationsHint')} />
        <CardBody><PushToggle /></CardBody>
      </Card>
      <Card>
        <CardHeader title={t('passkeys')} meta={t('passkeysHint')} />
        <CardBody><PasskeyManager /></CardBody>
      </Card>
      <Card>
        <CardHeader title={t('data')} meta={t('dataHint')} />
        <CardBody><AccountActions email={s.user.email} /></CardBody>
      </Card>
    </div>
  );
}
