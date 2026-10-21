import { getTranslations } from 'next-intl/server';

import { Button, Callout } from '@kardia/ui';

import { demoSignIn } from '@/app/actions/demo';
import { SignInForm } from '@/components/auth/SignInForm';
import { SsoSignIn } from '@/components/auth/SsoSignIn';
import { DEMO_PERSONAS } from '@/server/demoLogin';
import { env } from '@/server/env';

import type { Metadata } from 'next';

export const metadata: Metadata = { robots: { index: false } };

function safeNext(next: string | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/me';
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; admin?: string; demo?: string }> }) {
  const sp = await searchParams;
  const t = await getTranslations('auth');
  const ts = await getTranslations('employer.sso');
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-s text-ink-700">{t('lead')}</p>
      </header>
      {env().DEMO_LOGIN && sp.admin !== '1' ? (
        <section aria-labelledby="demo-title" className="flex flex-col gap-3 rounded-card border border-line-300 bg-surface-0 p-4">
          <h2 id="demo-title" className="text-h3">{t('demo.title')}</h2>
          <p className="text-body-s text-ink-700">{t('demo.lead')}</p>
          {sp.demo === 'failed' || sp.demo === 'missing' ? <Callout tone="critical">{t(`demo.${sp.demo}`)}</Callout> : null}
          <ul className="flex flex-col gap-2">
            {DEMO_PERSONAS.map((p) => (
              <li key={p.email}>
                <form action={demoSignIn}>
                  <input type="hidden" name="email" value={p.email} />
                  <Button type="submit" className="w-full justify-between">
                    <span>{t(`demo.roles.${p.role}`)}</span>
                    <span className="font-mono text-micro text-ink-500">{p.email}</span>
                  </Button>
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
    </div>
  );
}
