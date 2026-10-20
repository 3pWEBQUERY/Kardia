import { notFound } from 'next/navigation';

import { ProblemError } from '@kardia/core';

/** Service-Aufruf auf einer Detailseite: "nicht gefunden" (auch fremder Mandant) wird zur 404-Seite. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ProblemError && error.kind === 'notFound') notFound();
    throw error;
  }
}
