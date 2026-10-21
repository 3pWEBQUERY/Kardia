import { Baby, Banknote, CalendarClock, FileSignature, Gauge, GraduationCap, HeartHandshake, MapPin, RotateCcw, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { WARD_FIELDS, formatDate, formatNumber, type PartialWardProfile, type RealityAggregate, type WardProfileKey } from '@kardia/core';
import { Icon, ProfileFieldList, ProfileFieldRow } from '@kardia/ui';

import { formatFieldValue } from '@/lib/fieldValue';

const GROUP_ORDER = ['pay', 'shifts', 'workload', 'care', 'development', 'family', 'contract', 'reentry'] as const;

const GROUP_ICONS: Record<(typeof GROUP_ORDER)[number] | 'location', LucideIcon> = {
  pay: Banknote,
  shifts: CalendarClock,
  workload: Gauge,
  care: HeartHandshake,
  development: GraduationCap,
  family: Baby,
  contract: FileSignature,
  reentry: RotateCcw,
  location: MapPin,
};

function GroupHeading({ id, group, label }: { id: string; group: keyof typeof GROUP_ICONS; label: string }) {
  return (
    <h3 id={id} className="mb-2 flex items-center gap-2.5 text-h3">
      <span className="inline-flex size-8 items-center justify-center rounded-control bg-accent-50 text-accent-700">
        <Icon icon={GROUP_ICONS[group]} size={18} />
      </span>
      {label}
    </h3>
  );
}

/**
 * Stationsprofil als Feldzeilen: Label · Arbeitgeberwert · Team-Wert · Bestätigungsdatum
 * (AK-A2). Realitäts-Check inline, Abweichungen mit Warn-Token, nie versteckt (PRD 7.1).
 */
export async function WardProfileView({
  profile,
  confirmedAt,
  reality,
  comments,
  overridden = [],
  location,
}: {
  profile: PartialWardProfile;
  confirmedAt: Date;
  reality: Record<string, RealityAggregate>;
  comments: { field: string; body: string }[];
  overridden?: string[];
  location?: { street: string; postalCode: string; city: string; hasParking: boolean };
}) {
  const [tf, te, tc] = await Promise.all([getTranslations('fields'), getTranslations('enums'), getTranslations('common')]);
  const fmt = (k: string, v: unknown) => formatFieldValue(k, v, { fields: tf, enums: te, common: tc });
  const source = tc('confirmedBy', { date: formatDate(confirmedAt) });
  const short = tc('confirmedShort', { date: formatDate(confirmedAt) });

  const rows = WARD_FIELDS.filter((f) => f.key !== 'rosterPattern' && f.key !== 'department' && f.key !== 'salaryMaxChf');
  const grouped = GROUP_ORDER.map((g) => ({ group: g, fields: rows.filter((f) => f.group === g) })).filter((g) => g.fields.length);

  const teamLabel = (key: WardProfileKey) => {
    const agg = reality[key];
    if (!agg) return undefined;
    if (!agg.deviates) return tc('teamAgrees', { votes: agg.votes });
    const value = agg.teamValue != null ? fmt(key, agg.teamValue) : `${formatNumber(Math.round((1 - agg.agreeShare) * 100))} % ${tc('states.deviation')}`;
    return tc('teamValue', { value, votes: agg.votes });
  };

  return (
    <div className="flex flex-col gap-6">
      {grouped.map(({ group, fields }) => {
        // Der 13. Monatslohn steht bereits in der Lohnzeile, sobald es eine Lohnbandbreite gibt.
        const salaryShown = profile.salaryMinChf != null && profile.salaryMaxChf != null;
        const visible = fields.filter((f) => !(f.group === 'reentry' && !profile.reentryFriendly) && !(f.key === 'thirteenthSalary' && salaryShown));
        if (!visible.length) return null;
        return (
          <section key={group} aria-labelledby={`g-${group}`} className="flex flex-col">
            <GroupHeading id={`g-${group}`} group={group} label={tf(`groups.${group}`)} />
            <ProfileFieldList>
              {visible.map((f) => {
                const value =
                  f.key === 'salaryMinChf' && profile.salaryMinChf != null && profile.salaryMaxChf != null
                    ? `CHF ${formatNumber(profile.salaryMinChf)}–${formatNumber(profile.salaryMaxChf)}${profile.thirteenthSalary ? ` · ${tf('thirteenthSalary')}` : ''}`
                    : fmt(f.key, profile[f.key]);
                const comment = comments.find((c) => c.field === f.key)?.body;
                const team = teamLabel(f.key);
                return (
                  <ProfileFieldRow
                    key={f.key}
                    label={f.key === 'salaryMinChf' ? tf('salaryBand') : tf(f.key)}
                    value={value}
                    team={team}
                    deviates={reality[f.key]?.deviates ?? false}
                    deviationLabel={tc('states.deviation')}
                    source={overridden.includes(f.key) ? `${source} · ${tc('search.jobOverride')}` : source}
                    sourceShort={overridden.includes(f.key) ? `${short} · ${tc('search.jobOverride')}` : short}
                    {...(comment ? { employerComment: tc('employerComment', { comment }) } : {})}
                  />
                );
              })}
            </ProfileFieldList>
          </section>
        );
      })}
      {location ? (
        <section aria-labelledby="g-location" className="flex flex-col">
          <GroupHeading id="g-location" group="location" label={tf('location')} />
          <ProfileFieldList>
            <ProfileFieldRow label={tf('location')} value={`${location.street}, ${location.postalCode} ${location.city}`} source={source} sourceShort={short} />
            <ProfileFieldRow label={tf('hasParking')} value={location.hasParking ? tc('states.yes') : tc('states.no')} source={source} sourceShort={short} />
          </ProfileFieldList>
        </section>
      ) : null}
    </div>
  );
}
