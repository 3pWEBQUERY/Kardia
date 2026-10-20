'use server';

import { revalidatePath } from 'next/cache';


import {
  claimCredential,
  decideCredential,
  decideOrganization,
  moderate,
  recheckOrganization,
  saveGuide,
} from '@/server/services/admin';
import { setOrganizationPlan } from '@/server/services/adminOrgs';
import { requireAdmin } from '@/server/session';

import { actionResult, type ActionResult } from './result';

import type { ModerationStatus, OrgVerification, PlanTier } from '@kardia/db';

/** Server Actions der Admin-Konsole. Jede Aktion prüft die Admin-Sitzung und schreibt das Audit-Log (Service). */

export async function claim(credentialId: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireAdmin();
    await claimCredential(s, credentialId);
    revalidatePath(`/admin/credentials/${credentialId}`);
  });
}

export async function decide(credentialId: string, verified: boolean, reason?: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireAdmin();
    await decideCredential(s, credentialId, reason ? { verified, reason } : { verified });
    revalidatePath('/admin/credentials');
    revalidatePath(`/admin/credentials/${credentialId}`);
  });
}

export async function decideOrg(id: string, verification: OrgVerification, note?: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireAdmin();
    await decideOrganization(s, id, verification, note);
    revalidatePath('/admin/organizations');
  });
}

export async function recheckOrg(id: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireAdmin();
    await recheckOrganization(s, id);
  });
}

export async function setPlan(id: string, input: { plan: PlanTier | null; validUntil: string | null; foundingPartner: boolean }): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireAdmin();
    await setOrganizationPlan(s, id, input);
    revalidatePath('/admin/organizations');
  });
}

export async function moderateItem(
  entity: 'TeamQuestion' | 'WardVideo' | 'RealityCheckComment' | 'ContentReport',
  id: string,
  status: ModerationStatus,
): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireAdmin();
    await moderate(s, entity, id, status);
    revalidatePath('/admin/moderation');
  });
}

export async function saveRecognitionGuide(input: unknown, id?: string): Promise<ActionResult<{ id: string }>> {
  return actionResult(async () => {
    const s = await requireAdmin();
    const saved = await saveGuide(s, input, id);
    revalidatePath('/admin/editorial');
    return { id: saved.id };
  });
}
