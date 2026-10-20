import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { MAX_VIDEOS_PER_WARD, REALITY_CHECK_FIELDS, daysUntilStale, formatDate, isStale } from '@kardia/core';
import { Button, Callout, Card, CardBody, CardHeader, EmptyState, StatusChip, Tabs } from '@kardia/ui';

import { ConfirmWardButton } from '@/components/employer/ConfirmWardButton';
import { WardEditor } from '@/components/employer/WardEditor';
import { InviteEmployeeForm, RealityPanel, TranslationsEditor, VideoUpload } from '@/components/employer/WardPanels';
import { wardToDraft } from '@/components/employer/wardDefaults';
import { formatFieldValue } from '@/lib/fieldValue';
import { getWardForOrg, listLocations } from '@/server/services/wards';
import { requireOrg } from '@/server/session';

/** Station bearbeiten: Profil, Realitäts-Check, Mitarbeitende, Übersetzungen, Videos, Benchmark. */
export default async function WardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrg();
  const { ward, reality } = await getWardForOrg(ctx.org.id, id);
  const [t, tf, te, tc] = await Promise.all([getTranslations('employer.ward'), getTranslations('fields'), getTranslations('enums'), getTranslations('common')]);
  const locations = await listLocations(ctx.org.id);
  const fmt = (k: string, v: unknown) => formatFieldValue(k, v, { fields: tf, enums: te, common: tc });
  const record = ward as unknown as Record<string, unknown>;
  const stale = isStale(ward.confirmedAt);

  const realityRows = REALITY_CHECK_FIELDS.map((f) => {
    const agg = reality[f];
    return {
      field: f,
      label: tf(f),
      employerValue: fmt(f, record[f]),
      team: agg ? (agg.deviates && agg.teamValue != null ? tc('teamValue', { value: fmt(f, agg.teamValue), votes: agg.votes }) : agg.deviates ? t('teamDisagrees', { votes: agg.votes }) : tc('teamAgrees', { votes: agg.votes })) : null,
      deviates: agg?.deviates ?? false,
      comment: ward.fieldComments.find((c) => c.field === f)?.body ?? '',
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-caption text-ink-700">{ward.location.name} · {ward.location.city}</p>
          <h1 className="text-h1">{ward.name}</h1>
          <div className="flex flex-wrap gap-2">
            <StatusChip>{te(`Department.${ward.department}`)}</StatusChip>
            <StatusChip tone={stale ? 'warn' : 'ok'}>
              {stale ? t('staleSince', { days: -daysUntilStale(ward.confirmedAt) }) : t('confirmedOn', { date: formatDate(ward.confirmedAt) })}
            </StatusChip>
          </div>
        </div>
        <div className="flex gap-2">
          <ConfirmWardButton wardId={ward.id} label={t('confirm')} done={t('confirmedToast')} />
          <Button asChild><Link href={`/wards/${ward.id}`}>{t('publicView')}</Link></Button>
          <Button asChild variant="primary"><Link href={`/employer/jobs/new?ward=${ward.id}`}>{t('newJob')}</Link></Button>
        </div>
      </header>
      {stale ? <Callout tone="warn">{t('staleHint')}</Callout> : null}
      <Tabs
        label={t('tabs')}
        tabs={[
          {
            value: 'profile',
            label: t('tabProfile'),
            content: (
              <div className="max-w-4xl">
                <WardEditor wardId={ward.id} locationId={ward.locationId} locations={locations.map((l) => ({ id: l.id, name: l.name, city: l.city }))} initial={wardToDraft(record)} submitLabel={t('saveConfirm')} />
              </div>
            ),
          },
          { value: 'reality', label: t('tabReality'), content: <RealityPanel wardId={ward.id} rows={realityRows} /> },
          {
            value: 'team',
            label: t('tabTeam'),
            content: (
              <Card className="max-w-2xl">
                <CardHeader title={t('inviteTitle')} />
                <CardBody><InviteEmployeeForm wardId={ward.id} /></CardBody>
              </Card>
            ),
          },
          {
            value: 'translations',
            label: t('tabTranslations'),
            content: (
              <div className="max-w-3xl">
                <TranslationsEditor wardId={ward.id} initial={(ward.translations ?? {}) as Record<string, { description: string | null }>} />
              </div>
            ),
          },
          {
            value: 'videos',
            label: t('tabVideos'),
            content: (
              <div className="flex max-w-3xl flex-col gap-4">
                {ward.videos.length === 0 ? <p className="text-body-s text-ink-700">{t('noVideos')}</p> : null}
                <ul className="flex flex-col divide-y divide-line-200">
                  {ward.videos.map((v) => (
                    <li key={v.id} className="flex items-center justify-between py-2 text-body-s">
                      <span>{t('videoItem', { seconds: v.durationSec })}</span>
                      <StatusChip tone={v.moderation === 'APPROVED' ? 'ok' : v.moderation === 'REJECTED' ? 'critical' : 'neutral'}>{te(`ModerationStatus.${v.moderation}`)}</StatusChip>
                    </li>
                  ))}
                </ul>
                <VideoUpload wardId={ward.id} count={ward.videos.filter((v) => v.moderation !== 'REJECTED').length} max={MAX_VIDEOS_PER_WARD} />
              </div>
            ),
          },
          {
            value: 'benchmark',
            label: t('tabBenchmark'),
            content: ward.benchmarks.filter((b) => b.peerCount >= 8).length ? (
              <ul className="flex max-w-3xl flex-col divide-y divide-line-200 text-body-s">
                {ward.benchmarks.filter((b) => b.peerCount >= 8).map((b) => (
                  <li key={b.field} className="flex justify-between gap-4 py-2 tabular">
                    <span className="text-ink-700">{tf(b.field)}</span>
                    <span>{t('benchmarkRow', { value: fmt(b.field, b.wardValue), median: fmt(b.field, b.medianValue), peers: b.peerCount })}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState action={<Button asChild size="s"><Link href="/employer/benchmark">{t('toBenchmark')}</Link></Button>}>{t('noBenchmark')}</EmptyState>
            ),
          },
        ]}
      />
    </div>
  );
}
