'use server';

import { revalidatePath } from 'next/cache';

import {
  ProblemError,
  parseOrThrow,
  pushSubscriptionSchema,
  type CredentialInput,
  type PassInput,
  type RealityVote,
} from '@kardia/core';

import { db } from '@/server/db';
import { exportMyData, deleteMyAccount, savePushSubscription, removePushSubscription } from '@/server/services/account';
import { apply, postMessage, setDocumentsShared, withdrawApplication } from '@/server/services/applications';
import { completeUpload, createUpload } from '@/server/services/files';
import { respondOffer, setBlocks, updateMarketplaceProfile } from '@/server/services/marketplace';
import { addCredential, deleteCredential, saveTrainingProgress, updateCredential, upsertPass } from '@/server/services/pass';
import { bookShift, cancelShiftAsCandidate } from '@/server/services/pool';
import { createSavedSearch, deleteSavedSearch as removeSavedSearch } from '@/server/services/savedSearches';
import { askTeam, answerQuestion, castRealityVote, reportContent, setAmbassador, verifyByEmailDomain } from '@/server/services/team';
import { getSession, requireUser } from '@/server/session';

import { actionResult, type ActionResult } from './result';

/** Server Actions der Fachperson; jede ruft die gleichen Service-Funktionen wie die REST-API. */

export async function toggleSavedJob(jobId: string): Promise<ActionResult<{ saved: boolean }>> {
  return actionResult(async () => {
    const s = await getSession();
    if (!s) throw new ProblemError('unauthorized');
    const c = await db.candidateProfile.findUnique({ where: { userId: s.user.id } });
    if (!c) throw new ProblemError('conflict', 'Bitte zuerst den Qualifikations-Pass anlegen.');
    const existing = await db.savedJob.findUnique({ where: { candidateId_jobId: { candidateId: c.id, jobId } } });
    if (existing) await db.savedJob.delete({ where: { candidateId_jobId: { candidateId: c.id, jobId } } });
    else await db.savedJob.create({ data: { candidateId: c.id, jobId } });
    revalidatePath('/me/saved');
    return { saved: !existing };
  });
}

export async function saveSearch(input: unknown): Promise<ActionResult<{ id: string }>> {
  return actionResult(async () => {
    const s = await requireUser('/search');
    const saved = await createSavedSearch(s.user.id, input);
    revalidatePath('/me/saved');
    return { id: saved.id };
  });
}

export async function deleteSavedSearch(id: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser();
    await removeSavedSearch(s.user.id, id);
    revalidatePath('/me/saved');
  });
}

export async function applyToJob(input: { jobId: string; message?: string; shareDocuments: boolean }): Promise<ActionResult<{ id: string }>> {
  return actionResult(async () => {
    const s = await requireUser(`/jobs/${input.jobId}`);
    const app = await apply(s.user.id, input);
    revalidatePath('/me/applications');
    return { id: app.id };
  });
}

export async function withdraw(applicationId: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser();
    await withdrawApplication(s.user.id, applicationId);
    revalidatePath('/me/applications');
  });
}

export async function shareDocuments(applicationId: string, shared: boolean): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser();
    await setDocumentsShared(s.user.id, applicationId, shared);
    revalidatePath(`/me/applications/${applicationId}`);
  });
}

export async function sendCandidateMessage(applicationId: string, body: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser();
    await postMessage({ userId: s.user.id }, applicationId, { body });
    revalidatePath(`/me/applications/${applicationId}`);
  });
}

export async function savePass(input: PassInput): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser('/me/pass');
    await upsertPass(s.user.id, input);
    revalidatePath('/me/pass');
  });
}

export async function saveCredential(input: CredentialInput & { id?: string }): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser('/me/pass');
    if (input.id) await updateCredential(s.user.id, input.id, input);
    else await addCredential(s.user.id, input);
    revalidatePath('/me/pass');
  });
}

export async function removeCredential(id: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser('/me/pass');
    await deleteCredential(s.user.id, id);
    revalidatePath('/me/pass');
  });
}

export async function requestUpload(input: { purpose: 'pass' | 'import' | 'video' | 'captions' | 'logo'; mimeType: string; sizeBytes: number; sha256: string }): Promise<ActionResult<{ fileId: string; uploadUrl: string; headers: Record<string, string> }>> {
  return actionResult(async () => {
    const s = await requireUser();
    return createUpload(s.user.id, input);
  });
}

export async function finishUpload(fileId: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser();
    await completeUpload(s.user.id, fileId);
  });
}

export async function saveMarketplace(input: unknown): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser('/me/marketplace');
    await updateMarketplaceProfile(s.user.id, input);
    revalidatePath('/me/marketplace');
  });
}

export async function saveBlocks(orgIds: string[]): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser('/me/marketplace');
    await setBlocks(s.user.id, orgIds);
    revalidatePath('/me/marketplace');
  });
}

/** Nie optimistisch (PRD 7.4): die UI wartet auf die Antwort. */
export async function answerOffer(offerId: string, response: { action: 'interested' } | { action: 'decline'; reason?: 'salary' | 'workload' | 'location' | 'conditions' | 'timing' | 'other' }): Promise<ActionResult<{ applicationId: string | null }>> {
  return actionResult(async () => {
    const s = await requireUser('/me/marketplace');
    const r = await respondOffer(s.user.id, offerId, response);
    revalidatePath('/me/marketplace');
    return { applicationId: r.applicationId };
  });
}

export async function book(shiftId: string): Promise<ActionResult<{ status: 'BOOKED' | 'INTEREST' }>> {
  return actionResult(async () => {
    const s = await requireUser('/me/shifts');
    const r = await bookShift(s.user.id, shiftId);
    revalidatePath('/me/shifts');
    return r;
  });
}

export async function cancelBooking(shiftId: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser('/me/shifts');
    await cancelShiftAsCandidate(s.user.id, shiftId);
    revalidatePath('/me/shifts');
  });
}

export async function saveTraining(rows: { specialtyTitle: string; area: string; yearsCompleted: number }[]): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser('/me/training');
    await saveTrainingProgress(s.user.id, rows);
    revalidatePath('/me/training');
  });
}

export async function toggleRecognitionStep(guideId: string, stepId: string, done: boolean): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser('/me/recognition');
    const c = await db.candidateProfile.findUnique({ where: { userId: s.user.id } });
    if (!c) throw new ProblemError('conflict', 'Bitte zuerst den Qualifikations-Pass anlegen.');
    const current = await db.recognitionProgress.findUnique({ where: { candidateId_guideId: { candidateId: c.id, guideId } } });
    const steps = new Set(current?.completedSteps ?? []);
    if (done) steps.add(stepId);
    else steps.delete(stepId);
    await db.recognitionProgress.upsert({
      where: { candidateId_guideId: { candidateId: c.id, guideId } },
      create: { candidateId: c.id, guideId, completedSteps: [...steps] },
      update: { completedSteps: [...steps] },
    });
    revalidatePath(`/guide/recognition/${guideId}`);
  });
}

export async function verifyEmployee(wardId: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser(`/wards/${wardId}/team`);
    await verifyByEmailDomain(s.user, wardId);
    revalidatePath(`/wards/${wardId}/team`);
  });
}

export async function vote(wardId: string, input: RealityVote): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser(`/wards/${wardId}/team`);
    await castRealityVote(s.user.id, wardId, input);
    revalidatePath(`/wards/${wardId}/team`);
  });
}

export async function ask(wardId: string, body: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser(`/wards/${wardId}`);
    await askTeam(s.user.id, wardId, { body });
  });
}

export async function answer(questionId: string, text: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser('/me/team');
    await answerQuestion(s.user.id, questionId, { answer: text });
    revalidatePath('/me/team');
  });
}

export async function toggleAmbassador(wardId: string, on: boolean): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser('/me/team');
    await setAmbassador(s.user.id, wardId, on);
    revalidatePath(`/wards/${wardId}/team`);
  });
}

export async function report(entity: 'TeamQuestion' | 'RealityCheck' | 'WardVideo', entityId: string, reason: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await getSession();
    await reportContent(s?.user.id ?? null, entity, entityId, reason);
  });
}

export async function exportData(): Promise<ActionResult<string>> {
  return actionResult(async () => {
    const s = await requireUser('/me/settings');
    return JSON.stringify(await exportMyData(s.user.id), null, 2);
  });
}

export async function deleteAccount(confirmEmail: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser('/me/settings');
    if (confirmEmail.trim().toLowerCase() !== s.user.email.toLowerCase()) {
      throw new ProblemError('validation', 'Zur Bestätigung bitte die eigene E-Mail-Adresse eingeben.');
    }
    await deleteMyAccount(s.user.id);
  });
}

export async function subscribePush(sub: unknown): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser();
    await savePushSubscription(s.user.id, parseOrThrow(pushSubscriptionSchema, sub));
  });
}

export async function unsubscribePush(endpoint: string): Promise<ActionResult> {
  return actionResult(async () => {
    const s = await requireUser();
    await removePushSubscription(s.user.id, endpoint);
  });
}
