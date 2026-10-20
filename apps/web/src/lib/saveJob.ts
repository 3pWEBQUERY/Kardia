'use client';

import { toggleSavedJob } from '@/app/actions/candidate';

import type { ActionResult } from '@/app/actions/result';

/**
 * Merken/Entfernen. Online über die Server Action; offline über die REST-Route, die der
 * Service Worker per Hintergrund-Sync nachreicht (PRD 13.2).
 */
export async function saveJob(jobId: string, currentlySaved: boolean): Promise<ActionResult<{ saved: boolean }>> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    try {
      await fetch(`/api/v1/me/saved/${jobId}`, { method: currentlySaved ? 'DELETE' : 'PUT' });
    } catch {
      // Vom Service Worker in die Warteschlange gelegt.
    }
    return { ok: true, data: { saved: !currentlySaved } };
  }
  return toggleSavedJob(jobId);
}
