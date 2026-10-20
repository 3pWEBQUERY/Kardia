/** Endpunkte, die ein Ereignis erhalten: aktiv und abonniert (leere Liste = alle). */
export function selectEndpoints<T extends { active: boolean; events: string[] }>(endpoints: readonly T[], event: string): T[] {
  return endpoints.filter((e) => e.active && (e.events.length === 0 || e.events.includes(event)));
}

export function webhookBody(event: string, payload: unknown, deliveryId: string, createdAt: Date): string {
  return JSON.stringify({ id: deliveryId, event, createdAt: createdAt.toISOString(), data: payload });
}

/** 2xx = zugestellt; 410 = Endpunkt dauerhaft weg (deaktivieren); sonst wiederholen. */
export function classifyResponse(status: number): 'delivered' | 'gone' | 'retry' {
  if (status >= 200 && status < 300) return 'delivered';
  if (status === 410) return 'gone';
  return 'retry';
}
