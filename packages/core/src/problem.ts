import type { z } from 'zod';

/** RFC 9457 Problem Details (PRD 12.1): `type`, `title`, `detail`, `errors[]` aus Zod. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: { path: string; code: string; message: string }[];
}

export const PROBLEM_BASE = 'https://kardia.ch/problems/';

export const PROBLEMS = {
  validation: { status: 422, title: 'Die Eingabe ist ungültig.' },
  unauthorized: { status: 401, title: 'Anmeldung erforderlich.' },
  forbidden: { status: 403, title: 'Keine Berechtigung für diese Aktion.' },
  notFound: { status: 404, title: 'Nicht gefunden.' },
  conflict: { status: 409, title: 'Konflikt mit dem aktuellen Zustand.' },
  shiftTaken: { status: 409, title: 'Die Schicht ist bereits vergeben.' },
  rateLimited: { status: 429, title: 'Zu viele Anfragen. Bitte kurz warten.' },
  quotaExceeded: { status: 402, title: 'Das Kontingent Ihres Abos ist ausgeschöpft.' },
  publishBlocked: { status: 422, title: 'Die Stelle kann noch nicht veröffentlicht werden.' },
  offerRejected: { status: 422, title: 'Das Angebot erfüllt die Regeln nicht.' },
  upstream: { status: 502, title: 'Ein externer Dienst antwortet nicht.' },
  internal: { status: 500, title: 'Unerwarteter Fehler.' },
} as const;

export type ProblemKind = keyof typeof PROBLEMS;

export class ProblemError extends Error {
  readonly kind: ProblemKind;
  readonly detail: string | undefined;
  readonly errors: Problem['errors'];

  constructor(kind: ProblemKind, detail?: string, errors?: Problem['errors']) {
    super(detail ?? PROBLEMS[kind].title);
    this.name = 'ProblemError';
    this.kind = kind;
    this.detail = detail;
    this.errors = errors;
  }

  get status(): number {
    return PROBLEMS[this.kind].status;
  }

  toProblem(instance?: string): Problem {
    return {
      type: `${PROBLEM_BASE}${this.kind}`,
      title: PROBLEMS[this.kind].title,
      status: this.status,
      ...(this.detail ? { detail: this.detail } : {}),
      ...(instance ? { instance } : {}),
      ...(this.errors?.length ? { errors: this.errors } : {}),
    };
  }
}

export function zodProblem(error: z.ZodError, detail?: string): ProblemError {
  return new ProblemError(
    'validation',
    detail,
    error.issues.map((i) => ({ path: i.path.join('.'), code: i.code, message: i.message })),
  );
}

/** Parsen mit Zod und bei Fehler als ProblemError werfen – überall gleich. */
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw zodProblem(result.error);
  return result.data;
}
