'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PIPELINE_COLUMNS, STATUS_HOTKEYS, canTransition, formatDate } from '@kardia/core';
import { RejectionReason, type ApplicationStatus } from '@kardia/db/enums';
import {
  Button,
  Dialog,
  PipelineCard,
  PipelineColumn,
  RadioGroup,
  StatusChip,
  useToast,
} from '@kardia/ui';

import { setApplicationStatus } from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

export interface BoardCard {
  id: string;
  name: string;
  status: ApplicationStatus;
  createdAt: string;
  match: number;
  verifiedCount: number;
  pendingCount: number;
  documentsShared: boolean;
}

/**
 * Pipeline (PRD 6, 7.1): Spalten Neu → Gesichtet → Gespräch → Angebot → Angestellt |
 * Abgesagt. Vollständig per Tastatur: J/K navigieren, 1–6 Status setzen. Statuswechsel
 * sind umkehrbar → optimistisch mit Rückgängig (PRD 7.4). Absage nur mit Grund.
 */
export function PipelineBoard({ cards: initial }: { cards: BoardCard[] }) {
  const t = useTranslations('employer.pipeline');
  const te = useTranslations('enums');
  const toast = useToast();
  const message = useActionMessage();
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [focusId, setFocusId] = useState<string | null>(initial[0]?.id ?? null);
  const [reject, setReject] = useState<{ id: string } | null>(null);
  const [reason, setReason] = useState<string>(RejectionReason.QUALIFICATION_MISSING);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => setCards(initial), [initial]);

  const ordered = useMemo(
    () => PIPELINE_COLUMNS.flatMap((col) => cards.filter((c) => c.status === col)),
    [cards],
  );

  const focusCard = useCallback((id: string | null) => {
    setFocusId(id);
    if (id) boardRef.current?.querySelector<HTMLElement>(`[data-card-id="${id}"]`)?.focus();
  }, []);

  const move = useCallback(
    async (id: string, to: ApplicationStatus, rejectionReason?: string) => {
      const card = cards.find((c) => c.id === id);
      if (!card || card.status === to) return;
      if (!canTransition(card.status, to)) {
        toast({
          tone: 'critical',
          message: t('notAllowed', {
            from: te(`ApplicationStatus.${card.status}`),
            to: te(`ApplicationStatus.${to}`),
          }),
        });
        return;
      }
      const from = card.status;
      setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status: to } : c)));
      const r = await setApplicationStatus(id, {
        status: to as never,
        ...(rejectionReason ? { rejectionReason: rejectionReason as never } : {}),
      });
      if (!r.ok) {
        setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status: from } : c)));
        toast({ tone: 'critical', message: message(r) });
        return;
      }
      toast({
        tone: 'neutral',
        message: t('moved', { name: card.name, status: te(`ApplicationStatus.${to}`) }),
        ...(canTransition(to, from)
          ? {
              undo: {
                label: t('undo'),
                onUndo: () => {
                  setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status: from } : c)));
                  void setApplicationStatus(id, {
                    status: from as never,
                    ...(from === 'REJECTED' ? { rejectionReason: 'OTHER' } : {}),
                  }).then((u) => {
                    if (!u.ok) {
                      setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status: to } : c)));
                      toast({ tone: 'critical', message: message(u) });
                    }
                  });
                },
              },
            }
          : {}),
      });
      router.refresh();
    },
    [cards, message, router, t, te, toast],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey || reject) return;
      const idx = focusId ? ordered.findIndex((c) => c.id === focusId) : -1;
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        focusCard(ordered[Math.min(ordered.length - 1, idx + 1)]?.id ?? null);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        focusCard(ordered[Math.max(0, idx - 1)]?.id ?? null);
      } else if (STATUS_HOTKEYS[e.key] && focusId) {
        e.preventDefault();
        const to = STATUS_HOTKEYS[e.key];
        if (!to) return;
        if (to === 'REJECTED') setReject({ id: focusId });
        else void move(focusId, to);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusId, ordered, focusCard, move, reject]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-micro text-ink-500">{t('keyboard')}</p>
      <div ref={boardRef} className="flex gap-3 overflow-x-auto pb-2">
        {PIPELINE_COLUMNS.map((col, i) => {
          const list = cards.filter((c) => c.status === col);
          return (
            <PipelineColumn
              key={col}
              id={`col-${col}`}
              title={`${i + 1} · ${te(`ApplicationStatus.${col}`)}`}
              count={list.length}
            >
              {list.length === 0 ? (
                <li className="px-2 py-3 text-micro text-ink-500">{t('emptyColumn')}</li>
              ) : null}
              {list.map((c) => (
                <PipelineCard
                  key={c.id}
                  dataId={c.id}
                  href={`/employer/applications/${c.id}`}
                  title={c.name}
                  selected={focusId === c.id}
                  onFocus={() => setFocusId(c.id)}
                  meta={t('cardMeta', { match: c.match, date: formatDate(c.createdAt) })}
                  status={
                    <>
                      {c.verifiedCount > 0 ? (
                        <StatusChip tone="ok">
                          {t('verified', { count: c.verifiedCount })}
                        </StatusChip>
                      ) : (
                        <StatusChip>{t('noVerified')}</StatusChip>
                      )}
                      {c.pendingCount > 0 ? (
                        <StatusChip tone="warn">
                          {t('pending', { count: c.pendingCount })}
                        </StatusChip>
                      ) : null}
                      {c.documentsShared ? (
                        <StatusChip tone="accent">{t('docsShared')}</StatusChip>
                      ) : null}
                    </>
                  }
                />
              ))}
            </PipelineColumn>
          );
        })}
      </div>
      <Dialog
        open={!!reject}
        onOpenChange={(o) => !o && setReject(null)}
        title={t('rejectTitle')}
        description={t('rejectHint')}
        footer={
          <>
            <Button onClick={() => setReject(null)}>{t('cancel')}</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (reject) void move(reject.id, 'REJECTED', reason);
                setReject(null);
              }}
            >
              {t('reject')}
            </Button>
          </>
        }
      >
        <RadioGroup
          label={t('reason')}
          value={reason}
          onValueChange={setReason}
          options={Object.values(RejectionReason).map((r) => ({
            value: r,
            label: te(`RejectionReason.${r}`),
          }))}
        />
      </Dialog>
    </div>
  );
}
