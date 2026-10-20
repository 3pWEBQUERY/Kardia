import 'server-only';

import {
  CONFIRMATION_MAX_AGE_DAYS,
  evaluateMatch,
  isStale,
  resolveJobProfile,
  withoutCondition,
  type Condition,
  type MatchResult,
  type PartialWardProfile,
  type SearchFilter,
} from '@kardia/core';
import { Prisma, type Department, type Profession, type RosterCode } from '@kardia/db';

import { db } from '../db.ts';

/**
 * Lebensmodell-Suche (Modul B, PRD 10.3): ein SQL-Statement mit strukturierten
 * Filtern, Postgres-Volltext (`ts_rank`) und Trigramm. Muss-Bedingungen werden als
 * WHERE auf die effektiven Werte (Station + Job.overrides) angewandt, Wünsche als
 * Score. Unbekannte Werte (NULL) verletzen keine Muss-Bedingung. Pendelzeit kommt
 * nur aus dem Cache; fehlende Werte lädt der Client nach (AK-B3).
 */

const sql = Prisma.sql;
type Sql = Prisma.Sql;

/** Effektiver Wert: Überschreibung der Stelle, sonst Stationswert. */
function eff(field: string, cast: 'int' | 'float8' | 'boolean'): Sql {
  return sql`COALESCE((j."overrides"->>${field})::${Prisma.raw(cast)}, w.${Prisma.raw(`"${field}"`)})`;
}

const SHIFTS = sql`(CASE WHEN j."overrides" ? 'shiftTypes'
  THEN ARRAY(SELECT jsonb_array_elements_text(j."overrides"->'shiftTypes'))::"ShiftType"[]
  ELSE w."shiftTypes" END)`;

/** SQL-Ausdruck "Bedingung erfüllt oder unbekannt" bzw. "sicher erfüllt". */
function conditionSql(c: Condition): { okOrUnknown: Sql; met: Sql } {
  const both = (expr: Sql, nullable?: Sql) =>
    nullable ? { okOrUnknown: sql`(${nullable} IS NULL OR ${expr})`, met: sql`COALESCE(${expr}, false)` } : { okOrUnknown: expr, met: expr };
  switch (c.key) {
    case 'noNights':
      return both(sql`NOT ('NIGHT' = ANY(${SHIFTS}))`);
    case 'noSplitShifts':
      return both(sql`NOT ('SPLIT' = ANY(${SHIFTS}))`);
    case 'weekdaysOnly':
      return both(sql`('WEEKDAYS_ONLY' = ANY(${SHIFTS}))`);
    case 'maxWeekendsPerMonth':
      return both(sql`${eff('weekendsPerMonth', 'float8')} <= ${c.value}`);
    case 'minRosterLeadWeeks':
      return both(sql`${eff('rosterLeadWeeks', 'int')} >= ${c.value}`);
    case 'minWishDays':
      return both(sql`${eff('guaranteedWishDays', 'int')} >= ${c.value}`);
    case 'minSalary':
      return both(sql`${eff('salaryMaxChf', 'int')} >= ${c.value}`);
    case 'thirteenthSalary':
      return both(sql`${eff('thirteenthSalary', 'boolean')}`);
    case 'minNightAllowance':
      return both(sql`${eff('nightAllowanceChfHour', 'int')} >= ${c.value}`);
    case 'maxPatientsDay':
      return both(sql`w."patientsPerNurseDay" <= ${c.value}`, sql`w."patientsPerNurseDay"`);
    case 'maxPatientsNight':
      return both(sql`w."patientsPerNurseNight" <= ${c.value}`, sql`w."patientsPerNurseNight"`);
    case 'minOnboardingWeeks':
      return both(sql`${eff('onboardingWeeks', 'int')} >= ${c.value}`);
    case 'minVacationWeeks':
      return both(sql`${eff('vacationWeeks', 'int')} >= ${c.value}`);
    case 'minEducationDays':
      return both(sql`${eff('educationDays', 'int')} >= ${c.value}`, eff('educationDays', 'int'));
    case 'childcare':
      return both(sql`w."childcare" <> 'NONE'`);
    case 'collectiveAgreement':
      return both(sql`lower(trim(w."collectiveAgreement")) !~ '^kein\\s+gav$'`);
    case 'parking':
      return both(sql`l."hasParking"`);
    case 'reentryFriendly':
      return both(sql`w."reentryFriendly"`);
    case 'pendingRecognition':
      return both(sql`j."allowsPendingRecog"`);
    case 'recognizedTraining':
      return both(sql`(j."specialtyTitle" IS NOT NULL AND j."trainingCategory" IS NOT NULL)`);
    case 'maxCommute': {
      const col = c.transport === 'PT' ? sql`cc_pt."minutes"` : sql`cc_car."minutes"`;
      return both(sql`${col} <= ${c.value}`, col);
    }
  }
}

export interface SearchHit {
  jobId: string;
  title: string;
  profession: Profession;
  workloadMinPct: number;
  workloadMaxPct: number;
  startDate: string | null;
  publishedAt: Date | null;
  allowsPendingRecog: boolean;
  specialtyTitle: string | null;
  trainingCategory: string | null;
  ward: { id: string; name: string; department: Department; rosterPattern: RosterCode[]; confirmedAt: Date };
  org: { id: string; name: string };
  location: { city: string; canton: string; lat: number; lng: number; hasParking: boolean };
  profile: PartialWardProfile;
  commute: { PT?: number; CAR?: number };
  match: MatchResult;
  stale: boolean;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  nextCursor: string | null;
  /** Leerzustand mit nächster Handlung (PRD 7.4). */
  suggestion: { removeKey: Condition['key']; relaxedValue: number | null; count: number } | null;
}

function whereClause(filter: SearchFilter): Sql {
  const parts: Sql[] = [
    sql`j."status" = 'PUBLISHED'`,
    sql`o."verification" = 'VERIFIED'`,
    sql`(j."paidUntil" IS NULL OR j."paidUntil" > now() OR o."plan" IS NOT NULL)`,
  ];
  if (filter.profession) parts.push(sql`j."profession" = ${filter.profession}::"Profession"`);
  if (filter.departments?.length) {
    parts.push(sql`w."department" = ANY(${filter.departments}::"Department"[])`);
  }
  if (filter.cantons?.length) parts.push(sql`l."canton" = ANY(${filter.cantons}::text[])`);
  if (filter.workloadPct != null) {
    parts.push(sql`j."workloadMinPct" <= ${filter.workloadPct} AND j."workloadMaxPct" >= ${filter.workloadPct}`);
  }
  if (filter.availableFrom) {
    parts.push(sql`(j."startDate" IS NULL OR j."startDate" >= ${filter.availableFrom}::date - interval '30 days')`);
  }
  if (filter.specialtyTitle) parts.push(sql`j."specialtyTitle" = ${filter.specialtyTitle}`);
  if (filter.q) {
    parts.push(sql`(j."searchVector" @@ websearch_to_tsquery('german', ${filter.q})
      OR j."title" % ${filter.q} OR unaccent(lower(o."name")) LIKE unaccent(lower(${`%${filter.q}%`})))`);
  }
  for (const c of filter.conditions.filter((x) => x.mode === 'must')) parts.push(conditionSql(c).okOrUnknown);
  return Prisma.join(parts, ' AND ');
}

function fromClause(origin: string | undefined): Sql {
  return sql`
    FROM "Job" j
    JOIN "Ward" w ON w."id" = j."wardId"
    JOIN "Location" l ON l."id" = w."locationId"
    JOIN "Organization" o ON o."id" = l."organizationId"
    LEFT JOIN "CommuteCache" cc_pt ON cc_pt."wardId" = w."id" AND cc_pt."mode" = 'PT' AND cc_pt."originGeohash" = ${origin ?? ''}
    LEFT JOIN "CommuteCache" cc_car ON cc_car."wardId" = w."id" AND cc_car."mode" = 'CAR' AND cc_car."originGeohash" = ${origin ?? ''}`;
}

interface Row {
  jobId: string;
  title: string;
  profession: Profession;
  workloadMinPct: number;
  workloadMaxPct: number;
  startDate: Date | null;
  publishedAt: Date | null;
  allowsPendingRecog: boolean;
  specialtyTitle: string | null;
  trainingCategory: string | null;
  overrides: unknown;
  orgId: string;
  orgName: string;
  city: string;
  canton: string;
  lat: number;
  lng: number;
  hasParking: boolean;
  pt: number | null;
  car: number | null;
  ward: Record<string, unknown> & { id: string; name: string; department: Department; rosterPattern: RosterCode[]; confirmedAt: Date };
}

export async function searchJobs(
  filter: SearchFilter,
  opts: { cursor?: string | null; limit?: number } = {},
): Promise<SearchResult> {
  const limit = Math.min(opts.limit ?? 20, 500);
  const offset = opts.cursor ? Math.max(0, Number.parseInt(Buffer.from(opts.cursor, 'base64url').toString(), 10) || 0) : 0;
  const wishes = filter.conditions.filter((c) => c.mode === 'wish');
  const wishScore = wishes.length
    ? Prisma.join(
        wishes.map((c) => sql`(CASE WHEN ${conditionSql(c).met} THEN 1 ELSE 0 END)`),
        ' + ',
      )
    : sql`0`;
  const stale = sql`(w."confirmedAt" < now() - make_interval(days => ${CONFIRMATION_MAX_AGE_DAYS}))`;
  const completeness = sql`((w."minShiftsPerWeek" IS NOT NULL)::int + (w."patientsPerNurseDay" IS NOT NULL)::int
    + (w."skillMixHfFhPct" IS NOT NULL)::int + (w."educationBudgetChf" IS NOT NULL)::int
    + (w."educationDays" IS NOT NULL)::int + (w."onCallChfDay" IS NOT NULL)::int + (w."description" IS NOT NULL)::int)`;
  const rank = filter.q ? sql`ts_rank(j."searchVector", websearch_to_tsquery('german', ${filter.q}))` : sql`0`;
  const order =
    filter.sort === 'newest'
      ? sql`j."publishedAt" DESC NULLS LAST, j."id"`
      : filter.sort === 'salary'
        ? sql`${eff('salaryMaxChf', 'int')} DESC, j."id"`
        : sql`wish_score DESC, ${stale} ASC, ${rank} DESC, ${completeness} DESC, j."publishedAt" DESC NULLS LAST, j."id"`;
  const where = whereClause(filter);
  const from = fromClause(filter.origin);

  const [rows, countRows] = await Promise.all([
    db.$queryRaw<Row[]>`
      SELECT j."id" AS "jobId", j."title", j."profession", j."workloadMinPct", j."workloadMaxPct", j."startDate",
             j."publishedAt", j."allowsPendingRecog", j."specialtyTitle", j."trainingCategory", j."overrides",
             o."id" AS "orgId", o."name" AS "orgName", l."city", l."canton", l."lat", l."lng", l."hasParking",
             cc_pt."minutes" AS "pt", cc_car."minutes" AS "car",
             to_jsonb(w) AS "ward",
             ${wishScore} AS wish_score
      ${from}
      WHERE ${where}
      ORDER BY ${order}
      LIMIT ${limit} OFFSET ${offset}`,
    db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n ${from} WHERE ${where}`,
  ]);
  const total = Number(countRows[0]?.n ?? 0);

  const hits: SearchHit[] = [];
  for (const r of rows) {
    const ward = { ...r.ward, confirmedAt: new Date(String(r.ward.confirmedAt)) };
    const profile = resolveJobProfile(ward as unknown as PartialWardProfile, r.overrides);
    const commute = { ...(r.pt != null ? { PT: r.pt } : {}), ...(r.car != null ? { CAR: r.car } : {}) };
    const match = evaluateMatch(filter.conditions, {
      profile,
      hasParking: r.hasParking,
      allowsPendingRecog: r.allowsPendingRecog,
      trainingCategory: r.trainingCategory,
      commute,
    });
    // AK-B1: doppelte Absicherung zur SQL-Bedingung.
    if (match.excluded) continue;
    hits.push({
      jobId: r.jobId,
      title: r.title,
      profession: r.profession,
      workloadMinPct: r.workloadMinPct,
      workloadMaxPct: r.workloadMaxPct,
      startDate: r.startDate ? r.startDate.toISOString().slice(0, 10) : null,
      publishedAt: r.publishedAt,
      allowsPendingRecog: r.allowsPendingRecog,
      specialtyTitle: r.specialtyTitle,
      trainingCategory: r.trainingCategory,
      ward: { id: ward.id, name: ward.name, department: ward.department, rosterPattern: ward.rosterPattern, confirmedAt: ward.confirmedAt },
      org: { id: r.orgId, name: r.orgName },
      location: { city: r.city, canton: r.canton, lat: r.lat, lng: r.lng, hasParking: r.hasParking },
      profile,
      commute,
      match,
      stale: isStale(ward.confirmedAt),
    });
  }

  const nextOffset = offset + rows.length;
  return {
    hits,
    total,
    nextCursor: nextOffset < total ? Buffer.from(String(nextOffset)).toString('base64url') : null,
    suggestion: total === 0 ? await suggestRelaxation(filter) : null,
  };
}

async function countFor(filter: SearchFilter): Promise<number> {
  const rows = await db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n ${fromClause(filter.origin)} WHERE ${whereClause(filter)}`;
  return Number(rows[0]?.n ?? 0);
}

/**
 * Leerzustand: "Keine Treffer. Pendelzeit auf 45 min erhöhen ergäbe 12 Treffer."
 * Lockert jede Muss-Bedingung einzeln (Zahlenwerte um eine Stufe, sonst weglassen).
 */
async function suggestRelaxation(filter: SearchFilter): Promise<SearchResult['suggestion']> {
  let best: SearchResult['suggestion'] = null;
  for (const c of filter.conditions.filter((x) => x.mode === 'must').slice(0, 6)) {
    let relaxed: SearchFilter;
    let relaxedValue: number | null = null;
    if ('value' in c) {
      const step: Record<string, number> = { maxCommute: 15, minSalary: -5000, minRosterLeadWeeks: -2, maxWeekendsPerMonth: 1 };
      const delta = step[c.key];
      if (delta !== undefined) {
        relaxedValue = c.value + delta;
        relaxed = { ...filter, conditions: filter.conditions.map((x) => (x.key === c.key ? ({ ...c, value: relaxedValue } as Condition) : x)) };
      } else {
        relaxed = withoutCondition(filter, c.key);
      }
    } else {
      relaxed = withoutCondition(filter, c.key);
    }
    const count = await countFor(relaxed);
    if (count > 0 && (!best || count > best.count)) best = { removeKey: c.key, relaxedValue, count };
  }
  return best;
}

/** Für die Karte: alle Stationen mit Treffern (gleicher Filterzustand, AK-B2). */
export async function searchMapPoints(filter: SearchFilter): Promise<
  { wardId: string; jobId: string; title: string; orgName: string; lat: number; lng: number }[]
> {
  const result = await searchJobs(filter, { limit: 500 });
  return result.hits.map((h) => ({
    wardId: h.ward.id,
    jobId: h.jobId,
    title: h.title,
    orgName: h.org.name,
    lat: h.location.lat,
    lng: h.location.lng,
  }));
}
