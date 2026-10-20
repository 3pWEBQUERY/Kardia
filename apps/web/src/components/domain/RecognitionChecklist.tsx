'use client';

import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { RecognitionStep } from '@kardia/core';
import { Checkbox, Icon } from '@kardia/ui';

import { toggleRecognitionStep } from '@/app/actions/candidate';

/** Checkliste mit eigenem Fortschritt (umkehrbar → optimistisch). */
export function RecognitionChecklist({ guideId, steps, done, canTrack }: { guideId: string; steps: RecognitionStep[]; done: string[]; canTrack: boolean }) {
  const t = useTranslations('common');
  const [state, setState] = useState(() => new Set(done));
  return (
    <ol className="flex flex-col gap-4">
      {steps.map((s, i) => (
        <li key={s.id} className="flex flex-col gap-2 border-b border-line-200 pb-4 last:border-0">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 font-mono text-micro text-ink-500">{i + 1}</span>
            <div className="flex flex-1 flex-col gap-1">
              {canTrack ? (
                <Checkbox
                  label={<span className="font-medium">{s.title}</span>}
                  checked={state.has(s.id)}
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
                <p className="text-body-s font-medium">{s.title}</p>
              )}
              <p className="text-body-s text-ink-700">{s.description}</p>
              {s.documents.length ? (
                <ul className="list-disc pl-5 text-body-s text-ink-700">
                  {s.documents.map((d) => <li key={d}>{d}</li>)}
                </ul>
              ) : null}
              {s.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-body-s text-accent-600 hover:text-accent-700">
                  {l.label}
                  <Icon icon={ExternalLink} size={14} label={t('external')} />
                </a>
              ))}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
