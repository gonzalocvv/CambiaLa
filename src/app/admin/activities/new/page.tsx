import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { ActivityForm } from '@/components/admin/activity-form';
import { AppNavbar } from '@/components/layout/app-navbar';

export default async function NewActivityPage() {
  const t = await getTranslations('Admin.activities');

  return (
    <>
      <AppNavbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/admin/activities"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          {t('backToList')}
        </Link>
        <h1 className="text-foreground mt-2 mb-6 text-2xl font-bold">{t('formTitleNew')}</h1>
        <ActivityForm mode="create" />
      </main>
    </>
  );
}
