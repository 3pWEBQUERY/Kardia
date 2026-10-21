import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { PublicShell } from '@/components/shell/PublicShell';

import type { ReactNode } from 'react';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const all = (await getMessages()) as Record<string, Record<string, unknown>>;
  // Nur die Teile von "public", die Client-Komponenten brauchen (JS-Budget, PRD 10.4).
  const pub = all.public ?? {};
  return (
    <NextIntlClientProvider
      messages={{ common: all.common, enums: all.enums, fields: all.fields, errors: all.errors, public: { report: pub.report, results: pub.results }, explore: all.explore }}
    >
      <PublicShell>{children}</PublicShell>
    </NextIntlClientProvider>
  );
}
