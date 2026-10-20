import { getTranslations } from 'next-intl/server';

import { REGISTRY_BY_PROFESSION } from '@kardia/core';
import { Callout, Card, CardBody, CardHeader } from '@kardia/ui';

import { CredentialList } from '@/components/candidate/CredentialList';
import { PassForm } from '@/components/candidate/PassForm';
import { getPass } from '@/server/services/pass';
import { requireUser } from '@/server/session';

/** Qualifikations-Pass (Modul D): einmal prüfen, überall nutzen. */
export default async function PassPage({ searchParams }: { searchParams: Promise<{ setup?: string; next?: string }> }) {
  const sp = await searchParams;
  const s = await requireUser('/me/pass');
  const t = await getTranslations('candidate.pass');
  const pass = await getPass(s.user.id);
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : null;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-s text-ink-700">{t('lead')}</p>
      </header>
      {!pass ? <Callout title={t('setupTitle')}>{t('setup')}</Callout> : null}
      <Card>
        <CardHeader title={t('profile')} />
        <CardBody>
          <PassForm
            next={next}
            initial={
              pass
                ? {
                    firstName: pass.firstName,
                    lastName: pass.lastName,
                    phone: pass.phone,
                    profession: pass.profession,
                    yearsExperience: pass.yearsExperience,
                    workAuthorizedCh: pass.workAuthorizedCh,
                    experiences: pass.experiences.map((x) => ({ department: x.department, years: x.years })),
                    languages: pass.languages.map((l) => ({ language: l.language, level: l.level as 'A1' })),
                  }
                : null
            }
            defaultName={s.user.name}
          />
        </CardBody>
      </Card>
      {pass ? (
        <Card>
          <CardHeader title={t('credentials')} meta={t('credentialsHint', { registry: REGISTRY_BY_PROFESSION[pass.profession] })} />
          <CardBody>
            <CredentialList
              defaultRegistry={REGISTRY_BY_PROFESSION[pass.profession]}
              credentials={pass.credentials.map((c) => ({
                id: c.id,
                type: c.type,
                title: c.title,
                issuer: c.issuer,
                issuedAt: c.issuedAt?.toISOString().slice(0, 10) ?? null,
                validUntil: c.validUntil?.toISOString().slice(0, 10) ?? null,
                registry: c.registry,
                registryNumber: c.registryNumber,
                status: c.status,
                rejectReason: c.rejectReason,
                fileId: c.fileId,
                fileStatus: c.file?.status ?? null,
                suggestion: c.suggestion,
              }))}
            />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
