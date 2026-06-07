import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getSession } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/album');
  return <>{children}</>;
}
