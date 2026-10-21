import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { REALITY_CHECK_FIELDS, REALITY_CHECK_MIN_VOTES, emailMatchesDomains } from '@kardia/core';
import { Callout, Card, CardBody, CardHeader, Icon } from '@kardia/ui';

import { ContourField } from '@/components/brand/Artwork';
import { RealityVoteForm } from '@/components/domain/RealityVoteForm';
import { VerifyEmployee } from '@/components/domain/VerifyEmployee';
import { formatFieldValue } from '@/lib/fieldValue';
import { db } from '@/server/db';
import { isVerifiedEmployee, myVotes } from '@/server/services/team';
import { requireUser } from '@/server/session';

/**
 * Realitäts-Check für Mitarbeitende (Modul G). Stimmen sind keiner Person zuordenbar
 * (nur HMAC gespeichert); Anzeige im Profil erst ab 5 Stimmen pro Feld.
 */
export default async function WardTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser(`/wards/${id}/team`);
  const ward = await db.ward.findUnique({ where: { id }, include: { location: { include: { organization: true } } } });
  if (!ward) notFound();
  const [t, tf, te, tc] = await Promise.all([getTranslations('public.team'), getTranslations('fields'), getTranslations('enums'), getTranslations('common')]);
  const verified = await isVerifiedEmployee(s.user.id, id);
  const ambassador = verified ? await db.wardAmbassador.findUnique({ where: { wardId_userId: { wardId: id, userId: s.user.id } } }) : null;
  const votes = verified ? await myVotes(s.user.id, id) : [];
  const canDomainVerify = emailMatchesDomains(s.user.email, ward.location.organization.emailDomains);

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-sand-200 bg-sand-100">
        <ContourField tone="sand" className="absolute inset-y-0 right-0 -z-10 h-full w-full md:w-2/3" />
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-8 pb-10">
          <Link href={`/wards/${ward.id}`} className="inline-flex w-fit items-center gap-1.5 text-body-s text-ink-700 hover:text-accent-700">
            <Icon icon={ArrowLeft} size={16} />
            {ward.name}
          </Link>
          <span className="inline-flex w-fit items-center gap-2 text-caption font-semibold tracking-wider text-accent-700 uppercase">
            <Icon icon={ShieldCheck} size={16} />
            {ward.location.organization.name}
          </span>
          <h1 className="text-display text-ink-900">{t('title', { ward: ward.name })}</h1>
          <p className="text-body text-ink-700">{t('lead', { min: REALITY_CHECK_MIN_VOTES })}</p>
        </div>
      </section>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      {!verified ? (
        <Card>
          <CardHeader title={t('verifyTitle')} />
          <CardBody className="flex flex-col gap-3">
            {canDomainVerify ? <VerifyEmployee wardId={id} /> : <Callout>{t('verifyInvite', { domains: ward.location.organization.emailDomains.join(', ') })}</Callout>}
          </CardBody>
        </Card>
      ) : (
        <>
          <Callout>{verified.method === 'EMPLOYER_INVITE' ? t('verifiedInvite') : t('verifiedDomain')}</Callout>
          <RealityVoteForm
            wardId={id}
            ambassador={!!ambassador}
            fields={REALITY_CHECK_FIELDS.map((f) => ({
              field: f,
              label: tf(f),
              employerValue: formatFieldValue(f, (ward as unknown as Record<string, unknown>)[f], { fields: tf, enums: te, common: tc }),
              mine: votes.find((v) => v.field === f) ? { agrees: votes.find((v) => v.field === f)?.agrees ?? true, proposedValue: votes.find((v) => v.field === f)?.proposedValue ?? '' } : null,
            }))}
          />
        </>
      )}
      </div>
    </>
  );
}
