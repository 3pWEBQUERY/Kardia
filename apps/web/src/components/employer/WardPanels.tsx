'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { MAX_VIDEO_SECONDS } from '@kardia/core';
import { Button, Callout, Input, Textarea, useToast } from '@kardia/ui';

import {
  attachWardVideo,
  inviteWardEmployee,
  saveFieldComment,
  saveTranslations,
} from '@/app/actions/employer';
import { UploadFailure, uploadFile } from '@/lib/upload';
import { useActionMessage } from '@/lib/useActionError';

export interface RealityRow {
  field: string;
  label: string;
  employerValue: string;
  team: string | null;
  deviates: boolean;
  comment: string;
}

/**
 * Realitäts-Check aus Arbeitgebersicht: Team-Werte erst ab 5 Antworten; Werte können
 * nur kommentiert, nie gelöscht oder ausgeblendet werden (AK-G2).
 */
export function RealityPanel({ wardId, rows }: { wardId: string; rows: RealityRow[] }) {
  const t = useTranslations('employer.reality');
  const toast = useToast();
  const message = useActionMessage();
  const [comments, setComments] = useState(() =>
    Object.fromEntries(rows.map((r) => [r.field, r.comment])),
  );
  return (
    <div className="flex flex-col gap-3">
      <Callout>{t('hint')}</Callout>
      <ul className="flex flex-col divide-y divide-line-200">
        {rows.map((r) => (
          <li key={r.field} className="flex flex-col gap-2 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-body-s font-medium">{r.label}</span>
              <span className="text-body-s tabular">{t('yours', { value: r.employerValue })}</span>
            </div>
            <p className={r.deviates ? 'text-micro text-warn-600' : 'text-micro text-ink-500'}>
              {r.team ?? t('tooFew')}
            </p>
            {r.team ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  label={t('comment')}
                  hint={t('commentHint')}
                  maxLength={600}
                  value={comments[r.field] ?? ''}
                  onChange={(e) => setComments((c) => ({ ...c, [r.field]: e.target.value }))}
                />
                <div>
                  <Button
                    size="s"
                    onClick={() =>
                      void saveFieldComment(wardId, r.field, comments[r.field] ?? '').then((res) =>
                        toast(
                          res.ok
                            ? { tone: 'neutral', message: t('saved') }
                            : { tone: 'critical', message: message(res) },
                        ),
                      )
                    }
                  >
                    {t('saveComment')}
                  </Button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Mitarbeitende einladen (Kennzeichnung "vom Arbeitgeber eingeladen"). */
export function InviteEmployeeForm({ wardId }: { wardId: string }) {
  const t = useTranslations('employer.reality');
  const toast = useToast();
  const message = useActionMessage();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void inviteWardEmployee(wardId, email).then((r) => {
          setBusy(false);
          if (!r.ok) return toast({ tone: 'critical', message: message(r) });
          setEmail('');
          toast({ tone: 'neutral', message: t('invited') });
        });
      }}
    >
      <p className="text-body-s text-ink-700">{t('inviteHint')}</p>
      <Input
        label={t('inviteEmail')}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div>
        <Button type="submit" disabled={busy}>
          {t('invite')}
        </Button>
      </div>
    </form>
  );
}

const LOCALES = ['fr-CH', 'it-CH', 'en'] as const;

/** KI-6: Übersetzungen der Beschreibung, jede editierbar. */
export function TranslationsEditor({
  wardId,
  initial,
}: {
  wardId: string;
  initial: Record<string, { description: string | null }>;
}) {
  const t = useTranslations('employer.translations');
  const tl = useTranslations('common.language');
  const toast = useToast();
  const message = useActionMessage();
  const [values, setValues] = useState(() =>
    Object.fromEntries(LOCALES.map((l) => [l, initial[l]?.description ?? ''])),
  );
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-s text-ink-700">{t('hint')}</p>
      {LOCALES.map((l) => (
        <Textarea
          key={l}
          label={tl(l)}
          maxLength={6000}
          value={values[l] ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, [l]: e.target.value }))}
        />
      ))}
      <div>
        <Button
          variant="primary"
          onClick={() =>
            void saveTranslations(
              wardId,
              Object.fromEntries(
                LOCALES.map((l) => [l, { description: values[l]?.trim() || null }]),
              ),
            ).then((r) =>
              toast(
                r.ok
                  ? { tone: 'neutral', message: t('saved') }
                  : { tone: 'critical', message: message(r) },
              ),
            )
          }
        >
          {t('save')}
        </Button>
      </div>
    </div>
  );
}

function videoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(Math.ceil(v.duration));
    };
    v.onerror = () => reject(new Error('metadata'));
    v.src = URL.createObjectURL(file);
  });
}

/** Stationsvideo: MP4/MOV ≤ 60 s, Untertitel (WebVTT) Pflicht (AK-G3); Freigabe nach Moderation. */
export function VideoUpload({
  wardId,
  count,
  max,
}: {
  wardId: string;
  count: number;
  max: number;
}) {
  const t = useTranslations('employer.videos');
  const tu = useTranslations('errors.upload');
  const router = useRouter();
  const message = useActionMessage();
  const [video, setVideo] = useState<File | null>(null);
  const [captions, setCaptions] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (count >= max) return <Callout>{t('max', { max })}</Callout>;
  const submit = async () => {
    setError(null);
    if (!video || !captions) {
      setError(t('needBoth'));
      return;
    }
    setBusy(true);
    try {
      const duration = await videoDuration(video).catch(() => 0);
      if (duration > MAX_VIDEO_SECONDS) throw new Error(t('tooLong', { max: MAX_VIDEO_SECONDS }));
      const [v, c] = await Promise.all([
        uploadFile(video, 'video'),
        uploadFile(captions, 'captions'),
      ]);
      const r = await attachWardVideo(wardId, {
        fileId: v.fileId,
        captionsId: c.fileId,
        durationSec: duration || 1,
      });
      if (!r.ok) throw new Error(message(r) ?? '');
      setVideo(null);
      setCaptions(null);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof UploadFailure
          ? e.reason === 'rejected'
            ? e.message
            : tu(e.reason === 'type' ? 'type' : e.reason === 'tooLarge' ? 'tooLarge' : 'failed')
          : e instanceof Error
            ? e.message
            : tu('failed'),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body-s text-ink-700">{t('hint', { max: MAX_VIDEO_SECONDS })}</p>
      <label className="flex flex-col gap-1.5 text-caption text-ink-700">
        {t('video')}
        <input
          type="file"
          accept="video/mp4,video/quicktime,.mov,.mp4"
          onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
          className="text-body-s"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-caption text-ink-700">
        {t('captions')}
        <input
          type="file"
          accept=".vtt,text/vtt"
          onChange={(e) => setCaptions(e.target.files?.[0] ?? null)}
          className="text-body-s"
        />
      </label>
      {error ? <Callout tone="critical">{error}</Callout> : null}
      <div>
        <Button variant="primary" disabled={busy} onClick={() => void submit()}>
          {busy ? t('uploading') : t('upload')}
        </Button>
      </div>
    </div>
  );
}
