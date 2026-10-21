import { BadgeCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { REGISTRY_BY_PROFESSION, TERMS_VERSION } from '@kardia/core';
import { Callout } from '@kardia/ui';

import { FormSection } from '@/components/app/Form';
import { PageHeader } from '@/components/app/PageHeader';
import { CredentialList } from '@/components/candidate/CredentialList';
import { PassForm } from '@/components/candidate/PassForm';
import { db } from '@/server/db';
import { getPass } from '@/server/services/pass';
import { requireUser } from '@/server/session';

/** Qualifikations-Pass (Modul D): einmal prüfen, überall nutzen. */
export default async function PassPage({ searchParams }: { searchParams: Promise<{ setup?: string; next?: string }> }) {
  const sp = await searchParams;
  const s = await requireUser('/me/pass');
  const t = await getTranslations('candidate.pass');
  const tm = await getTranslations('candidate.overview');
  const [pass, user] = await Promise.all([
    getPass(s.user.id),
    db.user.findUnique({ where: { id: s.user.id }, select: { termsAcceptedAt: true, termsVersion: true } }),
  ]);
  const needsTerms = !user?.termsAcceptedAt || user.termsVersion !== TERMS_VERSION;
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : null;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={tm('eyebrow')} title={t('title')} description={t('lead')} />
      {!pass ? <Callout title={t('setupTitle')}>{t('setup')}</Callout> : null}
      <PassForm
            next={next}
            needsTerms={needsTerms}
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
                    home: pass.homeLat != null && pass.homeLng != null ? { lat: pass.homeLat, lng: pass.homeLng } : null,
                  }
                : null
            }
            defaultName={s.user.name}
          />
      {pass ? (
        <FormSection title={t('credentials')} description={t('credentialsHint', { registry: REGISTRY_BY_PROFESSION[pass.profession] })} icon={BadgeCheck}>
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
        </FormSection>
      ) : null}
    </div>
  );
}
