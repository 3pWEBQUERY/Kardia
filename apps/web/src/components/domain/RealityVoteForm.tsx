'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { WardProfileKey } from '@kardia/core';
import { Button, Card, CardBody, CardHeader, Switch, useToast } from '@kardia/ui';

import { toggleAmbassador, vote } from '@/app/actions/candidate';
import { useActionMessage } from '@/lib/useActionError';

interface FieldRow {
  field: WardProfileKey;
  label: string;
  employerValue: string;
  mine: { agrees: boolean; proposedValue: string } | null;
}

/** Pro Feld "stimmt" / "stimmt nicht" + optional der aus eigener Sicht korrekte Wert. */
export function RealityVoteForm({ wardId, fields, ambassador }: { wardId: string; fields: FieldRow[]; ambassador: boolean }) {
  const t = useTranslations('common.team');
  const toast = useToast();
  const message = useActionMessage();
  const [state, setState] = useState(() => Object.fromEntries(fields.map((f) => [f.field, f.mine])) as Record<string, FieldRow['mine']>);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [isAmbassador, setAmbassador] = useState(ambassador);

  const submit = async (field: WardProfileKey) => {
    const v = state[field];
    if (!v) return;
    const r = await vote(wardId, {
      field,
      agrees: v.agrees,
      ...(v.agrees || !v.proposedValue ? {} : { proposedValue: v.proposedValue }),
      ...(comment[field] ? { comment: comment[field] } : {}),
    });
    toast(r.ok ? { tone: 'neutral', message: t('voted') } : { tone: 'critical', message: message(r) });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={t('ambassadorTitle')} />
        <CardBody>
          <Switch
            label={t('ambassador')}
            checked={isAmbassador}
            onCheckedChange={(on) => {
              setAmbassador(on);
              void toggleAmbassador(wardId, on);
            }}
          />
        </CardBody>
      </Card>
      <ul className="flex flex-col gap-3">
        {fields.map((f) => {
          const v = state[f.field];
          return (
            <li key={f.field} className="flex flex-col gap-2 rounded-card border border-line-300 bg-surface-0 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-body-s font-medium">{f.label}</span>
                <span className="text-body-s text-ink-700 tabular">{t('employerSays', { value: f.employerValue })}</span>
              </div>
              <div role="radiogroup" aria-label={f.label} className="flex gap-2">
                {[true, false].map((agrees) => (
                  <button
                    key={String(agrees)}
                    type="button"
                    role="radio"
                    aria-checked={v?.agrees === agrees}
                    onClick={() => setState((s) => ({ ...s, [f.field]: { agrees, proposedValue: s[f.field]?.proposedValue ?? '' } }))}
                    className="h-control-s rounded-control border border-line-300 px-3 text-body-s aria-checked:border-accent-600 aria-checked:bg-accent-50 aria-checked:text-accent-700 pointer-coarse:h-touch"
                  >
                    {agrees ? t('agree') : t('disagree')}
                  </button>
                ))}
              </div>
              {v && !v.agrees ? (
                <input
                  aria-label={t('proposed')}
                  placeholder={t('proposed')}
                  maxLength={60}
                  value={v.proposedValue}
                  onChange={(e) => setState((s) => ({ ...s, [f.field]: { agrees: false, proposedValue: e.target.value } }))}
                  className="h-control-m rounded-control border border-line-300 bg-surface-0 px-3 text-body-s"
                />
              ) : null}
              {v ? (
                <textarea
                  aria-label={t('comment')}
                  placeholder={t('commentHint')}
                  maxLength={400}
                  value={comment[f.field] ?? ''}
                  onChange={(e) => setComment((c) => ({ ...c, [f.field]: e.target.value }))}
                  className="min-h-16 rounded-control border border-line-300 bg-surface-0 px-3 py-2 text-body-s"
                />
              ) : null}
              <div>
                <Button size="s" variant="primary" disabled={!v} onClick={() => void submit(f.field)}>
                  {t('submitVote')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
