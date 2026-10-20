'use server';

import { revalidatePath } from 'next/cache';

import { changeStatus, postMessage } from '@/server/services/applications';
import { checkoutPlan, checkoutSingleListing } from '@/server/services/billing';
import { importStatus, startImport } from '@/server/services/import';
import { createJob, publishJob, setJobStatus, updateJob } from '@/server/services/jobs';
import { listOrgOffers, searchMarketplace, sendOffer } from '@/server/services/marketplace';
import {
  changeMemberRole,
  createApiKey,
  createFeed,
  createWebhook,
  deleteWebhook,
  inviteMember,
  registerOrganization,
  removeMember,
  revokeApiKey,
  switchOrganization,
  updateOrgDomains,
} from '@/server/services/org';
import {
  assignShift,
  cancelShiftAsEmployer,
  createPool,
  inviteToPool,
  publishShift,
} from '@/server/services/pool';
import { addWardVideo, inviteEmployee } from '@/server/services/team';
import {
  commentRealityField,
  confirmWard,
  createLocation,
  createWard,
  updateLocation,
  updateWard,
  updateWardTranslations,
} from '@/server/services/wards';
import { requireOrg, requireUser } from '@/server/session';

import { actionResult, type ActionResult } from './result';

import type { LocationInput, OfferInput, ShiftInput, StatusChange } from '@kardia/core';
import type { MemberRole, PlanTier } from '@kardia/db';

/**
 * Server Actions des Arbeitgeber-Cockpits. Jede Action prüft Rolle und Mandant
 * serverseitig über `requireOrg(permission)` (PRD 14.2) und ruft dieselben
 * Service-Funktionen wie die REST-API.
 */

export async function registerOrg(input: {
  name: string;
  uid: string;
  emailDomains: string[];
}): Promise<ActionResult<{ id: string }>> {
  return actionResult(async () => {
    const s = await requireUser('/employer/onboarding');
    const org = await registerOrganization(s, input);
    return { id: org.id };
  });
}

export async function switchOrg(organizationId: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser('/employer');
    await switchOrganization(s.user.id, organizationId);
    revalidatePath('/employer', 'layout');
  });
}

// ───────── Standorte und Stationen ─────────

export async function saveLocation(
  input: LocationInput & { id?: string },
): Promise<ActionResult<{ id: string }>> {
  return actionResult(async () => {
    const ctx = await requireOrg('wards.edit');
    const { id, ...data } = input;
    const loc = id ? await updateLocation(ctx, id, data) : await createLocation(ctx, data);
    revalidatePath('/employer/wards');
    return { id: loc.id };
  });
}

export async function saveWard(input: {
  id?: string;
  locationId: string;
  profile: unknown;
}): Promise<ActionResult<{ id: string }>> {
  return actionResult(async () => {
    const ctx = await requireOrg('wards.edit');
    const ward = input.id
      ? await updateWard(ctx, input.id, input.profile)
      : await createWard(ctx, input.locationId, input.profile);
    revalidatePath('/employer/wards');
    revalidatePath(`/employer/wards/${ward.id}`);
    return { id: ward.id };
  });
}

export async function confirmWardProfile(wardId: string): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('wards.edit');
    await confirmWard(ctx, wardId);
    revalidatePath('/employer', 'layout');
  });
}

export async function saveFieldComment(
  wardId: string,
  field: string,
  body: string,
): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('wards.edit');
    await commentRealityField(ctx, wardId, field, body);
    revalidatePath(`/employer/wards/${wardId}`);
  });
}

export async function saveTranslations(
  wardId: string,
  translations: Record<string, { description: string | null }>,
): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('wards.edit');
    await updateWardTranslations(ctx, wardId, translations);
    revalidatePath(`/employer/wards/${wardId}`);
  });
}

export async function inviteWardEmployee(wardId: string, email: string): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('wards.edit');
    await inviteEmployee(ctx, wardId, email);
  });
}

export async function attachWardVideo(
  wardId: string,
  input: { fileId: string; captionsId: string; durationSec: number },
): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('wards.edit');
    await addWardVideo(ctx, wardId, input);
    revalidatePath(`/employer/wards/${wardId}`);
  });
}

// ───────── Stellen und Import ─────────

export async function beginImport(input: {
  text?: string;
  url?: string;
  fileId?: string;
}): Promise<ActionResult<{ id: string }>> {
  return actionResult(async () => {
    const ctx = await requireOrg('jobs.edit');
    return { id: await startImport(ctx, input) };
  });
}

export async function pollImport(
  id: string,
): Promise<ActionResult<{ state: string; output: unknown }>> {
  return actionResult(async () => {
    const ctx = await requireOrg('jobs.edit');
    return importStatus(ctx, id);
  });
}

export async function saveJob(input: {
  id?: string;
  data: Record<string, unknown>;
}): Promise<ActionResult<{ id: string }>> {
  return actionResult(async () => {
    const ctx = await requireOrg('jobs.edit');
    const job = input.id
      ? await updateJob(ctx, input.id, input.data)
      : await createJob(ctx, input.data);
    revalidatePath('/employer/jobs');
    return { id: job.id };
  });
}

export async function publish(jobId: string): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('jobs.publish');
    await publishJob(ctx, jobId);
    revalidatePath('/employer/jobs');
    revalidatePath(`/employer/jobs/${jobId}`);
  });
}

export async function changeJobStatus(
  jobId: string,
  status: 'PAUSED' | 'CLOSED' | 'DRAFT',
): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('jobs.edit');
    await setJobStatus(ctx, jobId, status);
    revalidatePath('/employer/jobs');
    revalidatePath(`/employer/jobs/${jobId}`);
  });
}

// ───────── Pipeline ─────────

export async function setApplicationStatus(
  applicationId: string,
  change: StatusChange,
): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('applications.update');
    await changeStatus(ctx, applicationId, change);
    revalidatePath(`/employer/applications/${applicationId}`);
  });
}

export async function sendEmployerMessage(
  applicationId: string,
  body: string,
): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('applications.read');
    await postMessage({ userId: ctx.user.id, orgCtx: ctx }, applicationId, { body });
    revalidatePath(`/employer/applications/${applicationId}`);
  });
}

// ───────── Marktplatz ─────────

export async function marketplaceSearch(
  filter: Parameters<typeof searchMarketplace>[1],
): Promise<ActionResult<Awaited<ReturnType<typeof searchMarketplace>>>> {
  return actionResult(async () => {
    const ctx = await requireOrg('marketplace.offer');
    return searchMarketplace(ctx, filter);
  });
}

export async function makeOffer(input: OfferInput): Promise<ActionResult<{ id: string }>> {
  return actionResult(async () => {
    const ctx = await requireOrg('marketplace.offer');
    const offer = await sendOffer(ctx, input);
    revalidatePath('/employer/marketplace');
    return { id: offer.id };
  });
}

export async function orgOffers(): Promise<
  ActionResult<Awaited<ReturnType<typeof listOrgOffers>>>
> {
  return actionResult(async () => {
    const ctx = await requireOrg('marketplace.offer');
    return listOrgOffers(ctx);
  });
}

// ───────── Flex-Pool ─────────

export async function newPool(input: {
  name: string;
  bookingMode: 'FIRST_CONFIRMS' | 'EMPLOYER_SELECTS';
  cancelDeadlineHours: number;
}): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('pool.manage');
    await createPool(ctx, input);
    revalidatePath('/employer/pool');
  });
}

export async function invitePoolMember(poolId: string, email: string): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('pool.manage');
    await inviteToPool(ctx, poolId, email);
  });
}

export async function newShift(input: ShiftInput): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('pool.manage');
    await publishShift(ctx, input);
    revalidatePath('/employer/pool');
  });
}

export async function assignShiftTo(shiftId: string, candidateId: string): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('pool.manage');
    await assignShift(ctx, shiftId, candidateId);
    revalidatePath('/employer/pool');
  });
}

export async function cancelShift(shiftId: string): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('pool.manage');
    await cancelShiftAsEmployer(ctx, shiftId);
    revalidatePath('/employer/pool');
  });
}

// ───────── Team und Einstellungen ─────────

export async function inviteTeamMember(email: string, role: MemberRole): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('team.manage');
    await inviteMember(ctx, { email, role });
    revalidatePath('/employer/team');
  });
}

export async function setMemberRole(memberId: string, role: MemberRole): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('team.manage');
    await changeMemberRole(ctx, memberId, role);
    revalidatePath('/employer/team');
  });
}

export async function dropMember(memberId: string): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('team.manage');
    await removeMember(ctx, memberId);
    revalidatePath('/employer/team');
  });
}

export async function saveDomains(domains: string[]): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('org.manage');
    await updateOrgDomains(ctx, domains);
    revalidatePath('/employer/team');
  });
}

export async function newApiKey(
  name: string,
  scopes: ('jobs:write' | 'applications:read')[],
): Promise<ActionResult<{ key: string }>> {
  return actionResult(async () => {
    const ctx = await requireOrg('apikeys.manage');
    const key = await createApiKey(ctx, name, scopes);
    revalidatePath('/employer/team');
    return { key };
  });
}

export async function dropApiKey(id: string): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('apikeys.manage');
    await revokeApiKey(ctx, id);
    revalidatePath('/employer/team');
  });
}

export async function newWebhook(
  url: string,
  events: string[],
): Promise<ActionResult<{ secret: string }>> {
  return actionResult(async () => {
    const ctx = await requireOrg('apikeys.manage');
    const secret = await createWebhook(ctx, url, events);
    revalidatePath('/employer/team');
    return { secret };
  });
}

export async function dropWebhook(id: string): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('apikeys.manage');
    await deleteWebhook(ctx, id);
    revalidatePath('/employer/team');
  });
}

export async function newFeed(input: {
  url: string;
  format: 'XML' | 'JSON';
  wardId: string;
}): Promise<ActionResult> {
  return actionResult(async () => {
    const ctx = await requireOrg('org.manage');
    await createFeed(ctx, input);
    revalidatePath('/employer/team');
  });
}

// ───────── Abrechnung ─────────

export async function startPlanCheckout(plan: PlanTier): Promise<ActionResult<{ url: string }>> {
  return actionResult(async () => {
    const ctx = await requireOrg('billing.manage');
    return { url: await checkoutPlan(ctx, plan) };
  });
}

export async function startListingCheckout(jobId: string): Promise<ActionResult<{ url: string }>> {
  return actionResult(async () => {
    const ctx = await requireOrg('billing.manage');
    return { url: await checkoutSingleListing(ctx, jobId) };
  });
}
