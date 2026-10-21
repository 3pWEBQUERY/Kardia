'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { formatDateTime, shiftHours } from '@kardia/core';
import {
  Button,
  Callout,
  DataTable,
  Input,
  Select,
  StatusChip,
  Textarea,
  useToast,
  type DataColumn,
  type Tone,
} from '@kardia/ui';

import {
  assignShiftTo,
  cancelShift,
  invitePoolMember,
  newPool,
  newShift,
  savePoolSettings,
} from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

/** Datum + Uhrzeit in Schweizer Zeit → ISO mit Offset (Sommer-/Winterzeit korrekt). */
function zurichIso(date: string, time: string): string {
  const guess = new Date(`${date}T${time}:00Z`);
  const local = new Date(guess.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }));
  const offsetMin = Math.round((local.getTime() - guess.getTime()) / 60_000);
  const utc = new Date(guess.getTime() - offsetMin * 60_000);
  return utc.toISOString();
}

interface PoolSettings {
  name: string;
  bookingMode: 'FIRST_CONFIRMS' | 'EMPLOYER_SELECTS';
  cancelDeadlineHours: number;
}

export function PoolCreateForm() {
  return <PoolSettingsForm />;
}

/** Pool anlegen oder Einstellungen (Name, Buchungsmodus, Absagefrist) ändern. */
export function PoolSettingsForm({ poolId, initial }: { poolId?: string; initial?: PoolSettings }) {
  const t = useTranslations('employer.pool');
  const te = useTranslations('enums');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [name, setName] = useState(initial?.name ?? '');
  const [mode, setMode] = useState<PoolSettings['bookingMode']>(initial?.bookingMode ?? 'FIRST_CONFIRMS');
  const [hours, setHours] = useState(String(initial?.cancelDeadlineHours ?? 48));
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_1.5fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const input = { name, bookingMode: mode, cancelDeadlineHours: Number(hours) };
        void (poolId ? savePoolSettings(poolId, input) : newPool(input)).then((r) => {
          if (!r.ok) return setError(message(r));
          if (!poolId) setName('');
          else toast({ tone: 'neutral', message: t('settingsSaved') });
          setError(null);
          router.refresh();
        });
      }}
    >
      <Input
        label={t('poolName')}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Select
        label={t('bookingMode')}
        value={mode}
        onChange={(e) => setMode(e.target.value as typeof mode)}
        options={(['FIRST_CONFIRMS', 'EMPLOYER_SELECTS'] as const).map((m) => ({
          value: m,
          label: te(`PoolBookingMode.${m}`),
        }))}
      />
      <Input
        label={t('cancelDeadline')}
        unit="h"
        inputMode="numeric"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
      />
      <Button type="submit" variant="primary" disabled={name.trim().length < 2}>
        {poolId ? t('saveSettings') : t('create')}
      </Button>
      {error ? (
        <div className="sm:col-span-4">
          <Callout tone="critical">{error}</Callout>
        </div>
      ) : null}
    </form>
  );
}

export function PoolInviteForm({ poolId }: { poolId: string }) {
  const t = useTranslations('employer.pool');
  const toast = useToast();
  const message = useActionMessage();
  const [email, setEmail] = useState('');
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void invitePoolMember(poolId, email).then((r) => {
          if (!r.ok) return toast({ tone: 'critical', message: message(r) });
          setEmail('');
          toast({ tone: 'neutral', message: t('invited') });
        });
      }}
    >
      <div className="min-w-64 flex-1">
        <Input
          label={t('inviteEmail')}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit">{t('invite')}</Button>
    </form>
  );
}

const DEFAULT_TIMES: Record<string, [string, string]> = {
  F: ['06:45', '15:30'],
  S: ['14:30', '23:00'],
  N: ['22:30', '07:15'],
  T: ['07:00', '19:30'],
};

export function ShiftForm({
  poolId,
  wards,
}: {
  poolId: string;
  wards: { id: string; name: string }[];
}) {
  const t = useTranslations('employer.pool');
  const te = useTranslations('enums');
  const router = useRouter();
  const message = useActionMessage();
  const [d, setD] = useState(() => ({
    wardId: wards[0]?.id ?? '',
    date: new Date(Date.now() + 86400_000).toISOString().slice(0, 10),
    code: 'F',
    from: '06:45',
    to: '15:30',
    rate: '55',
    requirements: '',
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setError(null);
    const startsAt = zurichIso(d.date, d.from);
    let endsAt = zurichIso(d.date, d.to);
    // Nachtdienst über Mitternacht: Ende am Folgetag.
    if (new Date(endsAt) <= new Date(startsAt))
      endsAt = new Date(new Date(endsAt).getTime() + 86400_000).toISOString();
    setBusy(true);
    const r = await newShift({
      poolId,
      wardId: d.wardId,
      startsAt,
      endsAt,
      code: d.code as 'F',
      hourlyRateChf: Number(d.rate),
      ...(d.requirements.trim() ? { requirements: d.requirements.trim() } : {}),
    });
    setBusy(false);
    if (!r.ok) return setError(message(r));
    router.refresh();
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label={t('ward')}
          value={d.wardId}
          onChange={(e) => setD({ ...d, wardId: e.target.value })}
          options={wards.map((w) => ({ value: w.id, label: w.name }))}
        />
        <Input
          label={t('date')}
          type="date"
          value={d.date}
          onChange={(e) => setD({ ...d, date: e.target.value })}
        />
        <Select
          label={t('code')}
          value={d.code}
          onChange={(e) => {
            const times = DEFAULT_TIMES[e.target.value] ?? ['07:00', '16:00'];
            setD({ ...d, code: e.target.value, from: times[0], to: times[1] });
          }}
          options={(['F', 'S', 'N', 'T'] as const).map((c) => ({
            value: c,
            label: te(`RosterCode.${c}`),
          }))}
        />
        <Input
          label={t('from')}
          type="time"
          value={d.from}
          onChange={(e) => setD({ ...d, from: e.target.value })}
        />
        <Input
          label={t('to')}
          type="time"
          value={d.to}
          onChange={(e) => setD({ ...d, to: e.target.value })}
        />
        <Input
          label={t('rate')}
          unit="CHF/h"
          inputMode="numeric"
          value={d.rate}
          onChange={(e) => setD({ ...d, rate: e.target.value })}
        />
      </div>
      <Textarea
        label={t('requirements')}
        maxLength={400}
        value={d.requirements}
        onChange={(e) => setD({ ...d, requirements: e.target.value })}
      />
      {error ? <Callout tone="critical">{error}</Callout> : null}
      <div>
        <Button variant="primary" disabled={busy || !d.wardId} onClick={() => void submit()}>
          {t('publishShift')}
        </Button>
      </div>
    </div>
  );
}

export interface ShiftRow {
  id: string;
  startsAt: string;
  endsAt: string;
  ward: string;
  code: string;
  rate: number;
  status: string;
  bookedBy: string | null;
  interests: { candidateId: string; name: string }[];
}

const TONE: Record<string, Tone> = {
  OPEN: 'accent',
  BOOKED: 'ok',
  CANCELLED: 'neutral',
  COMPLETED: 'neutral',
};

export function ShiftTable({ rows, selectMode }: { rows: ShiftRow[]; selectMode: boolean }) {
  const t = useTranslations('employer.pool');
  const te = useTranslations('enums');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const done = (r: { ok: boolean } & Parameters<typeof message>[0]) => {
    if (!r.ok) toast({ tone: 'critical', message: message(r) });
    else router.refresh();
  };
  const columns: DataColumn<ShiftRow>[] = [
    {
      key: 'start',
      header: t('start'),
      cell: (r) => formatDateTime(r.startsAt),
      sortValue: (r) => r.startsAt,
    },
    {
      key: 'hours',
      header: t('hours'),
      cell: (r) => `${shiftHours(new Date(r.startsAt), new Date(r.endsAt))} h`,
      align: 'right',
    },
    { key: 'ward', header: t('ward'), cell: (r) => r.ward, sortValue: (r) => r.ward },
    { key: 'code', header: t('code'), cell: (r) => te(`RosterCode.${r.code}`) },
    {
      key: 'rate',
      header: t('rate'),
      cell: (r) => `CHF ${r.rate}`,
      sortValue: (r) => r.rate,
      align: 'right',
    },
    {
      key: 'status',
      header: t('status'),
      cell: (r) => (
        <StatusChip tone={TONE[r.status] ?? 'neutral'}>{te(`ShiftStatus.${r.status}`)}</StatusChip>
      ),
      sortValue: (r) => r.status,
    },
    {
      key: 'person',
      header: t('person'),
      cell: (r) =>
        r.bookedBy ??
        (selectMode && r.status === 'OPEN' && r.interests.length ? (
          <select
            aria-label={t('assign')}
            defaultValue=""
            onChange={(e) => e.target.value && void assignShiftTo(r.id, e.target.value).then(done)}
            className="h-8 rounded-control border border-line-300 bg-surface-0 px-2 text-body-s"
          >
            <option value="">{t('interests', { count: r.interests.length })}</option>
            {r.interests.map((i) => (
              <option key={i.candidateId} value={i.candidateId}>
                {i.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-ink-500">–</span>
        )),
    },
    {
      key: 'actions',
      header: t('actions'),
      cell: (r) =>
        r.status === 'OPEN' || r.status === 'BOOKED' ? (
          <Button size="s" variant="ghost" onClick={() => void cancelShift(r.id).then(done)}>
            {t('cancel')}
          </Button>
        ) : null,
    },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      caption={t('shifts')}
      columnsLabel={t('columns')}
      empty={<p className="text-body-s text-ink-700">{t('noShifts')}</p>}
    />
  );
}
