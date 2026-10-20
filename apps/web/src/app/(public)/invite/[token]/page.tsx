import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ProblemError } from '@kardia/core';
import { Button, Callout } from '@kardia/ui';

import { redeemInvite } from '@/server/services/org';
import { requireUser } from '@/server/session';

/** Einladung einlösen (Team, Mitarbeitende, Flex-Pool). Anmeldung mit der eingeladenen Adresse. */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await requireUser(`/invite/${token}`);
  const t = await getTranslations('auth.invite');
  let target: string | null = null;
  let error: string | null = null;
  try {
    const invite = await redeemInvite(s.user, token);
    target = invite.kind === 'ORG_MEMBER' ? '/employer' : invite.kind === 'POOL' ? '/me/shifts' : invite.wardId ? `/wards/${invite.wardId}/team` : '/me';
  } catch (e) {
    error = e instanceof ProblemError ? (e.detail ?? e.message) : t('failed');
  }
  if (target) redirect(target);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-12">
      <h1 className="text-h1">{t('title')}</h1>
      <Callout tone="critical">{error}</Callout>
      <Button asChild>
        <Link href="/me">{t('toAccount')}</Link>
      </Button>
    </div>
  );
}
