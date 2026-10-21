import { ArrowRight, Building2, ShieldCheck, Stethoscope, Store, UserRound, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Callout, Icon } from '@kardia/ui';

import { demoSignIn } from '@/app/actions/demo';
import { SignInForm } from '@/components/auth/SignInForm';
import { SsoSignIn } from '@/components/auth/SsoSignIn';
import { KardiaMark } from '@/components/brand/KardiaLogo';
import { AuthLayout } from '@/components/marketing/AuthLayout';
import { DEMO_PERSONAS } from '@/server/demoLogin';
import { env } from '@/server/env';

import type { LucideIcon } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { robots: { index: false } };

const ROLE_ICONS: Record<string, LucideIcon> = { candidate: Stethoscope, owner: Building2, recruiter: Users, practice: Store, admin: ShieldCheck };

function safeNext(next: string | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/me';
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; admin?: string; demo?: string }> }) {
  const sp = await searchParams;
  const t = await getTranslations('auth');
  const ts = await getTranslations('employer.sso');
  return (
    <AuthLayout>
      <header className="flex flex-col gap-3">
        <KardiaMark className="size-10 lg:hidden" />
        <h1 className="text-display text-ink-900">{t('title')}</h1>
        <p className="text-body-s text-ink-700">{t('lead')}</p>
      </header>
      {env().DEMO_LOGIN && sp.admin !== '1' ? (
        <section aria-labelledby="demo-title" className="flex flex-col gap-3 rounded-card border border-sand-200 bg-sand-100 p-5">
          <h2 id="demo-title" className="text-h3 text-ink-900">
            {t('demo.title')}
          </h2>
          <p className="text-body-s text-ink-700">{t('demo.lead')}</p>
          {sp.demo === 'failed' || sp.demo === 'missing' ? <Callout tone="critical">{t(`demo.${sp.demo}`)}</Callout> : null}
          <ul className="flex flex-col gap-2">
            {DEMO_PERSONAS.map((p) => (
              <li key={p.email}>
                <form action={demoSignIn}>
                  <input type="hidden" name="email" value={p.email} />
                  <button
                    type="submit"
                    className="group flex w-full items-center gap-3 rounded-control border border-line-300 bg-surface-0 px-3 py-2.5 text-left transition-colors hover:border-accent-600"
                  >
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-brand-950 text-pulse-500">
                      <Icon icon={ROLE_ICONS[p.role] ?? UserRound} size={18} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body-s font-semibold text-ink-900">{t(`demo.roles.${p.role}`)}</span>
                      <span className="truncate font-mono text-micro text-ink-500">{p.email}</span>
                    </span>
                    <Icon icon={ArrowRight} size={16} className="text-ink-500 transition-colors group-hover:text-accent-600" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <SignInForm next={safeNext(sp.next)} adminOnly={sp.admin === '1'} />
      {sp.admin !== '1' ? (
        <SsoSignIn
          next={safeNext(sp.next)}
          labels={{ toggle: ts('signInToggle'), email: ts('signInEmail'), submit: ts('signInSubmit'), hint: ts('signInHint'), failed: ts('signInFailed') }}
        />
      ) : null}
      <p className="text-micro text-ink-500">{t('privacy')}</p>
    </AuthLayout>
  );
}
