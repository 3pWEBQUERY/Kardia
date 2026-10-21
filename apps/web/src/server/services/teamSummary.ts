import 'server-only';

import { db } from '../db.ts';

export interface TeamSummary {
  field: string;
  summary: string;
  basedOn: number;
  createdAt: Date;
}

/**
 * KI-5: jüngste Zusammenfassung der Team-Kommentare je Feld (Worker schreibt
 * `team.summary`-Events mit entityId "<wardId>:<feld>"). Anzeige nur gekennzeichnet.
 */
export async function latestTeamSummaries(wardId: string): Promise<TeamSummary[]> {
  const events = await db.event.findMany({
    where: { name: 'team.summary', entityId: { startsWith: `${wardId}:` } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const out = new Map<string, TeamSummary>();
  for (const e of events) {
    const field = (e.entityId ?? '').slice(wardId.length + 1);
    const props = (e.props ?? {}) as { summary?: unknown; basedOn?: unknown };
    if (!field || out.has(field) || typeof props.summary !== 'string') continue;
    out.set(field, { field, summary: props.summary, basedOn: typeof props.basedOn === 'number' ? props.basedOn : 0, createdAt: e.createdAt });
  }
  return [...out.values()];
}
