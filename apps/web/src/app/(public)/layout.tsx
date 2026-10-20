import { PublicShell } from '@/components/shell/PublicShell';

import type { ReactNode } from 'react';


export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
