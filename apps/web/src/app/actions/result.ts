import { unstable_rethrow } from 'next/navigation';

import { ProblemError } from '@kardia/core';

/** Ergebnis einer Server Action: Daten oder eine Fehlermeldung mit Ursache und Lösung (PRD 7.4). */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { kind: string; message: string; fields?: Record<string, string> } };

export async function actionResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ProblemError) {
      const fields = Object.fromEntries((error.errors ?? []).map((e) => [e.path, e.message]));
      return {
        ok: false,
        error: { kind: error.kind, message: error.detail ?? error.message, ...(Object.keys(fields).length ? { fields } : {}) },
      };
    }
    console.error(error);
    return { ok: false, error: { kind: 'internal', message: 'internal' } };
  }
}
