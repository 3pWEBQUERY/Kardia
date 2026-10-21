'use client';

import { Check, ExternalLink, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Checkbox, Icon, cx } from '@kardia/ui';

import { toggleRecognitionStep } from '@/app/actions/candidate';

import type { RecognitionStep } from '@kardia/core';

/** Anerkennungsschritte als Zeitachse mit eigenem Fortschritt (umkehrbar → optimistisch). */
export function RecognitionChecklist({ guideId, steps, done, canTrack }: { guideId: string; steps: RecognitionStep[]; done: string[]; canTrack: boolean }) {
  const t = useTranslations('common');
  const [state, setState] = useState(() => new Set(done));
  return (
    <ol className="relative flex flex-col gap-6">
      {steps.map((s, i) => {
        const isDone = state.has(s.id);
        const last = i === steps.length - 1;
        return (
          <li key={s.id} className="relative flex gap-5">
            {/* Verbindungslinie zwischen den Markern */}
            {!last ? <span className={cx('absolute top-12 bottom-[-1.5rem] left-[1.375rem] w-0.5', isDone ? 'bg-accent-600' : 'bg-line-300')} aria-hidden /> : null}
            <span
              className={cx(
                'relative z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-body font-semibold tabular',
                isDone ? 'border-accent-600 bg-accent-600 text-on-accent' : 'border-ink-900 bg-surface-0 text-ink-900',
              )}
              aria-hidden
            >
              {isDone ? <Icon icon={Check} size={18} /> : i + 1}
            </span>
            <div className={cx('flex flex-1 flex-col gap-3 rounded-card border bg-surface-0 p-5', isDone ? 'border-accent-600' : 'border-line-200')}>
              {canTrack ? (
                <Checkbox
                  label={<span className="text-h3">{s.title}</span>}
                  checked={isDone}
                  onCheckedChange={(on) => {
                    setState((prev) => {
                      const next = new Set(prev);
                      if (on) next.add(s.id);
                      else next.delete(s.id);
                      return next;
                    });
                    void toggleRecognitionStep(guideId, s.id, on);
                  }}
                />
              ) : (
                <h3 className="text-h3 text-ink-900">{s.title}</h3>
              )}
              <p className="text-body-s text-ink-700">{s.description}</p>
              {s.documents.length ? (
                <ul className="flex flex-col gap-1.5 rounded-control bg-surface-50 p-3 text-body-s text-ink-900">
                  {s.documents.map((d) => (
                    <li key={d} className="flex items-start gap-2">
                      <Icon icon={FileText} size={16} className="mt-0.5 shrink-0 text-accent-600" />
                      {d}
                    </li>
                  ))}
                </ul>
              ) : null}
              {s.links.length ? (
                <div className="flex flex-wrap gap-2">
                  {s.links.map((l) => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-chip border border-line-300 px-3 py-1 text-body-s font-medium text-accent-600 hover:border-accent-600 hover:text-accent-700"
                    >
                      {l.label}
                      <Icon icon={ExternalLink} size={14} label={t('external')} />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
