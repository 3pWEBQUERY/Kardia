import { createDb, type Db } from '@kardia/db/client';

/** Gemeinsame Ressourcen der Handler; einmal pro Prozess erzeugt. */
let dbInstance: Db | undefined;

export function db(): Db {
  dbInstance ??= createDb();
  return dbInstance;
}

export type Enqueue = (
  queue: string,
  data: object,
  options?: { startAfter?: number | Date; singletonKey?: string; retryLimit?: number },
) => Promise<string | null>;

let enqueueImpl: Enqueue = () => Promise.resolve(null);

/** Vom Worker-Start gesetzt; Handler legen darüber Folge-Jobs an. */
export function setEnqueue(fn: Enqueue): void {
  enqueueImpl = fn;
}

export const enqueue: Enqueue = (queue, data, options) => enqueueImpl(queue, data, options);

export const log = {
  info: (msg: string, extra?: Record<string, unknown>) => console.warn(JSON.stringify({ level: 'info', msg, ...extra })),
  warn: (msg: string, extra?: Record<string, unknown>) => console.warn(JSON.stringify({ level: 'warn', msg, ...extra })),
  error: (msg: string, extra?: Record<string, unknown>) => console.error(JSON.stringify({ level: 'error', msg, ...extra })),
};
