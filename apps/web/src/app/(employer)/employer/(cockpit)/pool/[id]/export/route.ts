import { ProblemError } from '@kardia/core';

import { poolCsv } from '@/server/services/pool';
import { requireOrg } from '@/server/session';

/** CSV-Export der Schichten eines Pools (Flex-Pool-Verwaltung). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const ctx = await requireOrg('pool.manage');
    const csv = await poolCsv(ctx, id);
    return new Response(`\uFEFF${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="flex-pool-${id}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof ProblemError) return new Response(error.message, { status: error.status });
    throw error;
  }
}
